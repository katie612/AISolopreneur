"use client";

import { useEffect } from "react";

export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pop slide-up relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-b-none px-5 pt-5 safe-bottom sm:rounded-b-[var(--radius-blob)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="chip h-9 w-9 bg-sunshine text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
