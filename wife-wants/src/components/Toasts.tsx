"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Toast = { id: number; text: string; emoji?: string };

const ToastCtx = createContext<(text: string, emoji?: string) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((text: string, emoji?: string) => {
    const id = ++seq.current;
    setToasts([{ id, text, emoji }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pop-sm pop-in flex items-center gap-2 bg-sunshine px-4 py-2 font-display text-base font-semibold"
            role="status"
          >
            {t.emoji && <span className="text-xl">{t.emoji}</span>}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
