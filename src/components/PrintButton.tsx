"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary h-10 print:hidden">
      <Printer className="size-4" strokeWidth={1.75} /> Save as PDF
    </button>
  );
}
