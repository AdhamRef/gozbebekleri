"use client";
import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Define our slide data structure
interface Slide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
}

const HeroSlider: React.FC = () => {
  // Create sample slides (replace with your actual content)
  const slides: Slide[] = [
    {
      id: 1,
      image:
        "https://i.ibb.co/Xm58ssT/481207566-944951421141366-1158434782285969951-n-1.png",
      title: "كل تبرع يصنع فرقًا",
      subtitle: "تبرعك اليوم يمكن أن يغير حياة الأشخاص الأكثر احتياجًا غدًا",
    },
    {
      id: 1,
      image:
        "https://i.ibb.co/fz4C0T6f/472716948-18035016284616682-1267064737784016838-n.jpg",
      title: "كل تبرع يصنع فرقًا",
      subtitle: "تبرعك اليوم يمكن أن يغير حياة الأشخاص الأكثر احتياجًا غدًا",
    },
    {
      id: 2,
      image:
        "https://i.ibb.co/zhQtyvv9/478337346-933833952253113-3208823071015907564-n.jpg",
      title: "ساهم في علاج ألاف المحتاجين",
      subtitle: "انضم إلى آلاف الأشخاص الذين يدعمون القضايا الهادفة حول العالم",
    },
    // {
    //   id: 2,
    //   image: "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg",
    //   title: "ساهم في علاج ألاف المحتاجين",
    //   subtitle: "انضم إلى آلاف الأشخاص الذين يدعمون القضايا الهادفة حول العالم",
    // },
    {
      id: 3,
      image:
        "https://i.ibb.co/TDSxDqv3/480915966-944967647806410-3294036676853219016-n.jpg",
      title: "معًا نبني مستقبلًا أفضل",
      subtitle: "شارك في بناء مجتمع أكثر عدلًا وإنصافًا للجميع",
    },
  ];

  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [count, setCount] = useState({
    cases: 0,
    campaigns: 0,
    sponsorships: 0,
    students: 0,
  });

  // Counter animation
  useEffect(() => {
    const targets = {
      cases: 22659,
      campaigns: 549,
      sponsorships: 4827,
      students: 2122,
    };
    const duration = 2000;
    const steps = 60;
    const increment = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);

      setCount({
        cases: Math.floor(targets.cases * progress),
        campaigns: Math.floor(targets.campaigns * progress),
        sponsorships: Math.floor(targets.sponsorships * progress),
        students: Math.floor(targets.students * progress),
      });

      if (progress === 1) clearInterval(timer);
    }, increment);

    return () => clearInterval(timer);
  }, []);

  // Auto slide function
  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Set up auto sliding
  useEffect(() => {
    let slideInterval: NodeJS.Timeout;

    if (isPlaying) {
      slideInterval = setInterval(() => {
        nextSlide();
      }, 6000);
    }

    return () => {
      if (slideInterval) clearInterval(slideInterval);
    };
  }, [isPlaying, nextSlide]);

  return (
    <div
      className="relative w-full h-[350px] sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[550px] overflow-hidden mt-16"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              current === index ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-black/50"></div>
            </div>

            {/* Content Container */}
            <div className="relative h-full z-20 flex flex-col justify-center items-center text-center px-4 sm:px-6 md:px-8 lg:px-12">
              {/* Title */}
              <h1
                className={`text-4xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 md:mb-6 max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl leading-tight transition-all duration-700 ${
                  current === index
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0"
                }`}
                style={{ transitionDelay: "200ms" }}
              >
                {slide.title}
              </h1>

              {/* Subtitle */}
              <p
                className={`text-sm sm:text-base md:text-lg lg:text-xl text-stone-100 mb-4 sm:mb-6 md:mb-8 max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl leading-relaxed transition-all duration-700 ${
                  current === index
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0"
                }`}
                style={{ transitionDelay: "400ms" }}
              >
                {slide.subtitle}
              </p>

              {/* Statistics Grid */}
              <div
                className={`mb-4 sm:mb-6 md:mb-8 w-full max-w-max sm:max-w-2xl md:max-w-3xl transition-all duration-700 ${
                  current === index
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0"
                }`}
                style={{ transitionDelay: "600ms" }}
              >
                {/* Mobile: Simple aside with separators */}
                {/* <aside className="sm:hidden flex flex-row-reverse items-center justify-center divide-x-2 backdrop-blur-sm rounded-lg py-3">
                  <div className="px-4 text-center">
                    <div className="text-2xl font-bold text-white mb-0.5">
                      {count.cases.toLocaleString('en-US')}
                    </div>
                    <div className="text-xs text-white/90">حالة</div>
                  </div>
                  
                  <div className="px-4 text-center">
                    <div className="text-2xl font-bold text-white mb-0.5">
                      {count.campaigns.toLocaleString('en-US')}
                    </div>
                    <div className="text-xs text-white/90">حملة</div>
                  </div>
                  
                  <div className="px-4 text-center">
                    <div className="text-2xl font-bold text-white mb-0.5">
                      {count.sponsorships.toLocaleString('en-US')}
                    </div>
                    <div className="text-xs text-white/90">كفالة</div>
                  </div>
                  
                  <div className="px-4 text-center">
                    <div className="text-2xl font-bold text-white mb-0.5">
                      {count.students.toLocaleString('en-US')}
                    </div>
                    <div className="text-xs text-white/90">طالب</div>
                  </div>
                </aside> */}

                {/* Desktop: Glass divs grid */}
                {/* <div className="hidden sm:grid sm:grid-cols-4 gap-4 md:gap-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                      {count.cases.toLocaleString('en-US')}
                    </div>
                    <div className="text-sm md:text-base lg:text-lg text-white/90">حالة</div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                      {count.campaigns.toLocaleString('en-US')}
                    </div>
                    <div className="text-sm md:text-base lg:text-lg text-white/90">حملة</div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                      {count.sponsorships.toLocaleString('en-US')}
                    </div>
                    <div className="text-sm md:text-base lg:text-lg text-white/90">كفالة</div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                      {count.students.toLocaleString('en-US')}
                    </div>
                    <div className="text-sm md:text-base lg:text-lg text-white/90">طالب</div>
                  </div>
                </div> */}
              </div>

              {/* CTA Button */}
              <a
                href="#quick_donate"
                className={`bg-transparent border-2 border-white text-white font-semibold py-2 px-6 sm:py-3 sm:px-8 md:py-3 md:px-10 rounded-lg hover:bg-white hover:text-orange-600 transition-all duration-300 hover:scale-105 text-sm sm:text-base md:text-lg ${
                  current === index
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0"
                }`}
                style={{ transitionDelay: "800ms" }}
              >
                التبرع السريع
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows - Hidden on mobile */}
      <button
        onClick={prevSlide}
        className="hidden md:flex absolute left-4 lg:left-6 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 lg:p-3 rounded-full z-30 backdrop-blur-sm transition-all hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="hidden md:flex absolute right-4 lg:right-6 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 lg:p-3 rounded-full z-30 backdrop-blur-sm transition-all hover:scale-110"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-2 sm:h-2.5 md:h-3 rounded-full transition-all duration-300 ${
              current === index
                ? "bg-white w-8 sm:w-10 md:w-12"
                : "bg-white/50 hover:bg-white/75 w-2 sm:w-2.5 md:w-3"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
