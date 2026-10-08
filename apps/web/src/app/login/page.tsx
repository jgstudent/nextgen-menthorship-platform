"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, GraduationCap } from "lucide-react";
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#173c36] px-4 py-10">
      <div className="pointer-events-none absolute -left-20 bottom-[-110px] h-80 w-80 rounded-full bg-[#f4c85a]/15" />
      <div className="pointer-events-none absolute -right-24 top-[-100px] h-96 w-96 rounded-full bg-[#dbece4]/10" />
      <Card className="relative w-full max-w-md rounded-[28px] border-white/10 bg-[#fffdf8] p-8 shadow-2xl sm:p-10">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4c85a] text-[#173c36]"><GraduationCap className="h-6 w-6" /></span>
          <div><p className="font-serif text-3xl font-bold leading-none text-[#173c36]">Pilye</p><p className="mt-1 text-xs text-[#63746f]">Learning together</p></div>
        </div>
        <h1 className="mt-8 font-serif text-3xl font-bold text-[#173c36]">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-[#63746f]">Your classroom, mentor, and next small step are waiting for you.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-[#173c36]">
            Email
            <input autoComplete="username" className="mt-1.5 h-12 w-full rounded-xl border border-[#dcd8cc] bg-white px-4 text-[#173c36] focus:border-[#2f7464] focus:ring-2 focus:ring-[#dbece4]" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold text-[#173c36]">
            Password
            <span className="relative mt-1 block">
              <input autoComplete="current-password" className="h-12 w-full rounded-xl border border-[#dcd8cc] bg-white px-4 pr-11 text-[#173c36] focus:border-[#2f7464] focus:ring-2 focus:ring-[#dbece4]" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-2 inline-flex w-8 items-center justify-center rounded-lg text-[#63746f] transition hover:bg-[#f7f2e7] hover:text-[#2f7464]"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <Button className="h-12 w-full rounded-xl bg-[#2f7464] hover:bg-[#245b4f]" type="submit">
            Enter Pilye
          </Button>
        </form>
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="font-semibold text-[#2f7464] hover:text-[#173c36]">
            Forgot password?
          </Link>
          <Link href="/register" className="font-semibold text-[#2f7464] hover:text-[#173c36]">
            Request access
          </Link>
        </div>
        <p className="mt-7 text-center text-[11px] text-[#7d8985]">A NextGen Haitian Empowerment learning experience</p>
      </Card>
    </main>
  );
}
