"use client";

import { useEffect } from "react";

export function PrintOnLoad() {
  useEffect(() => {
    const id = setTimeout(() => window.print(), 300);
    return () => clearTimeout(id);
  }, []);
  return (
    <button type="button" onClick={() => window.print()} className="mb-2 w-full rounded border border-black py-1 print:hidden">
      Imprimir
    </button>
  );
}
