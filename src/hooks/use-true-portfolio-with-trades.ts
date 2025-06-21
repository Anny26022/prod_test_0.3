import { useMemo } from 'react';
import { useTruePortfolio } from '../utils/TruePortfolioContext';
import { useAccountingMethod } from '../context/AccountingMethodContext';

/**
 * Hook that provides true portfolio functionality with trades integration
 * This hook should be used by components that need portfolio size calculations
 */
export const useTruePortfolioWithTrades = (trades: any[] = []) => {
  const truePortfolioContext = useTruePortfolio();
  const { accountingMethod } = useAccountingMethod();
  const useCashBasis = accountingMethod === 'cash';

  // Memoize functions that depend on trades and accounting method
  const getTruePortfolioSize = useMemo(() => {
    return (month: string, year: number) => {
      return truePortfolioContext.getTruePortfolioSize(month, year, trades, useCashBasis);
    };
  }, [truePortfolioContext.getTruePortfolioSize, trades, useCashBasis]);

  const getLatestTruePortfolioSize = useMemo(() => {
    return () => {
      return truePortfolioContext.getLatestTruePortfolioSize(trades, useCashBasis);
    };
  }, [truePortfolioContext.getLatestTruePortfolioSize, trades, useCashBasis]);

  const getMonthlyTruePortfolio = useMemo(() => {
    return (month: string, year: number) => {
      return truePortfolioContext.getMonthlyTruePortfolio(month, year, trades, useCashBasis);
    };
  }, [truePortfolioContext.getMonthlyTruePortfolio, trades, useCashBasis]);

  const getAllMonthlyTruePortfolios = useMemo(() => {
    return () => {
      return truePortfolioContext.getAllMonthlyTruePortfolios(trades, useCashBasis);
    };
  }, [truePortfolioContext.getAllMonthlyTruePortfolios, trades, useCashBasis]);

  // Current portfolio size for backward compatibility
  const portfolioSize = useMemo(() => {
    return getLatestTruePortfolioSize();
  }, [getLatestTruePortfolioSize]);

  return {
    // Core functions with trades integration
    getTruePortfolioSize,
    getLatestTruePortfolioSize,
    getMonthlyTruePortfolio,
    getAllMonthlyTruePortfolios,
    
    // Backward compatibility
    portfolioSize,
    getPortfolioSize: getTruePortfolioSize, // Alias for backward compatibility
    
    // Pass through other functions that don't need trades
    yearlyStartingCapitals: truePortfolioContext.yearlyStartingCapitals,
    setYearlyStartingCapital: truePortfolioContext.setYearlyStartingCapital,
    getYearlyStartingCapital: truePortfolioContext.getYearlyStartingCapital,
    monthlyStartingCapitalOverrides: truePortfolioContext.monthlyStartingCapitalOverrides,
    setMonthlyStartingCapitalOverride: truePortfolioContext.setMonthlyStartingCapitalOverride,
    removeMonthlyStartingCapitalOverride: truePortfolioContext.removeMonthlyStartingCapitalOverride,
    getMonthlyStartingCapitalOverride: truePortfolioContext.getMonthlyStartingCapitalOverride,
    capitalChanges: truePortfolioContext.capitalChanges,
    addCapitalChange: truePortfolioContext.addCapitalChange,
    updateCapitalChange: truePortfolioContext.updateCapitalChange,
    deleteCapitalChange: truePortfolioContext.deleteCapitalChange,
  };
};
