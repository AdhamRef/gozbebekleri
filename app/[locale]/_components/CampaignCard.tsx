"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { appendCurrencyQuery, getCurrencyCodeForLinks } from "@/lib/currency-link";
import { useSearchParams } from "next/navigation";
import { getCurrencySymbol } from "@/hooks/useCampaignValue";
import { formatNumber } from "@/hooks/formatNumber";
import { useCurrency } from "@/context/CurrencyContext";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import SignInDialog from "@/components/SignInDialog";

const DonationDialog = dynamic(() => import("@/components/DonationDialog"), { ssr: false });
import CategoryIcon from "@/components/CategoryIcon";
import { Heart, Zap } from "lucide-react";
import type { SuggestedDonationsConfig } from "@/lib/campaign/suggested-donations";

const RESUME_KEY = "campaignDonateResume";
const FALLBACK_IMG = "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg";

// 16:9 crop — matches the aspect-[4/3] container used everywhere
// 4:3 crop — matches the aspect-[4/3] container used everywhere
function buildImgSrc(src: string, width = 640, height = 480): string {
  if (!src.includes("res.cloudinary.com")) return src;
  return src.replace(
    /\/upload\//,
    `/upload/f_auto,q_auto:good,w_${width},h_${height},c_fill,g_auto/`
  );
}

export interface CampaignCardData {
  id: string;
  slug?: string | null;
  images: string[];
  title: string;
  description: string;
  currentAmount: number;
  targetAmount: number;
  progress?: number;
  showProgress?: boolean;
  fundraisingMode?: string;
  goalType?: string;
  sharePriceUSD?: number | null;
  suggestedShareCounts?: { counts: number[]; priceByCurrency?: Record<string, number> } | null;
  suggestedDonations?: SuggestedDonationsConfig | null;
  category?: { id?: string; slug?: string | null; name?: string; icon?: string };
}

type DonationDialogCampaignContext = {
  goalType?: string;
  fundraisingMode?: string;
  sharePriceUSD?: number | null;
  suggestedShareCounts?: { counts: number[]; priceByCurrency?: Record<string, number> } | null;
  suggestedDonations?: SuggestedDonationsConfig | null;
};

interface CampaignCardProps {
  campaign: CampaignCardData;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  isFeatured?: boolean;
  compact?: boolean;
  listView?: boolean;
}

