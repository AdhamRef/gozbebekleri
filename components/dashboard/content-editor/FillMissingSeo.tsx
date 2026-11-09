"use client";
import { useRef, useState } from "react";
import { CONFIG, type ContentKind } from "@/lib/content-editor/contracts";
export function FillMissingSeo({kinds, onDone}: {kinds: readonly ContentKind[]; onDone?: () => void}) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const cancelled = useRef(false);
  async function json(url: string, options?: RequestInit) {
    const response = await fetch(url, {...options, cache:"no-store"});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "تعذر استكمال SEO");
    return data;
  }
  async function run() {
    setBusy(true); cancelled.current = false;
    let checked = 0, filled = 0, failures = 0;
    const errors: string[] = [];
    try {
      for (const kind of kinds) {
        let cursor: string | null = null;
        const seen = new Set<string>();
        do {
          const list = await json(`/api/admin/content-editor/${kind}${cursor ? `?cursor=${cursor}` : ""}`);
          for (const item of list.items as {id:string; title:string}[]) {
            if (cancelled.current) break;
            setMessage(`${CONFIG[kind].label}: ${item.title} · فُحص ${checked} · استُكمل ${filled} حقل`);
            try {
              const url = `/api/admin/content-editor/${kind}/${item.id}`;
              const doc = await json(url);
              const saved = await json(url, {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"fill-missing-seo", revision:doc.revision})});
              filled += saved.filledFields;
            } catch (e) { failures++; errors.push(`${item.title}: ${e instanceof Error ? e.message : "تعذر الحفظ"}`); }
            checked++;
          }
          cursor = list.nextCursor;
          if (cursor && seen.has(cursor)) throw new Error("تكررت صفحة النتائج");
          if (cursor) seen.add(cursor);
        } while (cursor && !cancelled.current);
        if (cancelled.current) break;
      }
      setMessage(`${cancelled.current ? "أُوقف" : "اكتمل"} الفحص: ${checked} عنصر · استُكمل ${filled} حقل SEO ناقص · أخطاء ${failures}${errors.length ? " · " + errors.join(" | ") : ""}`);
      onDone?.();
    } catch (e) {setMessage(`فُحص ${checked} عنصر واستُكمل ${filled} حقل. ${e instanceof Error ? e.message : "تعذر الاستكمال"}`);}
    finally {setBusy(false);}
  }
  return <div className="space-y-2 rounded-lg border bg-white p-3" dir="rtl">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={busy} onClick={run} className="rounded border px-3 py-2 text-sm disabled:opacity-50">{busy ? "جار استكمال SEO…" : "استكمال SEO الناقص"}</button>
      {busy ? <button type="button" onClick={() => {cancelled.current=true;}} className="rounded border px-3 py-2 text-sm">إيقاف بعد العنصر الحالي</button> : null}
      <span className="text-xs text-slate-500">من نص كل لغة المحفوظ، مع الحفاظ على حقول SEO الموجودة. اترك الصفحة مفتوحة حتى الاكتمال.</span>
    </div>
    {message ? <p role="status" className="text-sm">{message}</p> : null}
  </div>;
}
