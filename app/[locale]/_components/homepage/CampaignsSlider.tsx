import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, HandCoins, Heart } from "lucide-react";

const CampaignsSlider = ({ isGrid = false, isGridMobile = false, limit = 100 }) => {
  const sliderRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const allCampaigns = [
    {
      id: "1",
      images: ["https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=600&h=400&fit=crop"],
      title: "مَشْرُوعُ حِفْظِ الْقُرْآنِ الْكَرِيمِ",
      description: "دعم حفظة القرآن الكريم",
      category: "تعليم",
      currentAmount: 15750,
      targetAmount: 50000,
      contributors: 127,
      daysLeft: 15
    },
    {
      id: "2",
      images: ["https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop"],
      title: "أَطْفَالٌ سُعَدَاء وَجُوهٌ مُبْتَسِمَة",
      description: "إسعاد الأطفال الأيتام",
      category: "رعاية اجتماعية",
      currentAmount: 8200,
      targetAmount: 25000,
      contributors: 89,
      daysLeft: 22
    },
    {
      id: "3",
      images: ["https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop"],
      title: "مَشْرُوعُ دَعْمِ التَّعْلِيمِ",
      description: "توفير التعليم للمحتاجين",
      category: "تعليم",
      currentAmount: 32500,
      targetAmount: 40000,
      contributors: 203,
      daysLeft: 8
    },
    {
      id: "4",
      images: ["https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&h=400&fit=crop"],
      title: "إفطار صائم في رمضان",
      description: "توفير وجبات إفطار للصائمين",
      category: "إغاثة",
      currentAmount: 45000,
      targetAmount: 60000,
      contributors: 312,
      daysLeft: 12
    },
    {
      id: "5",
      images: ["https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop"],
      title: "كفالة يتيم",
      description: "كفالة الأيتام ورعايتهم",
      category: "رعاية اجتماعية",
      currentAmount: 18900,
      targetAmount: 36000,
      contributors: 156,
      daysLeft: 30
    },
    {
      id: "6",
      images: ["https://www.muslimglobalrelief.org/wp-content/uploads/2023/03/mosque-building-fund.jpeg"],
      title: "بناء مسجد",
      description: "المساهمة في بناء مسجد للقرية",
      category: "مشاريع خيرية",
      currentAmount: 125000,
      targetAmount: 200000,
      contributors: 445,
      daysLeft: 45
    },
    {
      id: "7",
      images: ["https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=600&h=400&fit=crop"],
      title: "علاج المرضى المحتاجين",
      description: "توفير العلاج الطبي للفقراء",
      category: "صحة",
      currentAmount: 67500,
      targetAmount: 100000,
      contributors: 289,
      daysLeft: 18
    },
    {
      id: "8",
      images: ["https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&h=400&fit=crop"],
      title: "حفر بئر ماء",
      description: "توفير مياه نظيفة للقرى النائية",
      category: "مشاريع خيرية",
      currentAmount: 28000,
      targetAmount: 50000,
      contributors: 178,
      daysLeft: 25
    }
  ];

  const campaigns = limit ? allCampaigns.slice(0, limit) : allCampaigns;

  const formatNumber = (num) => {
    return num.toLocaleString('ar-EG');
  };

  const scroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = 320;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleCampaignClick = (id) => {
    if (!isDragging) {
      console.log(`Campaign ${id} clicked`);
    }
  };

  // Check if should allow drag (not in full grid mode)
  const shouldAllowDrag = () => {
    if (isGrid && isGridMobile) return false; // Full grid mode
    if (!isGrid) return true; // Always slider
    // Grid on desktop, slider on mobile - check window width
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640; // sm breakpoint
    }
    return false;
  };

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (!sliderRef.current || !shouldAllowDrag()) return;
    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
    sliderRef.current.style.cursor = 'grabbing';
  };

const handleMouseMove = (e) => {
    if (!isDragging || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (sliderRef.current) {
      sliderRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (sliderRef.current) {
        sliderRef.current.style.cursor = 'grab';
      }
    }
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    if (!sliderRef.current || !shouldAllowDrag()) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !sliderRef.current) return;
    const x = e.touches[0].pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider && shouldAllowDrag()) {
      slider.style.cursor = 'grab';
    }
    return () => {
      if (slider) {
        slider.style.cursor = 'default';
      }
    };
  }, [isGrid, isGridMobile]);

  const shouldShowSlider = !isGrid || (isGrid && !isGridMobile);

  return (
    <div className="bg-gradient-to-br p-4 sm:p-6 lg:p-8 w-full mx-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <HandCoins className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold sm:font-bold text-gray-800">أهم المشاريع الجارية</h2>
          </div>
          <button className="text-gray-700 px-2 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 font-semibold text-xs shadow-sm transition-colors">
            عرض الكل
          </button>
        </div>

        <div className="relative group">
          {/* Left fade overlay */}
          {shouldShowSlider && (
            <div className="hidden max-sm:block absolute left-[-2px] top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          )}
          
          {/* Right fade overlay */}
          {/* {shouldShowSlider && (
            <div className="hidden max-sm:block absolute right-[-2px] top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          )} */}

          {!isGrid && (
            <>
              <button
                onClick={() => scroll('left')}
                className="hidden lg:flex absolute left-[-20px] top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-all opacity-0 group-hover:opacity-100 items-center justify-center"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>

              <button
                onClick={() => scroll('right')}
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
            style={shouldShowSlider ? { 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              userSelect: isDragging ? 'none' : 'auto'
            } : {}}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {campaigns.map((campaign) => {
              const progress = (campaign.currentAmount / campaign.targetAmount) * 100;
              
              return (
                <div
                  key={campaign.id}
                  onClick={() => handleCampaignClick(campaign.id)}
                  className={
                    isGrid
                      ? "transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-white rounded-lg shadow-md hover:shadow-xl"
                      : "min-w-[280px] sm:min-w-[300px] transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-white rounded-lg shadow-md hover:shadow-xl flex-shrink-0"
                  }
                >
                  <div className="relative h-40 sm:h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={campaign.images[0]}
                      alt={campaign.title}
                      className="w-full h-full object-cover"
                      draggable="false"
                    />
                    <div className="absolute top-3 right-3 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                      {progress.toFixed(0)}%
                    </div>
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-sm">
                      {campaign.contributors} متبرع
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 line-clamp-1">
                      {campaign.title}
                    </h3>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs sm:text-sm mb-2 gap-2">
                        <span className="text-gray-700 whitespace-nowrap">
                          <span className="font-bold text-orange-600">
                            {formatNumber(campaign.currentAmount)} ₺
                          </span>
                          {" "}تبرعات
                        </span>
                        <span className="text-gray-600 text-left whitespace-nowrap">
                          تبقى{" "}
                          <span className="font-semibold">
                            {formatNumber(campaign.targetAmount - campaign.currentAmount)} ₺
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
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