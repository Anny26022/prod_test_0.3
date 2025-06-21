import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from "react";
import { getExitDatesWithFallback } from './accountingUtils';

export interface YearlyStartingCapital {
  year: number;
  startingCapital: number;
  updatedAt: string;
}

export interface MonthlyStartingCapitalOverride {
  id: string;
  month: string; // Short month name like 'Jan', 'Feb'
  year: number;
  startingCapital: number;
  updatedAt: string;
}

export interface CapitalChange {
  id: string;
  date: string;
  amount: number;  // Positive for deposits, negative for withdrawals
  type: 'deposit' | 'withdrawal';
  description: string;
}

export interface MonthlyTruePortfolio {
  month: string;
  year: number;
  startingCapital: number;
  capitalChanges: number; // Net deposits - withdrawals for the month
  pl: number; // P&L from trades for the month
  finalCapital: number; // Starting + changes + P&L
}

interface TruePortfolioContextType {
  // Core functions
  getTruePortfolioSize: (month: string, year: number, trades?: any[], useCashBasis?: boolean) => number;
  getLatestTruePortfolioSize: (trades?: any[], useCashBasis?: boolean) => number;

  // Starting capital management
  yearlyStartingCapitals: YearlyStartingCapital[];
  setYearlyStartingCapital: (year: number, amount: number) => void;
  getYearlyStartingCapital: (year: number) => number;

  // Monthly starting capital overrides
  monthlyStartingCapitalOverrides: MonthlyStartingCapitalOverride[];
  setMonthlyStartingCapitalOverride: (month: string, year: number, amount: number) => void;
  removeMonthlyStartingCapitalOverride: (month: string, year: number) => void;
  getMonthlyStartingCapitalOverride: (month: string, year: number) => number | null;

  // Capital changes
  capitalChanges: CapitalChange[];
  addCapitalChange: (change: Omit<CapitalChange, 'id'>) => void;
  updateCapitalChange: (change: CapitalChange) => void;
  deleteCapitalChange: (id: string) => void;

  // Monthly calculations
  getMonthlyTruePortfolio: (month: string, year: number, trades?: any[], useCashBasis?: boolean) => MonthlyTruePortfolio;
  getAllMonthlyTruePortfolios: (trades?: any[], useCashBasis?: boolean) => MonthlyTruePortfolio[];

  // Backward compatibility
  portfolioSize: number; // Latest true portfolio size
}

const TruePortfolioContext = createContext<TruePortfolioContextType | undefined>(undefined);

// localStorage helpers
function fetchYearlyStartingCapitals(): YearlyStartingCapital[] {
  try {
    const stored = localStorage.getItem('yearlyStartingCapitals');
    const capitals = stored ? JSON.parse(stored) : [];
    return capitals;
  } catch (error) {
    return [];
  }
}

function saveYearlyStartingCapitals(capitals: YearlyStartingCapital[]) {
  try {
    localStorage.setItem('yearlyStartingCapitals', JSON.stringify(capitals));
  } catch (error) {
    // Handle error silently
  }
}

function fetchCapitalChanges(): CapitalChange[] {
  try {
    const stored = localStorage.getItem('capitalChanges');
    const changes = stored ? JSON.parse(stored) : [];
    return changes;
  } catch (error) {
    return [];
  }
}

function saveCapitalChanges(changes: CapitalChange[]) {
  try {
    localStorage.setItem('capitalChanges', JSON.stringify(changes));
  } catch (error) {
    // Handle error silently
  }
}

function fetchMonthlyStartingCapitalOverrides(): MonthlyStartingCapitalOverride[] {
  try {
    const stored = localStorage.getItem('monthlyStartingCapitalOverrides');
    const overrides = stored ? JSON.parse(stored) : [];
    return overrides;
  } catch (error) {
    return [];
  }
}

function saveMonthlyStartingCapitalOverrides(overrides: MonthlyStartingCapitalOverride[]) {
  try {
    localStorage.setItem('monthlyStartingCapitalOverrides', JSON.stringify(overrides));
  } catch (error) {
    // Handle error silently
  }
}

