"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  HandHeart,
  Heart,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat2,
  ShieldCheck,
  ShoppingCart,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { signOut, useSession } from "next-auth/react";
import CartSheet from "../components/CartSheet";
import { useCart } from "@/hooks/useCart";
import { CART_CHANGED_EVENT, CART_OPEN_EVENT } from "@/components/CartReminder";
import CurrencySelector from "./CurrencySelector";
import LanguageSwitcher from "./LanguageSelector";
import SignInDialog from "@/components/SignInDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dynamic from "next/dynamic";
import { appendCurrencyQuery, getCurrencyCodeForLinks } from "@/lib/currency-link";
import { CURRENCY_COOKIE_UPDATED_EVENT } from "@/components/CurrencyFromUrlSync";

const CartPaymentDialog = dynamic(() => import("./CartPaymentDialog"), { ssr: false });

interface CartItem {
  id: string;
  campaignId: string;
  amount: number;
  amountUSD: number;
  currency: string;
  userId: string;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
    images: string[];
  };
}

const LOGO_URL = "/logo.png";

const utilityLabels = {
  ar: {
    partner: "كن شريكًا لنا",
    volunteer: "تطوع معنا",
    partnerProjects: "مشاريع الشركاء",
    proof: "تبرع آمن · إيصال · تحديثات أثر",
    signIn: "دخول",
    dashboard: "لوحة التحكم",
    profile: "حسابي",
    signOut: "تسجيل الخروج",
  },
  tr: {
    partner: "Partner Olun",
    volunteer: "Gönüllü Olun",
    partnerProjects: "Partner Projeleri",
    proof: "Güvenli bağış · Makbuz · Etki güncellemeleri",
    signIn: "Giriş",
    dashboard: "Dashboard",
    profile: "Profilim",
    signOut: "Çıkış",
  },
  en: {
    partner: "Become a Partner",
    volunteer: "Volunteer with Us",
    partnerProjects: "Partner Projects",
    proof: "Secure giving · Receipt · Impact updates",
    signIn: "Sign in",
    dashboard: "Dashboard",
    profile: "My Profile",
    signOut: "Sign out",
  },
};