export function CampaignCard({ campaign, className, onClick, isFeatured = false, compact = false, listView = false }: CampaignCardProps) {
  const t = useTranslations("CampaignsPage");
  const { convertToCurrency } = useCurrency();
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [donationOpen, setDonationOpen] = useState(false);
  const [donationContext, setDonationContext] = useState<DonationDialogCampaignContext | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [isGuestDonation, setIsGuestDonation] = useState(false);

  const snapshotDonationContext = (): DonationDialogCampaignContext => ({
    goalType: campaign.goalType,
    fundraisingMode: campaign.fundraisingMode,
    sharePriceUSD: campaign.sharePriceUSD ?? null,
    suggestedShareCounts: campaign.suggestedShareCounts ?? null,
    suggestedDonations: campaign.suggestedDonations ?? null,
  });

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
      setDonationContext(snapshotDonationContext());
      setDonationOpen(true);
    } catch { /* ignore */ }
    router.replace(appendCurrencyQuery(pathname, getCurrencyCodeForLinks()));
  }, [searchParams, campaign.id, pathname, router]);

  const handleDonateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (session?.user) {
      setDonationContext(snapshotDonationContext());
      setDonationOpen(true);
    } else {
      setSignInOpen(true);
    }
  };

  const handleGuestDonate = () => {
    setDonationContext(snapshotDonationContext());
    setIsGuestDonation(true);
    setDonationOpen(true);
  };

  const rawImgSrc = campaign.images[0] || FALLBACK_IMG;
  const imgSrc = buildImgSrc(rawImgSrc);

  return (
    <>
      {/* ── Mobile horizontal list row (listView only, hidden on sm+) ── */}
      {listView && !isFeatured && (
        <div className="sm:hidden flex flex-row bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <Link href={`/campaign/${campaign.slug || campaign.id}`} onClick={onClick} className="relative flex-shrink-0 w-28 aspect-square">
            <Image src={buildImgSrc(rawImgSrc, 320, 320)} alt={campaign.title} fill sizes="112px" className="object-cover" draggable={false} />
          </Link>
          <div className="flex flex-col justify-between flex-1 min-w-0 px-3 py-2.5">
            {campaign.category?.name && (
              <p className="text-[10px] text-gray-400 font-medium truncate mb-0.5">{campaign.category.name}</p>
            )}
            <Link href={`/campaign/${campaign.slug || campaign.id}`} onClick={onClick}>
              <h3 className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug">{campaign.title}</h3>
            </Link>
            <div className="mt-1.5">
              <div className="w-full bg-gray-100 rounded-full h-[3px] mb-1">
                <div className="bg-gradient-to-r from-[#FA5D17] to-[#ff8c55] h-[3px] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black text-gray-800">{symbol}{formatNumber(raised)} <span className="font-normal text-gray-400">{t("raised") || "جُمع"}</span></p>
                <button onClick={handleDonateClick} className="text-[10px] font-bold text-white bg-[#025EB8] hover:bg-[#014fa0] px-2.5 py-1 rounded-full transition-colors flex-shrink-0">
                  {t("donateNow") || "تبرع"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Card view (always on sm+, always when not listView) ── */}
      <div
        className={`${listView && !isFeatured ? "hidden sm:flex" : "flex"} group/card relative bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 flex-col ${isFeatured ? "border-[#FA5D17]/40 hover:shadow-[#FA5D17]/15 ring-1 ring-[#FA5D17]/20" : "border-gray-100 hover:shadow-[#025EB8]/12"} ${className ?? ""}`}
      >
        {/* Full image with everything overlaid */}
        <Link href={`/campaign/${campaign.slug || campaign.id}`} prefetch={true} onClick={onClick} className="relative flex-1 block">
          <div className={`relative w-full overflow-hidden ${isFeatured ? "h-full" : "aspect-[4/3]"}`}>
            <Image
              src={isFeatured ? buildImgSrc(rawImgSrc, 1280, 960) : imgSrc}
              alt={campaign.title}
              fill
              sizes={isFeatured ? "(max-width: 640px) 90vw, 50vw" : "(max-width: 640px) 70vw, (max-width: 1024px) 300px, 25vw"}
              className="object-cover group-hover/card:scale-105 transition-transform duration-700 ease-out"
              draggable={false}
              priority={isFeatured}
            />

            {/* Scrim */}
            <div className={`absolute inset-0 bg-gradient-to-t ${isFeatured ? "from-black/85 via-black/30 to-black/5" : "from-black/80 via-black/20 to-black/10"}`} />

            {/* Featured badge — top end */}
            {isFeatured && (
              <div className="absolute top-3 end-3">
                <span className="inline-flex items-center gap-1.5 bg-[#FA5D17] text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-[#FA5D17]/40">
                  <Zap className="w-3 h-3 fill-white" />
                  {t("featuredBadge")}
                </span>
              </div>
            )}

            {/* Category badge — featured only */}
            {isFeatured && campaign.category?.name && (
              <div className="absolute top-3 start-3 max-w-[45%]">
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/30 shadow-sm">
                  <CategoryIcon name={campaign.category.icon} className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{campaign.category.name}</span>
                </span>
              </div>
            )}

            {/* Title + stats — overlaid at bottom */}
            <div className={`absolute bottom-0 inset-x-0 ${isFeatured ? "px-5 pb-5" : compact ? "px-2 pb-2" : "px-3 pb-2.5 sm:px-4 sm:pb-3.5"}`}>
              <h3 className={`text-white font-bold leading-snug drop-shadow-sm mb-1.5 ${isFeatured ? "text-base lg:text-xl xl:text-2xl line-clamp-1 sm:line-clamp-2" : compact ? "text-[11px] sm:text-[13px] line-clamp-1 sm:line-clamp-2" : "text-[12px] sm:text-[14px] line-clamp-1 sm:line-clamp-2"}`}>
                {campaign.title}
              </h3>

              {campaign.showProgress !== false ? (
                <>
                  <div className={`flex items-end justify-between ${isFeatured ? "mb-2" : "mb-1"}`}>
                    <div>
                      {isFeatured && <p className="text-white/50 text-[9px] font-semibold uppercase tracking-widest mb-0.5">{t("raised") || "جُمع"}</p>}
                      <p className={`text-white font-black leading-none ${isFeatured ? "text-base" : compact ? "text-[10px]" : "text-[10px] sm:text-xs"}`}>
                        {symbol}{formatNumber(raised)}
                      </p>
                    </div>
                    <div className="text-end">
                      {isFeatured && <p className="text-white/50 text-[9px] font-semibold uppercase tracking-widest mb-0.5">{t("goal") || "الهدف"}</p>}
                      <p className={`text-white/65 font-semibold leading-none ${isFeatured ? "text-sm" : compact ? "text-[10px]" : "text-[10px] sm:text-xs"}`}>
                        {symbol}{formatNumber(target)}
                      </p>
                    </div>
                  </div>
                  <div className={`w-full bg-white/20 rounded-full ${isFeatured ? "h-1.5" : "h-[3px]"}`}>
                    <div
                      className={`bg-gradient-to-r from-[#FA5D17] to-[#ff8c55] rounded-full transition-all duration-500 ${isFeatured ? "h-1.5" : "h-[3px]"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className={`text-white font-black ${isFeatured ? "text-base" : compact ? "text-[10px]" : "text-[10px] sm:text-xs"}`}>{symbol}{formatNumber(raised)}</span>
                  <span className="text-white/60 text-[9px] sm:text-[10px]">
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
            className={`flex-1 flex items-center justify-center gap-1.5 text-white bg-[#025EB8] hover:bg-[#014fa0] font-bold transition-colors group/btn ${isFeatured ? "text-sm py-3.5" : compact ? "text-[11px] py-2" : "text-xs py-2.5"}`}
          >
            <Heart className={`fill-white/30 group-hover/btn:fill-white/60 transition-all ${isFeatured ? "w-4 h-4" : "w-3 h-3"}`} />
            {t("donateNow") || "تبرع الآن"}
          </button>
          <Link
            href={`/campaign/${campaign.slug || campaign.id}`}
            onClick={onClick}
            className={`flex-1 flex items-center justify-center text-gray-500 hover:text-[#025EB8] font-semibold transition-colors border-e border-gray-100 ${isFeatured ? "text-sm py-3.5" : compact ? "text-[11px] py-2" : "text-xs py-2.5"}`}
          >
            {t("details") || "التفاصيل"}
          </Link>
        </div>
      </div>

      <DonationDialog
        isOpen={donationOpen}
        onClose={() => {
          setDonationOpen(false);
          setDonationContext(null);
          setIsGuestDonation(false);
        }}
        guestMode={isGuestDonation}
        campaignId={campaign.id}
        campaignTitle={campaign.title}
        campaignImage={rawImgSrc}
        fundraisingMode={donationContext?.fundraisingMode ?? campaign.fundraisingMode}
        targetAmount={campaign.targetAmount}
        amountRaised={campaign.currentAmount}
        goalType={donationContext?.goalType ?? campaign.goalType}
        sharePriceUSD={donationContext?.sharePriceUSD ?? campaign.sharePriceUSD ?? null}
        suggestedShareCounts={donationContext?.suggestedShareCounts ?? campaign.suggestedShareCounts ?? null}
        suggestedDonations={donationContext?.suggestedDonations ?? campaign.suggestedDonations ?? null}
      />

      <SignInDialog
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSkip={handleGuestDonate}
        callbackUrl={
          typeof window !== "undefined"
            ? appendCurrencyQuery(
                `${pathname}?openCampaignDonation=1`,
                getCurrencyCodeForLinks()
              )
            : undefined
        }
      />
    </>
  );
}

export default CampaignCard;
