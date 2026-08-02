"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, Search, MessageCircle, AlertTriangle, UserX, Phone, Globe, MapPin, Heart, Inbox } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Donor = { userId: string | null; name: string | null; email: string | null; locale: string | null; country: string | null; totalDonations: number | null; lastDonationAt: string | null; whatsappOptIn: boolean; doNotContact: boolean };
type Sender = { id: string; name: string; phone: string | null };
type Conversation = { phone: string; donor: Donor | null; unresolved: boolean; handled: boolean; lastMessageAt: string | null; lastInboundText: string | null; needsReply: boolean; inboundCount: number; outboundCount: number; sender: Sender | null };
type TimelineItem = { kind: string; at: string | null; text: string | null; status: string | null };
type Detail = { phone: string; donor: Donor | null; unresolved: boolean; timeline: TimelineItem[]; sender: Sender | null };

function senderLabel(s: Sender | null) {
  if (!s) return "رقم غير محدد";
  return s.phone ? `${s.name} · ${s.phone}` : s.name;
}

type Filter = "all" | "needsReply" | "unresolved" | "handled";

const statusNote: Record<string, string> = { SENT: "تم الإرسال", SENT_TO_PROVIDER: "تم الإرسال", DELIVERED: "تم التسليم", READ: "تمت القراءة", FAILED: "فشل", BOUNCED: "فشل", REPLIED: "رد المتبرع", SKIPPED: "لم يُرسل", RENDERED: "تم التجهيز" };

