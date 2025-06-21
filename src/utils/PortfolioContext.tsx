import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from "react";

export interface MonthlyPortfolioSize {
  month: string;
  year: number;
  size: number;
  updatedAt: string;
}

interface PortfolioContextType {
  portfolioSize: number; // For backward compatibility
  monthlyPortfolioSizes: MonthlyPortfolioSize[];
  setPortfolioSize: (size: number, month: string, year: number) => void;
  getPortfolioSize: (month: string, year: number) => number;
  getLatestPortfolioSize: () => number;
}

const PORTFOLIO_SIZES_KEY = 'monthlyPortfolioSizes';
const DEFAULT_PORTFOLIO_SIZE = 100000; // Default 100k

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// localStorage helpers
function fetchPortfolioSizes(): MonthlyPortfolioSize[] {
  try {
    const stored = localStorage.getItem('portfolioSizes');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error fetching portfolio sizes:', error);
    return [];
  }
}

function savePortfolioSizes(sizes: MonthlyPortfolioSize[]) {
  try {
    localStorage.setItem('portfolioSizes', JSON.stringify(sizes));
  } catch (error) {
    console.error('localStorage save error:', error);
  }
}

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  const [monthlyPortfolioSizes, setMonthlyPortfolioSizes] = useState<MonthlyPortfolioSize[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const sizes = fetchPortfolioSizes();
    if (Array.isArray(sizes)) {
      setMonthlyPortfolioSizes(sizes);
    }
    setHydrated(true);
  }, []);

  // Save to localStorage when monthlyPortfolioSizes changes
  useEffect(() => {
    if (hydrated) {
      savePortfolioSizes(monthlyPortfolioSizes);
    }
  }, [monthlyPortfolioSizes, hydrated]);

  // For backward compatibility
  const portfolioSize = useCallback(() => {
    if (monthlyPortfolioSizes.length === 0) return DEFAULT_PORTFOLIO_SIZE;
    const sorted = [...monthlyPortfolioSizes].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return sorted[0].size;
  }, [monthlyPortfolioSizes]);

  const setPortfolioSize = useCallback((size: number, month: string, year: number) => {
    setMonthlyPortfolioSizes(prev => {
      // Create a new array to ensure state updates are detected
      const updatedSizes = [...prev];
      const existingIndex = updatedSizes.findIndex(
        item => item.month === month && item.year === year
      );
      
      const newSize = {
        month,
        year,
        size,
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        // Update existing
        updatedSizes[existingIndex] = newSize;
      } else {
        // Add new
        updatedSizes.push(newSize);
      }
      
      // Sort by year and month to ensure consistent ordering
      updatedSizes.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(a.month) - months.indexOf(b.month);
      });
      
      return updatedSizes;
    });
  }, []);

  const getPortfolioSize = useCallback((month: string, year: number): number => {
    const size = monthlyPortfolioSizes.find(
      item => item.month === month && item.year === year
    );
    
    if (size) return size.size;
    
    // If no specific size for this month, find the most recent one *within the same year* or fallback to default
    const monthIndex = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ].indexOf(month);
    
    if (monthIndex === -1) return DEFAULT_PORTFOLIO_SIZE; // Should not happen with valid month names
    
    const currentDate = new Date(year, monthIndex, 1);
    
    const previousSizesInSameYear = monthlyPortfolioSizes
      .filter(item => {
        const itemMonthIndex = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ].indexOf(item.month);
        const itemDate = new Date(item.year, itemMonthIndex, 1);
        // Only consider previous sizes within the same year
        return itemDate < currentDate && item.year === year;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    // If a previous size exists in the same year, use it, otherwise use the default
    return previousSizesInSameYear[0]?.size || DEFAULT_PORTFOLIO_SIZE;
  }, [monthlyPortfolioSizes]);

  const getLatestPortfolioSize = useCallback((): number => {
    if (monthlyPortfolioSizes.length === 0) return DEFAULT_PORTFOLIO_SIZE;
    const sorted = [...monthlyPortfolioSizes].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return sorted[0].size;
  }, [monthlyPortfolioSizes]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    portfolioSize: portfolioSize(),
    monthlyPortfolioSizes,
    setPortfolioSize,
    getPortfolioSize,
    getLatestPortfolioSize
  }), [portfolioSize, monthlyPortfolioSizes, setPortfolioSize, getPortfolioSize, getLatestPortfolioSize]);

  // Only render children after hydration
  if (!hydrated) return null;

  return (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = (): PortfolioContextType => {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within a PortfolioProvider");
  return ctx;
};