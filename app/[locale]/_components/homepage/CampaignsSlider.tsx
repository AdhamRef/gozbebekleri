"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";
import CampaignCard from "@/app/[locale]/_components/CampaignCard";
import type { CampaignCardData } from "@/app/[locale]/_components/CampaignCard";

const CampaignsSlider = ({
  isGrid = false,
  isGridMobile = false,
  limit = 16,
}) => {
  const t = useTranslations("CampaignsSlider");
  const locale = useLocale();
  const sliderRef = useRef<HTMLDivElement>(null);
  const justDraggedRef = useRef(false);

  const [campaigns, setCampaigns] = useState<CampaignCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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

  const handleLinkClick = (e: React.MouseEvent) => {
    if (justDraggedRef.current) e.preventDefault();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current || !allowDrag) return;
    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
    sliderRef.current.style.cursor = "grabbing";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    sliderRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5;
  };

  const stopDrag = () => {
    if (isDragging) {
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 0);
    }
    setIsDragging(false);
    if (sliderRef.current) sliderRef.current.style.cursor = "grab";
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!sliderRef.current || !allowDrag) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !sliderRef.current) return;
    const x = e.touches[0].pageX - sliderRef.current.offsetLeft;
    sliderRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
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

  // Card className depending on mode
  // isGrid + !isGridMobile → grid on sm+, horizontal scroll on mobile (80vw = 1.25 cards visible)
  // isGridMobile           → always grid
  // !isGrid                → always slider (80vw on mobile, fixed on desktop)
  const cardClassName = isGrid
    ? isGridMobile
      ? ""
      : "w-[70vw] flex-shrink-0 sm:w-auto sm:flex-shrink"
    : "w-[70vw] flex-shrink-0 sm:w-[300px]";

  const containerClassName = isGrid
    ? isGridMobile
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4"
      : "flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-4 pt-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
    : "flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-4 pt-1";

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

          <div
            ref={sliderRef}
            className={containerClassName}
            style={
              allowDrag
                ? { scrollbarWidth: "none", msOverflowStyle: "none", userSelect: isDragging ? "none" : "auto" }
                : {}
            }
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={stopDrag}
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
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CampaignsSlider;
