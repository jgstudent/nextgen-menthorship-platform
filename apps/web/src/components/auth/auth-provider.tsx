"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { homePathForRole } from "@/lib/permissions";
import type { User } from "@/types/domain";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<unknown>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const publicPaths = new Set(["/login", "/register", "/forgot-password"]);

function isPublicRoute(pathname?: string | null) {
  return publicPaths.has(pathname ?? "") || Boolean(pathname?.startsWith("/apply/mentorship/"));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isPublicPath = isPublicRoute(pathname);

  useEffect(() => {
    setToken(localStorage.getItem("nextgen_token"));
    setIsInitialized(true);
  }, [pathname]);

  const userQuery = useQuery({
    queryKey: ["auth", "me", token],
    queryFn: () => api<User>("/auth/me", { token: token ?? undefined }),
    enabled: Boolean(token),
    retry: false
  });

  useEffect(() => {
    if (isInitialized && !token && !isPublicPath) {
      router.replace("/login");
    }
  }, [isInitialized, isPublicPath, router, token]);

  useEffect(() => {
    if (userQuery.isError) {
      localStorage.removeItem("nextgen_token");
      setToken(null);
      queryClient.clear();
      if (!isPublicPath) {
        router.replace("/login");
      }
    }
  }, [isPublicPath, queryClient, router, userQuery.isError]);

  useEffect(() => {
    if (token && publicPaths.has(pathname ?? "") && userQuery.data) {
      router.replace(homePathForRole(userQuery.data.role));
    }
  }, [pathname, router, token, userQuery.data]);

  const logout = () => {
    api("/auth/logout", { method: "POST" }).catch(() => undefined);
    localStorage.removeItem("nextgen_token");
    setToken(null);
    queryClient.clear();
    router.replace("/login");
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user: userQuery.data ?? null,
      isLoading: Boolean(token) && userQuery.isLoading,
      isAuthenticated: Boolean(userQuery.data),
      refreshUser: () => userQuery.refetch(),
      logout
    }),
    [token, userQuery.data, userQuery.isLoading, userQuery.refetch]
  );

  if (!isPublicPath && (!isInitialized || !token || userQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm font-semibold text-[var(--text-secondary)]">
        Loading secure workspace...
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return value;
}
