"use client";
import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  User,
  ChevronDown,
  Search,
  Phone,
  Heart,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import axios from "axios";
import { useSession, signOut } from "next-auth/react";
import CartSheet from "../components/CartSheet";
import CurrencySelector from "./CurrencySelector";
import LanguageSwitcher from "./LanguageSelector";
import SignInDialog from "@/components/SignInDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CartPaymentDialog from "./CartPaymentDialog";
import { AnimatePresence, motion } from "framer-motion";

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

const Navbar = () => {
  const t = useTranslations("Navbar");
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartPaymentDialogOpen, setIsCartPaymentDialogOpen] = useState(false);


  // Fetch cart items when user is logged in
  useEffect(() => {
    const fetchCartItems = async () => {
      if (session?.user && status === "authenticated") {
        setCartLoading(true);
        try {
          const response = await axios.get("/api/cart");
          setCartItems(response.data);
        } catch (error) {
          console.error("Failed to fetch cart items:", error);
          setCartItems([]);
        } finally {
          setCartLoading(false);
        }
      } else {
        setCartItems([]);
      }
    };

    fetchCartItems();
  }, [session, status]);

  const handleRemoveItem = async (id: string) => {
    try {
      await axios.delete(`/api/cart/${id}`);
      // Remove item from local state
      setCartItems(prevItems => prevItems.filter(item => item.id !== id));
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  const onOpenDonationDialog = () => {
    console.log("open donation dialog");
  };

  // Refresh cart items (can be called after adding items)
  const refreshCart = async () => {
    if (session?.user) {
      try {
        const response = await axios.get("/api/cart");
        setCartItems(response.data);
      } catch (error) {
        console.error("Failed to refresh cart:", error);
      }
    }
  };

  const dropdownVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" as const },
    },
    exit: {
      opacity: 0,
      y: 5,
      scale: 0.97,
      transition: { duration: 0.15, ease: "easeIn" as const },
    },
  };
  

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const navLinks = [
    { name: t("projects"), href: "/campaigns" },
    // Blog - explicit label so translators can update it independently from "news"
    { name: t("blog"), href: "/blog" },
    //{ name: t("events"), href: "#" },
    //{ name: t("programs"), href: "#" },
    { name: t("about"), href: "/about-us" },
    { name: t("contact"), href: "/contact-us" },
  ];

  // Localized categories dropdown
  const locale = useLocale() as "ar" | "en" | "fr";
  const isRTL = locale === "ar";
  const [categories, setCategories] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchCategories = async () => {
      setCatLoading(true);
      try {
        const res = await axios.get(`/api/categories?locale=${locale}&limit=12&counts=true`);
        const data = res.data?.items ? res.data.items : res.data;
        if (!Array.isArray(data)) {
          setCategories([]);
        } else {
          const getName = (c: any) => {
            if (c.name) return c.name;
            if (Array.isArray(c.translations)) {
              const tr = c.translations.find((t: any) => t.locale === locale);
              if (tr && tr.name) return tr.name;
            }
            // Fallbacks based on locale
            if (locale === 'ar') return c.titleAr || c.title || c.slug || c.id;
            if (locale === 'en') return c.titleEn || c.title || c.slug || c.id;
            if (locale === 'fr') return c.titleFr || c.title || c.slug || c.id;
            return c.title || c.slug || c.id;
          };

          setCategories(data.map((c: any) => ({
            id: c.id,
            name: getName(c),
            slug: c.slug,
            campaignCount: c.campaignCount ?? c._count?.campaigns ?? undefined,
          })));
        }
        setCatError(null);
      } catch (err) {
        console.error("Failed to load categories", err);
        setCatError("Failed to load categories");
      } finally {
        if (mounted) setCatLoading(false);
      }
    };
    fetchCategories();
    return () => {
      mounted = false;
    };
  }, [locale]);

  const handleUserClick = () => {
    if (session) {
      setIsUserMenuOpen(!isUserMenuOpen);
    } else {
      setIsSignInOpen(true);
    }
  };

  const handleSignOut = () => {
    signOut();
    setIsUserMenuOpen(false);
  };

  // Calculate total cart items count
  const cartItemsCount = cartItems.length;

  return (
    <>
      {/* Top Bar - Desktop only, collapses on scroll */}
      <div
        className={`hidden absolute top-0 left-0 right-0 z-50 xl:flex bg-gradient-to-r from-sky-100 via-sky-50 to-sky-100 border-b border-sky-100 transition-all duration-300 ${isScrolled ? "h-0 opacity-0 overflow-hidden" : "h-11 xl:h-12 opacity-100"}`}
      >
        <div className="container mx-auto px-4 sm:px-6 h-full max-w-7xl">
          <div className="flex justify-between items-center h-full text-sm">
            <div className="flex items-center gap-6 xl:gap-8">
              <a
                href="tel:+902122885930"
                className="flex items-center gap-2 text-gray-700 hover:text-sky-600 transition-colors group"
              >
                <Phone className="w-4 h-4 shrink-0 group-hover:rotate-12 transition-transform" />
                <span dir="ltr" className="font-semibold tracking-wide whitespace-nowrap">+90 212 288 59 30</span>
              </a>
              <div className="flex items-center gap-3 xl:gap-4">
                {[
                  { icon: "fab fa-facebook-f", color: "hover:text-blue-600" },
                  { icon: "fab fa-twitter", color: "hover:text-sky-500" },
                  { icon: "fab fa-instagram", color: "hover:text-pink-600" },
                  { icon: "fab fa-youtube", color: "hover:text-red-600" },
                ].map((social, idx) => (
                  <a key={idx} href="#" className={`text-gray-600 ${social.color} transition-colors hover:scale-110`} aria-hidden><i className={`${social.icon} text-base`} /></a>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 xl:gap-4">
              <LanguageSwitcher />
              <div className="w-px h-5 bg-gray-300" aria-hidden />
              <CurrencySelector />
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header
        className={`fixed left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm transition-all duration-200 ${isScrolled ? "top-0 shadow-md" : "top-0 xl:top-12"}`}
      >
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="flex justify-between items-center gap-4 min-h-[4.5rem] sm:min-h-[5rem] lg:min-h-[5.5rem]">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 rounded-lg">
                <img
                  src="https://i.ibb.co/ZwcJcN1/logo.webp"
                  alt="جمعية قرة العيون"
                  className="h-12 sm:h-14 lg:h-16 w-auto object-contain transition-transform hover:scale-[1.02]"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8 flex-1 justify-center" aria-label="Main">
              {navLinks.map((link, index) => {
                if (link.href === "/campaigns") {
                  return (
                    <div
                      key={index}
                      className="relative"
                      onMouseEnter={() => setIsCategoriesOpen(true)}
                      onMouseLeave={() => setIsCategoriesOpen(false)}
                    >
                      <Link
                        href={link.href}
                        className="relative text-gray-800 dark:text-slate-100 font-semibold text-base group flex items-center gap-1"
                        onFocus={() => setIsCategoriesOpen(true)}
                        onBlur={() => setIsCategoriesOpen(false)}
                        aria-expanded={isCategoriesOpen}
                        aria-haspopup="menu"
                      >
                        {link.name}
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                        <span className="absolute -bottom-2 left-0 w-0 h-1 bg-gradient-to-r from-sky-500 to-sky-600 rounded-full transition-all duration-300 group-hover:w-full" />
                      </Link>

                      {/* Dropdown Panel */}
                      {isCategoriesOpen && (
                        <div
                          className={`absolute mt-2 ${isRTL ? "right-0" : "left-0"} w-64 sm:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-2 z-50 max-h-[min(70vh,24rem)] overflow-y-auto`}
                          role="menu"
                        >
                          {catLoading ? (
                            <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">{t("loading") || "Loading..."}</div>
                          ) : catError ? (
                            <div className="p-4 text-center text-sm text-red-600">{catError}</div>
                          ) : categories.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">{t("noCategories") || "No categories"}</div>
                          ) : (
                            <div className="grid grid-cols-1 gap-0.5">
                              {categories.map((cat) => (
                                <Link
                                  key={cat.id}
                                  href={`/category/${cat.id}`}
                                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-sm text-gray-800 dark:text-slate-200 transition-colors"
                                  role="menuitem"
                                >
                                  <span className="truncate">{cat.name}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={index}
                    href={link.href}
                    className="relative text-gray-800 dark:text-slate-100 font-semibold text-base group"
                  >
                    {link.name}
                    <span className="absolute -bottom-2 left-0 w-0 h-1 bg-gradient-to-r from-sky-500 to-sky-600 rounded-full transition-all duration-300 group-hover:w-full" />
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-5 shrink-0">
              {/* Search */}
              <div className="relative group">
                <input
                  type="text"
                  placeholder={t("search")}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-44 xl:w-56 px-4 py-2.5 pr-11 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-700 transition-all"
                />
                <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-slate-400 transition-colors ${searchFocused ? "text-sky-600" : ""}`} />
              </div>

              {/* User Menu with Dropdown */}
              <div className="relative user-menu-container">
                <button
                  onClick={handleUserClick}
                  className="relative rounded-full hover:bg-sky-50 transition-all group"
                >
                  {session ? (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={session.user?.image || ""} />
                      <AvatarFallback className="bg-sky-100 text-sky-700 text-xs">
                        {session.user?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <User className="w-6 h-6 text-gray-700 group-hover:text-sky-600 transition-colors" />
                  )}
                  <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {session ? session.user?.name : t("myAccount")}
                  </span>
                </button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {session && isUserMenuOpen && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={`absolute mt-2 min-w-[12rem] ${isRTL ? "left-0" : "right-0"} bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-600 overflow-hidden z-50`}
                    >
                      <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={session.user?.image || ""} />
                            <AvatarFallback className="bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-sm">
                              {session.user?.name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{session.user?.name}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{session.user?.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="py-1 text-sm">
                        <a href="/dashboard" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 transition-colors">
                          <LayoutDashboard size={16} className="shrink-0" />
                          {t("dashboard") || "Dashboard"}
                        </a>
                        <Link href="/profile?tab=account" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 transition-colors">
                          <User size={16} className="shrink-0" />
                          {t("myProfile") || "My Profile"}
                        </Link>
                        <Link href="/profile?tab=donations" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 transition-colors">
                          <Heart size={16} className="shrink-0" />
                          {t("myDonations") || "My Donations"}
                        </Link>
                        <button type="button" onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left">
                          <LogOut size={16} className="shrink-0" />
                          {t("signOut") || "Sign Out"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Cart */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors group"
                aria-label={t("cart")}
              >
                <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-slate-300 group-hover:text-sky-600 transition-colors" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center shadow">
                    {cartItemsCount > 99 ? "99+" : cartItemsCount}
                  </span>
                )}
                <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {t("cart")}
                </span>
              </button>
            </div>

            {/* Mobile: Cart + Menu toggle */}
            <div className="flex lg:hidden items-center gap-1 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors touch-manipulation"
                aria-label={t("cart")}
              >
                <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-slate-300" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-br from-orange-500 to-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center shadow">
                    {cartItemsCount > 99 ? "99+" : cartItemsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors touch-manipulation"
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-In Menu (RTL: slides from right; LTR: from left) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
        <div
          className={`absolute top-0 bottom-0 h-full w-[min(320px,88vw)] max-w-full bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-out ${
            isRTL
              ? isMobileMenuOpen ? "right-0 translate-x-0" : "right-0 translate-x-full"
              : isMobileMenuOpen ? "left-0 translate-x-0" : "left-0 -translate-x-full"
          }`}
        >
          {/* Menu Header */}
          <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex-shrink-0">
              <img src="https://i.ibb.co/ZwcJcN1/logo.webp" alt="قرة العيون" className="h-12 sm:h-14 w-auto object-contain" />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors touch-manipulation"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto overscroll-contain h-[calc(100vh-5.5rem)]">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder={t("searchMobile")}
                className="w-full px-4 py-3 pr-12 bg-gray-100 dark:bg-slate-800 border border-transparent rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-700 transition-all"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-500 pointer-events-none" />
            </div>

            {/* User block — SaaS-style signed-in card */}
            {session ? (
              <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700/80 shadow-sm shadow-gray-200/50 dark:shadow-none ring-1 ring-gray-100 dark:ring-slate-700/50">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12 rounded-xl border-2 border-white dark:border-slate-700 shadow-sm">
                        <AvatarImage src={session.user?.image || ""} alt="" className="object-cover" />
                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white text-sm font-semibold">
                          {session.user?.name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-800 bg-emerald-500" title="Signed in" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-0.5">
                        {t("signedInAs") || "Signed in as"}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">
                        {session.user?.name || "User"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <Link
                      href="/profile?tab=account"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-semibold shadow-sm transition-colors"
                    >
                      <User className="w-4 h-4 shrink-0" />
                      {t("profile") || "Profile"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-slate-200 transition-colors"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      {t("signOut") || "Sign out"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => { setIsSignInOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-sky-100 dark:bg-sky-900/50 rounded-full shrink-0"><User className="w-5 h-5 text-sky-600 dark:text-sky-400" /></div>
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate">{t("myAccount")}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 ${isRTL ? "" : "-rotate-90"}`} />
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-400">{t("chooseLanguage")}</span>
                <LanguageSwitcher />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-400">{t("chooseCurrency")}</span>
                <CurrencySelector />
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700" />

            <nav className="space-y-0.5" aria-label="Mobile menu">
              {navLinks.map((link) => {
                if (link.href === "/campaigns") {
                  return (
                    <div key={link.href}>
                      <button type="button" onClick={() => setMobileCategoriesOpen(!mobileCategoriesOpen)} className="w-full flex items-center justify-between py-3.5 px-4 text-sm font-semibold text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <span>{link.name}</span>
                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${mobileCategoriesOpen ? "rotate-180" : ""}`} />
                      </button>
                      {mobileCategoriesOpen && (
                        <div className={isRTL ? "pr-4 space-y-0.5" : "pl-4 space-y-0.5"}>
                          {catLoading ? <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-slate-400">{t("loading") || "Loading..."}</div> : catError ? <div className="px-4 py-2.5 text-sm text-red-600">{catError}</div> : categories.map((cat) => (
                            <Link key={cat.id} href={`/category/${cat.id}`} className="block py-2.5 px-4 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg truncate" onClick={() => setIsMobileMenuOpen(false)}>{cat.name}</Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <Link key={link.href} href={link.href} className="block py-3.5 px-4 text-sm font-semibold text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{link.name}</Link>
                );
              })}
            </nav>

            <Link href="/campaigns" onClick={() => setIsMobileMenuOpen(false)} className="w-full bg-gradient-to-r from-sky-600 to-sky-500 text-white py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <Heart className="w-5 h-5 fill-white" />
              {t("donateNow")}
            </Link>

            <div className="pt-3 border-t border-gray-200 dark:border-slate-700 space-y-3">
              <a href="tel:+902122885930" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                <Phone className="w-4 h-4 shrink-0" />
                <span dir="ltr">+90 212 288 59 30</span>
              </a>
              <div className="flex justify-center gap-4 py-1">
                {["facebook-f", "twitter", "instagram", "youtube"].map((icon) => (
                  <a key={icon} href="#" className="text-gray-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors text-lg"><i className={`fab fa-${icon}`} /></a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Sheet */}
      <CartSheet
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        cartItems={cartItems}
        handleRemoveItem={handleRemoveItem}
        onOpenDonationDialog={() => setIsCartPaymentDialogOpen(true)}
      />

      {/* Sign In Dialog */}
      <SignInDialog
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
      />

      <CartPaymentDialog
        isOpen={isCartPaymentDialogOpen}
        onClose={() => setIsCartPaymentDialogOpen(false)}
        cartItems={Array.isArray(cartItems) ? cartItems : []}
        amount={
          Array.isArray(cartItems)
            ? cartItems.reduce((total, item) => total + item.amount, 0)
            : 0
        }
      />
    </>
  );
};

export default Navbar;