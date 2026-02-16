import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, HandCoins, Heart, Loader2 } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { getCurrency } from "@/hooks/useCampaignValue";
import { formatNumber } from "@/hooks/formatNumber";
import { useTranslations, useLocale } from "next-intl";
import axios from "axios";
import { Link } from "@/i18n/routing";

// Campaign Type
interface Campaign {
  id: string;
  title: string;
  description: string;
  images: string[];
  currentAmount: number;
  targetAmount: number;
  donationCount: number;
  progress: number;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
}

const CampaignsSlider = ({
  isGrid = false,
  isGridMobile = false,
  limit = 8,
}) => {
  const t = useTranslations("CampaignsSlider");
  const locale = useLocale();
  const sliderRef = useRef<HTMLDivElement>(null);
  const justDraggedRef = useRef(false);
  const { convertToCurrency } = useCurrency();

  // State management
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Fetch campaigns from API
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get("/api/campaigns", {
          params: {
            limit: limit,
            sortBy: "newest",
            locale: locale, // Pass the locale to the API
          },
        });

        if (response.data && response.data.items) {
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
  }, [limit, locale]); // Add locale to dependencies

  const scroll = (direction: "left" | "right") => {
    if (sliderRef.current) {
      const scrollAmount = 320;
      sliderRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    if (justDraggedRef.current) {
      e.preventDefault();
    }
  };

  // Check if should allow drag (not in full grid mode)
  const shouldAllowDrag = () => {
    if (isGrid && isGridMobile) return false; // Full grid mode
    if (!isGrid) return true; // Always slider
    // Grid on desktop, slider on mobile - check window width
    if (typeof window !== "undefined") {
      return window.innerWidth < 640; // sm breakpoint
    }
    return false;
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current || !shouldAllowDrag()) return;
    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
    sliderRef.current.style.cursor = "grabbing";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    if (isDragging) {
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);
    }
    setIsDragging(false);
    if (sliderRef.current) {
      sliderRef.current.style.cursor = "grab";
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (sliderRef.current) {
        sliderRef.current.style.cursor = "grab";
      }
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!sliderRef.current || !shouldAllowDrag()) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !sliderRef.current) return;
    const x = e.touches[0].pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);
    }
    setIsDragging(false);
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider && shouldAllowDrag()) {
      slider.style.cursor = "grab";
    }
    return () => {
      if (slider) {
        slider.style.cursor = "default";
      }
    };
  }, [isGrid, isGridMobile]);

  const shouldShowSlider = !isGrid || (isGrid && !isGridMobile);

  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-br p-4 sm:p-6 lg:p-8 w-full mx-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                <HandCoins className="w-4 h-4 text-sky-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold sm:font-bold text-gray-800">
                {t("ongoingProjects")}
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gradient-to-br p-4 sm:p-6 lg:p-8 w-full mx-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                <HandCoins className="w-4 h-4 text-sky-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold sm:font-bold text-gray-800">
                {t("ongoingProjects")}
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-center py-20">
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (campaigns.length === 0) {
    return (
      <div className="bg-gradient-to-br p-4 sm:p-6 lg:p-8 w-full mx-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                <HandCoins className="w-4 h-4 text-sky-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold sm:font-bold text-gray-800">
                {t("ongoingProjects")}
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-center py-20">
            <p className="text-gray-600">{t("noCampaigns") || "No campaigns available"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br p-4 sm:p-6 lg:p-8 w-full mx-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
              <HandCoins className="w-4 h-4 text-sky-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold sm:font-bold text-gray-800">
              {t("ongoingProjects")}
            </h2>
          </div>
          <Link href="/campaign">
            <button className="text-gray-700 px-2 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 font-semibold text-xs shadow-sm transition-colors">
              {t("viewAll")}
            </button>
          </Link>
        </div>

        <div className="relative group">
          {/* Left fade overlay */}
          {shouldShowSlider && (
            <div className="hidden max-sm:block absolute left-[-2px] top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          )}

          {!isGrid && (
            <>
              <button
                onClick={() => scroll("left")}
                className="hidden lg:flex absolute left-[-20px] top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-all opacity-0 group-hover:opacity-100 items-center justify-center"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>

              <button
                onClick={() => scroll("right")}
                className="hidden lg:flex absolute right-[-20px] top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-all opacity-0 group-hover:opacity-100 items-center justify-center"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}

          <div
            ref={sliderRef}
            className={
              isGrid
                ? isGridMobile
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 pt-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 pt-1"
            }
            style={
              shouldShowSlider
                ? {
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    userSelect: isDragging ? "none" : "auto",
                  }
                : {}
            }
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {campaigns.map((campaign) => {
              const progress =
                (campaign.currentAmount / campaign.targetAmount) * 100;
              const remainingAmount = campaign.targetAmount - campaign.currentAmount;

              return (
                <Link
                  key={campaign.id}
                  href={`/campaign/${campaign.id}`}
                  onClick={handleLinkClick}
                  prefetch={true}
                  className={
                    isGrid
                      ? "block transition-all duration-300 cursor-pointer hover:-translate-y-0.5 bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-lg hover:border-sky-200/80 overflow-hidden"
                      : "block min-w-[280px] sm:min-w-[300px] transition-all duration-300 cursor-pointer hover:-translate-y-0.5 bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-lg hover:border-sky-200/80 flex-shrink-0 overflow-hidden"
                  }
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={campaign.images[0] || "/placeholder.jpg"}
                      alt={campaign.title}
                      className="w-full h-full object-cover"
                      draggable="false"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                    <div className="absolute top-2.5 right-2.5 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-bold text-sky-600 shadow-sm">
                      {Math.min(progress, 100).toFixed(0)}%
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-white text-xs font-medium drop-shadow-sm">
                      <Heart className="h-3.5 w-3.5 shrink-0 opacity-90" />
                      <span>
                        {campaign.donationCount} {t("contributor")}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-4">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 line-clamp-1">
                      {campaign.title}
                    </h3>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs sm:text-sm mb-2 gap-2">
                        <span className="text-gray-700 whitespace-nowrap">
                          <span className="font-bold text-sky-600">
                            {getCurrency()}
                            {formatNumber(
                              convertToCurrency(
                                Math.round(campaign.currentAmount)
                              ).convertedValue
                            )}
                          </span>{" "}
                          {t("donations")}
                        </span>
                        <span className="text-gray-600 text-left whitespace-nowrap">
                          {t("remaining")}{" "}
                          <span className="font-semibold">
                            {getCurrency()}
                            {formatNumber(
                              convertToCurrency(
                                Math.round(remainingAmount)
                              ).convertedValue
                            )}
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-sky-500 to-sky-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
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