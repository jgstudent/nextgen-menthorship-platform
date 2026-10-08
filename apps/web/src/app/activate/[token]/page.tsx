"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function ActivateInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => { void params.then((value) => setToken(value.token)); }, [params]);

  async function activate(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (password !== confirmation) return setError("Passwords do not match.");
    setSaving(true);
    try {
      const result = await api<{ success: boolean; email: string }>("/auth/activate", { method: "POST", body: JSON.stringify({ token, password }) });
      setEmail(result.email);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setSaving(false);
    }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#173c36] px-4 py-10"><div className="pointer-events-none absolute -left-20 bottom-[-110px] h-80 w-80 rounded-full bg-[#f4c85a]/15" /><div className="pointer-events-none absolute -right-24 top-[-100px] h-96 w-96 rounded-full bg-[#dbece4]/10" /><Card className="relative w-full max-w-md rounded-[28px] border-white/10 bg-[#fffdf8] p-8 shadow-2xl sm:p-10">{email ? <div className="text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h1 className="mt-4 font-serif text-3xl font-bold text-[#173c36]">Your classroom is ready</h1><p className="mt-3 text-sm leading-6 text-[#63746f]">Your Pilye account for {email} has been activated.</p><Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#2f7464] px-5 text-sm font-semibold text-white">Sign in to Pilye</Link></div> : <><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4c85a] text-[#173c36]"><GraduationCap className="h-6 w-6" /></span><div><p className="font-serif text-3xl font-bold leading-none text-[#173c36]">Pilye</p><p className="mt-1 text-xs text-[#63746f]">Learning together</p></div></div><h1 className="mt-8 font-serif text-3xl font-bold text-[#173c36]">Create your password</h1><p className="mt-2 text-sm leading-6 text-[#63746f]">Accept your invitation and enter your private classroom.</p><form className="mt-6 space-y-4" onSubmit={activate}><Input type="password" autoComplete="new-password" minLength={8} placeholder="Password — at least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required /><Input type="password" autoComplete="new-password" minLength={8} placeholder="Confirm password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />{error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}<Button className="h-12 w-full rounded-xl bg-[#2f7464] hover:bg-[#245b4f]" type="submit" disabled={!token || saving}>{saving ? "Activating…" : "Activate my account"}</Button></form><p className="mt-5 text-center text-xs text-[#7d8985]">Invitations expire after seven days and can only be used once.</p></>}</Card></main>;
}

function messageFrom(value: unknown) { if (!(value instanceof Error)) return "Account activation failed."; try { const parsed = JSON.parse(value.message) as { message?: string | string[] }; return Array.isArray(parsed.message) ? parsed.message.join(" ") : parsed.message ?? value.message; } catch { return value.message; } }
