"use client";

import { useCallback, useEffect, useState } from "react";

type ServiceRequest = {
  id: string; kind: string; status: string; donorId: string; donorName: string;
  subscriptionId: string; currency: string; requestedAmount: number | null;
  createdAt: string; updatedAt: string; note: string; staffNote?: string | null;
  resolutionNote?: string | null; canComplete: boolean;
  plan?: { status: string; amount: number; currency: string } | null;
};
type Result = { requests: ServiceRequest[]; openCount: number; pagination: { page: number; pages: number; total: number } };
const STATUS = ["OPEN", "NEW", "IN_PROGRESS", "COMPLETED", "REJECTED", "WITHDRAWN"];
const kindName: Record<string,string> = { AMOUNT_CHANGE: "تغيير مبلغ", PAUSE: "إيقاف مؤقت", CANCEL: "إلغاء" };
const control = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
export function SubscriptionRequestsQueue({ released }: { released: boolean }) {
  const [data, setData] = useState<Result | null>(null);
  const [status, setStatus] = useState("OPEN");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [staffNote, setStaffNote] = useState<Record<string,string>>({});
  const [resolutionNote, setResolutionNote] = useState<Record<string,string>>({});
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!released) return;
    setLoading(true);setError("");
    try {
      const res = await fetch("/api/admin/subscription-requests?" + new URLSearchParams({ status, page: String(page) }), {cache:"no-store",signal});
      if(!res.ok) throw new Error("تعذر تحميل طلبات الاشتراكات");
      const body = await res.json() as Result;
      if(!signal?.aborted) setData(body);
    } catch { if(!signal?.aborted) setError("تعذر تحميل الطلبات. أعد المحاولة."); }
    finally { if(!signal?.aborted) setLoading(false); }
  }, [page,released,status]);
  useEffect(() => {const abort = new AbortController();void load(abort.signal);return ()=>abort.abort()},[load]);
  async function update(row:ServiceRequest, next:"IN_PROGRESS"|"COMPLETED"|"REJECTED"){
    if(!released||saving||!window.confirm("هل تريد اعتماد هذا التحديث على طلب المتبرع؟"))return;
    if(next==="COMPLETED"&&!row.canComplete){setError("نفّذ إجراء الاشتراك المطلوب أولًا، ثم أكد الطلب.");return}
    setSaving(row.id);setError("");
    try{
      const res = await fetch("/api/admin/subscription-requests",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        id:row.id,status:next,updatedAt:row.updatedAt,staffNote:staffNote[row.id]??"",resolutionNote:resolutionNote[row.id]??""
      })});
      if(!res.ok) throw new Error(res.status===409?"تغيّر الطلب. أعد التحميل.":"تعذر تسجيل الرد. تأكد من الملاحظات والصلاحيات.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"تعذر تحديث الطلب")}
    finally{setSaving("")}
  }
  if(!released)return <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
    <h2 className="font-bold">طلبات إدارة الاشتراكات: غير مفعلة بعد</h2>
    <p className="mt-2 text-sm">تجهيز النظام منفصل عن تحصيل التبرعات. لن تُعرض طلبات أو تُرسل إشعارات أو تُغير اشتراكات قبل اكتمال اختبارات الهوية والتزامن والبوابة.</p>
  </div>;
  return <div dir="rtl" className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="requests-status">حالة الطلب</label>
      <select id="requests-status" className={control} value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}>
        {STATUS.map(s=><option key={s} value={s}>{s==="OPEN"?"قيد المتابعة":s}</option>)}
      </select>
      <button className={control} type="button" onClick={()=>void load()} disabled={loading}>تحديث</button>
      {data&&<span className="text-sm text-slate-500">طلبات مفتوحة: {data.openCount}</span>}
    </div>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    {loading&&<p role="status">جار تحميل الطلبات...</p>}
    {data?.requests.length===0&&<p className="rounded-xl border p-6">لا توجد طلبات لهذه الحالة.</p>}
    {data?.requests.map(row=><article key={row.id} className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-3">
        <div><h3 className="font-bold">{kindName[row.kind]??row.kind} · {row.donorName||"متبرع"}</h3>
          <p className="text-xs text-slate-600">الطلب: {row.id} · الاشتراك: {row.subscriptionId}</p>
        </div>
        <span className="text-sm">{row.status}</span>
      </div>
      <p className="text-sm">المبلغ المطلوب: {row.requestedAmount??"—"} {row.currency}</p>
      <p className="text-sm">ملاحظة المتبرع: {row.note}</p>
      {row.plan&&<p className="text-sm">الحالة الفعلية للاشتراك: {row.plan.status} · {row.plan.amount} {row.plan.currency}</p>}
      <label className="block text-sm">ملاحظة الموظف
        <textarea className={control+" mt-1 w-full"} value={staffNote[row.id]??row.staffNote??""} onChange={e=>setStaffNote(p=>({...p,[row.id]:e.target.value}))}/>
      </label>
      <label className="block text-sm">الرد النهائي للمتبرع
        <textarea className={control+" mt-1 w-full"} value={resolutionNote[row.id]??row.resolutionNote??""} onChange={e=>setResolutionNote(p=>({...p,[row.id]:e.target.value}))}/>
      </label>
      {["NEW","IN_PROGRESS"].includes(row.status)&&<div className="flex flex-wrap gap-2">
        <button className={control} disabled={!!saving} onClick={()=>void update(row,"IN_PROGRESS")}>بدء المتابعة</button>
        <button className={control} disabled={!!saving||!row.canComplete} onClick={()=>void update(row,"COMPLETED")}>تأكيد التنفيذ</button>
        <button className={control} disabled={!!saving} onClick={()=>void update(row,"REJECTED")}>تعذر التنفيذ</button>
      </div>}
    </article>)}
    {!!data&&data.pagination.pages>1&&<div className="flex items-center gap-3">
      <button className={control} disabled={page<=1||loading} onClick={()=>setPage(x=>x-1)}>السابق</button>
      <span>صفحة {page} من {data.pagination.pages}</span>
      <button className={control} disabled={page>=data.pagination.pages||loading} onClick={()=>setPage(x=>x+1)}>التالي</button>
    </div>}
  </div>;
}