function fmt(at: string | null) {
  if (!at) return "";
  try {
    return new Date(at).toLocaleString("ar", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
function displayName(d: Donor | null, phone: string) {
  return d?.name || d?.email || phone;
}

export default function InboxPage() {
  const [items, setItems] = React.useState<Conversation[]>([]);
  const [senders, setSenders] = React.useState<Sender[]>([]);
  const [senderId, setSenderId] = React.useState<string>("all");
  const [providerConfigured, setProviderConfigured] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [showDonor, setShowDonor] = React.useState(false);
  const [acting, setActing] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = senderId !== "all" ? `?senderId=${encodeURIComponent(senderId)}` : "";
      const res = await fetch(`/api/dashboard/operations/communication/inbox${qs}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      setItems(json?.conversations ?? []);
      if (json?.senders) setSenders(json.senders);
      setProviderConfigured(json?.providerConfigured ?? false);
    } finally {
      setLoading(false);
    }
  }, [senderId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openConversation = React.useCallback(async (phone: string) => {
    setSelected(phone);
    setDetailLoading(true);
    setDetail(null);
    setShowDonor(false);
    try {
      const res = await fetch(`/api/dashboard/operations/communication/inbox?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      setDetail(json?.conversation ?? null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  async function conversationAction(action: "handled" | "followup" | "link", phone: string, okMsg: string) {
    setActing(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, phone }) });
      if (!res.ok) throw new Error();
      toast.success(okMsg);
      await load();
    } catch {
      toast.error("تعذّر تنفيذ الإجراء");
    } finally {
      setActing(false);
    }
  }

  const filtered = items.filter((c) => {
    if (filter === "needsReply" && !c.needsReply) return false;
    if (filter === "unresolved" && !c.unresolved) return false;
    if (filter === "handled" && !c.handled) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${c.donor?.name ?? ""} ${c.donor?.email ?? ""} ${c.phone}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const needsReplyCount = items.filter((c) => c.needsReply).length;

  const donor = detail?.donor ?? null;
  const consent = donor?.doNotContact ? { text: "عدم التواصل", cls: "border-rose-200 bg-rose-50 text-rose-700" } : donor?.whatsappOptIn ? { text: "موافق", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" } : { text: "يحتاج مراجعة", cls: "border-amber-200 bg-amber-50 text-amber-700" };

  return (
    <main dir="rtl">
      {/* Clean header */}
      <PageHeader
        eyebrow="التواصل / المحادثات"
        title="صندوق واتساب"
        icon={Inbox}
        description={needsReplyCount > 0 ? <span className="font-bold text-amber-600">{needsReplyCount} محادثة بحاجة رد</span> : "كل المحادثات مُجاب عنها."}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث</Button>
            <Button asChild variant="outline" size="sm" className="gap-2"><Link href="/dashboard/operations/communication">العودة <ArrowLeft className="h-4 w-4" /></Link></Button>
          </>
        }
      />

      {!providerConfigured ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">مزود واتساب غير مُعد بعد. ستظهر المحادثات هنا بعد اكتمال الإعداد واستقبال الرسائل.</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr_18rem]">
        {/* ── Column 1: conversation list ── */}
        <aside className={cn("rounded-2xl border border-slate-200 bg-white", selected && "hidden lg:block")}>
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الهاتف أو البريد" className="w-full rounded-lg border border-slate-200 py-2 pr-9 pl-3 text-sm outline-none focus:border-brand" />
            </div>
            {senders.length > 0 ? (
              <select value={senderId} onChange={(e) => setSenderId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand">
                <option value="all">كل الأرقام</option>
                {senders.map((s) => <option key={s.id} value={s.id}>{senderLabel(s)}</option>)}
              </select>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {([["all", "الكل"], ["needsReply", "يحتاج رد"], ["unresolved", "غير مربوط"], ["handled", "تم التعامل"]] as [Filter, string][]).map(([f, label]) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", filter === f ? "border-brand bg-blue-50 text-brand" : "border-slate-200 text-slate-500")}>{label}</button>
              ))}
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex min-h-[12rem] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState
                variant="inline"
                icon={Inbox}
                title="لا توجد محادثات مطابقة"
                description="لا توجد محادثة تطابق البحث أو التصفية الحالية."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <li key={c.phone}>
                    <button onClick={() => openConversation(c.phone)} className={cn("flex w-full flex-col items-start gap-1 p-3 text-right hover:bg-slate-50", selected === c.phone && "bg-blue-50/60")}>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="truncate font-bold text-slate-800">{displayName(c.donor, c.phone)}</span>
                        <span className="shrink-0 text-[10px] text-slate-400">{fmt(c.lastMessageAt)}</span>
                      </div>
                      {c.donor?.email && c.donor?.name ? <span className="text-[11px] text-slate-400">{c.donor.email}</span> : null}
                      <span className="line-clamp-1 text-xs text-slate-500">{c.lastInboundText ?? "—"}</span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400"><Phone className="h-2.5 w-2.5" /> وصلت على: {senderLabel(c.sender)}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {c.donor?.locale ? <Badge variant="outline" className="border-slate-200 text-[10px] text-slate-500">{c.donor.locale}</Badge> : null}
                        {c.needsReply ? <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">يحتاج رد</Badge> : null}
                        {c.unresolved ? <span className="flex items-center gap-0.5 text-[10px] text-amber-600"><UserX className="h-3 w-3" /> غير مربوط</span> : null}
                        {c.handled ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">تم التعامل</Badge> : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* ── Column 2: timeline ── */}
        <section className={cn("rounded-2xl border border-slate-200 bg-white", !selected && "hidden lg:block")}>
          {!selected ? (
            <div className="flex min-h-[24rem] flex-col items-center justify-center gap-2 text-sm text-slate-400"><MessageCircle className="h-6 w-6" /> اختر محادثة لعرضها</div>
          ) : detailLoading ? (
            <div className="flex min-h-[24rem] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
          ) : !detail ? (
            <div className="p-8 text-center text-sm text-slate-500">تعذّر تحميل المحادثة.</div>
          ) : (
            <div className="flex h-full flex-col">
              {/* mobile back + header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3">
                <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-slate-500 lg:hidden"><ArrowRight className="h-4 w-4" /> رجوع</button>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800">{displayName(detail.donor, detail.phone)}</p>
                  {detail.unresolved ? <span className="text-[11px] text-amber-600">متبرع غير محدد</span> : null}
                </div>
                <button onClick={() => setShowDonor((v) => !v)} className="text-xs font-bold text-brand lg:hidden">التفاصيل</button>
              </div>

              {/* mobile donor drawer */}
              {showDonor ? <div className="border-b border-slate-100 lg:hidden"><DonorPanel donor={donor} phone={detail.phone} sender={detail.sender} consent={consent} unresolved={detail.unresolved} acting={acting} onAction={conversationAction} /></div> : null}

              {/* timeline */}
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {detail.timeline.length === 0 ? (
                  <EmptyState
                    variant="inline"
                    icon={MessageCircle}
                    title="لا توجد رسائل بعد"
                    description="لم تُتبادل أي رسالة في هذه المحادثة حتى الآن."
                  />
                ) : detail.timeline.map((t, i) => (
                  t.kind === "status" ? (
                    <div key={i} className="text-center text-[11px] text-slate-400">{statusNote[t.status ?? ""] ?? "تحديث"}{t.at ? ` · ${fmt(t.at)}` : ""}</div>
                  ) : (
                    <div key={i} className={cn("max-w-[78%] rounded-2xl px-3 py-2 text-sm", t.kind === "inbound" ? "ml-auto bg-slate-100 text-slate-800" : "mr-auto bg-blue-50 text-slate-800")}>
                      <p className="whitespace-pre-wrap leading-6">{t.text ?? "—"}</p>
                      {t.at ? <div className="mt-0.5 text-[10px] text-slate-400">{fmt(t.at)}</div> : null}
                    </div>
                  )
                ))}
              </div>

              {/* reply area */}
              <div className="border-t border-slate-100 p-3">
                {!providerConfigured ? (
                  <input disabled placeholder="الرد المباشر غير مفعّل حتى تكتمل إعدادات واتساب." className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400" />
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    <span>الرد يتم عبر قالب معتمد حاليًا.</span>
                    <Button size="sm" variant="outline" disabled>رد بقالب</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── Column 3: donor panel (desktop) ── */}
        <aside className={cn("hidden rounded-2xl border border-slate-200 bg-white lg:block", !selected && "lg:hidden xl:block xl:opacity-60")}>
          {detail ? <DonorPanel donor={donor} phone={detail.phone} sender={detail.sender} consent={consent} unresolved={detail.unresolved} acting={acting} onAction={conversationAction} /> : <div className="flex min-h-[24rem] items-center justify-center p-4 text-center text-xs text-slate-400">تفاصيل المتبرع تظهر عند اختيار محادثة</div>}
        </aside>
      </div>
    </main>
  );
}

function DonorPanel({
  donor,
  phone,
  sender,
  consent,
  unresolved,
  acting,
  onAction,
}: {
  donor: Donor | null;
  phone: string;
  sender: Sender | null;
  consent: { text: string; cls: string };
  unresolved: boolean;
  acting: boolean;
  onAction: (action: "handled" | "followup" | "link", phone: string, okMsg: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-black text-slate-900">{donor?.name || donor?.email || "متبرع غير محدد"}</p>
        {unresolved ? <Badge variant="outline" className="mt-1 border-amber-200 bg-amber-50 text-amber-700"><AlertTriangle className="ml-1 h-3 w-3" /> غير مربوط بمتبرع</Badge> : <Badge variant="outline" className="mt-1 border-emerald-200 bg-emerald-50 text-emerald-700">متبرع مطابق</Badge>}
      </div>

      <dl className="space-y-2 text-sm">
        <Info icon={<MessageCircle className="h-4 w-4" />} label="وصلت على" value={senderLabel(sender)} />
        <Info label="القناة" value="واتساب" />
        <Info icon={<Phone className="h-4 w-4" />} label="الهاتف" value={phone} />
        <Info icon={<Globe className="h-4 w-4" />} label="اللغة" value={donor?.locale ?? "—"} />
        <Info icon={<MapPin className="h-4 w-4" />} label="الدولة" value={donor?.country ?? "—"} />
        <Info icon={<Heart className="h-4 w-4" />} label="عدد التبرعات" value={String(donor?.totalDonations ?? 0)} />
        <Info label="آخر تبرع" value={donor?.lastDonationAt ? new Date(donor.lastDonationAt).toLocaleDateString("ar") : "—"} />
        <div className="flex items-center justify-between">
          <span className="text-slate-500">موافقة واتساب</span>
          <Badge variant="outline" className={consent.cls}>{consent.text}</Badge>
        </div>
      </dl>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        {unresolved ? (
          <Button size="sm" variant="outline" className="w-full" disabled={acting} onClick={() => onAction("link", phone, "تم تسجيل طلب الربط بمتبرع")}>ربط بمتبرع</Button>
        ) : null}
        <Button size="sm" variant="outline" className="w-full" disabled={acting} onClick={() => onAction("followup", phone, "تم تسجيل طلب مهمة متابعة")}>إنشاء مهمة متابعة</Button>
        <Button size="sm" className="w-full" disabled={acting} onClick={() => onAction("handled", phone, "تم وضع علامة: تم التعامل")}>تم التعامل</Button>
        {donor?.userId ? <Button asChild size="sm" variant="ghost" className="w-full text-slate-500"><Link href="/dashboard/users/donors">فتح ملف المتبرع</Link></Button> : null}
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-slate-500">{icon}{label}</span>
      <span className="truncate font-semibold text-slate-800">{value}</span>
    </div>
  );
}
