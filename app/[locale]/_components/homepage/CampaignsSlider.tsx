"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";
import CampaignCard from "@/app/[locale]/_components/CampaignCard";
import type { CampaignCardData } from "@/app/[locale]/_components/CampaignCard";
import { Loader2 } from "lucide-react";

const PAGE_LIMIT = 36;

interface CampaignsSliderProps {
  listView?: boolean;
  /**
   * Server-fetched campaigns. When provided, the slider renders them in the SSR HTML
   * with no loading state — eliminating the empty→skeleton→content swap that previously
   * caused CLS=0.92 on the homepage.
   */
  initialCampaigns?: CampaignCardData[];
  initialNextCursor?: string | null;
  initialHasMore?: boolean;
}

const CampaignsSlider: React.FC<CampaignsSliderProps> = ({
  listView = false,
  initialCampaigns = [],
  initialNextCursor = null,
  initialHasMore = false,
}) => {
  const t = useTranslations("CampaignsSlider");
  const locale = useLocale();
  const [campaigns, setCampaigns] = useState<CampaignCardData[]>(initialCampaigns);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const loadMore = useCallback(async () => {
    const cursorParam = cursor ?? campaigns[campaigns.length - 1]?.id;
    if (!cursorParam || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const response = await axios.get("/api/campaigns", {
        params: {
          limit: PAGE_LIMIT,
          sortBy: "priority",
          locale,
          cursor: cursorParam,
        },
      });
      const nextItems: CampaignCardData[] = response.data?.items ?? [];
      setCampaigns((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const merged = [...prev];
        for (const c of nextItems) {
          if (!seen.has(c.id)) {
            seen.add(c.id);
            merged.push(c);
          }
        }
        return merged;
      });
      setCursor(response.data?.nextCursor ?? null);
      setHasMore(Boolean(response.data?.hasMore));
    } catch {
      setError(t("loadError"));
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, campaigns, loadingMore, locale, t, hasMore]);

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-600">{t("noCampaigns")}</p>
      </div>
    );
  }

  const featured = campaigns[0];
  const top4 = campaigns.slice(1, 5);
  const rest = campaigns.slice(5);
  const others = [...top4, ...rest];

  return (
    <div className="w-full space-y-4">
      {!isDesktop ? (
        <div className="flex overflow-x-auto gap-3 pb-3 px-4 snap-x snap-mandatory scrollbar-hide">
          <div className="flex-shrink-0 w-[78vw] max-w-[320px] snap-start">
            <CampaignCard campaign={featured} />
          </div>
          {others.map((c) => (
            <div key={c.id} className="flex-shrink-0 w-[78vw] max-w-[320px] snap-start">
              <CampaignCard campaign={c} listView={listView} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 auto-rows-fr gap-3">
            <div className="col-span-2 row-span-2">
              <CampaignCard campaign={featured} isFeatured className="h-full" />
            </div>
            {top4.map((c) => (
              <CampaignCard key={c.id} campaign={c} compact />
            ))}
          </div>
          {rest.length > 0 && (
            <div className="grid grid-cols-4 gap-3 pt-2">
              {rest.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </>
      )}

      {(hasMore || loadingMore) && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore || !hasMore}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#025EB8]/30 bg-white px-6 py-3 text-sm font-semibold text-[#025EB8] shadow-sm transition hover:bg-[#025EB8]/5 disabled:opacity-60"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loadingMore")}
              </>
            ) : (
              t("showMore")
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default CampaignsSlider;
