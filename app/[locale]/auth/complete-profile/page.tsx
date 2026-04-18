"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Loader2, Phone, Calendar, Users, ArrowRight, CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useIpCountry } from "@/hooks/useIpCountry";

// ── Localised month names ─────────────────────────────────────────────────────
const MONTH_LABELS: Record<string, string[]> = {
  ar: ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  fr: ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"],
  tr: ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"],
  es: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
  pt: ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],
  id: ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"],
};

function daysInMonth(month: number, year: number) {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

const LOGO_URL = "https://i.ibb.co/Y4RZj4cs/output-onlinepngtools.png";

// ── Chevron icon ──────────────────────────────────────────────────────────────
function ChevronDown() {
  return (
    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CompleteProfilePage() {
  const { data: session, status } = useSession();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const t            = useTranslations("CompleteProfile");
  const tD           = useTranslations("SignInDialog");
  const locale       = useLocale();
  const isRTL        = locale === "ar";
  const ipCountry    = useIpCountry();

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // ── Form state ────────────────────────────────────────────────────────────
  const [phone,    setPhone]    = useState("");
  const [dobDay,   setDobDay]   = useState<number | "">("");
  const [dobMonth, setDobMonth] = useState<number | "">("");
  const [dobYear,  setDobYear]  = useState<number | "">("");
  const [gender,   setGender]   = useState("");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Date helpers ──────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const years  = useMemo(() => Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i), [currentYear]);
  const maxDay = useMemo(() => daysInMonth(dobMonth === "" ? 0 : +dobMonth, dobYear === "" ? 0 : +dobYear), [dobMonth, dobYear]);
  const days   = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);
  const months = MONTH_LABELS[locale] ?? MONTH_LABELS.en;
  useEffect(() => { if (dobDay !== "" && +dobDay > maxDay) setDobDay(maxDay); }, [maxDay, dobDay]);

  // ── Load existing profile ─────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") { router.replace(`/${locale}/auth/signin`); return; }
    if (status !== "authenticated") return;
    fetch(`/api/users/${session.user.id}`)
      .then((r) => r.json())
      .then((data) => {
        const u = data.user;
        if (u?.birthdate && u?.gender && u?.phone) { router.replace(callbackUrl); return; }
        if (u?.phone)     setPhone(u.phone);
        if (u?.gender)    setGender(u.gender);
        if (u?.birthdate) {
          const [y, m, d] = String(u.birthdate).split("-").map(Number);
          if (y) setDobYear(y); if (m) setDobMonth(m); if (d) setDobDay(d);
        }
        setPageLoading(false);
      })
      .catch(() => setPageLoading(false));
  }, [status, session, callbackUrl, locale, router]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!phone.trim() || !dobDay || !dobMonth || !dobYear || !gender) {
      setError(t("fillAllFields")); return;
    }
    setSaving(true); setError(null);
    const birthdate = `${dobYear}-${String(+dobMonth).padStart(2,"0")}-${String(+dobDay).padStart(2,"0")}`;
    try {
      const res = await fetch(`/api/users/${session!.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), birthdate, gender }),
      });
      if (!res.ok) throw new Error();
      router.replace(callbackUrl);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (pageLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50/40">
        <div className="flex flex-col items-center gap-3">
          <Image src={LOGO_URL} alt="Logo" width={48} height={48} className="h-12 w-auto object-contain opacity-60" />
          <Loader2 className="w-6 h-6 animate-spin text-[#025EB8]" />
        </div>
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  const userImage = session?.user?.image;

  const isAr = locale === "ar";
  const greeting = isAr ? `أهلاً${firstName ? `، ${firstName}` : ""}!` : `Hi${firstName ? `, ${firstName}` : ""}!`;

  // Select base class
  const selCls = (filled: boolean) =>
    `w-full border rounded-2xl py-3 px-3.5 text-sm outline-none appearance-none cursor-pointer transition-all bg-white
     focus:border-[#025EB8] focus:ring-2 focus:ring-[#025EB8]/10
     ${filled ? "text-gray-800 border-[#025EB8]/40 bg-blue-50/30" : "text-gray-400 border-gray-200 hover:border-gray-300"}`;

  // Completion score for the mini progress bar
  const filled = [phone, dobDay, dobMonth, dobYear, gender].filter(Boolean).length;
  const pct = Math.round((filled / 5) * 100);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50/40 p-4 py-10"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ── Decorative blobs ────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#025EB8]/6 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#FA5D17]/6 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* ── Logo above card ─────────────────────────────────────────────── */}
        <div className="flex justify-center mb-6">
          <Image src={LOGO_URL} alt="Logo" width={56} height={56} className="h-12 w-auto object-contain" />
        </div>

        {/* ── Card ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/70 border border-gray-100/80 overflow-hidden">

          {/* Rainbow accent top bar */}
          <div className="h-1 bg-gradient-to-r from-[#025EB8] via-[#1e7fea] to-[#FA5D17]" />

          {/* ── Card header ────────────────────────────────────────────────── */}
          <div className="px-7 pt-7 pb-6 text-center">
            {/* Avatar */}
            <div className="relative inline-flex mb-4">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt={session?.user?.name ?? ""}
                  className="w-[72px] h-[72px] rounded-full ring-4 ring-white shadow-md object-cover"
                />
              ) : (
                <div className="w-[72px] h-[72px] rounded-full bg-[#025EB8]/10 ring-4 ring-white shadow-md flex items-center justify-center">
                  <Users className="w-8 h-8 text-[#025EB8]" />
                </div>
              )}
              {/* Google badge */}
              <div className="absolute -bottom-1 -end-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow ring-2 ring-white">
                <Image src="/google.svg" alt="Google" width={16} height={16} />
              </div>
            </div>

            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{greeting}</h1>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">{t("subtitle")}</p>

            {/* Live progress bar */}
            <div className="mt-5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
                <span>{t("progress") ?? "Profile completion"}</span>
                <span className={pct === 100 ? "text-green-500" : "text-[#025EB8]"}>{pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#025EB8] to-[#FA5D17]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Divider ────────────────────────────────────────────────────── */}
          <div className="mx-7 h-px bg-gray-100" />

          {/* ── Form body ──────────────────────────────────────────────────── */}
          <div className="px-7 py-6 space-y-6">

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
                <span className="shrink-0 w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-red-500 font-bold text-xs">!</span>
                {error}
              </div>
            )}

            {/* ── Phone ──────────────────────────────────────────────────── */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#025EB8]/10 flex items-center justify-center shrink-0">
                  <Phone className="w-3 h-3 text-[#025EB8]" />
                </div>
                <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide">
                  {t("phoneLabel")}
                </label>
                {phone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ms-auto" />}
              </div>
              <div className="overflow-visible phone-input-wrapper">
                <PhoneInput
                  defaultCountry={ipCountry}
                  value={phone}
                  onChange={setPhone}
                  className="w-full overflow-visible"
                  inputClassName="w-full min-w-0 rounded-2xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#025EB8] focus:ring-2 focus:ring-[#025EB8]/10 transition-all hover:border-gray-300"
                />
              </div>
            </div>

            {/* ── Date of Birth ───────────────────────────────────────────── */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#025EB8]/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-3 h-3 text-[#025EB8]" />
                </div>
                <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide">
                  {tD("dateOfBirthLabel")}
                </label>
                {dobDay && dobMonth && dobYear && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ms-auto" />}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Day */}
                <div className="relative">
                  <select value={dobDay} onChange={(e) => setDobDay(e.target.value === "" ? "" : +e.target.value)} className={selCls(dobDay !== "")}>
                    <option value="">{t("dobDayPlaceholder")}</option>
                    {days.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center"><ChevronDown /></div>
                </div>
                {/* Month */}
                <div className="relative">
                  <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value === "" ? "" : +e.target.value)} className={selCls(dobMonth !== "")}>
                    <option value="">{t("dobMonthPlaceholder")}</option>
                    {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center"><ChevronDown /></div>
                </div>
                {/* Year */}
                <div className="relative">
                  <select value={dobYear} onChange={(e) => setDobYear(e.target.value === "" ? "" : +e.target.value)} className={selCls(dobYear !== "")}>
                    <option value="">{t("dobYearPlaceholder")}</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center"><ChevronDown /></div>
                </div>
              </div>
            </div>

            {/* ── Gender ──────────────────────────────────────────────────── */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#025EB8]/10 flex items-center justify-center shrink-0">
                  <Users className="w-3 h-3 text-[#025EB8]" />
                </div>
                <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wide">
                  {tD("genderLabel")}
                </label>
                {gender && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ms-auto" />}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "male",           emoji: "♂",  label: tD("genderMale") },
                  { key: "female",         emoji: "♀",  label: tD("genderFemale") },
                  { key: "preferNotToSay", emoji: "—",  label: tD("genderPreferNotToSay") },
                ] as const).map(({ key, emoji, label }) => {
                  const active = gender === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setGender(key)}
                      className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl border-2 text-center transition-all duration-150 ${
                        active
                          ? "border-[#025EB8] bg-[#025EB8] text-white shadow-md shadow-[#025EB8]/20 scale-[1.02]"
                          : "border-gray-200 bg-white text-gray-500 hover:border-[#025EB8]/40 hover:bg-blue-50/40 hover:text-[#025EB8]"
                      }`}
                    >
                      <span className={`text-xl leading-none ${active ? "text-white" : "text-gray-400"}`}>{emoji}</span>
                      <span className="text-[11px] font-bold leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Save button ─────────────────────────────────────────────── */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#025EB8] to-[#0478E8] hover:from-[#014fa0] hover:to-[#0265c4] disabled:opacity-60 text-white text-sm font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-[#025EB8]/25"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t("saveButton")}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                </>
              )}
            </button>

            {/* ── Skip ────────────────────────────────────────────────────── */}
            <p className="text-center">
              <button
                type="button"
                onClick={() => router.replace(callbackUrl)}
                className="text-xs text-gray-400 hover:text-gray-500 transition-colors underline underline-offset-2"
              >
                {t("skip")}
              </button>
            </p>

          </div>
        </div>

        {/* ── Footer note ─────────────────────────────────────────────────── */}
        <p className="text-center text-[11px] text-gray-400 mt-5 leading-relaxed">
          {isAr
            ? "معلوماتك محمية ولن تُشارك مع أي طرف ثالث."
            : locale === "tr"
            ? "Bilgileriniz korunmaktadır ve üçüncü taraflarla paylaşılmaz."
            : "Your information is protected and will never be shared."}
        </p>

      </div>
    </div>
  );
}
