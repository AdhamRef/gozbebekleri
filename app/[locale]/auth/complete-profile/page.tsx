"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Calendar, Loader2, User } from "lucide-react";

export default function CompleteProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("CompleteProfile");
  const tDialog = useTranslations("SignInDialog");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/${locale}/auth/signin`);
      return;
    }
    if (status !== "authenticated") return;

    // Fetch current user profile
    fetch(`/api/users/${session.user.id}`)
      .then((r) => r.json())
      .then((data) => {
        const u = data.user;
        if (u?.birthdate && u?.gender) {
          // Profile already complete — skip to destination
          router.replace(callbackUrl);
        } else {
          if (u?.birthdate) setDateOfBirth(u.birthdate);
          if (u?.gender) setGender(u.gender);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [status, session, callbackUrl, locale, router]);

  const handleSave = async () => {
    if (!dateOfBirth || !gender) {
      setError(t("fillAllFields"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${session!.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthdate: dateOfBirth, gender }),
      });
      if (!res.ok) throw new Error();
      router.replace(callbackUrl);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#025EB8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#025EB8] px-6 pt-7 pb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://i.ibb.co/Y4RZj4cs/output-onlinepngtools.png"
            alt="Logo"
            className="h-12 w-auto object-contain brightness-0 invert mx-auto mb-3"
          />
          <h1 className="text-lg font-bold text-white">{t("title")}</h1>
          <p className="mt-1 text-xs text-white/70 leading-relaxed">{t("subtitle")}</p>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {tDialog("dateOfBirthLabel")}
            </label>
            <div className="relative">
              <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? "right-3" : "left-3"}`}>
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm outline-none focus:border-[#025EB8] focus:ring-2 focus:ring-[#025EB8]/10 transition-all bg-white text-gray-800 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"}`}
              />
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {tDialog("genderLabel")}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["male", "female", "preferNotToSay"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                    gender === g
                      ? "bg-[#025EB8] text-white border-[#025EB8]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#025EB8]/40"
                  }`}
                >
                  {tDialog(`gender${g.charAt(0).toUpperCase() + g.slice(1)}` as "genderMale" | "genderFemale" | "genderPreferNotToSay")}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#025EB8] hover:bg-[#0150a0] disabled:opacity-60 text-white text-sm font-semibold py-3 rounded-xl transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("saveButton")}
          </button>

          {/* Skip */}
          <button
            type="button"
            onClick={() => router.replace(callbackUrl)}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            {t("skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