export const TruePortfolioProvider = ({ children }: { children: ReactNode }) => {
  const [yearlyStartingCapitals, setYearlyStartingCapitals] = useState<YearlyStartingCapital[]>([]);
  const [capitalChanges, setCapitalChanges] = useState<CapitalChange[]>([]);
  const [monthlyStartingCapitalOverrides, setMonthlyStartingCapitalOverrides] = useState<MonthlyStartingCapitalOverride[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        // Load from localStorage
        const capitals = fetchYearlyStartingCapitals();
        const changes = fetchCapitalChanges();
        const overrides = fetchMonthlyStartingCapitalOverrides();

        if (Array.isArray(capitals)) {
          setYearlyStartingCapitals(capitals);
        }

        if (Array.isArray(changes)) {
          setCapitalChanges(changes);
        }

        if (Array.isArray(overrides)) {
          setMonthlyStartingCapitalOverrides(overrides);
        }
      } catch (error) {
        // Handle error silently
      } finally {
        setHydrated(true);
      }
    };

    loadData();
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    if (hydrated && yearlyStartingCapitals.length > 0) {
      saveYearlyStartingCapitals(yearlyStartingCapitals);
    }
  }, [yearlyStartingCapitals, hydrated]);

  useEffect(() => {
    if (hydrated && capitalChanges.length > 0) {
      saveCapitalChanges(capitalChanges);
    }
  }, [capitalChanges, hydrated]);

  useEffect(() => {
    if (hydrated && monthlyStartingCapitalOverrides.length > 0) {
      saveMonthlyStartingCapitalOverrides(monthlyStartingCapitalOverrides);
    }
  }, [monthlyStartingCapitalOverrides, hydrated]);

  const setYearlyStartingCapital = useCallback((year: number, amount: number) => {
    setYearlyStartingCapitals(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(item => item.year === year);
      
      const newCapital = {
        year,
        startingCapital: amount,
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        updated[existingIndex] = newCapital;
      } else {
        updated.push(newCapital);
      }
      
      return updated.sort((a, b) => a.year - b.year);
    });
  }, []);

  const getYearlyStartingCapital = useCallback((year: number): number => {
    const capital = yearlyStartingCapitals.find(item => item.year === year);
    return capital?.startingCapital || 0;
  }, [yearlyStartingCapitals]);

  const setMonthlyStartingCapitalOverride = useCallback((month: string, year: number, amount: number) => {
    const normalizedMonth = month.length > 3 ?
      ({ "January": "Jan", "February": "Feb", "March": "Mar", "April": "Apr", "May": "May", "June": "Jun",
         "July": "Jul", "August": "Aug", "September": "Sep", "October": "Oct", "November": "Nov", "December": "Dec" }[month] || month) :
      month;

    setMonthlyStartingCapitalOverrides(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(item => item.month === normalizedMonth && item.year === year);

      const newOverride: MonthlyStartingCapitalOverride = {
        id: `${normalizedMonth}-${year}`,
        month: normalizedMonth,
        year,
        startingCapital: amount,
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        updated[existingIndex] = newOverride;
      } else {
        updated.push(newOverride);
      }

      return updated.sort((a, b) => a.year - b.year || a.month.localeCompare(b.month));
    });
  }, []);

  const removeMonthlyStartingCapitalOverride = useCallback((month: string, year: number) => {
    const normalizedMonth = month.length > 3 ?
      ({ "January": "Jan", "February": "Feb", "March": "Mar", "April": "Apr", "May": "May", "June": "Jun",
         "July": "Jul", "August": "Aug", "September": "Sep", "October": "Oct", "November": "Nov", "December": "Dec" }[month] || month) :
      month;

    setMonthlyStartingCapitalOverrides(prev =>
      prev.filter(item => !(item.month === normalizedMonth && item.year === year))
    );
  }, []);

  const getMonthlyStartingCapitalOverride = useCallback((month: string, year: number): number | null => {
    const normalizedMonth = month.length > 3 ?
      ({ "January": "Jan", "February": "Feb", "March": "Mar", "April": "Apr", "May": "May", "June": "Jun",
         "July": "Jul", "August": "Aug", "September": "Sep", "October": "Oct", "November": "Nov", "December": "Dec" }[month] || month) :
      month;

    const override = monthlyStartingCapitalOverrides.find(item => item.month === normalizedMonth && item.year === year);
    return override ? override.startingCapital : null;
  }, [monthlyStartingCapitalOverrides]);

  const addCapitalChange = useCallback((change: Omit<CapitalChange, 'id'>) => {
    const newChange = {
      ...change,
      id: `capital_${new Date().getTime()}_${Math.random()}`
    };
    
    setCapitalChanges(prev => [...prev, newChange]);
  }, []);

  const updateCapitalChange = useCallback((updatedChange: CapitalChange) => {
    setCapitalChanges(prev => 
      prev.map(change => 
        change.id === updatedChange.id ? updatedChange : change
      )
    );
  }, []);

  const deleteCapitalChange = useCallback((id: string) => {
    setCapitalChanges(prev => prev.filter(change => change.id !== id));
  }, []);

  // Helper function to get trades P&L for a specific month/year
  const getTradesPLForMonth = useCallback((month: string, year: number, trades: any[] = [], useCashBasis: boolean = false): number => {
    if (!trades || trades.length === 0) return 0;



    if (useCashBasis) {
      // Cash basis: P&L is attributed to the month when trades are exited/closed
      const result = trades
        .filter(trade => {
          // Only include trades that have exits (closed or partial)
          return trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial';
        })
        .reduce((sum, trade) => {
          let monthPL = 0;

          // Check each exit and attribute P&L to the respective exit months
          const exits = getExitDatesWithFallback(trade);

          // Calculate P&L for exits in this specific month/year
          exits.forEach(exit => {
            const exitDate = new Date(exit.date);
            // Use consistent month name conversion
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const exitMonth = monthNames[exitDate.getMonth()];
            const exitYear = exitDate.getFullYear();

            if (exitMonth === month && exitYear === year) {
              // Calculate P&L for this specific exit
              const avgEntry = trade.avgEntry || trade.entry || 0;
              if (avgEntry > 0 && exit.price > 0 && exit.qty > 0) {
                const exitPL = trade.buySell === 'Buy'
                  ? (exit.price - avgEntry) * exit.qty
                  : (avgEntry - exit.price) * exit.qty;
                monthPL += exitPL;
              }
            }
          });

          return sum + monthPL;
        }, 0);

      return result;
    } else {
      // Accrual basis: P&L is attributed to the month when trades are initiated (current behavior)
      return trades
        .filter(trade => {
          if (!trade.date) return false;
          const tradeDate = new Date(trade.date);
          // Use consistent month name conversion
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const tradeMonth = monthNames[tradeDate.getMonth()];
          const tradeYear = tradeDate.getFullYear();
          return tradeMonth === month && tradeYear === year;
        })
        .reduce((sum, trade) => {
          // Use plRs if available, otherwise calculate basic P&L
          if (trade.plRs !== undefined && trade.plRs !== null) {
            return sum + trade.plRs;
          }
          // Fallback calculation for trades without plRs
          const exitedQty = trade.exitedQty || 0;
          const avgExitPrice = trade.avgExitPrice || 0;
          const avgEntry = trade.avgEntry || trade.entry || 0;
          if (exitedQty > 0 && avgExitPrice > 0 && avgEntry > 0) {
            const pl = trade.buySell === 'Buy'
              ? (avgExitPrice - avgEntry) * exitedQty
              : (avgEntry - avgExitPrice) * exitedQty;
            return sum + pl;
          }
          return sum;
        }, 0);
    }
  }, []);

  // Helper function to get capital changes for a specific month/year
  const getCapitalChangesForMonth = useCallback((month: string, year: number): number => {
    return capitalChanges
      .filter(change => {
        if (!change.date) return false;
        const changeDate = new Date(change.date);
        // Use consistent month name conversion
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const changeMonth = monthNames[changeDate.getMonth()];
        const changeYear = changeDate.getFullYear();
        return changeMonth === month && changeYear === year;
      })
      .reduce((sum, change) => {
        return sum + (change.type === 'deposit' ? change.amount : -change.amount);
      }, 0);
  }, [capitalChanges]);

  // Helper function to normalize month names
  const normalizeMonth = useCallback((month: string): string => {
    // If it's already a short month name, return as is
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (shortMonths.includes(month)) {
      return month;
    }

    // Convert full month names to short month names
    const monthMap: Record<string, string> = {
      "January": "Jan", "February": "Feb", "March": "Mar", "April": "Apr",
      "May": "May", "June": "Jun", "July": "Jul", "August": "Aug",
      "September": "Sep", "October": "Oct", "November": "Nov", "December": "Dec"
    };

    return monthMap[month] || month;
  }, []);

  // Core function to calculate monthly true portfolio with memoization
  const calculateMonthlyTruePortfolio = useCallback((month: string, year: number, trades: any[] = [], memo: Map<string, MonthlyTruePortfolio> = new Map(), minOverallDate: Date | null = null, useCashBasis: boolean = false): MonthlyTruePortfolio => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Normalize the month name
    const normalizedMonth = normalizeMonth(month);
    const monthIndex = months.indexOf(normalizedMonth);

    if (monthIndex === -1) {
      throw new Error(`Invalid month: ${month}. Expected short month names like 'Jan', 'Feb', etc.`);
    }

    const key = `${normalizedMonth}-${year}`;
    if (memo.has(key)) {
      return memo.get(key)!;
    }

    let startingCapital = 0;

    const currentMonthDate = new Date(year, monthIndex, 1);
    
    // Base case: If current month is before the overall minimum date, return zero capital.
    // This prevents infinite recursion when going too far back in time.
    if (minOverallDate && currentMonthDate < minOverallDate) {
      return {
        month: normalizedMonth,
        year,
        startingCapital: 0,
        capitalChanges: 0,
        pl: 0,
        finalCapital: 0
      };
    }
    
    // Check for monthly starting capital override first
    const override = getMonthlyStartingCapitalOverride(normalizedMonth, year);
    if (override !== null) {
      startingCapital = override;
    } else if (minOverallDate && currentMonthDate.getFullYear() === minOverallDate.getFullYear() && currentMonthDate.getMonth() === minOverallDate.getMonth()) {
      // If this is the absolute first month with data for the *entire* portfolio journey,
      // and there's no monthly override, use the yearly starting capital for its year.
      startingCapital = getYearlyStartingCapital(year);
    } else {
      // For subsequent months, get final capital from previous month
      const prevMonthIndex = monthIndex - 1;
      let prevMonth = months[prevMonthIndex];
      let prevYear = year;

      if (prevMonthIndex < 0) {
        prevMonth = months[11]; // December of previous year
        prevYear = year - 1;
      }

      const prevMonthData = calculateMonthlyTruePortfolio(prevMonth, prevYear, trades, memo, minOverallDate, useCashBasis); // Pass minOverallDate and useCashBasis recursively
      startingCapital = prevMonthData.finalCapital;
    }

    // Get capital changes for this month
    const capitalChangesAmount = getCapitalChangesForMonth(normalizedMonth, year);

    // Revised starting capital = original starting capital + capital changes
    const revisedStartingCapital = startingCapital + capitalChangesAmount;

    // Get P&L for this month
    const pl = getTradesPLForMonth(normalizedMonth, year, trades, useCashBasis);

    // Final capital = revised starting capital + P&L
    const finalCapital = revisedStartingCapital + pl;

    const result: MonthlyTruePortfolio = {
      month: normalizedMonth, // Always return normalized month name
      year,
      startingCapital: revisedStartingCapital, // This is the revised starting capital
      capitalChanges: capitalChangesAmount,
      pl,
      finalCapital
    };

    memo.set(key, result);
    return result;
  }, [getYearlyStartingCapital, getCapitalChangesForMonth, getTradesPLForMonth, normalizeMonth, getMonthlyStartingCapitalOverride]);

  // Public function to get monthly true portfolio
  const getMonthlyTruePortfolio = useCallback((month: string, year: number, trades: any[] = [], useCashBasis: boolean = false): MonthlyTruePortfolio => {
    const memo = new Map<string, MonthlyTruePortfolio>();

    // Determine the earliest and latest dates with data (trades or capital changes)
    let minOverallDate: Date | null = null;

    [...trades, ...capitalChanges].forEach(item => {
        if (item.date) {
            const itemDate = new Date(item.date);
            if (!minOverallDate || itemDate < minOverallDate) {
                minOverallDate = itemDate;
            }
        }
    });

    // Also consider yearly starting capitals for the earliest date
    yearlyStartingCapitals.forEach(capital => {
        const capitalDate = new Date(capital.year, 0, 1); // January 1st of the capital year
        if (!minOverallDate || capitalDate < minOverallDate) {
            minOverallDate = capitalDate;
        }
    });

    // If there's no data at all, fallback to current year
    if (!minOverallDate) {
        minOverallDate = new Date(new Date().getFullYear(), 0, 1); // January 1st of current year
    }

    // Adjust minOverallDate to the beginning of its month
    minOverallDate.setDate(1);
    minOverallDate.setHours(0, 0, 0, 0);

    return calculateMonthlyTruePortfolio(month, year, trades, memo, minOverallDate, useCashBasis);
  }, [calculateMonthlyTruePortfolio, yearlyStartingCapitals, capitalChanges]);

  // Get true portfolio size for a specific month/year
  const getTruePortfolioSize = useCallback((month: string, year: number, trades: any[] = [], useCashBasis: boolean = false): number => {
    try {
      const monthlyData = getMonthlyTruePortfolio(month, year, trades, useCashBasis);
      return monthlyData.finalCapital;
    } catch (error) {
      return 100000; // Fallback value
    }
  }, [getMonthlyTruePortfolio]);

  // Get latest true portfolio size
  const getLatestTruePortfolioSize = useCallback((trades: any[] = [], useCashBasis: boolean = false): number => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', { month: 'short' });
      const currentYear = currentDate.getFullYear();

      return getTruePortfolioSize(currentMonth, currentYear, trades, useCashBasis);
    } catch (error) {
      return 100000; // Fallback value
    }
  }, [getTruePortfolioSize]);

  // Get all monthly true portfolios for a year or range
  const getAllMonthlyTruePortfolios = useCallback((trades: any[] = [], useCashBasis: boolean = false): MonthlyTruePortfolio[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result: MonthlyTruePortfolio[] = [];
    const memo = new Map<string, MonthlyTruePortfolio>();

    // Determine the earliest and latest dates with data (trades or capital changes)
    let minOverallDate: Date | null = null;
    let maxOverallDate: Date | null = null;

    // Process trades - consider both entry and exit dates for cash basis
    trades.forEach(trade => {
        if (trade.date) {
            const entryDate = new Date(trade.date);
            if (!minOverallDate || entryDate < minOverallDate) {
                minOverallDate = entryDate;
            }
            if (!maxOverallDate || entryDate > maxOverallDate) {
                maxOverallDate = entryDate;
            }
        }

        // For cash basis, also consider exit dates
        if (useCashBasis && (trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial')) {
            [trade.exit1Date, trade.exit2Date, trade.exit3Date].forEach(exitDate => {
                if (exitDate) {
                    const exitDateObj = new Date(exitDate);
                    if (!isNaN(exitDateObj.getTime())) {
                        if (!minOverallDate || exitDateObj < minOverallDate) {
                            minOverallDate = exitDateObj;
                        }
                        if (!maxOverallDate || exitDateObj > maxOverallDate) {
                            maxOverallDate = exitDateObj;
                        }
                    }
                }
            });
        }
    });

    // Process capital changes
    capitalChanges.forEach(item => {
        if (item.date) {
            const itemDate = new Date(item.date);
            if (!minOverallDate || itemDate < minOverallDate) {
                minOverallDate = itemDate;
            }
            if (!maxOverallDate || itemDate > maxOverallDate) {
                maxOverallDate = itemDate;
            }
        }
    });

    // Also consider yearly starting capitals for the earliest date
    yearlyStartingCapitals.forEach(capital => {
        const capitalDate = new Date(capital.year, 0, 1); // January 1st of the capital year
        if (!minOverallDate || capitalDate < minOverallDate) {
            minOverallDate = capitalDate;
        }
    });

    // If there's no data at all, fallback to current year
    if (!minOverallDate) {
        minOverallDate = new Date(new Date().getFullYear(), 0, 1); // January 1st of current year
    }

    // Adjust minOverallDate to the beginning of its month
    minOverallDate.setDate(1);
    minOverallDate.setHours(0, 0, 0, 0);

    // If maxOverallDate is not set (e.g., only yearly capital with no trades/capital changes), default to current date
    if (!maxOverallDate) {
      maxOverallDate = new Date();
    }
    
    // Ensure maxOverallDate is at the end of its month to include all trades/changes within that month
    maxOverallDate.setMonth(maxOverallDate.getMonth() + 1);
    maxOverallDate.setDate(0); // This sets it to the last day of the previous month
    maxOverallDate.setHours(23, 59, 59, 999);

    let currentDate = new Date(minOverallDate.getFullYear(), minOverallDate.getMonth(), 1);

    while (currentDate <= maxOverallDate) {
        const year = currentDate.getFullYear();
        const month = months[currentDate.getMonth()]; // Get short month name

        try {
            const monthlyData = calculateMonthlyTruePortfolio(month, year, trades, memo, minOverallDate, useCashBasis); // Pass minOverallDate and useCashBasis
            result.push(monthlyData);
        } catch (error) {
            // Skip months with no data
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return result;
  }, [yearlyStartingCapitals, capitalChanges, calculateMonthlyTruePortfolio]);

  // Backward compatibility - get current portfolio size
  const portfolioSize = React.useMemo(() => {
    try {
      return getLatestTruePortfolioSize();
    } catch (error) {
      return 100000; // Fallback value
    }
  }, [getLatestTruePortfolioSize]);

  // Create safe wrapper functions that check hydration status
  const safeGetTruePortfolioSize = useCallback((month: string, year: number, trades?: any[], useCashBasis?: boolean) => {
    if (!hydrated) return 100000; // Return default value during hydration
    return getTruePortfolioSize(month, year, trades, useCashBasis);
  }, [hydrated, getTruePortfolioSize]);

  const safeGetLatestTruePortfolioSize = useCallback((trades?: any[], useCashBasis?: boolean) => {
    if (!hydrated) return 100000; // Return default value during hydration
    return getLatestTruePortfolioSize(trades, useCashBasis);
  }, [hydrated, getLatestTruePortfolioSize]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    getTruePortfolioSize: safeGetTruePortfolioSize,
    getLatestTruePortfolioSize: safeGetLatestTruePortfolioSize,
    yearlyStartingCapitals,
    setYearlyStartingCapital,
    getYearlyStartingCapital,
    monthlyStartingCapitalOverrides,
    setMonthlyStartingCapitalOverride,
    removeMonthlyStartingCapitalOverride,
    getMonthlyStartingCapitalOverride,
    capitalChanges,
    addCapitalChange,
    updateCapitalChange,
    deleteCapitalChange,
    getMonthlyTruePortfolio,
    getAllMonthlyTruePortfolios,
    portfolioSize: hydrated ? portfolioSize : 100000
  }), [
    safeGetTruePortfolioSize,
    safeGetLatestTruePortfolioSize,
    yearlyStartingCapitals,
    setYearlyStartingCapital,
    getYearlyStartingCapital,
    monthlyStartingCapitalOverrides,
    setMonthlyStartingCapitalOverride,
    removeMonthlyStartingCapitalOverride,
    getMonthlyStartingCapitalOverride,
    capitalChanges,
    addCapitalChange,
    updateCapitalChange,
    deleteCapitalChange,
    getMonthlyTruePortfolio,
    getAllMonthlyTruePortfolios,
    portfolioSize,
    hydrated
  ]);

  // Always render children to prevent hook count mismatches
  return (
    <TruePortfolioContext.Provider value={contextValue}>
      {children}
    </TruePortfolioContext.Provider>
  );
};

export const useTruePortfolio = (): TruePortfolioContextType => {
  const ctx = useContext(TruePortfolioContext);
  if (!ctx) throw new Error("useTruePortfolio must be used within a TruePortfolioProvider");
  return ctx;
};
