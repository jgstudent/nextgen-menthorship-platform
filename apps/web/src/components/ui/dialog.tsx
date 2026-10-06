import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export function Dialog({ open, title, description, children, onClose }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-soft">
        <div className="flex items-start justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0B1220]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[#64748B]">{description}</p> : null}
          </div>
          <Button type="button" className="h-8 w-8 bg-transparent p-0 text-[#64748B] shadow-none hover:bg-[#F8FAFC]" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
