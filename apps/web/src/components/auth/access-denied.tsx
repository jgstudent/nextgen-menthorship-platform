"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AccessDenied() {
  return (
    <Card className="mx-auto max-w-2xl p-8 text-center shadow-soft">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-[#0B1220]">This section is restricted</h1>
      <p className="mt-3 text-sm leading-6 text-[#64748B]">
        Your current role does not include access to this workspace or operational area. Your navigation only shows modules available to your role, and restricted data is not loaded.
      </p>
      <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-[#1D4ED8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2563EB]">
        Back to Dashboard
      </Link>
    </Card>
  );
}
