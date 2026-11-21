"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Native <dialog>: keyboard-friendly, closes with Esc or by clicking outside.
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/30 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="btn-ghost -mr-2 h-8 px-2">
          <X className="size-[18px]" strokeWidth={1.75} />
        </button>
      </div>
      <div className="p-5">{open && children}</div>
    </dialog>
  );
}

// Delete button that needs a second tap within 4 seconds to confirm.
export function ConfirmDelete({
  onConfirm,
  label = "Delete",
  pending,
}: {
  onConfirm: () => void;
  label?: string;
  pending?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={`btn h-10 px-3 text-[14px] ${
        armed ? "bg-negative text-white hover:opacity-90" : "text-negative hover:bg-negative/10"
      }`}
    >
      {armed ? "Tap again to confirm" : label}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-negative/10 px-3 py-2 text-[13px] text-negative">
      {message}
    </p>
  );
}
