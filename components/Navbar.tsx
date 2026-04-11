"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  Search,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Heart,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  MessageCircle,
  Phone,
  UserCircle,
} from "lucide-react";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { useSession, signOut } from "next-auth/react";
import CartSheet from "../components/CartSheet";
import CurrencySelector from "./CurrencySelector";
import LanguageSwitcher from "./LanguageSelector";
import SignInDialog from "@/components/SignInDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CartPaymentDialog from "./CartPaymentDialog";
import { AnimatePresence, motion } from "framer-motion";
import { appendCurrencyQuery, getCurrencyCodeForLinks } from "@/lib/currency-link";

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

const LOGO_URL = "https://i.ibb.co/ZwcJcN1/logo.webp";

const Navbar = () => {
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartPaymentDialogOpen, setIsCartPaymentDialogOpen] = useState(false);
  const [signInCallbackUrl, setSignInCallbackUrl] = useState<string | undefined>(undefined);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get("openCartPayment") === "1") {
      setIsCartPaymentDialogOpen(true);
      router.replace(appendCurrencyQuery(pathname, getCurrencyCodeForLinks()));
    }
  }, [searchParams, pathname, router]);

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
    try {
      await axios.delete(`/api/cart/${id}`);
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } catch {}
  };

  const onOpenDonationDialog = () => {
    setIsCartOpen(false);
    setIsCartPaymentDialogOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        appendCurrencyQuery(
          `/campaigns?search=${encodeURIComponent(searchQuery.trim())}`,
          getCurrencyCodeForLinks()
        )
      );
      setSearchQuery("");
      setIsMobileMenuOpen(false);
    }
  };

  const openCart = () => {
    if (session?.user) {
      setIsCartOpen(true);
    } else {
      setSignInCallbackUrl(
        typeof window !== "undefined"
          ? appendCurrencyQuery(pathname, getCurrencyCodeForLinks())
          : undefined
      );
      setIsSignInOpen(true);
    }
  };

  const navLinks = [
    { href: "/about-us", label: t("about") },
    { href: "/campaigns", label: t("projects") },
    { href: "/blog", label: t("news") },
    // { href: "/campaigns", label: t("activities") },
    { href: "/contact-us", label: t("contact") },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 ${
          isScrolled ? "shadow-lg" : "shadow-md"
        }`}
      >
        {/* ── Top Info Bar (desktop only) ── */}
        <div className="bg-[#025EB8] text-white text-xs hidden lg:block">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-9">
            {/* Left: social icons + phone */}
            <div className="flex items-center gap-3">
              <a href="https://www.instagram.com/gozbebekleri_foundation/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-blue-200 transition-colors">
                <Instagram className="w-3.5 h-3.5" />
              </a>
              <a href="https://www.youtube.com/channel/UCvvSx8jtGafK9BI2hQnBYSQ" target="_blank" rel="noopener noreferrer" aria-label="Youtube" className="hover:text-blue-200 transition-colors">
                <Youtube className="w-3.5 h-3.5" />
              </a>
              <a href="https://www.facebook.com/gozbebeklerider/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-blue-200 transition-colors">
                <Facebook className="w-3.5 h-3.5" />
              </a>
              <a href="https://x.com/gozbebeklerider" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-blue-200 transition-colors">
                <Twitter className="w-3.5 h-3.5" />
              </a>
              <span className="border-l border-white/30 pl-3 flex items-center gap-1.5">
                <a href="https://wa.me/902122885930" className="flex items-center gap-1.5 hover:text-blue-200 transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span dir="ltr">+90 212 288 59 30</span>
                </a>
              </span>
            </div>
            {/* Right: language + currency */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <div className="border-l border-white/30 pl-3">
                <CurrencySelector />
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Navbar ── */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 flex items-center h-16 lg:h-[68px] gap-2">

            {/* Logo — always visible */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <Image src={LOGO_URL} alt="Logo" width={48} height={48} className="h-9 lg:h-12 w-auto object-contain" />
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {navLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-colors rounded-md ${
                    pathname === link.href
                      ? "text-[#025EB8]"
                      : "text-gray-700 hover:text-[#025EB8]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop: Search */}
            {/* <form
              onSubmit={handleSearch}
              className="hidden lg:flex items-center border border-gray-300 rounded-lg overflow-hidden flex-shrink-0"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder") || "Ara..."}
                className="px-3 py-2 text-sm outline-none w-44 xl:w-56"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors border-l border-gray-300"
              >
                <Search className="w-4 h-4 text-gray-500" />
              </button>
            </form> */}

            {/* Desktop: Donate button */}
            <Link
              href="/campaigns"
              className="hidden lg:flex items-center gap-1.5 bg-[#FA5D17] hover:bg-[#e04d0f] text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors flex-shrink-0"
            >
              <Heart className="w-4 h-4" />
              {t("donate") || "BAĞIŞ YAP"}
            </Link>

            {/* Spacer — pushes right-side items to the edge on mobile */}
            <div className="flex-1 lg:hidden" />

            {/* Mobile: Language + Currency */}
            <div className="flex lg:hidden items-center gap-0.5">
              <LanguageSwitcher onDark={false} />
              <CurrencySelector onDark={false} />
            </div>

            {/* Cart button — always visible */}
            <button
              type="button"
              onClick={openCart}
              className="relative p-2 text-gray-600 hover:text-[#025EB8] transition-colors flex-shrink-0"
              aria-label="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItems.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#FA5D17] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </button>

            {/* User avatar / Sign in */}
            {status === "authenticated" && session?.user ? (
              <div className={`relative flex-shrink-0 ${isRTL ? "mr-3" : "ml-3"}`} ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={session.user.image ?? ""} />
                    <AvatarFallback className="bg-[#025EB8] text-white text-xs">
                      {session.user.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden lg:block" />
                </button>
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800 truncate">{session.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                      </div>
                           {(session.user.role === "ADMIN" || session.user.role === "STAFF") && (
                        <a
                          href="/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#025EB8]" />
                          {isRTL ? "لوحة التحكم" : "Dashboard"}
                        </a>
                      )}
                      <Link
                        href="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UserCircle className="w-4 h-4 text-[#025EB8]" />
                        {t("profile") || "Profilim"}
                      </Link>
                 
                      <button
                        type="button"
                        onClick={() => { setIsUserMenuOpen(false); signOut(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t("signOut") || "Çıkış"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSignInCallbackUrl(
        typeof window !== "undefined"
          ? appendCurrencyQuery(pathname, getCurrencyCodeForLinks())
          : undefined
      );
                  setIsSignInOpen(true);
                }}
                className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-[#025EB8] transition-colors flex-shrink-0"
              >
                {t("signIn") || "Giriş Yap"}
              </button>
            )}

            {/* Mobile: Hamburger */}
            <button
              type="button"
              className="lg:hidden p-2 text-gray-700 flex-shrink-0"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* ── Mobile Menu ── */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden overflow-hidden border-t border-gray-200 bg-white"
              >
                {/* Search */}
                {/* <form
                  onSubmit={handleSearch}
                  className="flex items-center gap-2 px-4 py-3 border-b border-gray-100"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchPlaceholder") || "Ara..."}
                    className="flex-1 text-sm outline-none text-gray-700"
                  />
                  <button type="submit" className="text-gray-400 hover:text-[#025EB8] transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                </form> */}

                {/* Nav links */}
                {navLinks.map((link) => (
                  <Link
                    key={link.href + link.label}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-semibold uppercase tracking-wide border-b border-gray-100 transition-colors ${
                      pathname === link.href
                        ? "text-[#025EB8] bg-blue-50"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* User info (mobile) */}
                {status === "authenticated" && session?.user && (
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={session.user.image ?? ""} />
                      <AvatarFallback className="bg-[#025EB8] text-white text-xs">
                        {session.user.name?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{session.user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-lg bg-blue-50 text-[#025EB8] hover:bg-blue-100 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setIsMobileMenuOpen(false); signOut(); }}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Donate + Sign in */}
                <div className="px-4 py-3 flex gap-3 border-b border-gray-100">
                  <Link
                    href="/campaigns"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#FA5D17] hover:bg-[#e04d0f] text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    {t("donate") || "BAĞIŞ YAP"}
                  </Link>
                  {!session?.user && (
                    <button
                      type="button"
                      onClick={() => { setIsMobileMenuOpen(false); setIsSignInOpen(true); }}
                      className="flex-1 flex items-center justify-center text-sm font-medium text-[#025EB8] border border-[#025EB8] rounded-lg px-4 py-2.5 hover:bg-blue-50 transition-colors"
                    >
                      {t("signIn") || "Giriş Yap"}
                    </button>
                  )}
                </div>

                {/* Social links */}
                <div className="px-4 py-3 flex items-center justify-center gap-5">
                  <a href="https://www.instagram.com/gozbebekleri_foundation/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#025EB8] hover:text-white transition-colors">
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a href="https://www.youtube.com/channel/UCvvSx8jtGafK9BI2hQnBYSQ" target="_blank" rel="noopener noreferrer" aria-label="Youtube" className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#025EB8] hover:text-white transition-colors">
                    <Youtube className="w-4 h-4" />
                  </a>
                  <a href="https://www.facebook.com/gozbebeklerider/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#025EB8] hover:text-white transition-colors">
                    <Facebook className="w-4 h-4" />
                  </a>
                  <a href="https://x.com/gozbebeklerider" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#025EB8] hover:text-white transition-colors">
                    <Twitter className="w-4 h-4" />
                  </a>
                  <a href="https://wa.me/902122885930" aria-label="WhatsApp" className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#025EB8] hover:text-white transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

      {/* Cart Sheet */}
      <CartSheet
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        cartItems={cartItems}
        handleRemoveItem={handleRemoveItem}
        onOpenDonationDialog={onOpenDonationDialog}
      />

      {/* Cart Payment Dialog */}
      <CartPaymentDialog
        isOpen={isCartPaymentDialogOpen}
        onClose={() => setIsCartPaymentDialogOpen(false)}
        cartItems={cartItems}
        onSuccess={() => {
          setIsCartPaymentDialogOpen(false);
          setCartItems([]);
        }}
      />

      {/* Sign In Dialog */}
      <SignInDialog
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        callbackUrl={signInCallbackUrl}
      />
    </>
  );
};

export default Navbar;
