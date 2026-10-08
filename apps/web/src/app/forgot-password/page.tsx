import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#173c36] px-4">
      <Card className="w-full max-w-md rounded-[28px] border-white/10 bg-[#fffdf8] p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7464]">Pilye account recovery</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-[#173c36]">Forgot password</h1>
        <div className="mt-3 h-1 w-24 rounded-full bg-[#f4c85a]" />
        <p className="mt-5 text-sm leading-6 text-[#64748B]">
          Password reset emails are not enabled yet. Contact your Pilye program administrator to restore your classroom access.
        </p>
        <Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#2f7464] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245b4f]">
          Back to sign in
        </Link>
      </Card>
    </main>
  );
}
