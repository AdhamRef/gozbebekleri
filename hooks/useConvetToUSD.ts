export default function useConvetToUSD(amount: number, currency: string): number {
    try {
      // Retrieve cached exchange rates from localStorage
      const cachedExchangeRates = localStorage.getItem('cachedExchangeRates');
      
      if (!cachedExchangeRates) {
        throw new Error('Cached exchange rates not found in localStorage');
      }
  
      // Parse the cached exchange rates
      const exchangeRates = JSON.parse(cachedExchangeRates);
  
      // Check if the currency exists in the rates
      const rate = exchangeRates.rates[currency];
      if (!rate) {
        throw new Error(`Exchange rate not found for currency: ${currency}`);
      }
  
      // Convert to USD by dividing by the exchange rate
      return amount / rate;
    } catch (error) {
      console.error('Error converting currency:', error);
      throw error;
    }
  }