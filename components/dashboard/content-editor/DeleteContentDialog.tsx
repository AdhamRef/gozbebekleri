"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ContentKind } from "@/lib/content-editor/contracts";

export function DeleteContentDialog({kind,id,onClose,onDeleted}:{kind:ContentKind;id:string;onClose:()=>void;onDeleted:()=>void}) {
  const [document,setDocument]=useState<{title:string;revision:string}|null>(null);
  const [confirmation,setConfirmation]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const endpoint=`/api/admin/content-editor/${kind}/${id}`;
  useEffect(()=>{let active=true;fetch(endpoint,{cache:"no-store"}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error);if(active)setDocument(body);}).catch(e=>{if(active)setError(e.message || "تعذر تحميل المحتوى");});return()=>{active=false;};},[endpoint]);
  async function remove(){
    if(!document || confirmation.trim()!==(document.title.trim() || id))return;
    setBusy(true);setError("");
    try{
      const r=await fetch(endpoint,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:document.revision,confirmation})});
      const data=await r.json();if(!r.ok)throw new Error(data.error || "تعذر الحذف");
      onDeleted();onClose();
    }catch(e){setError(e instanceof Error?e.message:"تعذر الحذف");}finally{setBusy(false);}
  }
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent dir="rtl" className="max-w-lg p-6">
    <DialogTitle>تأكيد حذف المحتوى</DialogTitle>
    <DialogDescription className="leading-7">{kind==="campaigns"?"الحذف متاح للمشاريع التي لم تجمع تبرعات ولا ترتبط بسجلات تبرع أو اشتراك. تبقى المشاريع المدعومة محمية ويمكن أرشفتها.":kind==="categories"?"الحذف متاح للتصنيفات الخالية من المشاريع والتبرعات والاشتراكات.":"سيُحذف المقال وترجماته من الموقع. احتفظ بمحتواه إن كنت ستحتاجه لاحقًا."}</DialogDescription>
    {document?<><p className="rounded-lg bg-slate-50 p-3 font-semibold break-words">{document.title || `عنصر بلا عنوان · ${id}`}</p><label className="space-y-2 text-sm">{document.title ? "اكتب الاسم كاملًا لتأكيد الحذف" : "اكتب معرف العنصر لتأكيد الحذف"}<input autoComplete="off" disabled={busy} value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="block w-full rounded-lg border p-3" /></label></>:!error?<p role="status">تحميل النسخة الحالية…</p>:null}
    {error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
    <div className="flex justify-end gap-2"><button type="button" disabled={busy} className="rounded-lg border px-4 py-3" onClick={onClose}>إلغاء</button><button type="button" disabled={busy||!document||confirmation.trim()!==(document.title.trim() || id)} className="rounded-lg bg-red-600 px-4 py-3 text-white disabled:opacity-40" onClick={()=>void remove()}>{busy?"جار الحذف…":"تأكيد الحذف"}</button></div>
  </DialogContent></Dialog>;
}
