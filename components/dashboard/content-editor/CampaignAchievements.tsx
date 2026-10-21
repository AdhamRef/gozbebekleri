"use client";
import { useRef } from "react";
import { ImageUploadField } from "@/app/(dashboard)/dashboard/_components/ImageUploadField";
import { rows, type ContentRecord } from "@/lib/content-editor/contracts";
import { LOCALES } from "@/lib/locales";
export function CampaignAchievements({value,locale,onChange,onUploadingChange,uploading}:{value:unknown;locale:string;onChange:(value:ContentRecord[])=>void;onUploadingChange:(uploading:boolean)=>void;uploading:boolean}){
  const updates=rows(value);
  const sequence=useRef(0);
  const latest=useRef(updates);latest.current=updates;
  const change=(index:number,key:string,value:string)=>onChange(latest.current.map((row,i)=>{
    if(i!==index)return row;
    if(locale==="ar"||["image","videoUrl"].includes(key))return {...row,[key]:value};
    const translations=rows(row.translations), existing=translations.find(t=>t.locale===locale)||{locale,title:"",description:""};
    return {...row,translations:[...translations.filter(t=>t.locale!==locale),{...existing,[key]:value}]};
  }));
  return <section className="space-y-4 rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-bold">إنجازات المشروع · {LOCALES[locale as keyof typeof LOCALES]?.nativeLabel}</h3><button type="button" disabled={uploading || updates.length >= 200} className="rounded border px-3 py-2 text-sm" onClick={()=>onChange([...updates,{clientKey:`achievement-${Date.now()}-${++sequence.current}`,title:"",description:"",image:"",videoUrl:"",translations:[]}])}>إضافة إنجاز</button></div>
    <p className="text-xs leading-6 text-slate-500">استخدم شريط اللغات أعلى الصفحة لتحرير ترجمات كل إنجاز. إضافة الإنجازات وتعديلها وحذفها تُعتمد مع زر حفظ التغييرات العلوي.</p>
    {updates.map((row,index)=>{const text=locale==="ar"?row:rows(row.translations).find(t=>t.locale===locale)||{};return <article className="space-y-3 rounded-xl border p-4" key={String(row.id||row.clientKey||`new-${index}`)}><div className="flex justify-between"><b>إنجاز {index+1}</b><button type="button" disabled={uploading} className="text-sm text-red-700" onClick={()=>{if(window.confirm("حذف هذا الإنجاز وترجماته عند حفظ التغييرات؟"))onChange(updates.filter((_,i)=>i!==index));}}>حذف الإنجاز</button></div>
      {[["title","عنوان الإنجاز"],["description","وصف الإنجاز"]].map(([key,label])=><label key={key} className="block space-y-1"><span>{label}</span><textarea aria-label={`${label} ${index+1}`} dir={LOCALES[locale as keyof typeof LOCALES]?.direction||"ltr"} className="min-h-20 w-full rounded border p-3" value={String(text[key]||"")} onChange={e=>change(index,key,e.target.value)}/></label>)}
      <ImageUploadField label={`صورة الإنجاز ${index+1}`} value={String(row.image||"")} onChange={image=>change(index,"image",image)} onUploadingChange={onUploadingChange}/>
      <label className="block">رابط فيديو الإنجاز<input aria-label={`فيديو الإنجاز ${index+1}`} className="w-full rounded border p-3" dir="ltr" value={String(row.videoUrl||"")} onChange={e=>change(index,"videoUrl",e.target.value)}/></label>
    </article>;})}
    {!updates.length?<p className="text-sm text-slate-500">لا توجد إنجازات. يمكنك إضافتها من هنا.</p>:null}
  </section>;
}
