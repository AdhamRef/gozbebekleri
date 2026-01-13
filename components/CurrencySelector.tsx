"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar" },
  { code: "QAR", symbol: "﷼", name: "Qatari Riyal" },
  { code: "BHD", symbol: "ب.د", name: "Bahraini Dinar" },
];

const BASE_CURRENCY = "USD"; // Base currency for fetching rates
const CACHE_KEY = "cachedExchangeRates"; // Key for storing cached rates in localStorage
const CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache duration: 24 hours in milliseconds

export default function CurrencySelector({ className = '' }: CurrencySelectorProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(
    {}
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const exchangeRateApiKey = "db9e1f2395aac69fe3648487";

  // Fetch exchange rates only if the cached data is older than 24 hours
  useEffect(() => {
    const fetchExchangeRates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/${BASE_CURRENCY}`
        );
        const data = await response.json();
        if (data.result === "success") {
          setExchangeRates(data.conversion_rates);
          // Cache the rates along with a timestamp
          const cacheData = {
            rates: data.conversion_rates,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } else {
          setError("Failed to fetch exchange rates: " + data.error);
          console.error("Failed to fetch exchange rates:", data.error);
        }
      } catch (error) {
        setError("Error fetching exchange rates: " + error.message);
        console.error("Error fetching exchange rates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Check if cached data exists and is still valid
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { rates, timestamp } = JSON.parse(cachedData);
      const isCacheValid = Date.now() - timestamp < CACHE_DURATION;

      if (isCacheValid) {
        // Use cached rates if they are still valid
        setExchangeRates(rates);
        setIsLoading(false);
      } else {
        // Fetch new rates if the cache is expired
        fetchExchangeRates();
      }
    } else {
      // Fetch rates if no cached data exists
      fetchExchangeRates();
    }
  }, []);

  // Load saved currency from cookies
  useEffect(() => {
    const savedCurrency = Cookies.get("currency");
    if (savedCurrency) {
      setSelectedCurrency(savedCurrency);
    }
  }, []);

  const handleCurrencyChange = (currencyCode: string) => {
    setSelectedCurrency(currencyCode);
    Cookies.set("currency", currencyCode, { expires: 365 });
    window.location.reload();
  };

  // Get the exchange rate for the selected currency
  const exchangeRate =
    selectedCurrency === BASE_CURRENCY
      ? 1
      : exchangeRates[selectedCurrency] || 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="rounded-lg flex items-center gap-2 w-full"
        >
          <span>
            {selectedCurrency} (
            {currencies.find((c) => c.code === selectedCurrency)?.symbol})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-2">
        {isLoading ? (
          <DropdownMenuItem className="flex items-center gap-2 p-2">
            <span>Loading...</span>
          </DropdownMenuItem>
        ) : error ? (
          <DropdownMenuItem className="flex items-center gap-2 p-2">
            <span>{error}</span>
          </DropdownMenuItem>
        ) : (
          currencies.map((curr) => (
            <DropdownMenuItem
              key={curr.code}
              onClick={() => handleCurrencyChange(curr.code)}
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-emerald-50 rounded-lg"
            >
              <span className="flex items-center justify-between w-full">
                <span className="w-max">{curr.name} ({curr.code})</span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
