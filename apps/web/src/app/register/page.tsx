import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B1220] px-4">
      <Card className="w-full max-w-md border-white/10 p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#10B981]">Invitation required</p>
        <h1 className="mt-2 text-2xl font-bold text-[#0B1220]">Request access</h1>
        <div className="mt-3 h-1 w-24 rounded-full bg-[#D4A017]" />
        <p className="mt-5 text-sm leading-6 text-[#64748B]">
          Member registration is invite-based for NextGen Haitian Empowerment, Inc. Ask an administrator or project manager to create your account.
        </p>
        <Link href="/login" className="mt-6 inline-flex h-10 items-center rounded-md bg-[#1D4ED8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2563EB]">
          Back to sign in
        </Link>
      </Card>
    </main>
  );
}
