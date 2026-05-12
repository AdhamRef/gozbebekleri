"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import axios from "axios";
import { useCart } from "@/hooks/useCart";

export const CART_OPEN_EVENT = "cart-reminder:open";
export const CART_CHANGED_EVENT = "cart-reminder:changed";

const HIDDEN_PATH_PATTERNS = [
  /\/success(\/|$)/,
  /\/donation-failed(\/|$)/,
  /\/dashboard(\/|$)/,
];

export default function CartReminder() {
  const t = useTranslations("Navbar");
  const { data: session, status } = useSession();
  const { items: zustandItems } = useCart();
  const pathname = usePathname() ?? "";
  const [serverCount, setServerCount] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      setServerCount(null);
      return;
    }
    let cancelled = false;
    const refetch = async () => {
      try {
        const res = await axios.get("/api/cart");
        if (!cancelled) setServerCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch {
        if (!cancelled) setServerCount(0);
      }
    };
    refetch();
    const onChange = () => refetch();
    window.addEventListener(CART_CHANGED_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_CHANGED_EVENT, onChange);
    };
  }, [session?.user, status]);

  if (!mounted) return null;
  if (HIDDEN_PATH_PATTERNS.some((re) => re.test(pathname))) return null;

  const count = session?.user ? serverCount ?? 0 : zustandItems.length;
  if (count <= 0) return null;

  const label = `${t("cart")} (${count})`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => window.dispatchEvent(new CustomEvent(CART_OPEN_EVENT))}
      className="
        fixed bottom-4 end-4 z-40
        inline-flex items-center gap-2
        h-12 px-4 rounded-full
        bg-[#025EB8] text-white
        shadow-lg shadow-[#025EB8]/30
        hover:bg-[#024a92] hover:shadow-xl hover:scale-[1.03]
        active:scale-95
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#025EB8]
        animate-cart-reminder-in
        pointer-events-auto
      "
      style={{
        // Respect iOS safe area without forcing the rule everywhere
        marginBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <ShoppingCart className="w-5 h-5" aria-hidden="true" />
      <span
        className="min-w-[1.25rem] h-5 px-1 inline-flex items-center justify-center rounded-full bg-white text-[#025EB8] text-xs font-semibold leading-none"
        dir="ltr"
      >
        {count > 99 ? "99+" : count}
      </span>

      <style jsx>{`
        @keyframes cart-reminder-in {
          0% {
            transform: translateY(16px) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        :global(.animate-cart-reminder-in) {
          animation: cart-reminder-in 220ms ease-out both;
        }
      `}</style>
    </button>
  );
}