const Navbar = () => {
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const labels = utilityLabels[locale as keyof typeof utilityLabels] ?? utilityLabels.en;
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartPaymentDialogOpen, setIsCartPaymentDialogOpen] = useState(false);
  const [signInCallbackUrl, setSignInCallbackUrl] = useState<string | undefined>(undefined);
  const [cartGuestMode, setCartGuestMode] = useState(false);
  const { items: zustandItems, removeItem: zustandRemoveItem, clearItems: clearZustandItems } = useCart();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [, setCurrencyTick] = useState(0);

  useEffect(() => {
    setCurrencyTick((n) => n + 1);
    const onUpdate = () => setCurrencyTick((n) => n + 1);
    window.addEventListener(CURRENCY_COOKIE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(CURRENCY_COOKIE_UPDATED_EVENT, onUpdate);
  }, []);

  useEffect(() => {
    if (searchParams.get("openCartPayment") === "1") {
      setCartGuestMode(!session?.user && zustandItems.length > 0);
      setIsCartPaymentDialogOpen(true);
      router.replace(appendCurrencyQuery(pathname, getCurrencyCodeForLinks()));
    }
  }, [searchParams, pathname, router, session?.user, zustandItems.length]);

  useEffect(() => {
    const fetchCartItems = async () => {
      if (session?.user && status === "authenticated") {
        try {
          const response = await axios.get("/api/cart");
          setCartItems(response.data);
        } catch {
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
    };
    fetchCartItems();
  }, [session, status]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRemoveItem = async (id: string) => {
    if (!session?.user) {
      zustandRemoveItem(id);
      window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
      return;
    }
    try {
      await axios.delete(`/api/cart/${id}`);
      setCartItems((prev) => prev.filter((item) => item.id !== id));
      window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
    } catch {}
  };

  const onOpenDonationDialog = () => {
    setIsCartOpen(false);
    setIsCartPaymentDialogOpen(true);
  };

  const openCart = () => {
    if (session?.user) {
      setCartGuestMode(false);
      setIsCartOpen(true);
    } else if (zustandItems.length > 0) {
      setCartGuestMode(true);
      setIsCartOpen(true);
    } else {
      setSignInCallbackUrl(
        typeof window !== "undefined" ? appendCurrencyQuery(pathname, getCurrencyCodeForLinks()) : undefined
      );
      setIsSignInOpen(true);
    }
  };

  useEffect(() => {
    const onOpen = () => openCart();
    window.addEventListener(CART_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CART_OPEN_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, zustandItems.length, pathname]);

  const mainLinks = [
    { href: "/campaigns", label: t("projects") || "Projects", icon: HandHeart },
    { href: "/campaigns?type=funds", label: locale === "ar" ? "الصناديق" : locale === "tr" ? "Fonlar" : "Funds", icon: ShieldCheck },
    { href: "/campaigns?intent=zakat", label: locale === "ar" ? "الزكاة" : locale === "tr" ? "Zekat" : "Zakat", icon: HandHeart },
    { href: "/campaigns?intent=waqf", label: locale === "ar" ? "الوقف" : locale === "tr" ? "Vakıf" : "Waqf", icon: Landmark },
    { href: "/campaigns?frequency=monthly", label: locale === "ar" ? "التبرع الدوري" : locale === "tr" ? "Düzenli" : "Recurring", icon: Repeat2 },
    { href: "/blog", label: t("news") || "Knowledge", icon: BookOpen },
    { href: "/about-us", label: t("about") || "About", icon: Users },
  ];

  const utilityLinks = [
    { href: "/contact-us", label: labels.partner },
    { href: "/contact-us", label: labels.volunteer },
    { href: "/campaigns?type=partner", label: labels.partnerProjects },
  ];

  const checkoutCartItems =
    isCartPaymentDialogOpen && cartGuestMode ? zustandItems : session?.user ? cartItems : zustandItems;

  const cartPaymentCallbackUrl =
    typeof window !== "undefined"
      ? appendCurrencyQuery(`${pathname}?openCartPayment=1`, getCurrencyCodeForLinks())
      : undefined;

  const cartCount = session?.user ? cartItems.length : zustandItems.length;

  const isActive = (href: string) => {
    const cleanHref = href.split("?")[0];
    return pathname === cleanHref || (cleanHref !== "/" && pathname.startsWith(cleanHref));
  };

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 transition-shadow duration-300 ${isScrolled ? "shadow-lg" : "shadow-sm"}`}>
        <div className="hidden border-b border-white/10 bg-[#10212B] text-[#FFFDF8] lg:block">
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-xs">
            <div className="flex items-center gap-2 text-white/70">
              <ShieldCheck className="h-3.5 w-3.5 text-[#D39A27]" />
              <span>{labels.proof}</span>
            </div>
            <div className="flex items-center gap-5">
              {utilityLinks.map((link) => (
                <Link key={link.label} href={link.href} className="font-semibold text-white/75 transition-colors hover:text-[#D39A27]">
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 border-s border-white/15 ps-4">
                <LanguageSwitcher onDark />
                <CurrencySelector onDark />
              </div>
            </div>
          </div>
        </div>

        <nav className="border-b border-[#E9DDCA] bg-[#FFFDF8]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 lg:h-[72px]">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Image src={LOGO_URL} alt="Minber-i Aksa" width={220} height={56} className="hidden h-12 w-auto object-contain lg:block" />
              <Image src={LOGO_URL} alt="Minber-i Aksa" width={120} height={44} className="h-10 w-auto object-contain lg:hidden" />
            </Link>

            <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
              {mainLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href + link.label}
                    href={link.href}
                    className={`rounded-full px-3 py-2 text-sm font-bold transition-colors ${
                      active ? "bg-[#10212B] text-[#FFFDF8]" : "text-[#132C38] hover:bg-[#F7F2EA] hover:text-[#A93428]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <Link
              href="/campaigns"
              className="hidden shrink-0 items-center gap-1.5 rounded-full bg-[#A93428] px-4 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-[#8f2a21] lg:flex"
            >
              <Heart className="h-4 w-4" />
              {t("donate") || "Donate Now"}
            </Link>

            <div className="flex-1 lg:hidden" />

            <div className="flex items-center gap-1 lg:hidden">
              <LanguageSwitcher onDark={false} />
              <CurrencySelector onDark={false} />
            </div>

            <button
              type="button"
              onClick={openCart}
              className="relative shrink-0 rounded-full p-2 text-[#132C38] transition-colors hover:bg-[#F7F2EA] hover:text-[#A93428]"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#A93428] text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            {status === "authenticated" && session?.user ? (
              <div className={`relative shrink-0 ${isRTL ? "mr-2" : "ml-2"}`} ref={userMenuRef}>
                <button type="button" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-1.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image ?? ""} />
                    <AvatarFallback className="bg-[#10212B] text-xs text-white">
                      {session.user.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-[#52616B] lg:block" />
                </button>
                {isUserMenuOpen && (
                  <div className={`absolute z-50 mt-2 w-56 rounded-2xl border border-[#E9DDCA] bg-white py-1 shadow-xl ${isRTL ? "left-0" : "right-0"}`}>
                    <div className="border-b border-[#F1E7D8] px-4 py-3">
                      <p className="truncate text-sm font-bold text-[#132C38]">{session.user.name}</p>
                      <p className="truncate text-xs text-[#52616B]">{session.user.email}</p>
                    </div>
                    {(session.user.role === "ADMIN" || session.user.role === "STAFF") && (
                      <a href="/dashboard" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#132C38] hover:bg-[#F7F2EA]">
                        <LayoutDashboard className="h-4 w-4 text-[#D39A27]" />
                        {labels.dashboard}
                      </a>
                    )}
                    <Link href="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#132C38] hover:bg-[#F7F2EA]">
                      <UserCircle className="h-4 w-4 text-[#D39A27]" />
                      {labels.profile}
                    </Link>
                    <button type="button" onClick={() => { setIsUserMenuOpen(false); signOut({ callbackUrl: "/" }); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#A93428] hover:bg-[#A93428]/10">
                      <LogOut className="h-4 w-4" />
                      {labels.signOut}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSignInCallbackUrl(typeof window !== "undefined" ? appendCurrencyQuery(pathname, getCurrencyCodeForLinks()) : undefined);
                  setIsSignInOpen(true);
                }}
                className="hidden shrink-0 rounded-full border border-[#D8C8AD] px-3 py-2 text-sm font-bold text-[#132C38] transition-colors hover:border-[#D39A27] hover:text-[#A93428] lg:flex"
              >
                {t("signIn") || labels.signIn}
              </button>
            )}

            <button type="button" className="shrink-0 rounded-full p-2 text-[#132C38] lg:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Menu">
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {isMobileMenuOpen && (
            <div className="border-t border-[#E9DDCA] bg-[#FFFDF8] lg:hidden">
              <div className="px-4 py-3 text-xs text-[#52616B]">
                <div className="flex items-center gap-2 rounded-2xl bg-[#F7F2EA] px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-[#D39A27]" />
                  <span>{labels.proof}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1 px-3 pb-3">
                {mainLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href + link.label}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors ${
                        active ? "bg-[#10212B] text-[#FFFDF8]" : "text-[#132C38] hover:bg-[#F7F2EA]"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-[#D39A27]" : "text-[#D39A27]"}`} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-1 border-t border-[#E9DDCA] px-3 py-3">
                {utilityLinks.map((link) => (
                  <Link key={link.label} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#52616B] hover:bg-[#F7F2EA] hover:text-[#132C38]">
                    {link.label}
                  </Link>
                ))}
              </div>

              {status === "authenticated" && session?.user && (
                <div className="border-t border-[#E9DDCA] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={session.user.image ?? ""} />
                      <AvatarFallback className="bg-[#10212B] text-xs text-white">{session.user.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#132C38]">{session.user.name}</p>
                      <p className="truncate text-xs text-[#52616B]">{session.user.email}</p>
                    </div>
                    <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl bg-[#F7F2EA] p-2 text-[#132C38]">
                      <UserCircle className="h-4 w-4" />
                    </Link>
                    <button type="button" onClick={() => { setIsMobileMenuOpen(false); signOut({ callbackUrl: "/" }); }} className="rounded-xl bg-[#A93428]/10 p-2 text-[#A93428]">
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 border-t border-[#E9DDCA] px-4 py-3">
                <Link href="/campaigns" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#A93428] px-4 py-3 text-sm font-black text-white">
                  <Heart className="h-4 w-4" />
                  {t("donate") || "Donate Now"}
                </Link>
                {!session?.user && (
                  <button type="button" onClick={() => { setIsMobileMenuOpen(false); setIsSignInOpen(true); }} className="flex flex-1 items-center justify-center rounded-full border border-[#D8C8AD] px-4 py-3 text-sm font-bold text-[#132C38]">
                    {t("signIn") || labels.signIn}
                  </button>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} cartItems={session?.user ? cartItems : zustandItems} handleRemoveItem={handleRemoveItem} onOpenDonationDialog={onOpenDonationDialog} />

      <CartPaymentDialog
        isOpen={isCartPaymentDialogOpen}
        onClose={() => setIsCartPaymentDialogOpen(false)}
        cartItems={checkoutCartItems}
        guestMode={false}
        authCallbackUrl={cartPaymentCallbackUrl}
        onSuccess={() => {
          setIsCartPaymentDialogOpen(false);
          setCartItems([]);
          if (cartGuestMode) clearZustandItems();
        }}
      />

      <SignInDialog isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} callbackUrl={signInCallbackUrl} />
    </>
  );
};

export default Navbar;
