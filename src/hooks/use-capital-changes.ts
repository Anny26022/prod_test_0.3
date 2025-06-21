import React from 'react';
import { CapitalChange, MonthlyCapital, MonthlyCapitalHistory } from '../types/trade';
import { generateId } from '../utils/helpers';
import { useTruePortfolio } from '../utils/TruePortfolioContext';
import { calculateTradePL } from '../utils/accountingUtils';
import { DatabaseService } from '../db/database';
// Migrated from localStorage to IndexedDB using Dexie

// IndexedDB helpers using Dexie
const loadCapitalChanges = async (): Promise<CapitalChange[]> => {
  if (typeof window === 'undefined') return [];

  try {
    const saved = await DatabaseService.getMiscData('capital_changes');
    return saved ? saved : [];
  } catch (error) {
    console.error('❌ Error loading capital changes from IndexedDB:', error);
    return [];
  }
};

const loadMonthlyCapitalHistory = async (): Promise<MonthlyCapitalHistory[]> => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = await DatabaseService.getMiscData('monthly_capital_history');
    return saved ? saved : [];
  } catch (error) {
    console.error('❌ Error loading monthly capital history from IndexedDB:', error);
    return [];
  }
};

const saveMonthlyCapitalHistory = async (history: MonthlyCapitalHistory[]): Promise<boolean> => {
  try {
    return await DatabaseService.saveMiscData('monthly_capital_history', history);
  } catch (error) {
    console.error('❌ Error saving monthly capital history to IndexedDB:', error);
    return false;
  }
};

// IndexedDB helpers using Dexie

async function loadCapitalChangesLegacy(): Promise<CapitalChange[]> {
  try {
    const stored = await DatabaseService.getMiscData('capitalChanges');
    return stored ? stored : [];
  } catch (error) {
    console.error('❌ Error loading capital changes from IndexedDB:', error);
    return [];
  }
}

async function saveCapitalChanges(changes: CapitalChange[]): Promise<boolean> {
  try {
    return await DatabaseService.saveMiscData('capitalChanges', changes);
  } catch (error) {
    console.error('❌ IndexedDB save error:', error);
    return false;
  }
}

async function fetchMonthlyCapitalHistory(): Promise<any[]> {
  try {
    const stored = await DatabaseService.getMiscData('monthlyCapitalHistory');
    return stored ? stored : [];
  } catch (error) {
    console.error('❌ Error fetching monthly capital history from IndexedDB:', error);
    return [];
  }
}

async function saveMonthlyCapitalHistoryLegacy(history: any[]): Promise<boolean> {
  try {
    return await DatabaseService.saveMiscData('monthlyCapitalHistory', history);
  } catch (error) {
    console.error('❌ IndexedDB save error:', error);
    return false;
  }
}

