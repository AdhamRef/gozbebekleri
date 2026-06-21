"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function BrandCopyButton({ value, label = "Copy URL" }: { value: string | null; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      className="inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
