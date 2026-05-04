import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

const CACHE_KEY = "cachedExchangeRates";
/** Slightly under 1h so we pick up server hourly refresh without extra third-party API calls. */
const CACHE_DURATION = 50 * 60 * 1000;

const useCurrencyConverter = () => {
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRates = async () => {
    try {
      const res = await fetch("/api/exchange/rates", { cache: "no-store" });
      const data = await res.json();
      if (data.result === "success" && (data.conversion_rates || data.rates)) {
        const map = (data.conversion_rates || data.rates) as Record<string, number>;
        setExchangeRates(map);
        const updated = data.time_last_update_utc || data.updatedAt || new Date().toISOString();
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            rates: map,
            timestamp: Date.now(),
            time_last_update_utc: updated,
          })
        );
      }
    } catch (err) {
      console.error("Failed to fetch exchange rates", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached);
      const valid = Date.now() - timestamp < CACHE_DURATION;
      if (valid) {
        setExchangeRates(rates);
        setLoading(false);
        return;
      }
    }
    fetchRates();
  }, []);

  const getSelectedCurrency = () => Cookies.get("currency") || "DEFAULT";

  const convertToCurrency = (value: number) => {
    const currency = getSelectedCurrency();
    if (currency === "DEFAULT") return { convertedValue: value, currency: "USD", exchangeRate: 1 };
    if (!exchangeRates) return { convertedValue: null, currency: null, exchangeRate: null };
    const exchangeRate = exchangeRates[currency];
    if (!exchangeRate) return { convertedValue: null, currency, exchangeRate: null };
    return { convertedValue: value * exchangeRate, currency, exchangeRate };
  };

  return { convertToCurrency, getSelectedCurrency, exchangeRates, loading };
};

export default useCurrencyConverter;
