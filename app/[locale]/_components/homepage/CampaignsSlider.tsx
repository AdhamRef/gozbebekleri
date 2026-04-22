"use client";

import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";
import CampaignCard from "@/app/[locale]/_components/CampaignCard";
import type { CampaignCardData } from "@/app/[locale]/_components/CampaignCard";

const CampaignsSlider = ({ limit = 16, listView = false }: { limit?: number; listView?: boolean }) => {
  const t = useTranslations("CampaignsSlider");
  const locale = useLocale();
  const [campaigns, setCampaigns] = useState<CampaignCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get("/api/campaigns", {
          params: { limit, sortBy: "priority", locale },
        });
        if (response.data?.items) setCampaigns(response.data.items);
      } catch {
        setError("Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [limit, locale]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <div className="flex items-center justify-center py-20"><p className="text-gray-600">{error}</p></div>;
  if (campaigns.length === 0) return <div className="flex items-center justify-center py-20"><p className="text-gray-600">{t("noCampaigns") || "No campaigns available"}</p></div>;

  const featured = campaigns[0];
  const top4     = campaigns.slice(1, 5);
  const rest     = campaigns.slice(5);

  const others = [...top4, ...rest];

  return (
    <div className="w-full space-y-4">

      {/* ── Mobile: full horizontal snap-scroll (all campaigns) ── */}
      <div className="lg:hidden flex overflow-x-auto gap-3 pb-3 px-4 snap-x snap-mandatory scrollbar-hide">
        <div className="flex-shrink-0 w-[78vw] max-w-[320px] snap-start">
          <CampaignCard campaign={featured} />
        </div>
        {others.map((c) => (
          <div key={c.id} className="flex-shrink-0 w-[78vw] max-w-[320px] snap-start">
            <CampaignCard campaign={c} listView={listView} />
          </div>
        ))}
      </div>

      {/* ── Desktop: featured (2×2) + 4 compact cards in a single 4-col grid
           Each cell is aspect-[4/3]; featured spans 2 cols × 2 rows, so its
           cell is also ≈ 4:3 (2W × 2H + gap). Prevents stretched images. ── */}
      <div className="hidden lg:grid grid-cols-4 auto-rows-fr gap-3">
        <div className="col-span-2 row-span-2">
          <CampaignCard campaign={featured} isFeatured className="h-full" />
        </div>
        {top4.map((c) => (
          <CampaignCard key={c.id} campaign={c} compact />
        ))}
      </div>

      {/* ── Desktop: rest in 4-col grid ── */}
      {rest.length > 0 && (
        <div className="hidden lg:grid grid-cols-4 gap-3 pt-2">
          {rest.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
};

function LoadingSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-fr gap-3">
        <div className="col-span-2 row-span-2 aspect-[4/3] bg-gray-200 rounded-2xl animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default CampaignsSlider;
