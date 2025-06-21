import { Trade } from "../types/trade";
import { MonthlyTruePortfolio } from "./TruePortfolioContext";
import { calculateTradePL } from "./accountingUtils";

export interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number; // For tiered milestones, e.g., 10 trades, 100 trades
  criteria: (
    trades: Trade[],
    monthlyPortfolios: MonthlyTruePortfolio[],
    currentPortfolioSize: number,
    yearlyStartingCapitals: { year: number; startingCapital: number; updatedAt: string; }[],
    useCashBasis?: boolean
  ) => boolean;
}

export const ALL_MILESTONES: Milestone[] = [
  {
    id: "first-trade",
    name: "First Trade!",
    description: "You've recorded your very first trade. The journey begins!",
    icon: "lucide:dollar-sign",
    level: 1,
    criteria: (trades) => trades.length >= 1,
  },
  {
    id: "profitable-trade",
    name: "First Win!",
    description: "You've successfully closed your first profitable trade.",
    icon: "lucide:trending-up",
    level: 1,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals, useCashBasis = false) =>
      trades.some((trade) => calculateTradePL(trade, useCashBasis) > 0),
  },
  {
    id: "ten-trades",
    name: "Getting Started",
    description: "You've completed 10 trades. Keep learning!",
    icon: "lucide:number-ten",
    level: 1,
    criteria: (trades) => trades.length >= 10,
  },
  {
    id: "hundred-trades",
    name: "Centurion Trader",
    description: "You've completed 100 trades. You're building serious experience.",
    icon: "lucide:bar-chart-2",
    level: 2,
    criteria: (trades) => trades.length >= 100,
  },
  {
    id: "five-hundred-trades",
    name: "Veteran Volume",
    description: "You've completed 500 trades! A true market participant.",
    icon: "lucide:rocket",
    level: 3,
    criteria: (trades) => trades.length >= 500,
  },
  {
    id: "first-profitable-month",
    name: "Monthly Maestro",
    description: "You've finished a calendar month with a positive overall P&L.",
    icon: "lucide:calendar-check",
    level: 1,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals, useCashBasis = false) =>
      monthlyPortfolios.some((month) => month.pl > 0),
  },
  {
    id: "portfolio-growth-initial",
    name: "Growth Sprout",
    description: "Your portfolio has grown 10% beyond your initial starting capital.",
    icon: "lucide:leaf",
    level: 1,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals) => {
      const initialCapital = yearlyStartingCapitals[0]?.startingCapital || 0;
      return initialCapital > 0 && currentPortfolioSize >= initialCapital * 1.10;
    },
  },
  {
    id: "portfolio-growth-substantial",
    name: "Steady Progress",
    description: "Your portfolio has grown 25% beyond your initial starting capital.",
    icon: "lucide:dollar-sign",
    level: 2,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals) => {
      const initialCapital = yearlyStartingCapitals[0]?.startingCapital || 0;
      return initialCapital > 0 && currentPortfolioSize >= initialCapital * 1.25;
    },
  },
  {
    id: "portfolio-growth-significant",
    name: "Market Mover",
    description: "Your portfolio has grown 50% beyond your initial starting capital.",
    icon: "lucide:trending-up",
    level: 3,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals) => {
      const initialCapital = yearlyStartingCapitals[0]?.startingCapital || 0;
      return initialCapital > 0 && currentPortfolioSize >= initialCapital * 1.50;
    },
  },
  {
    id: "portfolio-growth-double",
    name: "Double Trouble!",
    description: "Your portfolio has doubled in size (100% growth) from your initial starting capital.",
    icon: "lucide:trophy",
    level: 4,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals) => {
      const initialCapital = yearlyStartingCapitals[0]?.startingCapital || 0;
      return initialCapital > 0 && currentPortfolioSize >= initialCapital * 2.00;
    },
  },
  {
    id: "high-win-rate",
    name: "Consistent Winner",
    description: "Achieved a 60% win rate over at least 50 closed trades.",
    icon: "lucide:award",
    level: 1,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals, useCashBasis = false) => {
      const closedTrades = trades.filter(trade => trade.positionStatus === 'Closed');
      if (closedTrades.length < 50) return false;
      const profitableTrades = closedTrades.filter(trade => calculateTradePL(trade, useCashBasis) > 0);
      return (profitableTrades.length / closedTrades.length) >= 0.60;
    },
  },
  {
    id: "five-consecutive-wins",
    name: "Winning Streak!",
    description: "Achieved 5 consecutive profitable closed trades.",
    icon: "lucide:zap",
    level: 1,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals, useCashBasis = false) => {
      const closedTrades = trades.filter(trade => trade.positionStatus === 'Closed');
      if (closedTrades.length < 5) return false; // Need at least 5 trades to check for a streak
      let consecutiveWins = 0;
      for (let i = closedTrades.length - 1; i >= 0; i--) {
        if (calculateTradePL(closedTrades[i], useCashBasis) > 0) {
          consecutiveWins++;
        } else {
          consecutiveWins = 0;
        }
        if (consecutiveWins >= 5) return true;
      }
      return false;
    },
  },
  {
    id: "below-ten-percent-drawdown",
    name: "Risk Manager",
    description: "Maintained overall portfolio drawdown below 10% for any given month.",
    icon: "lucide:shield",
    level: 1,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals, useCashBasis = false) => {
      return monthlyPortfolios.every(month => {
        let runningMax = monthlyPortfolios[0]?.startingCapital || 0;
        // Find the running max up to this month
        for (const m of monthlyPortfolios) {
          if (m.year < month.year || (m.year === month.year && m.month <= month.month)) {
            if (m.finalCapital > runningMax) {
              runningMax = m.finalCapital;
            }
          }
        }
        const drawdown = runningMax !== 0 ? ((runningMax - month.finalCapital) / runningMax) * 100 : 0;
        return drawdown < 10;
      });
    },
  },
  {
    id: "diversified-trader-5-sectors",
    name: "Sector Explorer",
    description: "Traded in at least 5 unique sectors.",
    icon: "lucide:map",
    level: 1,
    criteria: (trades) => {
      const uniqueSectors = new Set(trades.map(trade => trade.sector).filter(sector => sector));
      return uniqueSectors.size >= 5;
    },
  },
  {
    id: "diversified-trader-10-sectors",
    name: "Market Mapper",
    description: "Traded in at least 10 unique sectors.",
    icon: "lucide:globe",
    level: 2,
    criteria: (trades) => {
      const uniqueSectors = new Set(trades.map(trade => trade.sector).filter(sector => sector));
      return uniqueSectors.size >= 10;
    },
  },
  {
    id: "first-hundred-k-profit",
    name: "Six-Figure Earner",
    description: "Achieved a cumulative realized profit of ₹1,00,000.",
    icon: "lucide:wallet",
    level: 1,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals, useCashBasis = false) => {
      const totalRealizedPL = trades.reduce((sum, trade) => sum + calculateTradePL(trade, useCashBasis), 0);
      return totalRealizedPL >= 100000;
    },
  },
  {
    id: "first-million-profit",
    name: "Millionaire Mindset",
    description: "Achieved a cumulative realized profit of ₹1,000,000.",
    icon: "lucide:banknote",
    level: 2,
    criteria: (trades, monthlyPortfolios, currentPortfolioSize, yearlyStartingCapitals, useCashBasis = false) => {
      const totalRealizedPL = trades.reduce((sum, trade) => sum + calculateTradePL(trade, useCashBasis), 0);
      return totalRealizedPL >= 1000000;
    },
  },
]; 