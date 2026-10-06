"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type Toast = { id: string; title: string; description?: string; tone?: "success" | "error" };
type ToastContextValue = { toast: (toast: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo(
    () => ({
      toast: (toast: Omit<Toast, "id">) => {
        const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((items) => [...items, { ...toast, id }]);
        window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-3">
        {toasts.map((toast) => (
          <div key={toast.id} className="w-80 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-soft">
            <p className={toast.tone === "error" ? "font-semibold text-red-700" : "font-semibold text-[#0B1220]"}>{toast.title}</p>
            {toast.description ? <p className="mt-1 text-sm text-[#64748B]">{toast.description}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
