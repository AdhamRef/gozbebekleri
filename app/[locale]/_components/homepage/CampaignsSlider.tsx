"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";
import CampaignCard from "@/app/[locale]/_components/CampaignCard";
import type { CampaignCardData } from "@/app/[locale]/_components/CampaignCard";

const DRAG_THRESHOLD = 6; // px movement before treating as a drag

const CampaignsSlider = ({
  isGrid = false,
  isGridMobile = false,
  limit = 16,
}) => {
  const t = useTranslations("CampaignsSlider");
  const locale = useLocale();
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const [campaigns, setCampaigns] = useState<CampaignCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get("/api/campaigns", {
          params: { limit, sortBy: "newest", locale },
        });
        if (response.data?.items) {
          setCampaigns(response.data.items);
        }
      } catch (err) {
        console.error("Error fetching campaigns:", err);
        setError("Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [limit, locale]);

  const scroll = (direction: "left" | "right") => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const isSliderOnMobile = isGrid && !isGridMobile;
  const isAlwaysSlider = !isGrid;
  const allowDrag = isAlwaysSlider || isSliderOnMobile;

  // Only block the link click if the user actually dragged (not a plain click)
  const handleLinkClick = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) e.preventDefault();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current || !allowDrag) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - sliderRef.current.offsetLeft;
    scrollLeftRef.current = sliderRef.current.scrollLeft;
    sliderRef.current.style.cursor = "grabbing";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !sliderRef.current) return;
    const x = e.pageX - sliderRef.current.offsetLeft;
    const delta = x - startXRef.current;
    if (Math.abs(delta) > DRAG_THRESHOLD) {
      hasDraggedRef.current = true;
      e.preventDefault();
      sliderRef.current.scrollLeft = scrollLeftRef.current - delta * 1.5;
    }
  };

  const stopDrag = () => {
    isDraggingRef.current = false;
    // Keep hasDraggedRef true until the click event fires, then reset
    if (hasDraggedRef.current) {
      setTimeout(() => { hasDraggedRef.current = false; }, 0);
    }
    if (sliderRef.current) sliderRef.current.style.cursor = "grab";
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider && allowDrag) slider.style.cursor = "grab";
    return () => { if (slider) slider.style.cursor = "default"; };
  }, [isGrid, isGridMobile, allowDrag]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#025EB8]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 w-full">
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 w-full">
        <p className="text-gray-600">{t("noCampaigns") || "No campaigns available"}</p>
      </div>
    );
  }

  const cardClassName = isGrid
    ? isGridMobile
      ? ""
      : "w-[70vw] flex-shrink-0 sm:w-auto sm:flex-shrink"
    : "w-[70vw] flex-shrink-0 sm:w-[300px]";

  const containerClassName = isGrid
    ? isGridMobile
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4"
      : "flex gap-3 overflow-x-auto scroll-smooth pb-4 pt-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
    : "flex gap-3 overflow-x-auto scroll-smooth pb-4 pt-1 lg:scrollbar-hide";

  return (
    <div className="w-full mx-auto">
      <div className="max-w-7xl mx-auto">
        <div className="relative group/slider">
          {/* Desktop nav arrows (slider-only mode) */}
          {!isGrid && (
            <>
              <button
                onClick={() => scroll("left")}
                className="hidden lg:flex absolute left-[-20px] top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-all opacity-0 group-hover/slider:opacity-100 items-center justify-center"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="hidden lg:flex absolute right-[-20px] top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-all opacity-0 group-hover/slider:opacity-100 items-center justify-center"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}

          {/* Touch devices: native overflow-x scroll (no JS interference).
              Desktop: mouse-drag scrolling with click protection. */}
          <div
            ref={sliderRef}
            className={containerClassName}
            style={allowDrag ? { userSelect: "none" } : {}}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
          >
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                className={cardClassName}
                onClick={handleLinkClick}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .lg\\:scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 1023px) {
          div[class*="overflow-x-auto"] {
            scrollbar-width: thin;
            scrollbar-color: #025EB8 #e5e7eb;
          }
          div[class*="overflow-x-auto"]::-webkit-scrollbar {
            height: 4px;
          }
          div[class*="overflow-x-auto"]::-webkit-scrollbar-track {
            background: #e5e7eb;
            border-radius: 9999px;
          }
          div[class*="overflow-x-auto"]::-webkit-scrollbar-thumb {
            background: #025EB8;
            border-radius: 9999px;
          }
        }
      `}</style>
    </div>
  );
};

export default CampaignsSlider;
