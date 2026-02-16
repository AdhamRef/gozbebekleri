'use client'
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

interface ExchangeRates {
  rates: { [key: string]: number };
  time_last_update_utc: string; // API provides the last update time
}

const EXCHANGE_RATE_API_KEY = 'db9e1f2395aac69fe3648487';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Function to fetch exchange rates from the API
const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const response = await fetch(
    `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch exchange rates');
  }
  const data = await response.json();
  return {
    rates: data.conversion_rates, // The API returns rates under `conversion_rates`
    time_last_update_utc: data.time_last_update_utc, // Timestamp from the API
  };
};

// Function to get cached exchange rates from localStorage
const getCachedExchangeRates = (): ExchangeRates | null => {
  const cachedExchangeRatesString = localStorage.getItem('cachedExchangeRates');
  if (cachedExchangeRatesString) {
    const cachedExchangeRates: ExchangeRates = JSON.parse(cachedExchangeRatesString);
    const lastUpdateTime = new Date(cachedExchangeRates.time_last_update_utc).getTime();
    if (Date.now() - lastUpdateTime < CACHE_DURATION) {
      return cachedExchangeRates;
    }
  }
  return null;
};

// Hook for campaign value conversion
const useCampaignValue = (campaignValue: number): number | null => {
  const [convertedValue, setConvertedValue] = useState<number | null>(null);

  useEffect(() => {
    const currency = Cookies.get('currency') || 'USD'; // Get currency from cookies (default to USD)

    const fetchAndCacheExchangeRates = async () => {
      try {
        const exchangeRates = await fetchExchangeRates();
        localStorage.setItem('cachedExchangeRates', JSON.stringify(exchangeRates));
        const exchangeRate = exchangeRates.rates[currency];
        if (exchangeRate) {
          setConvertedValue(campaignValue * exchangeRate);
        } else {
          console.error('Currency not found in exchange rates');
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      }
    };

    const cachedExchangeRates = getCachedExchangeRates();
    if (cachedExchangeRates) {
      const exchangeRate = cachedExchangeRates.rates[currency];
      if (exchangeRate) {
        setConvertedValue(campaignValue * exchangeRate);
      } else {
        console.error('Currency not found in exchange rates');
      }
    } else {
      fetchAndCacheExchangeRates();
    }
  }, [campaignValue]);

  return convertedValue;
};

// Function to get the current currency
const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  TRY: '₺',
  SAR: '﷼',
  AED: 'دينار',
  KWD: 'دينار',
  EGP: 'EGP',
  QAR: '﷼',
  BHD: 'دينار',
};
/** Returns currency code (e.g. 'USD'). Use CURRENCY_SYMBOLS[code] for display symbol. */
export const getCurrency = (): string => {
  return typeof window === 'undefined' ? 'USD' : (Cookies.get('currency') || 'USD');
};


export default useCampaignValue;