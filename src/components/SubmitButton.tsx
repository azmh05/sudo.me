"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn-primary w-full ${className}`}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
