"use client";

import { useEffect, useState } from "react";
import { HandCoins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Link } from "@/i18n/routing";

const donations = [
  { name: "أحمد", amount: 50, campaign: "إفطار صائم" },
  { name: "محمد", amount: 120, campaign: "كفالة يتيم" },
  { name: "فاطمة", amount: 30, campaign: "حفر بئر ماء" },
  { name: "سارة", amount: 75, campaign: "علاج المرضى" },
  { name: "عبدالله", amount: 200, campaign: "بناء مسجد" },
];

export default function LiveDonationsGlass() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % donations.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const donation = donations[index];

  return (
    <div
      className={cn(
        "fixed bottom-6 z-50 pointer-events-none",
        "left-1/2 -translate-x-1/2", // default center for mobile
        "md:right-6 md:-translate-x-0 backdrop-blur-md rounded-xl w-max" // on medium+ screens, stick to left
        // If you want it on the right side instead: "md:right-6 md:left-auto md:translate-x-0"
      )}
    >
      <BlurFade key={index} duration={0.5} blur="4px">
        <Card
          className={cn(
            "w-[280px] sm:w-[300px] border border-white/20",
            "bg-white/75",
            "shadow-lg shadow-black/20"
          )}
        >
          <div className="flex items-center gap-2 p-3">
            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-orange-400/30 blur-sm" />
              <div className="relative bg-orange-500 text-white rounded-full p-1.5">
                <HandCoins className="w-3 h-3" />
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 text-right">
              <p className="text-xs text-gray-800 leading-snug">
                <span className="font-semibold">{donation.name}</span>{" "}
                تبرع بـ{" "}
                <span className="font-bold text-orange-600">
                  ${donation.amount}
                </span>{" "}
                لـ <Link className=" cursor-pointer text-orange-600 font-semibold" href={"campaign"}>{donation.campaign}</Link>
              </p>
            </div>

            <span className="text-[9px] text-gray-400 whitespace-nowrap">
              الآن
            </span>
          </div>

          {/* subtle animated glow line */}
          <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-orange-400/50 to-transparent animate-pulse" />
        </Card>
      </BlurFade>
    </div>
  );
}
