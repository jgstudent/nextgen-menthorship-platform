"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApiUrl } from "@/lib/api";
import { homePathForRole } from "@/lib/permissions";
import type { UserRole } from "@/types/domain";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to sign in with those credentials.");
      }

      const result = await response.json() as { accessToken?: string; user?: { role?: UserRole } };
      if (!result.accessToken) {
        throw new Error("The API did not return an access token.");
      }

      localStorage.setItem("nextgen_token", result.accessToken);
      window.location.assign(homePathForRole(result.user?.role));
    } catch (error) {
      setError(error instanceof Error && error.message.includes("access token") ? error.message : "Unable to sign in with those credentials.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B1220] px-4">
      <Card className="w-full max-w-md border-white/10 p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#10B981]">NextGen Haitian Empowerment, Inc.</p>
        <h1 className="mt-2 text-2xl font-bold text-[#0B1220]">Sign in to Collaboration Hub</h1>
        <div className="mt-3 h-1 w-24 rounded-full bg-[#D4A017]" />
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-[#1E293B]">
            Email
            <input autoComplete="username" className="mt-1 h-11 w-full rounded-md border border-[#CBD5E1] px-3 text-[#1E293B] focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-medium text-[#1E293B]">
            Password
            <span className="relative mt-1 block">
              <input autoComplete="current-password" className="h-11 w-full rounded-md border border-[#CBD5E1] px-3 pr-11 text-[#1E293B] focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-2 inline-flex w-8 items-center justify-center rounded-md text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#1D4ED8]"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </form>
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="font-medium text-[#1D4ED8] hover:text-[#2563EB]">
            Forgot password?
          </Link>
          <Link href="/register" className="font-medium text-[#1D4ED8] hover:text-[#2563EB]">
            Request access
          </Link>
        </div>
      </Card>
    </main>
  );
}
