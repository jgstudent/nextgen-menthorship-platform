import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export function Sheet({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm">
      <aside className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-[#E2E8F0] bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#0B1220]">{title}</h2>
          <Button type="button" className="h-8 w-8 bg-transparent p-0 text-[#64748B] shadow-none hover:bg-[#F8FAFC]" onClick={onClose} aria-label="Close drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}
