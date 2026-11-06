"use client";

import { secondaryButtonClass } from "@/components/ui";

export function PrintButton({ label = "Imprimir QR codes" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
      {label}
    </button>
  );
}
