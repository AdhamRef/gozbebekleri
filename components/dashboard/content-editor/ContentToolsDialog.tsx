"use client";
import { useState } from "react";
import { Languages } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TranslationOverview } from "./TranslationOverview";
import { ContentLocalizationAuditCard } from "@/app/(dashboard)/dashboard/_components/ContentLocalizationAuditCard";

export function ContentToolsDialog({kind,scopeIds}:{kind:"campaigns"|"categories"|"blog"|"super-categories";scopeIds?:string[]}){
  const [open,setOpen]=useState(false);
  return <div className="mb-4 flex justify-end">
    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-brand hover:text-brand" onClick={()=>setOpen(true)}><Languages size={17}/>الترجمات وجودة المحتوى</button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent dir="rtl" className="max-h-[90vh] w-[95vw] max-w-6xl overflow-y-auto p-5 sm:p-7">
      <DialogTitle>الترجمات وجودة المحتوى</DialogTitle>
      <DialogDescription>راجع حالة اللغات والنصوص هنا. لتحرير عنصر بعينه، افتح محرره من القائمة.</DialogDescription>
      {open?<div className="space-y-5 pt-3"><TranslationOverview kind={kind} scopeIds={scopeIds}/>{kind!=="super-categories"?<details className="rounded-xl border bg-slate-50 p-4"><summary className="cursor-pointer py-2 text-sm font-semibold">الفحص التفصيلي ومعاينة الترجمات الناقصة</summary><div className="pt-4"><ContentLocalizationAuditCard section={kind}/></div></details>:null}</div>:null}
    </DialogContent></Dialog>
  </div>;
}
