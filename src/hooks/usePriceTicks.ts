import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PriceTick, fetchPriceTicks, fetchPriceTicksWithFallback, getTodayMarketOpen, isMarketOpen } from '../utils/priceTickApi';
import { isWeekend } from 'date-fns';

interface ProcessedTick extends Omit<PriceTick, 'dateTime'> {
  dateTime: string;
  timestamp: number;
}

export const usePriceTicks = (symbol: string) => {
  const [priceTicks, setPriceTicks] = useState<ProcessedTick[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  const processTicks = useCallback((data: any): ProcessedTick[] => {
    if (!data?.data?.ticks?.[symbol]) return [];
    
    return data.data.ticks[symbol].map((tick: any) => ({
      dateTime: tick[0],
      timestamp: new Date(tick[0]).getTime(),
      open: tick[1],
      high: tick[2],
      low: tick[3],
      close: tick[4],
      volume: tick[5],
      dayVolume: tick[6]
    }));
  }, [symbol]);

  // Fetch data for the current market session with fallback mechanism
  const fetchTicks = useCallback(async (fromDate?: Date, toDate?: Date) => {
    if (!symbol || !isMounted.current) {
      console.log('[usePriceTicks] No symbol provided or component unmounted');
      return [];
    }

    console.log(`[usePriceTicks] Attempting to fetch ticks for symbol: ${symbol}`);
    setLoading(true);
    setError(null);

    try {
      console.log(`[usePriceTicks] Calling primary fetchPriceTicks for ${symbol}`);
      let data;

      try {
        // Try primary API first
        data = await fetchPriceTicks(symbol, fromDate, toDate);
        console.log('[usePriceTicks] Primary API success:', data);
      } catch (primaryError) {
        console.warn('[usePriceTicks] Primary API failed, trying fallback:', primaryError);

        // If primary fails, try fallback mechanism
        data = await fetchPriceTicksWithFallback(symbol, fromDate, toDate);
        console.log('[usePriceTicks] Fallback API success:', data);
      }

      const processed = processTicks(data);
      console.log('[usePriceTicks] Processed ticks:', processed);

      if (isMounted.current) {
        setPriceTicks(processed);
        setLastUpdated(new Date());
        // Clear any previous errors on success
        setError(null);
      }

      return processed;
    } catch (err) {
      if (isMounted.current) {
        console.error('[usePriceTicks] All API attempts failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch price ticks';

        // Provide more specific error messages for common issues
        let userFriendlyError = errorMessage;
        if (errorMessage.includes('525') || errorMessage.includes('SSL')) {
          userFriendlyError = 'SSL connection failed. The API server may be temporarily unavailable.';
        } else if (errorMessage.includes('CORS')) {
          userFriendlyError = 'Cross-origin request blocked. Please check API configuration.';
        } else if (errorMessage.includes('timeout')) {
          userFriendlyError = 'Request timed out. Please check your internet connection.';
        } else if (errorMessage.includes('404')) {
          userFriendlyError = 'API endpoint not found. The service may be temporarily unavailable.';
        }

        setError(new Error(userFriendlyError));
      }
      return [];
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [symbol, processTicks]);

  // Stop polling
  const stopPolling = useCallback(() => {
    console.log('[usePriceTicks] Stopping polling.');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Helper function to determine if it's after-hours weekday (12:00 AM to 9:15 AM IST)
  const isAfterHoursWeekday = useCallback((): boolean => {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Only applies to weekdays (Monday=1 to Friday=5)
    if (day === 0 || day === 6) return false;

    // Check if time is between 12:00 AM (00:00) and 9:15 AM (09:15)
    if (hours < 9 || (hours === 9 && minutes < 15)) {
      return true;
    }

    return false;
  }, []);

  // Start polling with conditional interval based on market status, weekends, and after-hours
  const startPolling = useCallback(() => {
    // Clear any existing interval first
    stopPolling();

    const now = new Date();
    const isCurrentlyWeekend = isWeekend(now);
    const isCurrentlyMarketOpen = isMarketOpen();
    const isCurrentlyAfterHours = isAfterHoursWeekday();

    // Determine polling interval based on market status, weekend, and after-hours
    let pollingInterval: number;
    let marketStatus: string;

    if (isCurrentlyWeekend) {
      pollingInterval = 1800000; // 30 minutes on weekends (less frequent)
      marketStatus = 'Weekend';
    } else if (isCurrentlyAfterHours) {
      pollingInterval = 600000; // 10 minutes during after-hours weekdays (12:00 AM - 9:15 AM)
      marketStatus = 'After-Hours';
    } else if (isCurrentlyMarketOpen) {
      pollingInterval = 60000; // 1 minute during market hours (9:15 AM - 3:30 PM)
      marketStatus = 'Open';
    } else {
      pollingInterval = 600000; // 10 minutes when market is closed on weekdays (3:30 PM - 12:00 AM)
      marketStatus = 'Closed';
    }

    console.log(`[usePriceTicks] Starting polling for ${symbol} with interval: ${pollingInterval / 1000}s (Status: ${marketStatus})`);

    // Initial fetch - let the API determine the appropriate date range and interval
    fetchTicks();

    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
      const currentNow = new Date();
      const currentIsWeekend = isWeekend(currentNow);
      const currentIsMarketOpen = isMarketOpen();
      const currentIsAfterHours = isAfterHoursWeekday();

      // Determine current status and interval
      let currentPollingInterval: number;
      let currentMarketStatus: string;

      if (currentIsWeekend) {
        currentPollingInterval = 1800000; // 30 minutes
        currentMarketStatus = 'Weekend';
      } else if (currentIsAfterHours) {
        currentPollingInterval = 600000; // 10 minutes
        currentMarketStatus = 'After-Hours';
      } else if (currentIsMarketOpen) {
        currentPollingInterval = 60000; // 1 minute
        currentMarketStatus = 'Open';
      } else {
        currentPollingInterval = 600000; // 10 minutes
        currentMarketStatus = 'Closed';
      }

      // CRITICAL FIX: Prevent recursive polling that causes memory leaks
      // Instead of restarting polling, just continue with current interval
      // The useEffect will handle interval changes when dependencies change

      console.log(`[usePriceTicks] Polling for ${symbol}... (Status: ${currentMarketStatus})`);
      fetchTicks(); // Let API determine appropriate parameters
    }, pollingInterval);

    return () => {
      stopPolling();
    };
  }, [symbol, fetchTicks, stopPolling, isAfterHoursWeekday]);

  // Initialize and clean up
  useEffect(() => {
    isMounted.current = true;
    // Only start polling if a symbol is provided
    if (symbol) {
      startPolling();
    }
    
    return () => {
      isMounted.current = false;
      stopPolling();
    };
  }, [symbol, startPolling]); // symbol dependency ensures polling restarts if symbol changes

  // Function to refresh data
  const refresh = useCallback((fromDate?: Date, toDate?: Date) => {
    return fetchTicks(fromDate, toDate);
  }, [fetchTicks]);

  // Get the latest price
  const latestPrice = useMemo(() => {
    if (priceTicks.length === 0) return null;
    // Ensure the last tick is for the current symbol if the symbol changes rapidly
    const lastTick = priceTicks[priceTicks.length - 1];
     // Basic check if the tick data structure looks plausible
    if (Array.isArray((lastTick as any).ticks?.[symbol]) && (lastTick as any).ticks[symbol].length > 0) {
       const symbolTicks = (lastTick as any).ticks[symbol];
       const latest = symbolTicks[symbolTicks.length - 1];
       // Assuming index 4 is the close price based on PriceTicksResponse interface
       if (latest && typeof latest[4] === 'number'){
          // Create a simplified object matching ProcessedTick structure
          return { 
            dateTime: latest[0] || '', // Date string
            timestamp: new Date(latest[0] || '').getTime(), // Timestamp
            open: latest[1] || 0,
            high: latest[2] || 0,
            low: latest[3] || 0,
            close: latest[4] || 0, // Correct: Access close price from array index 4
            volume: latest[5] || 0,
            dayVolume: latest[6] || 0,
            // Include other properties from the main tick object if needed, but be cautious with types
             ...(typeof lastTick === 'object' && lastTick !== null ? lastTick : {})
          };
       }
    } else if (lastTick && typeof lastTick.close === 'number') {
       // Fallback for the processed tick structure if API response format changes or mock data is used
       return lastTick;
    }
    return null;
  }, [priceTicks, symbol]); // Add symbol dependency

  // Get price at a specific time
  const getPriceAtTime = useCallback((timestamp: Date): ProcessedTick | null => {
    if (priceTicks.length === 0) return null;
    
    const targetTime = timestamp.getTime();
    
    // Find the closest timestamp
    return priceTicks.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.timestamp - targetTime);
      const currDiff = Math.abs(curr.timestamp - targetTime);
      return prevDiff < currDiff ? prev : curr;
    });
  }, [priceTicks]);

  // Get price change percentage
  const priceChange = useMemo(() => {
    if (priceTicks.length < 2) return 0;
    const first = priceTicks[0].close;
    const last = priceTicks[priceTicks.length - 1].close;
    return ((last - first) / first) * 100;
  }, [priceTicks]);

  // Get today's market open time (9:08 AM IST)
  const getTodayMarketOpen = useCallback((): Date => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Market opens at 9:08 AM IST (UTC+5:30)
    today.setHours(9, 8, 0, 0);
    return today;
  }, []);

  return {
    priceTicks,
    latestPrice,
    loading,
    error,
    lastUpdated,
    refresh,
    getPriceAtTime,
    priceChange
  };
};
