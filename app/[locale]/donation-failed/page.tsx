"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import BankAccountsBlock from "../bank-transfer/_components/BankAccountsBlock";

export default function DonationFailedPage() {
  const t = useTranslations("DonationFailed");

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Failure hero — explains what happened and pivots the user toward the
          manual bank-transfer fallback below so we don't lose the donation. */}
      <div className="bg-gradient-to-br from-rose-600 to-rose-700">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/15 border border-white/30 mb-5">
            <AlertCircle className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white/85 text-xs font-semibold mb-4">
            {t("badge")}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            {t("title")}
          </h1>
          <p className="text-white/85 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t("description")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/campaigns"
              className="inline-flex items-center gap-1.5 bg-white text-rose-700 font-semibold text-sm px-5 py-2.5 rounded-full shadow hover:bg-rose-50 transition-colors"
            >
              {t("tryAgain")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Manual bank-transfer fallback — verbatim copy of the /bank-transfer body. */}
      <div className="border-y border-amber-100 bg-amber-50">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center">
          <p className="text-sm text-amber-800 font-medium">
            {t("manualFallback")}
          </p>
        </div>
      </div>

      <BankAccountsBlock />
    </main>
  );
}