export const useCapitalChanges = (trades: any[], initialPortfolioSize: number, useCashBasis: boolean = false) => {
  const {
    getTruePortfolioSize,
    setYearlyStartingCapital,
    capitalChanges,
    addCapitalChange,
    updateCapitalChange,
    deleteCapitalChange
  } = useTruePortfolio();
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Use local state for legacy compatibility, but sync with TruePortfolio system
  const [localCapitalChanges, setLocalCapitalChanges] = React.useState<CapitalChange[]>([]);
  const [monthlyCapital, setMonthlyCapital] = React.useState<MonthlyCapital[]>([]);
  const [monthlyCapitalHistory, setMonthlyCapitalHistory] = React.useState<MonthlyCapitalHistory[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Load from IndexedDB on mount and sync with TruePortfolio
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const loadedChanges = await loadCapitalChangesLegacy();
        setLocalCapitalChanges(loadedChanges);
        const loadedHistory = await fetchMonthlyCapitalHistory();
        setMonthlyCapitalHistory(loadedHistory);
      } catch (error) {
        console.error('❌ Failed to load capital data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save capital changes to IndexedDB
  React.useEffect(() => {
    if (!loading) {
      saveCapitalChanges(localCapitalChanges).then(success => {
        console.log(`📊 [useCapitalChanges] Capital changes save ${success ? 'successful' : 'failed'}`);
      });
    }
  }, [localCapitalChanges, loading]);

  // Save monthly capital history to IndexedDB
  React.useEffect(() => {
    if (!loading) {
      saveMonthlyCapitalHistoryLegacy(monthlyCapitalHistory).then(success => {
        console.log(`📊 [useCapitalChanges] Monthly history save ${success ? 'successful' : 'failed'}`);
      });
    }
  }, [monthlyCapitalHistory, loading]);

    // Calculate monthly capital data using TruePortfolio system
  React.useEffect(() => {
    if (!getTruePortfolioSize) return;
    
    // Group trades and capital changes by month and year
    const monthlyData: Record<string, { trades: any[]; changes: CapitalChange[]; date: Date; monthName: string; year: number }> = {};

    // Determine the overall date range from trades and monthly portfolio sizes
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    trades.forEach(trade => {
      const date = new Date(trade.date);
      if (!earliestDate || date < earliestDate) earliestDate = date;
      if (!latestDate || date > latestDate) latestDate = date;
    });

    // Use TruePortfolio capital changes instead of local state
    capitalChanges.forEach(change => {
      const date = new Date(change.date);
      if (!earliestDate || date < earliestDate) earliestDate = date;
      if (!latestDate || date > latestDate) latestDate = date;
    });

    // Note: TruePortfolio system doesn't use monthlyPortfolioSizes
    // It calculates portfolio size dynamically based on starting capital + changes + P/L

    if (!earliestDate || !latestDate) {
      setMonthlyCapital([]);
      return;
    }

    // Process trades and capital changes into monthly groups
    const getMonthKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    trades.forEach(trade => {
      const date = new Date(trade.date);
      const key = getMonthKey(date);
      if (!monthlyData[key]) {
        monthlyData[key] = { trades: [], changes: [], date: new Date(date.getFullYear(), date.getMonth(), 1), monthName: date.toLocaleString('default', { month: 'short' }), year: date.getFullYear() };
      }
      monthlyData[key].trades.push(trade);
    });

    // Use TruePortfolio capital changes
    capitalChanges.forEach(change => {
      const date = new Date(change.date);
      const key = getMonthKey(date);
      if (!monthlyData[key]) {
        monthlyData[key] = { trades: [], changes: [], date: new Date(date.getFullYear(), date.getMonth(), 1), monthName: date.toLocaleString('default', { month: 'short' }), year: date.getFullYear() };
      }
      monthlyData[key].changes.push(change);
    });

    // Generate data for every month in the date range
    const monthlyCapitalData: MonthlyCapital[] = [];
    let currentCapital = initialPortfolioSize; // Start with initial capital

    const cursorDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    
    // Add an initial data point for the starting capital of the very first month
    const firstMonthName = earliestDate.toLocaleString('default', { month: 'short' });
    const firstYear = earliestDate.getFullYear();
    const initialStartingCapitalForChart = getTruePortfolioSize(firstMonthName, firstYear, trades, useCashBasis);
    monthlyCapitalData.push({
      month: firstMonthName,
      year: firstYear,
      startingCapital: initialStartingCapitalForChart, // Capital at the absolute start of the first month
      deposits: 0, // No changes at the very start point
      withdrawals: 0,
      pl: 0,
      finalCapital: initialStartingCapitalForChart // Final capital is the same as starting at this point
    });

    while (cursorDate <= latestDate) {
      const monthKey = getMonthKey(cursorDate);
      const monthName = cursorDate.toLocaleString('default', { month: 'short' });
      const year = cursorDate.getFullYear();

      const monthData = monthlyData[monthKey] || { trades: [], changes: [], date: new Date(year, cursorDate.getMonth(), 1), monthName, year };

      // Get the true portfolio size for this month using TruePortfolio system
      const truePortfolioSize = getTruePortfolioSize(monthName, year, trades, useCashBasis);

      // Use TruePortfolio calculated size as starting capital
      const startingCapital = truePortfolioSize;

      // Calculate deposits and withdrawals
      const deposits = monthData.changes.filter(c => c.type === 'deposit').reduce((sum, c) => sum + c.amount, 0);
      const withdrawals = monthData.changes.filter(c => c.type === 'withdrawal').reduce((sum, c) => sum + Math.abs(c.amount), 0);
      const netChange = deposits - withdrawals;

      // Calculate P/L from trades using accounting method
      const pl = monthData.trades.reduce((sum, t) => sum + calculateTradePL(t, useCashBasis), 0);

      // Calculate final capital for the month
      const finalCapital = startingCapital + netChange + pl;

      monthlyCapitalData.push({
        month: monthName,
        year,
        startingCapital: startingCapital, // Starting capital before net change
        deposits,
        withdrawals,
        pl,
        finalCapital
      });

      // Set current capital for the next month to this month's final capital
      currentCapital = finalCapital;

      // Move to the next month
      cursorDate.setMonth(cursorDate.getMonth() + 1);
    }

    setMonthlyCapital(monthlyCapitalData);

  }, [trades, capitalChanges, getTruePortfolioSize, initialPortfolioSize, months, useCashBasis]); // Updated dependencies for TruePortfolio

  const addCapitalChangeLocal = React.useCallback((change: Omit<CapitalChange, 'id'>) => {
    const newChange = {
      ...change,
      id: generateId()
    };

    // Add to TruePortfolio system
    addCapitalChange(newChange);

    // Also add to local state for backward compatibility
    setLocalCapitalChanges(prev => [...prev, newChange]);

    return newChange;
  }, [addCapitalChange]);

  const updateCapitalChangeLocal = (updatedChange: CapitalChange) => {
    // Update in TruePortfolio system
    updateCapitalChange(updatedChange);

    // Update local state for backward compatibility
    setLocalCapitalChanges(prev =>
      prev.map(change =>
        change.id === updatedChange.id ? updatedChange : change
      )
    );
  };

  const deleteCapitalChangeLocal = (id: string) => {
    // Delete from TruePortfolio system
    deleteCapitalChange(id);

    // Delete from local state for backward compatibility
    setLocalCapitalChanges(prev => prev.filter(change => change.id !== id));
  };

  // Add or update monthly starting capital for a month/year
  const setMonthlyStartingCapitalLocal = (month: string, year: number, startingCapital: number) => {
    // For January, use TruePortfolio's yearly starting capital
    if (month === 'Jan') {
      setYearlyStartingCapital(year, startingCapital);
    }

    // Update local history for backward compatibility
    setMonthlyCapitalHistory(prev => {
      const idx = prev.findIndex(h => h.month === month && h.year === year);
      if (idx !== -1) {
        // Update
        const updated = [...prev];
        updated[idx] = { ...updated[idx], startingCapital };
        return updated;
      } else {
        // Add
        return [...prev, { month, year, startingCapital }];
      }
    });
  };

  return {
    capitalChanges: localCapitalChanges, // Return local state for backward compatibility
    monthlyCapital,
    addCapitalChange: addCapitalChangeLocal,
    updateCapitalChange: updateCapitalChangeLocal,
    deleteCapitalChange: deleteCapitalChangeLocal,
    monthlyCapitalHistory,
    setMonthlyStartingCapital: setMonthlyStartingCapitalLocal
  };
}; 