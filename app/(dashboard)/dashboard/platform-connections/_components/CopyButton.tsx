"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";

/** Copies a value (e.g. the webhook URL) to the clipboard. No secrets pass through this. */
export function CopyButton({ value, label = "نسخ رابط Webhook" }: { value: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const [full, setFull] = React.useState(value);

  React.useEffect(() => {
    // If given a relative path, show the absolute URL from the current origin.
    if (value.startsWith("/") && typeof window !== "undefined") setFull(`${window.location.origin}${value}`);
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <code dir="ltr" className="min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">{full}</code>
      <button
        type="button"
        onClick={() => { navigator.clipboard?.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {label}
      </button>
    </div>
  );
}
