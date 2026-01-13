import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

const BASE_CURRENCY = "USD";
const CACHE_KEY = "cachedExchangeRates";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h
const EXCHANGE_API_KEY = "db9e1f2395aac69fe3648487";

const useCurrencyConverter = () => {
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRates = async () => {
    try {
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${BASE_CURRENCY}`);
      const data = await res.json();
      if (data.result === "success") {
        setExchangeRates(data.conversion_rates);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.conversion_rates, timestamp: Date.now() }));
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

  const convertToCurrency = (value: number) => {
    const currency = Cookies.get("currency") || BASE_CURRENCY;
    if (!exchangeRates) return { convertedValue: null, currency: null, exchangeRate: null };
    const exchangeRate = exchangeRates[currency];
    if (!exchangeRate) return { convertedValue: null, currency, exchangeRate: null };
    return { convertedValue: value * exchangeRate, currency, exchangeRate };
  };

  return { convertToCurrency, exchangeRates, loading };
};

export default useCurrencyConverter;
