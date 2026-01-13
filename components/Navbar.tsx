"use client";
import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  User,
  Globe,
  ChevronDown,
  Search,
  Phone,
  Heart,
} from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { Link } from "@/i18n/routing";
import CartSheet from "../components/CartSheet";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState("AR");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [cartItems, setCartItems] = useState(3);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // temporary mock data – replace with real cart later
  const cartData = []; // empty = dummy items will show

  const handleRemoveItem = async (id: string) => {
    console.log("remove item", id);
  };

  const onOpenDonationDialog = () => {
    console.log("open donation dialog");
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const languages = [
    { code: "AR", name: "العربية", countryCode: "SA" },
    { code: "EN", name: "English", countryCode: "GB" },
    { code: "TR", name: "Türkçe", countryCode: "TR" },
  ];

  const currencies = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  ];

  const navLinks = [
    { name: "المشاريع", href: "/campaign" },
    { name: "الأخبار", href: "/blog" },
    { name: "الأنشطة و الفاعليات", href: "#" },
    { name: "برامجنا", href: "#" },
    { name: "من نحن", href: "/about-us" },
    { name: "اتصل بنا", href: "/contact-us" },
  ];

  return (
    <>
      {/* Top Bar - Visible only on desktop and collapses smoothly on scroll */}
      <div
        className={`hidden lg:flex bg-gradient-to-r from-slate-50 via-orange-50/30 to-slate-50 border-b border-orange-100 transition-all duration-300 ${
          isScrolled ? "h-0 opacity-0 overflow-hidden" : "h-12 opacity-100"
        }`}
      >
        <div className="container mx-auto px-6 h-full">
          <div className="flex justify-between items-center h-full text-sm">
            <div className="flex items-center gap-8">
              <a
                href="tel:+902122885930"
                className="flex items-center gap-2.5 text-gray-700 hover:text-orange-600 transition-all group"
              >
                <Phone className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span dir="ltr" className="font-semibold tracking-wide">
                  +90 212 288 59 30
                </span>
              </a>

              <div className="flex items-center gap-4">
                {[
                  { icon: "fab fa-facebook-f", color: "hover:text-blue-600" },
                  { icon: "fab fa-twitter", color: "hover:text-sky-500" },
                  { icon: "fab fa-instagram", color: "hover:text-pink-600" },
                  { icon: "fab fa-youtube", color: "hover:text-red-600" },
                ].map((social, idx) => (
                  <a
                    key={idx}
                    href="#"
                    className={`text-gray-600 ${social.color} transition-all hover:scale-125 hover:-translate-y-1`}
                  >
                    <i className={`${social.icon} text-base`} />
                  </a>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Language Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsLangOpen(!isLangOpen);
                    setIsCurrencyOpen(false);
                  }}
                  className="flex items-center gap-2 px-2"
                >
                  <ReactCountryFlag
                    countryCode={
                      languages.find((l) => l.code === selectedLang)
                        ?.countryCode
                    }
                    svg
                    style={{
                      width: "1.25em",
                      height: "1.25em",
                    }}
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    {selectedLang}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isLangOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isLangOpen && (
                  <div className="absolute top-full mt-2 left-0 bg-white/95 backdrop-blur-lg shadow-2xl rounded-2xl min-w-48 border border-orange-100 z-50 overflow-hidden">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLang(lang.code);
                          setIsLangOpen(false);
                        }}
                        className={`flex items-center gap-4 w-full px-6 py-3 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent transition-all ${
                          selectedLang === lang.code
                            ? "bg-orange-100 text-orange-700 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        <ReactCountryFlag
                          countryCode={lang.countryCode}
                          svg
                          style={{
                            width: "1.5em",
                            height: "1.5em",
                          }}
                        />
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-gray-300" />

              {/* Currency Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsCurrencyOpen(!isCurrencyOpen);
                    setIsLangOpen(false);
                  }}
                  className="flex items-center gap-2 px-2"
                >
                  <span className="font-bold text-gray-800">
                    {
                      currencies.find((c) => c.code === selectedCurrency)
                        ?.symbol
                    }
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {selectedCurrency}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isCurrencyOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isCurrencyOpen && (
                  <div className="absolute top-full mt-2 left-0 bg-white/95 backdrop-blur-lg shadow-2xl rounded-2xl min-w-44 border border-orange-100 z-50">
                    {currencies.map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => {
                          setSelectedCurrency(curr.code);
                          setIsCurrencyOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-6 py-3 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent transition-all ${
                          selectedCurrency === curr.code
                            ? "bg-orange-100 text-orange-700 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        <span>{curr.name}</span>
                        <span className="font-bold">{curr.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar - Always fixed at top-0 */}
      <header
        className={`fixed left-0 py-2 right-0 z-40 bg-white/95 backdrop-blur-md shadow-md transition-all duration-200 ${
          isScrolled ? "top-0 shadow-2xl" : "top-0 lg:top-[48px]"
        }`}
      >
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex gap-8">
              <div className="flex-shrink-0">
                <Link href="/">
                  <img
                    src="https://i.ibb.co/ZwcJcN1/logo.webp"
                    alt="جمعية قرة العيون"
                    className="transition-all duration-300 h-16"
                  />
                </Link>
              </div>

              {/* Desktop Navigation */}
            </div>
            <nav className="hidden lg:flex items-center gap-10">
              {navLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="relative text-gray-800 font-semibold text-base group"
                >
                  {link.name}
                  <span className="absolute -bottom-2 left-0 w-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-5">
              {/* Search */}
              <div className="relative group">
                <input
                  type="text"
                  placeholder="ابحث..."
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="px-5 py-3 pr-12 bg-gray-50/80 backdrop-blur border border-gray-200 rounded-2xl w-56 text-sm text-right focus:outline-none focus:ring-4 focus:ring-orange-200 focus:bg-white transition-all duration-300"
                />
                <Search
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-all duration-300 ${
                    searchFocused ? "text-orange-600 scale-110" : ""
                  }`}
                />
              </div>

              {/* User & Cart */}
              <button className="relative p-3 rounded-full hover:bg-orange-50 transition-all group">
                <User className="w-6 h-6 text-gray-700 group-hover:text-orange-600 transition-colors" />
                <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  حسابي
                </span>
              </button>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-3 rounded-full hover:bg-orange-50 transition-all group"
              >
                <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-orange-600 transition-colors" />

                {cartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-br from-orange-500 to-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse ring-4 ring-orange-200">
                    {cartItems}
                  </span>
                )}

                <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  السلة
                </span>
              </button>
            </div>

            {/* Mobile Controls - Clean and Simple */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-gray-700" />

                {cartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-br from-orange-500 to-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    {cartItems}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-In Menu */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div
          className={`absolute left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Menu Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <img
              src="https://i.ibb.co/ZwcJcN1/logo.webp"
              alt="جمعية قرة العيون"
              className="h-14"
            />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 space-y-5 overflow-y-auto h-[calc(100%-100px)]">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن مشروع أو تبرع..."
                className="w-full px-5 py-4 pr-14 bg-gray-50 rounded-2xl text-right focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all"
              />
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-orange-500" />
            </div>

            {/* User Account Button */}
            <button className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-50 to-transparent rounded-2xl hover:from-orange-100 transition-all group border border-orange-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-base font-bold text-gray-800">حسابي</span>
              </div>
              <ChevronDown className="-rotate-90 w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
            </button>

            {/* Language & Currency Selection Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsLangOpen(!isLangOpen);
                    setIsCurrencyOpen(false);
                  }}
                  className="w-full flex flex-col items-center gap-2 px-3 py-3.5 bg-white border-2 border-gray-200 rounded-xl hover:border-orange-300 transition-all"
                >
                  <ReactCountryFlag
                    countryCode={
                      languages.find((l) => l.code === selectedLang)
                        ?.countryCode
                    }
                    svg
                    style={{
                      width: "2em",
                      height: "2em",
                    }}
                  />
                  <span className="text-sm font-bold text-gray-700">
                    {selectedLang}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isLangOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isLangOpen && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white shadow-2xl rounded-xl py-2 border border-orange-100 z-50">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLang(lang.code);
                          setIsLangOpen(false);
                        }}
                        className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-orange-50 transition ${
                          selectedLang === lang.code
                            ? "bg-orange-100 text-orange-700 font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        <ReactCountryFlag
                          countryCode={lang.countryCode}
                          svg
                          style={{
                            width: "1.5em",
                            height: "1.5em",
                          }}
                        />
                        <span className="text-sm">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Currency Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsCurrencyOpen(!isCurrencyOpen);
                    setIsLangOpen(false);
                  }}
                  className="w-full flex flex-col items-center gap-2 px-3 py-3.5 bg-white border-2 border-gray-200 rounded-xl hover:border-orange-300 transition-all"
                >
                  <span className="font-bold text-2xl text-gray-800">
                    {
                      currencies.find((c) => c.code === selectedCurrency)
                        ?.symbol
                    }
                  </span>
                  <span className="text-sm font-bold text-gray-700">
                    {selectedCurrency}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isCurrencyOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isCurrencyOpen && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white shadow-2xl rounded-xl py-2 border border-orange-100 z-50">
                    {currencies.map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => {
                          setSelectedCurrency(curr.code);
                          setIsCurrencyOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-4 py-3 hover:bg-orange-50 transition ${
                          selectedCurrency === curr.code
                            ? "bg-orange-100 text-orange-700 font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        <span className="text-sm">{curr.name}</span>
                        <span className="font-bold text-base">
                          {curr.symbol}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block py-4 px-5 text-base font-semibold text-gray-800 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Donate Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Heart className="w-6 h-6 fill-white animate-pulse" />
              تبرع الآن
            </button>

            {/* Contact & Social */}
            <div className="pt-4 border-t border-gray-200 space-y-4">
              <a
                href="tel:+902122885930"
                className="flex items-center justify-center gap-2 text-base font-bold text-orange-600 hover:text-orange-700 transition-colors py-3 bg-orange-50 rounded-xl"
              >
                <Phone className="w-5 h-5" />
                <span dir="ltr">+90 212 288 59 30</span>
              </a>
              <div className="flex justify-center gap-6 py-2">
                {[
                  { icon: "facebook-f", color: "hover:text-blue-600" },
                  { icon: "twitter", color: "hover:text-sky-500" },
                  { icon: "instagram", color: "hover:text-pink-600" },
                  { icon: "youtube", color: "hover:text-red-600" },
                ].map((platform) => (
                  <a
                    key={platform.icon}
                    href="#"
                    className={`text-2xl text-gray-600 ${platform.color} transition-all hover:scale-125`}
                  >
                    <i className={`fab fa-${platform.icon}`} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <CartSheet
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        cartItems={cartData}
        handleRemoveItem={handleRemoveItem}
        onOpenDonationDialog={onOpenDonationDialog}
      />
    </>
  );
};

export default Navbar;
