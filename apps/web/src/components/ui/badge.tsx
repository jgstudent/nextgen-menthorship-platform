import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  blue: "bg-[#DBEAFE] text-[#1D4ED8] ring-[#93C5FD]",
  green: "bg-[#D1FAE5] text-[#047857] ring-[#6EE7B7]",
  gold: "bg-[#FEF3C7] text-[#92400E] ring-[#FCD34D]",
  red: "bg-red-50 text-red-700 ring-red-200",
  gray: "bg-[#F8FAFC] text-[#64748B] ring-[#E2E8F0]"
};

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", tones[tone])}>{children}</span>;
}
