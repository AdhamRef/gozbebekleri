"use client";
import { useEffect, useRef, useState } from "react";
import { LOCALES, SUPPORTED_LOCALES } from "@/lib/locales";
import { SUPPORTED_CURRENCY_OPTIONS } from "@/lib/supported-currencies";
import { FINANCE_CONFIRMATION } from "@/lib/content-editor/advanced-settings";
import { DEFAULT_SUGGESTED_TEAM_SUPPORT_AMOUNTS } from "@/lib/campaign/suggested-team-support";
import type { ContentRecord } from "@/lib/content-editor/contracts";
const inputClass="w-full rounded-lg border bg-white p-2 text-sm";
const buttonClass="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-40";
const object=(value:unknown):ContentRecord=>value&&typeof value==="object"&&!Array.isArray(value)?value as ContentRecord:{};
function Numbers({label,value,onChange,integer=false}:{label:string;value:unknown;onChange:(value:number[])=>void;integer?:boolean}){
  const format=(value:unknown)=>Array.isArray(value)?value.join(", "):"";
  const [text,setText]=useState(()=>format(value));
  const emitted=useRef(JSON.stringify(value));
  useEffect(()=>{if(JSON.stringify(value)!==emitted.current){setText(format(value));emitted.current=JSON.stringify(value);}},[value]);
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>
    <input aria-label={label} dir="ltr" className={inputClass} value={text} onChange={event=>{
      setText(event.target.value);
      const next=event.target.value.split(/[,،\s]+/).filter(Boolean).map(Number);
      emitted.current=JSON.stringify(next);onChange(next);
    }}/><small className="block text-slate-500">حتى 12 قيمة موجبة{integer?" صحيحة":""}، مفصولة بفاصلة. لا تُحفظ حتى تضغط حفظ التغييرات.</small></label>;
}
function CurrencyOverrides({value,onChange,prices=false}:{value:unknown;onChange:(value:ContentRecord)=>void;prices?:boolean}){
  const map=object(value), [currency,setCurrency]=useState("USD");
  return <div className="space-y-3"><h4 className="font-semibold">{prices?"سعر السهم المخصص حسب العملة":"مبالغ مخصصة حسب العملة"}</h4>
    {Object.entries(map).map(([code,amounts])=><div key={code} className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between"><b dir="ltr">{code}</b><button type="button" className={buttonClass} onClick={()=>{const next={...map};delete next[code];onChange(next);}}>إزالة تخصيص {code}</button></div>
      {prices?<label className="block">سعر السهم {code}<input aria-label={`سعر السهم ${code}`} className={inputClass} dir="ltr" type="number" min="0.01" step="any" value={String(amounts??"")} onChange={e=>onChange({...map,[code]:e.target.value===""?null:Number(e.target.value)})}/></label>:<Numbers label={`المبالغ ${code}`} value={amounts} onChange={next=>onChange({...map,[code]:next})}/>}
    </div>)}
    <div className="flex gap-2"><select aria-label="عملة التخصيص" className={inputClass} value={currency} onChange={e=>setCurrency(e.target.value)}>{SUPPORTED_CURRENCY_OPTIONS.map(c=><option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select>
      <button type="button" className={buttonClass} disabled={currency in map} onClick={()=>onChange({...map,[currency]:prices?1:[10,25,50]})}>إضافة عملة</button></div>
    <p className="text-xs text-slate-500">عند غياب تخصيص للعملة، تُستخدم القيم الافتراضية. لا يُغيّر هذا أسعار الصرف.</p>
  </div>;
}
export function CampaignAdvancedSettings({settings,saved,onChange}:{settings:ContentRecord;saved:ContentRecord;onChange:(key:string,value:unknown)=>void}){
  const [financeOpen,setFinanceOpen]=useState(Boolean(settings.financialAdjustment));
  const [confirmation,setConfirmation]=useState("");
  const donation=object(settings.suggestedDonations), shares=object(settings.suggestedShareCounts), team=object(settings.suggestedTeamSupport),labels=object(settings.shareLabels);
  const amount=Number(saved.currentAmount||0), adjustment=object(settings.financialAdjustment);
  return <div className="space-y-5">
    {settings.fundraisingMode!=="SHARES"?<section className="space-y-4 rounded-xl border bg-white p-5"><h3 className="font-bold">مبالغ التبرع المقترحة</h3>
      <Numbers label="المبالغ الافتراضية لجميع العملات" value={donation.amounts} onChange={amounts=>onChange("suggestedDonations",{...donation,amounts})}/>
      <CurrencyOverrides value={donation.byCurrency} onChange={byCurrency=>onChange("suggestedDonations",{...donation,byCurrency})}/>
    </section>:<><section className="space-y-4 rounded-xl border bg-white p-5"><h3 className="font-bold">إعدادات الأسهم حسب العملة</h3>
      <Numbers integer label="أعداد الأسهم المقترحة" value={shares.counts} onChange={counts=>onChange("suggestedShareCounts",{...shares,counts})}/>
      <CurrencyOverrides prices value={shares.priceByCurrency} onChange={priceByCurrency=>onChange("suggestedShareCounts",{...shares,priceByCurrency})}/>
    </section><section className="space-y-3 rounded-xl border bg-white p-5"><h3 className="font-bold">تسمية الوحدة بجميع اللغات</h3><p className="text-xs text-slate-500">اترك المفرد والجمع فارغين لاستخدام تسمية سهم/أسهم الافتراضية.</p>
      {SUPPORTED_LOCALES.map(locale=>{const entry=object(labels[locale]);return <fieldset className="grid gap-2 rounded border p-3 sm:grid-cols-2" key={locale}><legend>{LOCALES[locale].nativeLabel}</legend>
        {[["singular","المفرد"],["plural","الجمع"]].map(([key,label])=><label key={key}>{label}<input aria-label={`${label} · ${locale}`} className={inputClass} dir={LOCALES[locale].direction} maxLength={100} value={String(entry[key]||"")} onChange={e=>onChange("shareLabels",{...labels,[locale]:{singular:"",plural:"",...entry,[key]:e.target.value}})}/></label>)}
      </fieldset>;})}
    </section></>}
    <section className="space-y-4 rounded-xl border bg-white p-5"><h3 className="font-bold">دعم فريق العمل</h3>
      <label className="flex gap-2"><input type="checkbox" checked={settings.suggestedTeamSupport!=null} onChange={e=>onChange("suggestedTeamSupport",e.target.checked?{amounts:[...DEFAULT_SUGGESTED_TEAM_SUPPORT_AMOUNTS],byCurrency:{}}:null)}/>تخصيص دعم الفريق لهذا المشروع</label>
      {settings.suggestedTeamSupport!=null?<><Numbers label="مبالغ دعم الفريق الافتراضية" value={team.amounts} onChange={amounts=>onChange("suggestedTeamSupport",{...team,amounts})}/><CurrencyOverrides value={team.byCurrency} onChange={byCurrency=>onChange("suggestedTeamSupport",{...team,byCurrency})}/></>:<p className="text-sm text-slate-500">تُستخدم إعدادات دعم الفريق العامة. خيار «لا شكرًا» يظل متاحًا للمتبرع.</p>}
    </section>
    <section className="space-y-3 rounded-xl border border-amber-200 bg-white p-5"><h3 className="font-bold">المبلغ المحصّل</h3><p dir="ltr" className="text-2xl font-bold">${amount.toLocaleString("en-US")}</p>
      <p className="text-xs leading-6 text-slate-600">التعديل اليدوي يحدّث الرصيد الخارجي مع الحفاظ على التبرعات المؤكدة. لا يمكن تخفيض الإجمالي دون مجموع التبرعات المؤكدة. يُسجّل التعديل في سجل التدقيق، ولا يُطبق حتى الحفظ.</p>
      {!financeOpen?<div className="space-y-2"><label className="block">لتعديل الإجمالي اكتب: {FINANCE_CONFIRMATION}<input aria-label="تأكيد تعديل المبلغ" className={inputClass} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><button type="button" className={buttonClass} disabled={confirmation.trim()!==FINANCE_CONFIRMATION} onClick={()=>setFinanceOpen(true)}>فتح المبلغ للتعديل</button></div>:<><label className="block">الإجمالي المطلوب بالدولار<input aria-label="الإجمالي المطلوب بالدولار" className={inputClass} dir="ltr" type="number" min="0" step="any" value={String(adjustment.desiredTotal??amount)} onChange={e=>onChange("financialAdjustment",{desiredTotal:e.target.value===""?null:Number(e.target.value),confirmation:FINANCE_CONFIRMATION})}/></label><button type="button" className={buttonClass} onClick={()=>{onChange("financialAdjustment",undefined);setFinanceOpen(false);setConfirmation("");}}>إلغاء تعديل المبلغ</button></>}
    </section>
  </div>;
}
