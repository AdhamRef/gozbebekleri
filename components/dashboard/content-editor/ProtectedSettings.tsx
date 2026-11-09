"use client";
import { useState } from "react";
import { RELIGIOUS_CONFIRMATION, SLUG_CONFIRMATION } from "@/lib/content-editor/advanced-settings";
import type { ContentRecord } from "@/lib/content-editor/contracts";

function ConfirmedField({label, saved, pending, phrase, property, onChange, multiline=false}: {label:string;saved:string;pending:unknown;phrase:string;property:string;onChange:(value:unknown)=>void;multiline?:boolean}) {
  const operation = pending && typeof pending === "object" ? pending as ContentRecord : {};
  const [open,setOpen]=useState(Boolean(pending));
  const [confirmation,setConfirmation]=useState("");
  const props={className:"w-full rounded-lg border bg-white p-3 text-sm", value:String(operation[property]??saved), onChange:(event:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>onChange({[property]:event.target.value,confirmation:phrase})};
  return <section className="space-y-3 rounded-xl border bg-white p-5"><h3 className="font-bold">{label}</h3>
    {multiline?<p lang="ar" dir="rtl" className="text-xl leading-10">{saved || "لم يُضف نص بعد"}</p>:<p dir="ltr" className="break-all text-sm">{saved}</p>}
    <p className="text-xs leading-6 text-slate-500">{multiline?"يبقى النص العربي محفوظًا، ولا يُرسل للترجمة الآلية. التعديل اليدوي فقط بعد التأكيد والحفظ.":"تغيير الرابط قد يغيّر عنوان الصفحة المنشور. راجع الروابط الخارجية قبل اعتماد التغيير."}</p>
    {!open?<><label className="block space-y-2"><span className="text-sm">اكتب: {phrase}</span><input aria-label={`تأكيد ${label}`} className="w-full rounded border p-3" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><button type="button" className="rounded border px-3 py-2 text-sm disabled:opacity-40" disabled={confirmation.trim()!==phrase} onClick={()=>setOpen(true)}>فتح {label} للتعديل</button></>:<><label className="block"><span className="text-sm">{label} الجديد</span>{multiline?<textarea {...props} aria-label={`${label} الجديد`} dir="rtl" rows={5}/>:<input {...props} aria-label={`${label} الجديد`} dir="ltr"/>}</label><button type="button" className="rounded border px-3 py-2 text-sm" onClick={()=>{onChange(undefined);setOpen(false);setConfirmation("");}}>إلغاء تعديل {label}</button></>}
  </section>;
}
export function ProtectedSettings({kind,slug,settings,saved,onChange}:{kind:string;slug:string;settings:ContentRecord;saved:ContentRecord;onChange:(key:string,value:unknown)=>void}){
  return <div className="space-y-4">{kind==="super-categories"?<ConfirmedField key={`verse-${String(saved.verseArabic)}`} label="النص العربي" multiline saved={String(saved.verseArabic||"")} pending={settings.religiousTextAdjustment} phrase={RELIGIOUS_CONFIRMATION} property="text" onChange={value=>onChange("religiousTextAdjustment",value)}/>:null}
    <ConfirmedField key={`slug-${slug}`} label="الرابط المختصر" saved={slug} pending={settings.slugAdjustment} phrase={SLUG_CONFIRMATION} property="slug" onChange={value=>onChange("slugAdjustment",value)}/>
  </div>;
}
