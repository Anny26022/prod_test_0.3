import React from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tooltip, Input, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useTrades } from "../hooks/use-trades";
import { useTruePortfolioWithTrades } from "../hooks/use-true-portfolio-with-trades";
import { calcXIRR } from "../utils/tradeCalculations";
import { useAccountingMethod } from "../context/AccountingMethodContext";
import { useGlobalFilter } from "../context/GlobalFilterContext";
import { getTradesForMonth, calculateTradePL, getTradeDateForAccounting } from "../utils/accountingUtils";
import MobileTooltip from "../components/ui/MobileTooltip";

// Helper function to create safe dependencies for useEffect/useMemo
const safeDeps = (deps: any[]) => deps;

interface MonthlyData {
  month: string;
  addedWithdrawn: number;
  startingCapital: number;
  pl: number;
  plPercentage: number;
  finalCapital: number;
  yearPlPercentage: string;
  trades: number;
  winPercentage: number;
  avgGain: number;
  avgLoss: number;
  avgRR: number;
  biggestImpact: number;
  smallestLoss: number;
  avgHoldingDays: number;
  cagr: number;
  rollingReturn1M: number;
  rollingReturn3M: number;
  rollingReturn6M: number;
  rollingReturn12M: number;
}

export const MonthlyPerformanceTable: React.FC = () => {
  const { trades } = useTrades(); // This now returns filtered trades based on global filter and accounting method
  const { accountingMethod } = useAccountingMethod();
  const { filter } = useGlobalFilter();
  const useCashBasis = accountingMethod === 'cash';
  const {
    portfolioSize,
    getPortfolioSize,
    getAllMonthlyTruePortfolios,
    yearlyStartingCapitals,
    setYearlyStartingCapital,
    setMonthlyStartingCapitalOverride,
    removeMonthlyStartingCapitalOverride,
    getMonthlyStartingCapitalOverride,
    capitalChanges,
    addCapitalChange,
    updateCapitalChange,
    deleteCapitalChange
  } = useTruePortfolioWithTrades(trades);

  // Removed debug console.log to prevent unnecessary re-renders

  // Get all monthly portfolio data
  const monthlyPortfolios = getAllMonthlyTruePortfolios(trades, useCashBasis);
  const [yearlyStartingCapital, setYearlyStartingCapitalState] = React.useState(portfolioSize);

  // Inline editing state
  const [editingCell, setEditingCell] = React.useState<{ row: number; col: string } | null>(null);
  const [editingValue, setEditingValue] = React.useState<string>("");

  // Add global year picker state
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState<number>(currentYear);

  // Build monthly data from trades with proper date handling
  const monthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Memoize filtered trades to prevent unnecessary recalculations
  const filteredTrades = React.useMemo(() =>
    trades.filter(trade => {
      if (!trade.date) return false;
      const tradeYear = new Date(trade.date).getFullYear();
      return tradeYear === selectedYear;
    }),
    [trades, selectedYear]
  );

  // Memoize monthly map calculation based on accounting method
  const monthlyMap = React.useMemo(() => {
    const map: Record<string, { trades: typeof trades; date: Date }> = {};

    monthOrder.forEach(month => {
      const monthTrades = getTradesForMonth(filteredTrades, month, selectedYear, useCashBasis);
      if (monthTrades.length > 0) {
        // Use the first trade's date for the month date
        const firstTradeDate = new Date(getTradeDateForAccounting(monthTrades[0], useCashBasis));

        map[month] = {
          trades: monthTrades,
          date: firstTradeDate
        };

        // Sort trades by date within each month
        map[month].trades.sort((a, b) => {
          const dateA = new Date(getTradeDateForAccounting(a, useCashBasis));
          const dateB = new Date(getTradeDateForAccounting(b, useCashBasis));
          return dateA.getTime() - dateB.getTime();
        });
      }
    });

    return map;
  }, [filteredTrades, selectedYear, useCashBasis, monthOrder]);

  // Memoize filtered monthly portfolios
  const filteredMonthlyPortfolios = React.useMemo(() =>
    monthlyPortfolios.filter(mp => mp.year === selectedYear),
    [monthlyPortfolios, selectedYear, useCashBasis, trades]
  );

  // Memoize initial monthly data calculation
  const initialMonthlyData = React.useMemo(() => monthOrder.map((month, i) => {
    const monthData = monthlyMap[month] || { trades: [], date: new Date() };
    const monthTrades = monthData.trades;
    const tradesCount = monthTrades.length;

    // Calculate P/L based on accounting method
    const tradesWithPL = monthTrades.map(trade => ({
      ...trade,
      accountingPL: calculateTradePL(trade, useCashBasis)
    }));

    const winTrades = tradesWithPL.filter(t => t.accountingPL > 0);
    const lossTrades = tradesWithPL.filter(t => t.accountingPL < 0);
    const winPercentage = tradesCount > 0 ? (winTrades.length / tradesCount) * 100 : 0;

    // For monthly performance, we want to show stockMove % (which is consistent across accounting methods)
    // The key is that we're filtering trades correctly based on accounting method above
    const avgGain = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + (t.stockMove || 0), 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((sum, t) => sum + (t.stockMove || 0), 0) / lossTrades.length : 0;
    
    // Calculate average R:R (Reward to Risk ratio)
    const avgRR = tradesCount > 0 
      ? Math.abs(avgGain / avgLoss) // Use absolute values to get proper ratio
      : 0;

    const avgHoldingDays = tradesCount > 0 ? monthTrades.reduce((sum, t) => sum + (t.holdingDays || 0), 0) / tradesCount : 0;

    // Find corresponding monthly portfolio data
    const monthPortfolio = filteredMonthlyPortfolios.find(mp => mp.month === month) || {
      month,
      year: selectedYear,
      startingCapital: 0,
      capitalChanges: 0,
      pl: 0,
      finalCapital: 0
    };

    // Get capital changes for this month and year
    const monthCapitalChanges = capitalChanges.filter(change => {
      const changeDate = new Date(change.date);
      return changeDate.getMonth() === monthOrder.indexOf(month) && 
             changeDate.getFullYear() === selectedYear;
    });

    // Calculate net added/withdrawn from capital changes
    let netAddedWithdrawn = 0;
    monthCapitalChanges.forEach(change => {
      netAddedWithdrawn += change.type === 'deposit' ? change.amount : -change.amount;
    });

    // If no capital changes, use the portfolio data
    if (monthCapitalChanges.length === 0) {
      netAddedWithdrawn = monthPortfolio.capitalChanges;
    }

    // For months with no trades, show '-' for most stats and set finalCapital to 0
    // Use the starting capital from monthPortfolio which includes the net deposits/withdrawals
    const adjustedStartingCapital = monthPortfolio.startingCapital || getPortfolioSize(month, selectedYear, trades, useCashBasis);

    // Check if there's any P/L for this month (regardless of trade count)
    // This is important for Cash Basis where P/L might exist without trades initiated in this month
    const hasMonthlyPL = monthPortfolio.pl !== 0;
    const shouldShowPL = tradesCount > 0 || hasMonthlyPL;

    return {
      month,
      addedWithdrawn: netAddedWithdrawn,
      startingCapital: adjustedStartingCapital,
      pl: shouldShowPL ? monthPortfolio.pl : '-',
      plPercentage: shouldShowPL ? 0 : '-', // Will be calculated later in computedData
      finalCapital: shouldShowPL ? monthPortfolio.finalCapital : adjustedStartingCapital,
      yearPlPercentage: '',
      trades: tradesCount > 0 ? tradesCount : '-',
      winPercentage: tradesCount > 0 ? winPercentage : '-',
      avgGain: tradesCount > 0 ? avgGain : '-',
      avgLoss: tradesCount > 0 ? avgLoss : '-',
      avgRR: tradesCount > 0 ? avgRR : '-',
      biggestImpact: 0,
      smallestLoss: 0,
      avgHoldingDays: tradesCount > 0 ? avgHoldingDays : '-',
      cagr: 0,
      rollingReturn1M: 0,
      rollingReturn3M: 0,
      rollingReturn6M: 0,
      rollingReturn12M: 0
    };
  }), [monthOrder, monthlyMap, filteredMonthlyPortfolios, selectedYear, capitalChanges, getPortfolioSize, useCashBasis]);

  // Effect to update yearly starting capital when portfolio size changes
  React.useEffect(() => {
    setYearlyStartingCapitalState(portfolioSize);
  }, safeDeps([portfolioSize]));

  const computedData = React.useMemo(() => {
    const currentYear = selectedYear; // Use the selected year instead of current year
    
    return initialMonthlyData.map((row, i) => {
      const startingCapital = row.startingCapital;
      const pl = row.pl;
      const finalCapital = row.finalCapital;
      const monthIndex = monthOrder.indexOf(row.month);
      const currentDate = new Date(currentYear, monthIndex, 1);
      
      // Get all capital changes up to this month
      const relevantChanges = capitalChanges
        .filter(change => new Date(change.date) <= currentDate)
        .map(change => ({
          date: new Date(change.date),
          amount: change.type === 'deposit' ? change.amount : -change.amount
        }));

      // Calculate XIRR for different time periods
      const startOfYear = new Date(currentYear, 0, 1);
      const xirrYTD = (typeof startingCapital === 'number' && typeof finalCapital === 'number' && startingCapital !== 0)
        ? calcXIRR(startOfYear, yearlyStartingCapital, currentDate, finalCapital, relevantChanges)
        : 0;

      // Calculate rolling returns only if we have the required previous months' data
      let xirr1M = 0;
      let xirr3M = 0;
      let xirr6M = 0;
      let xirr12M = 0;

      // 1-month return
      if (i > 0 && initialMonthlyData[i-1] && typeof initialMonthlyData[i-1].finalCapital === 'number' && typeof finalCapital === 'number') {
        const prevMonth = new Date(currentYear, monthIndex - 1, 1);
        xirr1M = calcXIRR(
          prevMonth,
          initialMonthlyData[i-1].finalCapital,
          currentDate,
          finalCapital,
          relevantChanges.filter(c => c.date >= prevMonth)
        );
      }

      // 3-month return
      if (i >= 2 && initialMonthlyData[i-3] && typeof initialMonthlyData[i-3].finalCapital === 'number' && typeof finalCapital === 'number') {
        const prev3Month = new Date(currentYear, monthIndex - 3, 1);
        xirr3M = calcXIRR(
          prev3Month,
          initialMonthlyData[i-3].finalCapital,
          currentDate,
          finalCapital,
          relevantChanges.filter(c => c.date >= prev3Month)
        );
      }

      // 6-month return
      if (i >= 5 && initialMonthlyData[i-6] && typeof initialMonthlyData[i-6].finalCapital === 'number' && typeof finalCapital === 'number') {
        const prev6Month = new Date(currentYear, monthIndex - 6, 1);
        xirr6M = calcXIRR(
          prev6Month,
          initialMonthlyData[i-6].finalCapital,
          currentDate,
          finalCapital,
          relevantChanges.filter(c => c.date >= prev6Month)
        );
      }

      // 12-month return
      if (i >= 11 && initialMonthlyData[i-12] && typeof initialMonthlyData[i-12].finalCapital === 'number' && typeof finalCapital === 'number') {
        const prev12Month = new Date(currentYear, monthIndex - 12, 1);
        xirr12M = calcXIRR(
          prev12Month,
          initialMonthlyData[i-12].finalCapital,
          currentDate,
          finalCapital,
          relevantChanges.filter(c => c.date >= prev12Month)
        );
      }

      return {
        ...row,
        plPercentage: (typeof startingCapital === 'number' && typeof pl === 'number' && startingCapital !== 0)
          ? (pl / startingCapital) * 100
          : '-',
        cagr: xirrYTD,
        rollingReturn1M: xirr1M,
        rollingReturn3M: xirr3M,
        rollingReturn6M: xirr6M,
        rollingReturn12M: xirr12M
      };
    });
  }, safeDeps([initialMonthlyData, yearlyStartingCapital, capitalChanges, monthOrder]));
  
  // Ensure we have valid data before rendering the table
  if (!computedData || computedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="text-default-400 mb-2">
          <Icon icon="lucide:calendar-x" className="w-12 h-12 mx-auto mb-3 opacity-50" />
        </div>
        <div className="text-default-500 text-lg font-medium mb-1">
          No monthly data available
        </div>
        <div className="text-default-400 text-sm">
          Add some trades to see monthly performance breakdown
        </div>
      </div>
    );
  }

  // Helper to get the date string for the first day of a month/year
  const getMonthDateString = (month: string, year: number) => {
    const monthIndex = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(month);
    return new Date(year, monthIndex, 1).toISOString();
  };

  // Helper to get all years from 2000 to current year+1
  const getYearOptions = () => {
    const years = [];
    for (let y = 2000; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  };

  // Handler for saving the edited value
  const handleSaveAddedWithdrawn = (rowIndex: number, month: string, year: number) => {
    const value = Number(editingValue);
    if (isNaN(value)) return;
    
    // Get the month index (0-11)
    const monthIndex = monthOrder.indexOf(month);
    if (monthIndex === -1) return;
    
    // Always use selectedYear for the year
    year = selectedYear;
    
    // Check if starting capital is set for this month (either manually or automatically)
    const monthData = computedData[rowIndex];
    const startingCapital = monthData.startingCapital;
    
    // Allow adding/withdrawing funds regardless of starting capital value
    
    const monthDate = new Date(year, monthIndex, 1);
    const formattedDate = monthDate.toISOString();
    
    // Find any capital change for this month (assume only one per month for this UI)
    const existingChange = capitalChanges.find(change => {
      const d = new Date(change.date);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    });

    // Get the current portfolio size for this month
    const currentPortfolioSize = getPortfolioSize(month, year, trades, useCashBasis);
    
    if (existingChange) {
      // Calculate the difference to adjust the portfolio size
      const oldAmount = existingChange.type === 'deposit' 
        ? existingChange.amount 
        : -existingChange.amount;
      const newAmount = value; // value can be positive or negative
      const difference = newAmount - oldAmount;
      
      // Note: Portfolio size is now calculated automatically from true portfolio logic
      
      // Update the capital change
      updateCapitalChange({
        ...existingChange,
        amount: Math.abs(value),
        type: value >= 0 ? 'deposit' : 'withdrawal',
        date: formattedDate,
        description: 'Manual edit from performance table'
      });
    } else if (value !== 0) {
      // Only add if value is not zero
      // Note: Portfolio size is now calculated automatically from true portfolio logic
      
      // Add new capital change
      addCapitalChange({
        amount: Math.abs(value),
        type: value >= 0 ? 'deposit' : 'withdrawal',
        date: formattedDate,
        description: 'Manual edit from performance table'
      });
    } else if (value === 0 && existingChange) {
      // If setting to zero and there's an existing change, remove it
      // Note: Portfolio size is now calculated automatically from true portfolio logic
      
      // Delete the existing change
      deleteCapitalChange(existingChange.id);
    }
    
    setEditingCell(null);
    setEditingValue("");
  };

  const handleSaveStartingCapital = (rowIndex: number, month: string, year: number) => {
    const value = parseFloat(editingValue);
    if (isNaN(value) || value < 0) {
      setEditingCell(null);
      setEditingValue('');
      return;
    }

    // Set monthly starting capital override
    setMonthlyStartingCapitalOverride(month, year, value);

    setEditingCell(null);
    setEditingValue('');
  };

  const columns = [
    {
      key: 'month',
      label: (
        <div className="flex items-center gap-1">
          Month
        </div>
      )
    },
    {
      key: 'startingCapital',
      label: (
        <div className="flex items-center gap-1">
          Starting Capital
          <MobileTooltip content={
        <div className="max-w-xs text-xs p-1">
          <div>Capital at the start of the month, before trades and capital changes.</div>
          <div className="mt-2 font-semibold">Calculation Priority:</div>
          <div>1. Manual Override (if set)</div>
          <div>2. January: Yearly starting capital</div>
          <div>3. Other months: Previous month's final capital</div>
          <div className="text-foreground-400 mt-2">Click to edit or manage in Portfolio Settings</div>
        </div>
      } placement="top">
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </MobileTooltip>
        </div>
      )
    },
    {
      key: 'addedWithdrawn',
      label: (
        <div className="flex items-center gap-1">
          Added/Withdrawn
          <MobileTooltip
            content={
              <div className="max-w-xs text-xs p-1">
                <b>Assumption:</b><br />
                For XIRR calculation, all additions and withdrawals are assumed to occur on the <b>first day of the month</b>, even if the actual cash flow happened mid-month.<br /><br />
                This may slightly affect the accuracy of annualized returns if you have frequent mid-month capital changes.
              </div>
            }
            placement="top"
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </MobileTooltip>
        </div>
      )
    },
    {
      key: 'pl',
      label: (
        <div className="flex items-center gap-1">
          P/L
          <Tooltip
            content={
              <div className="max-w-xs p-2">
                <div className="font-semibold text-sm mb-1">
                  P/L Calculation ({useCashBasis ? 'Cash Basis' : 'Accrual Basis'})
                </div>
                <div className="text-xs">
                  {useCashBasis
                    ? "P/L is attributed to the month when trades are actually exited/closed, regardless of when they were initiated."
                    : "P/L is attributed to the month when trades are initiated/opened, regardless of when they are closed."
                  }
                </div>
                <div className="text-xs text-warning-600 mt-2">
                  Toggle accounting method using the switch above to see different P/L attribution.
                </div>
              </div>
            }
            placement="top"
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </Tooltip>
        </div>
      )
    },
    {
      key: 'plPercentage',
      label: (
        <div className="flex items-center gap-1">
          % P/L
          <Tooltip
            content={
              <div className="max-w-xs p-2">
                <div className="font-semibold text-sm mb-1">
                  P/L Percentage ({useCashBasis ? 'Cash Basis' : 'Accrual Basis'})
                </div>
                <div className="text-xs">
                  Profit or loss as a percentage of starting capital for the month (before taxes).
                </div>
                <div className="text-xs mt-2">
                  {useCashBasis
                    ? "Based on P/L from trades exited in this month."
                    : "Based on P/L from trades initiated in this month."
                  }
                </div>
              </div>
            }
            placement="top"
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </Tooltip>
        </div>
      )
    },
    {
      key: 'finalCapital',
      label: (
        <div className="flex items-center gap-1">
          Final Capital
          <Tooltip 
            content={
              <div className="max-w-xs p-2">
                <p className="font-semibold mb-1">Final Capital Calculation:</p>
                <p className="text-sm">Starting Capital + P/L + (Added - Withdrawn)</p>
                <p className="text-xs mt-2 text-foreground-500">Note: Please ensure Starting Capital is set before adding/withdrawing funds.</p>
              </div>
            } 
            placement="top"
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </Tooltip>
        </div>
      )
    },
    {
      key: 'cagr',
      label: (
        <div className="flex items-center gap-1">
          YTD Return %
          <Tooltip
            content={
              <div className="max-w-xs text-xs p-1">
                <b>Year-to-Date Return</b> calculated using XIRR (Extended Internal Rate of Return)<br /><br />
                <ul className="list-disc pl-4">
                  <li>Accounts for the timing and size of all cash flows</li>
                  <li>Includes deposits and withdrawals</li>
                  <li>More accurate than simple percentage returns</li>
                  <li>Annualized return from start of year to current month</li>
                </ul>
                <br />
                <span className="text-foreground-400">Uses XIRR calculation which considers the timing of all cash flows</span>
              </div>
            }
            placement="top"
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </Tooltip>
        </div>
      )
    },
    {
      key: 'rollingReturn1M',
      label: (
        <div className="flex items-center gap-1">
          1M Return %
          <Tooltip
            content={
              <div className="max-w-xs text-xs p-1">
                <b>1-Month Return</b> calculated using XIRR<br /><br />
                <ul className="list-disc pl-4">
                  <li>Considers all cash flows in the last month</li>
                  <li>Accounts for timing of deposits/withdrawals</li>
                  <li>More accurate than simple month-over-month return</li>
                </ul>
              </div>
            }
            placement="top"
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </Tooltip>
        </div>
      )
    },
    {
      key: 'rollingReturn3M',
      label: (
        <div className="flex items-center gap-1">
          3M Return %
          <Tooltip
            content={
              <div className="max-w-xs text-xs p-1">
                <b>3-Month Return</b> calculated using XIRR<br /><br />
                <ul className="list-disc pl-4">
                  <li>Considers all cash flows in the last 3 months</li>
                  <li>Accounts for timing of deposits/withdrawals</li>
                  <li>Annualized return over the 3-month period</li>
                </ul>
              </div>
            }
            placement="top"
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </Tooltip>
        </div>
      )
    },
    {
      key: 'rollingReturn6M',
      label: (
        <div className="flex items-center gap-1">
          6M Return %
          <Tooltip
            content={
              <div className="max-w-xs text-xs p-1">
                <b>6-Month Return</b> calculated using XIRR<br /><br />
                <ul className="list-disc pl-4">
                  <li>Considers all cash flows in the last 6 months</li>
                  <li>Accounts for timing of deposits/withdrawals</li>
                  <li>Annualized return over the 6-month period</li>
                </ul>
              </div>
            }
            placement="top"
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </Tooltip>
        </div>
      )
    },
    {
      key: 'rollingReturn12M',
      label: (
        <div className="flex items-center gap-1">
          12M Return %
          <Tooltip
            content={
              <div className="max-w-xs text-xs p-1">
                <b>12-Month Return</b> calculated using XIRR<br /><br />
                <ul className="list-disc pl-4">
                  <li>Considers all cash flows in the last 12 months</li>
                  <li>Accounts for timing of deposits/withdrawals</li>
                  <li>True annual return considering all capital changes</li>
                </ul>
              </div>
            }
            placement="top"
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </Tooltip>
        </div>
      )
    },
    {
      key: 'trades',
      label: (
        <div className="flex items-center gap-1">
          Trades
          <MobileTooltip content="Number of trades closed in this month." placement="top">
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </MobileTooltip>
        </div>
      )
    },
    {
      key: 'winPercentage',
      label: (
        <div className="flex items-center gap-1">
          % Win
          <MobileTooltip content="Percentage of trades closed with a profit in this month." placement="top">
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </MobileTooltip>
        </div>
      )
    },
    {
      key: 'avgGain',
      label: (
        <div className="flex items-center gap-1">
          Avg Gain
          <MobileTooltip content="Average percentage gain for winning trades in this month." placement="top">
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </MobileTooltip>
        </div>
      )
    },
    {
      key: 'avgLoss',
      label: (
        <div className="flex items-center gap-1">
          Avg Loss
          <MobileTooltip content="Average percentage loss for losing trades in this month." placement="top">
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </MobileTooltip>
        </div>
      )
    },
    {
      key: 'avgRR',
      label: (
        <div className="flex items-center gap-1">
          Avg R:R
          <MobileTooltip content="Average reward-to-risk ratio for trades in this month." placement="top">
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </MobileTooltip>
        </div>
      )
    },
    {
      key: 'avgHoldingDays',
      label: (
        <div className="flex items-center gap-1">
          Avg Days
          <MobileTooltip content="Average holding period (in days) for trades closed in this month." placement="top">
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </MobileTooltip>
        </div>
      )
    },
  ];

  // Track the previous editingCell to only update editingValue when editing a new cell
  const prevEditingCell = React.useRef(editingCell);

  React.useEffect(() => {
    // Only run when editingCell changes to a new cell
    if (
      editingCell &&
      editingCell.col === 'addedWithdrawn' &&
      (prevEditingCell.current?.row !== editingCell.row || prevEditingCell.current?.col !== editingCell.col)
    ) {
      const rowIndex = editingCell.row;
      const item = computedData[rowIndex];
      if (!item) return;
      const month = item.month;
      const monthPortfolio = filteredMonthlyPortfolios.find(mp => mp.month === month);
      const year = monthPortfolio ? monthPortfolio.year : selectedYear;
      const existingChange = capitalChanges.find(change => {
        const d = new Date(change.date);
        return d.getMonth() === monthOrder.indexOf(month) && d.getFullYear() === year;
      });
      if (existingChange) {
        const sign = existingChange.type === 'deposit' ? 1 : -1;
        setEditingValue(String(existingChange.amount * sign));
      } else {
        setEditingValue('');
      }
    }

    // Handle starting capital editing
    if (
      editingCell &&
      editingCell.col === 'startingCapital' &&
      (prevEditingCell.current?.row !== editingCell.row || prevEditingCell.current?.col !== editingCell.col)
    ) {
      const rowIndex = editingCell.row;
      const item = computedData[rowIndex];
      if (!item) return;
      const month = item.month;

      // Check if there's a monthly override for this month
      const override = getMonthlyStartingCapitalOverride(month, selectedYear);
      if (override !== null) {
        setEditingValue(String(override));
      } else {
        // Use the current calculated starting capital
        setEditingValue(String(item.startingCapital));
      }
    }

    prevEditingCell.current = editingCell;
  }, safeDeps([editingCell, computedData, capitalChanges, filteredMonthlyPortfolios, getMonthlyStartingCapitalOverride, selectedYear]));

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-blue-50 dark:bg-gray-900 rounded-lg p-4 border border-blue-200 dark:border-gray-800">
        <div className="flex items-start gap-2">
          <Icon icon="lucide:info" className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-800 dark:text-white">Portfolio Management:</p>
            <p className="text-sm text-blue-700 dark:text-gray-200">
              You can edit <span className="font-semibold">Starting Capital</span> and <span className="font-semibold">Added/Withdrawn</span> directly in this table, or manage them through <span className="font-semibold">Portfolio Settings</span> (profile icon). Both places stay in sync automatically.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <label htmlFor="year-picker" className="font-medium text-black dark:text-white">Year:</label>
        <select
          id="year-picker"
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          style={{ height: 32, borderRadius: 6, border: '1px solid #ccc', padding: '0 8px', fontSize: 16 }}
        >
          {getYearOptions().map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="rounded-lg border border-default-200 dark:border-default-100 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <Table
            aria-label="Monthly performance table"
            classNames={{
              base: "min-w-[1200px]",
              wrapper: "shadow-none p-0 rounded-none",
              table: "table-auto",
              thead: "[&>tr]:first:shadow-none",
              th: "bg-default-100 dark:bg-gray-950 text-foreground-600 dark:text-white text-xs font-medium uppercase border-b border-default-200 dark:border-gray-800 sticky top-0 z-20 backdrop-blur-sm",
              td: "py-3 px-4 border-b border-default-200 dark:border-gray-800 text-foreground-800 dark:text-gray-200",
            }}
            removeWrapper
          >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn key={column.key} className="whitespace-nowrap">
                {column.label}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody items={computedData}>
            {(item) => (
              <TableRow key={item.month} className="group hover:bg-default-50 dark:hover:bg-gray-800">
                {(columnKey) => {
                  if (columnKey === 'yearPlPercentage') return null;
                  const rowIndex = computedData.findIndex(d => d.month === item.month);
                  const isEditing = editingCell && editingCell.row === rowIndex && editingCell.col === columnKey;
                  const value = item[columnKey as keyof typeof item];
                  if (columnKey === 'addedWithdrawn') {
                    if (isEditing) {
                      return (
                        <TableCell key={`${item.month}-${String(columnKey)}`}> 
                          <div className="flex items-center gap-2">
                            <Input
                              autoFocus
                              size="sm"
                              variant="bordered"
                              type="number"
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveAddedWithdrawn(rowIndex, item.month, selectedYear)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleSaveAddedWithdrawn(rowIndex, item.month, selectedYear);
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                  setEditingValue('');
                                }
                              }}
                              className="h-8 w-32 min-w-[8rem] bg-background dark:bg-gray-900 border border-default-300 dark:border-primary focus:border-primary dark:focus:border-primary text-sm text-foreground dark:text-white text-right"
                              startContent={
                                <span className="text-foreground-500 text-sm pr-1">₹</span>
                              }
                            />
                          </div>
                        </TableCell>
                      );
                    }
                    const numValue = Number(value);
                    return (
                      <TableCell
                        key={`${item.month}-${String(columnKey)}`}
                        className="cursor-pointer rounded-md"
                        onClick={() => {
                          setEditingCell({ row: rowIndex, col: columnKey });
                          setEditingValue(numValue === 0 ? "" : String(numValue));
                        }}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={numValue < 0 ? "text-danger-600 dark:text-danger-400" : "text-success-600 dark:text-success-400"}>
                            {numValue < 0
                              ? `Withdrawn ₹${Math.abs(numValue).toLocaleString()}`
                              : `Added ₹${numValue.toLocaleString()}`}
                          </span>
                          <span className="text-foreground-400">
                            <Icon icon="lucide:edit-2" className="h-2.5 w-2.5" />
                          </span>
                        </div>
                      </TableCell>
                    );
                  }

                  if (columnKey === 'month') {
                    return (
                      <TableCell key={`${item.month}-${String(columnKey)}`}>
                        <span className="font-medium text-foreground dark:text-foreground-200">{value}</span>
                      </TableCell>
                    );
                  }
                  
                  if (columnKey === 'pl' || columnKey === 'plPercentage' || 
                      (typeof columnKey === 'string' && (columnKey === 'cagr' || columnKey.startsWith('rollingReturn')))) {
                    return (
                      <TableCell key={`${item.month}-${String(columnKey)}`}>
                        <span className={`${value !== '-' && Number(value) >= 0 ? "text-success-600 dark:text-success-400" : value !== '-' ? "text-danger-600 dark:text-danger-400" : ''}`}>
                          {value === '-' ? '-' : (columnKey === 'pl' ? Number(value).toLocaleString() : `${Number(value).toFixed(2)}%`)}
                        </span>
                      </TableCell>
                    );
                  }
                  
                  if (columnKey === 'winPercentage') {
                    return (
                      <TableCell key={`${item.month}-${String(columnKey)}`}>
                        <div className="flex items-center gap-1 text-foreground dark:text-foreground-200">
                          {value === '-' ? '-' : (
                            <>
                              {Number(value) > 0 ? (
                                <Icon icon="lucide:check" className="text-success-600 dark:text-success-400 w-3 h-3" />
                              ) : (
                                <Icon icon="lucide:x" className="text-danger-600 dark:text-danger-400 w-3 h-3" />
                              )}
                              {Number(value).toFixed(2)}%
                            </>
                          )}
                        </div>
                      </TableCell>
                    );
                  }
                  
                  if (columnKey === 'avgGain') {
                    return (
                      <TableCell key={`${item.month}-${String(columnKey)}`}>
                        {value === '-' ? '-' : (
                          Number(value) > 0 ? (
                            <span className="text-success-600 dark:text-success-400">{Number(value).toFixed(2)}%</span>
                          ) : <span className="text-foreground-500 dark:text-foreground-400">-</span>
                        )}
                      </TableCell>
                    );
                  }
                  
                  if (columnKey === 'avgLoss') {
                    return (
                      <TableCell key={`${item.month}-${String(columnKey)}`}>
                        {value === '-' ? '-' : (
                          <span className="text-danger-600 dark:text-danger-400">{Number(value).toFixed(2)}%</span>
                        )}
                      </TableCell>
                    );
                  }
                  
                  if (columnKey === 'avgRR') {
                    return (
                      <TableCell key={`${item.month}-${String(columnKey)}`}>
                        <span className={`${value !== '-' && Number(value) >= 0 ? "text-success-600 dark:text-success-400" : value !== '-' ? "text-danger-600 dark:text-danger-400" : ''}`}>
                          {value === '-' ? '-' : Number(value).toFixed(2)}
                        </span>
                      </TableCell>
                    );
                  }
                  
                  if (columnKey === 'startingCapital') {
                    const override = getMonthlyStartingCapitalOverride(item.month, selectedYear);
                    const hasCustomSize = override !== null;
                    
                    if (isEditing) {
                      return (
                        <TableCell key={`${item.month}-${String(columnKey)}`}>
                          <div className="flex items-center gap-2">
                            <Input
                              autoFocus
                              size="sm"
                              variant="bordered"
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveStartingCapital(rowIndex, item.month, selectedYear)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleSaveStartingCapital(rowIndex, item.month, selectedYear);
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                  setEditingValue("");
                                }
                              }}
                              classNames={{
                                inputWrapper: "h-8 min-h-0 bg-background dark:bg-gray-900 border-default-300 dark:border-primary focus-within:border-primary dark:focus-within:border-primary",
                                input: "text-sm text-foreground dark:text-white text-right placeholder:text-gray-400 dark:placeholder:text-gray-500"
                              }}
                              style={{ width: 120 }}
                              startContent={
                                <span className="text-foreground-500 text-sm pr-1">₹</span>
                              }
                            />
                            <MobileTooltip content="Click to save starting capital" placement="top">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => handleSaveStartingCapital(rowIndex, item.month, selectedYear)}
                              >
                                <Icon icon="lucide:check" className="h-4 w-4 text-success-500" />
                              </Button>
                            </MobileTooltip>
                          </div>
                        </TableCell>
                      );
                    }
                    
                    let tooltipDerivation = '';

                    if (hasCustomSize) {
                        tooltipDerivation = `Manually overridden starting capital for ${item.month} ${selectedYear}.`;
                    } else if (item.month === 'Jan') {
                        tooltipDerivation = `Derived from Yearly Starting Capital: ₹${yearlyStartingCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    } else {
                        const prevMonthIndex = monthOrder.indexOf(item.month) - 1;
                        if (prevMonthIndex >= 0 && computedData[prevMonthIndex]) {
                            const prevMonthItem = computedData[prevMonthIndex];
                            const prevMonthFinalCapital = typeof prevMonthItem.finalCapital === 'number' ? Number(prevMonthItem.finalCapital) : null;
                            const currentMonthAddedWithdrawn = typeof item.addedWithdrawn === 'number' ? Number(item.addedWithdrawn) : null;

                            if (prevMonthFinalCapital !== null && currentMonthAddedWithdrawn !== null) {
                                tooltipDerivation = `Derived from: ₹${prevMonthFinalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Prev Month Final Capital) + ₹${currentMonthAddedWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Current Month Added/Withdrawn) = ₹${Number(item.startingCapital).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            } else if (prevMonthFinalCapital !== null) {
                                tooltipDerivation = `Derived from: ₹${prevMonthFinalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Previous Month Final Capital)`;
                            } else {
                                tooltipDerivation = `Calculation details unavailable.`;
                            }
                        } else {
                            tooltipDerivation = `Calculation details unavailable for previous month.`;
                        }
                    }

                    return (
                      <TableCell
                        key={`${item.month}-${String(columnKey)}`}
                        className="cursor-pointer group rounded-md"
                        onClick={() => {
                          setEditingCell({ row: rowIndex, col: columnKey });
                          setEditingValue(value === '-' ? '' : String(value));
                        }}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-foreground-500 text-sm">₹</span>
                          <span className={`${hasCustomSize ? 'font-medium text-primary-600 dark:text-primary-400' : 'text-foreground dark:text-foreground-200'}`}>
                            {value === '-' ? '-' : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <MobileTooltip
                            content={<div className="max-w-xs text-xs p-1">{tooltipDerivation}</div>}
                            placement="top"
                            radius="sm"
                            shadow="md"
                            classNames={{ content: "bg-content1 border border-divider z-50 max-w-xs" }}
                          >
                            <Icon icon="lucide:info" className="h-2.5 w-2.5 text-foreground-400 cursor-help" />
                          </MobileTooltip>
                          <span className="text-foreground-400">
                            <Icon icon="lucide:edit-2" className="h-2.5 w-2.5" />
                          </span>
                        </div>
                      </TableCell>
                    );
                  }
                  
                  if (columnKey === 'finalCapital') {
                    return (
                      <TableCell key={`${item.month}-${String(columnKey)}`}>
                        <span className="text-foreground dark:text-foreground-200">{value === '-' ? '-' : Number(value).toLocaleString()}</span>
                      </TableCell>
                    );
                  }
                  
                  if (columnKey === 'avgHoldingDays') {
                    return (
                      <TableCell key={`${item.month}-${String(columnKey)}`}>
                        {value === '-' ? '-' : Number(value).toFixed(2)}
                      </TableCell>
                    );
                  }
                  
                  if (columnKey === 'trades') {
                    return (
                      <TableCell key={`${item.month}-${String(columnKey)}`}>
                        {value === '-' ? '-' : value}
                      </TableCell>
                    );
                  }
                  
                  return (
                    <TableCell key={`${item.month}-${String(columnKey)}`}>
                      <span className="text-foreground dark:text-foreground-200">{value}</span>
                    </TableCell>
                  );
                }}
              </TableRow>
            )}
          </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
