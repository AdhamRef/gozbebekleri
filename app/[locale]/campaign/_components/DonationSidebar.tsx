/* eslint-disable @typescript-eslint/no-explicit-any */
import DonationDialog from "@/components/DonationDialog";
import SharePopup from "@/components/SharePopup";
import SignInDialog from "@/components/SignInDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/context/CurrencyContext";
import { usePathname, useRouter } from "@/i18n/routing";
import { Award, Clock, Gift, HandCoins, HandHeart, Share2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";

// Shared across instances (MainPageDummy renders desktop + mobile sidebars); only one should open the dialog
let openDonationHandledThisLoad = false;

interface DonationSidebarProps {
  campaign: any;
  isMobileSticky?: boolean;
}

const DonationSidebar = ({ campaign, isMobileSticky = false }: DonationSidebarProps) => {
  const t = useTranslations("Campaign");
  const locale = useLocale() as "ar" | "en" | "fr";
  const { data: session } = useSession();
  const { convertToCurrency } = useCurrency();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  // After sign-in redirect: open donation dialog once and clean URL (only one instance handles it)
  useEffect(() => {
    if (searchParams.get("openDonation") !== "1") {
      openDonationHandledThisLoad = false;
      return;
    }
    if (openDonationHandledThisLoad) return;
    openDonationHandledThisLoad = true;
    setIsDonationOpen(true);
    router.replace(pathname);
  }, [searchParams, pathname, router]);

  const donationCallbackUrl =
    typeof window !== "undefined"
      ? `${window.location.pathname}?openDonation=1`
      : undefined;

  // Helper function to get locale-specific property
  const getLocalizedProperty = (obj: any, key: string) => {
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    return obj[localeKey] || obj[key] || "";
  };

  const formatMoney = (n: number) => {
    const r = convertToCurrency(n);
    if (r?.convertedValue != null && r?.currency) {
      const sym =
        r.currency === "USD"
          ? "$"
          : r.currency === "EUR"
            ? "€"
            : r.currency === "GBP"
              ? "£"
              : r.currency === "TRY"
                ? "₺"
                : r.currency;
      const val =
        typeof r.convertedValue === "number"
          ? r.convertedValue.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })
          : "0";
      return sym + " " + val;
    }
    return (
      "$" +
      (typeof n === "number"
        ? n.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })
        : "0")
    );
  };

  const handleDonate = () => {
    if (session) {
      setIsDonationOpen(true);
    } else {
      setIsSignInOpen(true);
    }
  };
  
  const handleShare = () => {
    setIsShareOpen(true);
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  // Mobile Sticky Bottom Bar
  if (isMobileSticky) {
    return (
      <>
        {/* Share Popup */}
        <SharePopup
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          url={shareUrl}
          title={getLocalizedProperty(campaign, "title")}
          description={getLocalizedProperty(campaign, "description")}
          image={campaign.images[0]}
        />

        <DonationDialog
          isOpen={isDonationOpen}
          onClose={() => setIsDonationOpen(false)}
          campaignTitle={getLocalizedProperty(campaign, "title")}
          campaignImage={campaign.images[0]}
          targetAmount={campaign.targetAmount}
          amountRaised={campaign.amountRaised}
          campaignId={campaign.id}
          suggestedDonations={campaign.suggestedDonations}
          goalType={campaign.goalType}
          fundraisingMode={campaign.fundraisingMode}
          sharePriceUSD={campaign.sharePriceUSD}
          suggestedShareCounts={campaign.suggestedShareCounts}
        />

        <SignInDialog
          isOpen={isSignInOpen}
          onClose={() => setIsSignInOpen(false)}
          callbackUrl={donationCallbackUrl}
        />

        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl">
          <div className="px-4 py-3">
            {/* Progress Info - Compact */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex lg:flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {formatMoney(campaign.currentAmount)}
                  </span>
                  {campaign.showProgress !== false ? (
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                      {t("from")} {formatMoney(campaign.targetAmount)}
                    </span>
                  ) : campaign.fundraisingMode === "SHARES" ? (
                    <span className="text-xs text-violet-700 bg-violet-50 px-2 py-1 rounded-md">
                      {t("sharesCampaignBadge")}
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                      {t("openGoalBadge")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <HandHeart className="w-4 h-4" />
                  <span>{campaign.donationCount} {t("donor")}</span>
                </div>
              </div>

              {campaign.showProgress !== false ? (
                <div className="relative w-10 h-10 lg:w-14 lg:h-14 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E8E8E8"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#0EA5E9"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${campaign.progress}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-700">
                      {Math.round(campaign.progress)}%
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleDonate}
                className="flex-1 flex gap-2 bg-[#FA5D17] hover:bg-[#e04d0f] text-white font-semibold py-3 text-base rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <HandCoins className="w-5 h-5" />
                {t("donateNow")}
              </Button>
              <Button
                onClick={handleShare}
                className="flex-shrink-0 flex gap-2 bg-primary hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg border-0 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop Version
  return (
    <div className="lg:col-span-4">
      {/* Share Popup */}
      <SharePopup
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        url={shareUrl}
        title={getLocalizedProperty(campaign, "title")}
        description={getLocalizedProperty(campaign, "description")}
        image={campaign.images[0]}
      />

      <DonationDialog
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
        campaignTitle={getLocalizedProperty(campaign, "title")}
        campaignImage={campaign.images[0]}
        targetAmount={campaign.targetAmount}
        amountRaised={campaign.amountRaised}
        campaignId={campaign.id}
        suggestedDonations={campaign.suggestedDonations}
        goalType={campaign.goalType}
        fundraisingMode={campaign.fundraisingMode}
        sharePriceUSD={campaign.sharePriceUSD}
        suggestedShareCounts={campaign.suggestedShareCounts}
      />

      <SignInDialog
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        callbackUrl={donationCallbackUrl}
      />

      <div className="sticky top-24 gap-y-6">
        {/* Progress Card */}
        <Card className="border-0">
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-1">
                <div className="flex flex-col gap-2">
                  <h2 className="text-[2rem] font-bold text-gray-900 leading-none">
                    {formatMoney(campaign.currentAmount)}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {campaign.showProgress !== false ? (
                      <p className="text-white bg-primary px-2 py-1 rounded-md text-sm font-medium">
                        {t("outOfGoal")} {formatMoney(campaign.targetAmount)}
                      </p>
                    ) : (
                      <>
                        {campaign.fundraisingMode === "SHARES" &&
                        campaign.sharePriceUSD != null &&
                        campaign.sharePriceUSD > 0 ? (
                          <p className="text-white bg-violet-600 px-2 py-1 rounded-md text-sm font-medium">
                            {t("sharesCampaignBadge")}
                          </p>
                        ) : (
                          <p className="text-white bg-emerald-600 px-2 py-1 rounded-md text-sm font-medium">
                            {t("openGoalBadge")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-800">
                    <HandHeart className="w-5 h-5" />
                    {campaign.donationCount} {t("peopleDonated")}
                  </div>
                </div>
                {campaign.showProgress !== false ? (
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#E8E8E8"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#0EA5E9"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${campaign.progress}, 100`}
                      />
                      <text
                        x="18"
                        y="20.35"
                        className="text-[0.5em]"
                        textAnchor="middle"
                        fill="#666"
                      >
                        {Math.round(campaign.progress)}%
                      </text>
                    </svg>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleDonate}
                className="flex gap-2 w-full bg-[#FA5D17] hover:bg-[#e04d0f] text-white font-semibold py-6 text-lg rounded-md transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <HandCoins className="w-5 h-5" />
                {t("donateNow")}
              </Button>
              <Button
                onClick={handleShare}
                className="flex gap-2 w-full bg-primary hover:bg-slate-800 text-white font-semibold py-6 text-lg rounded-md border-0 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Share2 className="w-5 h-5" />
                {t("share")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DonationSidebar;