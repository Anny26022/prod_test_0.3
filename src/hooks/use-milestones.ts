import { useState, useEffect, useCallback } from 'react';
import { ALL_MILESTONES, Milestone } from '../utils/milestones';
import { useTrades } from './use-trades';
import { useTruePortfolio } from '../utils/TruePortfolioContext';
import { useAccountingMethod } from '../context/AccountingMethodContext';
import { DatabaseService } from '../db/database';

interface AchievedMilestone extends Milestone {
  achievedAt: string; // ISO date string
}

export const useMilestones = () => {
  const { trades } = useTrades();
  const { getAllMonthlyTruePortfolios, portfolioSize, yearlyStartingCapitals } = useTruePortfolio();
  const { accountingMethod } = useAccountingMethod();
  const useCashBasis = accountingMethod === 'cash';

  // Get monthly portfolios with accounting method-aware calculations
  const monthlyPortfolios = getAllMonthlyTruePortfolios(trades, useCashBasis);

  const [achievedMilestones, setAchievedMilestones] = useState<AchievedMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load milestones from IndexedDB on mount
  useEffect(() => {
    const loadMilestones = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      try {
        const milestonesRecord = await DatabaseService.getMilestonesData();
        if (milestonesRecord && milestonesRecord.achievements) {
          setAchievedMilestones(milestonesRecord.achievements);
        }
      } catch (error) {
        console.error('❌ Error loading achieved milestones from IndexedDB:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMilestones();
  }, []);

  const checkAndAwardMilestones = useCallback(() => {
    const newlyAchieved: AchievedMilestone[] = [];

    // For cash basis, deduplicate trades to avoid double counting in milestone calculations
    let uniqueTrades = trades;
    if (useCashBasis) {
      const seenTradeIds = new Set();
      uniqueTrades = trades.filter(trade => {
        const originalId = trade.id.split('_exit_')[0];
        if (seenTradeIds.has(originalId)) return false;
        seenTradeIds.add(originalId);
        return true;
      });
    }

    ALL_MILESTONES.forEach(milestone => {
      // Check if already achieved
      const alreadyAchieved = achievedMilestones.some(a => a.id === milestone.id);

      if (!alreadyAchieved) {
        // Check if criteria is met with accounting method-aware data (use deduplicated trades)
        if (milestone.criteria(uniqueTrades, monthlyPortfolios, portfolioSize, yearlyStartingCapitals, useCashBasis)) {
          newlyAchieved.push({
            ...milestone,
            achievedAt: new Date().toISOString(),
          });
        }
      }
    });

    if (newlyAchieved.length > 0) {
      setAchievedMilestones(prev => {
        const updated = [...prev, ...newlyAchieved];
        // Ensure uniqueness and sort by achievedAt
        const uniqueAndSorted = Array.from(new Set(updated.map(m => m.id)))
          .map(id => updated.find(m => m.id === id)!)
          .sort((a, b) => new Date(a.achievedAt).getTime() - new Date(b.achievedAt).getTime());
        return uniqueAndSorted;
      });
    }
  }, [trades, monthlyPortfolios, portfolioSize, yearlyStartingCapitals, useCashBasis]); // Removed achievedMilestones to prevent infinite loops

  useEffect(() => {
    // Debounce milestone checking to prevent excessive re-evaluation
    const timeoutId = setTimeout(() => {
      checkAndAwardMilestones();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [checkAndAwardMilestones]); // Re-run when dependencies change

  // Save milestones to IndexedDB
  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined') {
      DatabaseService.saveMilestonesData(achievedMilestones).then(success => {
        console.log(`🏆 [useMilestones] Milestones save ${success ? 'successful' : 'failed'}`);
      });
    }
  }, [achievedMilestones, isLoading]);

  return {
    achievedMilestones,
    ALL_MILESTONES,
    isLoading,
  };
}; 