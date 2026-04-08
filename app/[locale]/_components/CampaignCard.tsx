"use client";

import { useState, useEffect } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { getCurrencySymbol } from "@/hooks/useCampaignValue";
import { formatNumber } from "@/hooks/formatNumber";
import { useCurrency } from "@/context/CurrencyContext";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import DonationDialog from "@/components/DonationDialog";
import SignInDialog from "@/components/SignInDialog";
import CategoryIcon from "@/components/CategoryIcon";
import { Heart } from "lucide-react";

const RESUME_KEY = "campaignDonateResume";
const FALLBACK_IMG = "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg";

export interface CampaignCardData {
  id: string;
  images: string[];
  title: string;
  description: string;
  currentAmount: number;
  targetAmount: number;
  progress?: number;
  showProgress?: boolean;
  fundraisingMode?: string;
  goalType?: string;
  category?: { id?: string; name?: string; icon?: string };
}

interface CampaignCardProps {
  campaign: CampaignCardData;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function CampaignCard({ campaign, className, onClick }: CampaignCardProps) {
  const t = useTranslations("CampaignsPage");
  const { convertToCurrency } = useCurrency();
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [donationOpen, setDonationOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const progress = Math.min(Number(campaign.progress ?? 0), 100);
  const raised = convertToCurrency(Math.round(campaign.currentAmount)).convertedValue ?? 0;
  const target = convertToCurrency(Math.round(campaign.targetAmount)).convertedValue ?? 0;
  const symbol = getCurrencySymbol();

  useEffect(() => {
    if (searchParams.get("openCampaignDonation") !== "1") return;
    try {
      const stored = typeof window !== "undefined" ? sessionStorage.getItem(RESUME_KEY) : null;
      if (!stored) return;
      const data = JSON.parse(stored) as { campaignId?: string };
      if (data.campaignId !== campaign.id) return;
      sessionStorage.removeItem(RESUME_KEY);
      setDonationOpen(true);
    } catch { /* ignore */ }
    router.replace(pathname);
  }, [searchParams, campaign.id, pathname, router]);

  const handleDonateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (session?.user) {
      setDonationOpen(true);
    } else {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(RESUME_KEY, JSON.stringify({ campaignId: campaign.id }));
      }
      setSignInOpen(true);
    }
  };

  const imgSrc = campaign.images[0] || FALLBACK_IMG;

  return (
    <>
      <div
        className={`group/card relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-[#025EB8]/12 transition-all duration-300 flex flex-col ${className ?? ""}`}
      >
        {/* Full image with everything overlaid */}
        <Link href={`/campaign/${campaign.id}`} prefetch={true} onClick={onClick} className="block relative flex-1">
          <div className="relative overflow-hidden h-64 lg:h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={campaign.title}
              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700 ease-out"
              draggable="false"
              loading="lazy"
            />

            {/* Scrim: subtle top, heavy bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

            {/* Category badge — frosted glass, top */}
            {campaign.category?.name && (
              <div className="absolute top-3 start-3">
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/30 shadow-sm">
                  <CategoryIcon name={campaign.category.icon} className="w-3 h-3" />
                  {campaign.category.name}
                </span>
              </div>
            )}

            {/* Title — overlaid, above stats */}
            <div className="absolute bottom-0 inset-x-0 px-4 pb-3.5">
              <h3 className="text-white font-bold text-[15px] leading-snug line-clamp-2 mb-3 drop-shadow-sm">
                {campaign.title}
              </h3>

              {campaign.showProgress !== false ? (
                <>
                  {/* Raised / Goal */}
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-white/50 text-[9px] font-semibold uppercase tracking-widest mb-0.5">{t("raised") || "جُمع"}</p>
                      <p className="text-white font-black text-sm leading-none">{symbol}{formatNumber(raised)}</p>
                    </div>
                    <div className="text-end">
                      <p className="text-white/50 text-[9px] font-semibold uppercase tracking-widest mb-0.5">{t("goal") || "الهدف"}</p>
                      <p className="text-white/80 font-bold text-sm leading-none">{symbol}{formatNumber(target)}</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-white/20 rounded-full h-1">
                    <div
                      className="bg-gradient-to-r from-[#FA5D17] to-[#ff8c55] h-1 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-black text-sm">{symbol}{formatNumber(raised)}</span>
                  <span className="text-white/60 text-[10px]">
                    {campaign.fundraisingMode === "SHARES" ? t("sharesCampaignLabel") : t("openGoalLabel")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Action strip */}
        <div className="flex">
                    <button
            onClick={handleDonateClick}
            className="flex-1 flex items-center justify-center gap-1.5 text-white bg-[#025EB8] hover:bg-[#014fa0] text-xs font-bold py-2.5 transition-colors group/btn"
          >
            <Heart className="w-3 h-3 fill-white/30 group-hover/btn:fill-white/60 transition-all" />
            {t("donateNow") || "تبرع الآن"}
          </button>
          <Link
            href={`/campaign/${campaign.id}`}
            onClick={onClick}
            className="flex-1 flex items-center justify-center text-gray-500 hover:text-[#025EB8] text-xs font-semibold py-2.5 transition-colors border-e border-gray-100"
          >
            {t("details") || "التفاصيل"}
          </Link>
        </div>
      </div>

      <DonationDialog
        isOpen={donationOpen}
        onClose={() => setDonationOpen(false)}
        campaignId={campaign.id}
        campaignTitle={campaign.title}
        campaignImage={imgSrc}
        fundraisingMode={campaign.fundraisingMode}
        targetAmount={campaign.targetAmount}
        amountRaised={campaign.currentAmount}
        goalType={campaign.goalType}
      />

      <SignInDialog
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        callbackUrl={
          typeof window !== "undefined"
            ? `${window.location.pathname}?openCampaignDonation=1`
            : undefined
        }
      />
    </>
  );
}

export default CampaignCard;
