"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { ChevronDown } from "lucide-react";

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar" },
  { code: "EGP", symbol: "EGP", name: "Egyptian Pound" },
  { code: "QAR", symbol: "﷼", name: "Qatari Riyal" },
  { code: "BHD", symbol: "ب.د", name: "Bahraini Dinar" },
];

const BASE_CURRENCY = "USD";
const CACHE_KEY = "cachedExchangeRates";
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export default function CurrencySelector() {
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  const exchangeRateApiKey = "db9e1f2395aac69fe3648487";

  /* =========================
     Load saved currency
  ========================= */
  useEffect(() => {
    const saved = Cookies.get("currency");
    if (saved) setSelectedCurrency(saved);
  }, []);

  /* =========================
     Fetch + cache rates
  ========================= */
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);

    if (cached) {
      const { rates, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        setExchangeRates(rates);
        return;
      }
    }

    fetch(
      `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/${BASE_CURRENCY}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setExchangeRates(data.conversion_rates);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              rates: data.conversion_rates,
              timestamp: Date.now(),
            })
          );
        }
      })
      .catch(console.error);
  }, []);

  const handleChange = (code: string) => {
    setSelectedCurrency(code);
    Cookies.set("currency", code, { expires: 365 });
    setIsCurrencyOpen(false);
    window.location.reload();
  };

  const current = currencies.find((c) => c.code === selectedCurrency);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsCurrencyOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition"
      >
        <span className="font-bold text-gray-800">
          {current?.symbol}
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

      {/* Dropdown */}
      {isCurrencyOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 min-w-48 rounded-2xl border border-sky-100 bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
          {currencies.map((curr) => (
            <button
              key={curr.code}
              onClick={() => handleChange(curr.code)}
              className={`flex items-center justify-between w-full px-6 py-3 text-sm transition-all
                hover:bg-gradient-to-r hover:from-sky-50 hover:to-transparent
                ${
                  selectedCurrency === curr.code
                    ? "bg-sky-100 text-sky-700 font-semibold"
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
  );
}
