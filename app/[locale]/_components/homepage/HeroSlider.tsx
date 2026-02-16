"use client";
import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

interface SlideItem {
  id: string;
  title: string;
  description: string;
  image: string | null;
  showButton: boolean;
  buttonText: string;
  buttonLink: string;
  order: number;
}

const HeroSlider: React.FC = () => {
  const t = useTranslations("HeroSlider");
  const locale = useLocale() as "ar" | "en" | "fr";
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    fetch(`/api/slides?locale=${locale}`)
      .then((res) => res.json())
      .then((data) => {
        const items = data?.items ?? [];
        setSlides(Array.isArray(items) ? items : []);
        setCurrent(0);
      })
      .catch(() => setSlides([]));
  }, [locale]);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (slides.length ? (prev + 1) % slides.length : 0));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (slides.length ? (prev - 1 + slides.length) % slides.length : 0));
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

  if (slides.length === 0) return null;

  return (
    <div
      className="relative w-full h-[350px] sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[550px] overflow-hidden"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              current === index ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: slide.image ? `url(${slide.image})` : undefined, backgroundColor: slide.image ? undefined : '#0f172a' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-black/50"></div>
            </div>

            <div className="relative h-full z-20 flex flex-col justify-center items-center text-center px-4 sm:px-6 md:px-8 lg:px-12">
              <h1
                className={`text-4xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 md:mb-6 max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl leading-tight transition-all duration-700 ${
                  current === index ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
                }`}
                style={{ transitionDelay: "200ms" }}
              >
                {slide.title}
              </h1>

              {slide.description && (
                <p
                  className={`text-sm sm:text-base md:text-lg lg:text-xl text-stone-100 mb-4 sm:mb-6 md:mb-8 max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl leading-relaxed transition-all duration-700 ${
                    current === index ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
                  }`}
                  style={{ transitionDelay: "400ms" }}
                >
                  {slide.description}
                </p>
              )}

              {slide.showButton && (
                <Link
                  href={`/${slide.buttonLink || "#quick_donate"}`}
                  className={`bg-transparent border-2 border-white text-white font-semibold py-2 px-6 sm:py-3 sm:px-8 md:py-3 md:px-10 rounded-lg hover:bg-white hover:text-sky-600 transition-all duration-300 hover:scale-105 text-sm sm:text-base md:text-lg ${
                    current === index ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
                  }`}
                  style={{ transitionDelay: "800ms" }}
                >
                  {slide.buttonText || t("quickDonate")}
                </Link>
              )}
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
