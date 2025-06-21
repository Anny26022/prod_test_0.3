import React, { useMemo } from 'react';
import { Card, CardBody, CardHeader, Divider, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Tooltip } from "@heroui/react";
import { useTrades } from '../hooks/use-trades';
import { useTruePortfolioWithTrades } from '../hooks/use-true-portfolio-with-trades';
import { Icon } from '@iconify/react';
import { motion } from "framer-motion"; // Import motion for StatsCard animation
import SetupFrequencyChart from '../components/analytics/SetupFrequencyChart'; // Import the new chart component
import { loadIndustrySectorMapping, getIndustrySectorByName } from '../utils/industrySectorMap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import IndustryDistributionChart from '../components/analytics/IndustryDistributionChart';
import { Accordion, AccordionItem } from "@heroui/react";
import PnLDistributionCharts from '../components/analytics/PnLDistributionCharts';
import TradeHeatmap from '../components/analytics/TradeHeatmap';
import { useGlobalFilter } from '../context/GlobalFilterContext';
import { useAccountingMethod } from '../context/AccountingMethodContext';
import { calculateTradePL, getTradeDateForAccounting, getExitDatesWithFallback } from '../utils/accountingUtils';
import {
  getUniqueSortedDates,
  calculateDailyPortfolioValues,
  calculateDailyReturns,
  calculateStandardDeviation,
  calculateMaxDrawdown,
  calculateDownsideDeviation,
  calculateSharpeRatio,
  calculateCalmarRatio,
  calculateSortinoRatio,
  annualizeMetric,
  calcUnrealizedPL // Import calcUnrealizedPL if not already imported
} from '../utils/tradeCalculations';

// Assuming Trade type is available from useTrades or a common types file
// import { Trade } from '../types/trade'; 

// Placeholder type if not explicitly imported (ensure these match your actual Trade type structure)
interface Trade {
    id: string;
    name: string;
    positionStatus: "Open" | "Closed" | "Partial";
    positionSize: number; // Assuming positionSize is available
    plRs: number; // Add plRs for calculating win/loss stats
    holdingDays: number; // Add holdingDays for hold time stats
    date: string; // Add date for streak calculation
    pfImpact: number; // Add pfImpact for percentage-based calculations
    setup?: string; // Ensure setup is included for the chart
    avgEntry?: number;
    cmp?: number;
    openQty?: number;
    buySell?: 'Buy' | 'Sell';
}


const DeepAnalyticsPage: React.FC = () => { // Renamed component
    const { trades, isLoading } = useTrades();
    const { portfolioSize, capitalChanges } = useTruePortfolioWithTrades(trades);
    const { filter } = useGlobalFilter();
    const { accountingMethod } = useAccountingMethod();
    const useCashBasis = accountingMethod === 'cash';
    const [mappingLoaded, setMappingLoaded] = React.useState(false);

    // Load industry/sector mapping on mount
    React.useEffect(() => {
        loadIndustrySectorMapping().then(() => setMappingLoaded(true));
    }, []);

    // Augment trades with industry/sector
    const tradesWithIndustry = useMemo(() => {
        if (!mappingLoaded) return [];
        return trades.map(trade => {
            const info = getIndustrySectorByName(trade.name);
            return {
                ...trade,
                industry: info?.industry || 'Unknown',
                sector: info?.sector || 'Unknown',
            };
        });
    }, [trades, mappingLoaded]);

    // Group trades by industry and sector to get stock names for tooltips
    const tradesByIndustry = useMemo(() => {
        if (!tradesWithIndustry.length) return {};
        return tradesWithIndustry.reduce((acc, trade) => {
            const key = trade.industry;
            if (!acc[key]) acc[key] = [];
            acc[key].push(trade);
            return acc;
        }, {} as Record<string, typeof tradesWithIndustry>);
    }, [tradesWithIndustry]);

    const industryChartData = useMemo(() => {
        return Object.entries(tradesByIndustry)
            .map(([name, trades]) => ({
                name,
                trades: trades.length,
                stockNames: [...new Set(trades.map(t => t.name))]
            }))
            .sort((a, b) => b.trades - a.trades);
    }, [tradesByIndustry]);

    const tradesBySector = useMemo(() => {
        if (!tradesWithIndustry.length) return {};
        return tradesWithIndustry.reduce((acc, trade) => {
            const key = trade.sector;
            if (!acc[key]) acc[key] = [];
            acc[key].push(trade);
            return acc;
        }, {} as Record<string, typeof tradesWithIndustry>);
    }, [tradesWithIndustry]);

    const sectorChartData = useMemo(() => {
        return Object.entries(tradesBySector)
            .map(([name, trades]) => ({
                name,
                trades: trades.length,
                stockNames: [...new Set(trades.map(t => t.name))]
            }))
            .sort((a, b) => b.trades - a.trades);
    }, [tradesBySector]);

    const industryStats = useMemo(() => {
        if (industryChartData.length === 0) {
            return { most: 'N/A', least: 'N/A', mostStocks: [], leastStocks: [] };
        }
        const most = industryChartData[0];
        const least = industryChartData[industryChartData.length - 1];
        return {
            most: most.name,
            least: least.name,
            mostStocks: most.stockNames || [],
            leastStocks: least.stockNames || []
        };
    }, [industryChartData]);

    const sectorStats = useMemo(() => {
        if (sectorChartData.length === 0) {
            return { most: 'N/A', least: 'N/A', mostStocks: [], leastStocks: [] };
        }
        const most = sectorChartData[0];
        const least = sectorChartData[sectorChartData.length - 1];
        return {
            most: most.name,
            least: least.name,
            mostStocks: most.stockNames || [],
            leastStocks: least.stockNames || []
        };
    }, [sectorChartData]);

    const setupPerformance = useMemo(() => {
        // For cash basis, deduplicate trades to avoid double counting
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

        const tradesWithSetup = uniqueTrades.filter(t => t.setup && t.setup.trim() !== '');

        if (tradesWithSetup.length === 0) {
            return [];
        }

        const tradesBySetup = tradesWithSetup.reduce((acc, trade) => {
            const key = trade.setup!;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(trade);
            return acc;
        }, {} as Record<string, typeof tradesWithSetup>);

        const setupStats = Object.entries(tradesBySetup).map(([setupName, setupTrades]) => {
            const totalTrades = setupTrades.length;

            // Calculate P/L based on accounting method
            const tradesWithAccountingPL = setupTrades.map(trade => ({
                ...trade,
                accountingPL: calculateTradePL(trade, useCashBasis)
            }));

            const winningTrades = tradesWithAccountingPL.filter(t => t.accountingPL > 0).length;
            const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
            // Use accounting-method-aware PF Impact
            const totalPfImpact = setupTrades.reduce((sum, trade) => {
                const pfImpact = useCashBasis
                    ? (trade._cashPfImpact ?? 0)
                    : (trade._accrualPfImpact ?? trade.pfImpact ?? 0);
                return sum + pfImpact;
            }, 0);

        return {
                id: setupName,
                name: setupName,
                totalTrades,
                winRate,
                totalPfImpact,
        };
        });

        // Sort by total PF impact to show most impactful setups first
        return setupStats.sort((a, b) => b.totalPfImpact - a.totalPfImpact);
    }, [trades, useCashBasis]);

    // --- Calculations for Deep Analytics --- //
    const processedTrades = useMemo(() => {
        if (!useCashBasis) return trades;
        // For cash basis: flatten all expanded trades from _expandedTrades arrays
        const expanded = trades.flatMap(trade =>
            Array.isArray(trade._expandedTrades)
                ? trade._expandedTrades.filter(t => t._cashBasisExit)
                : (trade._cashBasisExit ? [trade] : [])
        );
        if (process.env.NODE_ENV === 'development') {
            console.log('[CASH BASIS FIX] Using all expanded trades for analytics:', expanded.map(t => ({ id: t.id, pl: calculateTradePL(t, true) })));
        }
        return expanded;
    }, [trades, useCashBasis]);

    const analytics = useMemo(() => {
        let closedTrades = processedTrades.filter(trade => trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial');
        let totalTrades = closedTrades.length;

        // --- Cash Basis: Group and sum by original trade ID ---
        let groupedTrades = closedTrades;
        if (useCashBasis) {
            // Group by original trade ID (strip _exit_)
            const tradeGroups = new Map();
            closedTrades.forEach(trade => {
                const originalId = trade.id.split('_exit_')[0];
                const pl = calculateTradePL(trade, true);
                if (!tradeGroups.has(originalId)) {
                    tradeGroups.set(originalId, { ...trade, accountingPL: 0, exits: [] });
                }
                const group = tradeGroups.get(originalId);
                group.accountingPL += pl;
                group.exits.push(trade);
            });
            groupedTrades = Array.from(tradeGroups.values());
            totalTrades = groupedTrades.length;
            if (process.env.NODE_ENV === 'development') {
                console.log('[CASH BASIS GROUPED] Grouped trades for stats:', groupedTrades.map(t => ({ id: t.id, accountingPL: t.accountingPL, exits: t.exits.map(e => e.id) })));
            }
        }
        // Use groupedTrades for all win/loss stats below

        if (totalTrades === 0) {
            return {
                expectancy: 0,
                profitFactor: 0,
                avgWinHold: 0,
                avgLossHold: 0,
                avgWin: 0,
                avgLoss: 0,
                winStreak: 0,
                lossStreak: 0,
                topWin: 0,
                topLoss: 0,
                avgWinPfImpact: 0,
                avgLossPfImpact: 0,
                totalPositivePfImpact: 0,
                totalAbsoluteNegativePfImpact: 0,
                avgPnLPerDay: 0,
                uniqueTradingDays: 0,
                sharpeRatio: 0,
                calmarRatio: 0,
                sortinoRatio: 0,
                annualizedAverageReturn: 0,
                annualRiskFreeRate: 0,
                annualizedStdDev: 0,
                annualizedDownsideDev: 0,
                maxDrawdown: 0
            };
        }

        // Calculate P/L based on accounting method
        const tradesWithAccountingPL = groupedTrades.map(trade => ({
            ...trade,
            accountingPL: useCashBasis ? trade.accountingPL : calculateTradePL(trade, useCashBasis)
        }));

        const winningTrades = tradesWithAccountingPL.filter(trade => trade.accountingPL > 0);
        const losingTrades = tradesWithAccountingPL.filter(trade => trade.accountingPL < 0);
        const totalWinningTrades = winningTrades.length;
        const totalLosingTrades = losingTrades.length;

        // Calculate total P&L and total trading days using accounting method
        const totalPnL = tradesWithAccountingPL.reduce((sum, trade) => sum + trade.accountingPL, 0);
        const uniqueTradingDays = new Set(groupedTrades.map(trade => trade.date.split('T')[0])).size;
        const avgPnLPerDay = uniqueTradingDays > 0 ? totalPnL / uniqueTradingDays : 0;

        // Calculate total positive and negative PF Impact using accounting-method-aware values
        const totalPositivePfImpact = winningTrades.reduce((sum, trade) => {
            const pfImpact = useCashBasis
                ? (trade._cashPfImpact ?? 0)
                : (trade._accrualPfImpact ?? trade.pfImpact ?? 0);
            return sum + pfImpact;
        }, 0);
        const totalAbsoluteNegativePfImpact = losingTrades.reduce((sum, trade) => {
            const pfImpact = useCashBasis
                ? (trade._cashPfImpact ?? 0)
                : (trade._accrualPfImpact ?? trade.pfImpact ?? 0);
            return sum + Math.abs(pfImpact);
        }, 0);

        // Calculate average PF Impact for winning and losing trades
        const avgWinPfImpact = totalWinningTrades > 0 ? totalPositivePfImpact / totalWinningTrades : 0;
        const avgLossPfImpact = totalLosingTrades > 0 ? totalAbsoluteNegativePfImpact / totalLosingTrades : 0;

        const winRate = totalTrades > 0 ? totalWinningTrades / totalTrades : 0;
        const lossRate = totalTrades > 0 ? totalLosingTrades / totalTrades : 0;

        // Expectancy (using Average PF Impact and Rates)
        const expectancy = (avgWinPfImpact * winRate) - (avgLossPfImpact * lossRate);

        // Profit Factor (using Total PF Impact)
        const profitFactor = totalAbsoluteNegativePfImpact > 0 ? totalPositivePfImpact / totalAbsoluteNegativePfImpact : totalPositivePfImpact > 0 ? Infinity : 0; // Handle division by zero

        // Calculate Avg Win/Loss and Top Win/Loss using accounting method
        const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.accountingPL, 0);
        const totalLoss = losingTrades.reduce((sum, trade) => sum + Math.abs(trade.accountingPL), 0); // Use absolute for total loss

        const avgWin = totalWinningTrades > 0 ? totalProfit / totalWinningTrades : 0;
        const avgLoss = totalLosingTrades > 0 ? totalLoss / totalLosingTrades : 0; // This will be a positive value

        const avgWinHold = totalWinningTrades > 0 ? winningTrades.reduce((sum, trade) => sum + trade.holdingDays, 0) / totalWinningTrades : 0;
        const avgLossHold = totalLosingTrades > 0 ? losingTrades.reduce((sum, trade) => sum + trade.holdingDays, 0) / totalLosingTrades : 0;

        const topWin = totalWinningTrades > 0 ? Math.max(...winningTrades.map(trade => trade.accountingPL)) : 0;
        const topLoss = totalLosingTrades > 0 ? Math.min(...losingTrades.map(trade => trade.accountingPL)) : 0; // Will be a negative value

        // Calculate Win/Loss Streaks based on accounting method
        let currentWinStreak = 0;
        let maxWinStreak = 0;
        let currentLossStreak = 0;
        let maxLossStreak = 0;

        // Sort trades chronologically based on accounting method
        let sortedTradesForStreaks;
        if (useCashBasis) {
            // For cash basis, group by original trade ID and calculate total P/L per trade
            const tradeGroups = new Map<string, { trade: any; exits: any[]; totalPL: number; latestExitDate: string }>();

            closedTrades.forEach(trade => {
                if (trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial') {
                    const originalId = trade.id.split('_exit_')[0];
                    const exits = getExitDatesWithFallback(trade);

                    if (!tradeGroups.has(originalId)) {
                        tradeGroups.set(originalId, {
                            trade,
                            exits: [],
                            totalPL: 0,
                            latestExitDate: ''
                        });
                    }

                    const group = tradeGroups.get(originalId)!;

                    // Calculate total P/L for this trade across all exits
                    exits.forEach(exit => {
                        const partialPL = calculateTradePL({
                            ...trade,
                            _cashBasisExit: {
                                date: exit.date,
                                qty: exit.qty,
                                price: exit.price
                            }
                        }, true);

                        group.totalPL += partialPL;
                        group.exits.push(exit);

                        // Track the latest exit date for sorting
                        if (!group.latestExitDate || new Date(exit.date) > new Date(group.latestExitDate)) {
                            group.latestExitDate = exit.date;
                        }
                    });
                }
            });

            // Convert to sorted array using latest exit date for each original trade
            sortedTradesForStreaks = Array.from(tradeGroups.values())
                .map(group => ({
                    trade: group.trade,
                    accountingPL: group.totalPL,
                    exitDate: group.latestExitDate
                }))
                .sort((a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime());
        } else {
            // For accrual basis, sort by entry date
            sortedTradesForStreaks = tradesWithAccountingPL
                .filter(trade => trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(trade => ({ trade, accountingPL: trade.accountingPL, exitDate: trade.date }));
        }

        for (const entry of sortedTradesForStreaks) {
            if (entry.accountingPL > 0) {
                currentWinStreak++;
                maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
                currentLossStreak = 0;
            } else if (entry.accountingPL < 0) {
                currentLossStreak++;
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
                currentWinStreak = 0;
            } else { // breakeven or zero P/L
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
                maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
                currentWinStreak = 0;
                currentLossStreak = 0;
            }
        }

        // Account for streaks ending at the last trade
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);

        // --- Calculate Sharpe, Calmar, Sortino Ratios ---
        const allTradesForMetrics = processedTrades; // Use all trades for portfolio value calculation
        const dailyPortfolioValues = calculateDailyPortfolioValues(allTradesForMetrics, capitalChanges, useCashBasis);
        const dailyReturnsMap = calculateDailyReturns(dailyPortfolioValues);
        const dailyReturnsArray = Array.from(dailyReturnsMap.values());

        // Define risk-free rate (e.g., 5% annually)
        const annualRiskFreeRate = 0.05; // 5%
        const dailyRiskFreeRate = Math.pow(1 + annualRiskFreeRate, 1/252) - 1; // Convert to daily for comparison

        // Calculate annualized average return (more robust approach)
        let annualizedAverageReturn = 0;
        if (dailyReturnsArray.length > 0) {
            const averageDailyReturn = dailyReturnsArray.reduce((sum, r) => sum + r, 0) / dailyReturnsArray.length;
            // Use simple annualization for more realistic results
            annualizedAverageReturn = averageDailyReturn * 252;
        }

        // Calculate annualized standard deviation of daily returns
        const dailyStdDev = calculateStandardDeviation(dailyReturnsArray);
        const annualizedStdDev = annualizeMetric(dailyStdDev, 252); // Use the helper to annualize volatility

        // Calculate Max Drawdown
        const maxDrawdown = calculateMaxDrawdown(dailyPortfolioValues);

        // Calculate Downside Deviation (use all returns, not filtered)
        const dailyDownsideDev = calculateDownsideDeviation(dailyReturnsArray, dailyRiskFreeRate);
        const annualizedDownsideDev = annualizeMetric(dailyDownsideDev, 252);

        // Calculate Ratios (use annualized values consistently)
        const sharpeRatio = calculateSharpeRatio(annualizedAverageReturn, annualRiskFreeRate, annualizedStdDev);
        const calmarRatio = calculateCalmarRatio(annualizedAverageReturn, maxDrawdown);
        const sortinoRatio = calculateSortinoRatio(annualizedAverageReturn, annualRiskFreeRate, annualizedDownsideDev);

        // Apply realistic bounds to ratios to prevent unrealistic values
        const boundedSharpeRatio = isNaN(sharpeRatio) || !isFinite(sharpeRatio) ? 0 : Math.max(-10, Math.min(10, sharpeRatio));
        const boundedCalmarRatio = isNaN(calmarRatio) || !isFinite(calmarRatio) ? 0 : Math.max(-100, Math.min(100, calmarRatio));
        const boundedSortinoRatio = isNaN(sortinoRatio) || !isFinite(sortinoRatio) ? 0 : Math.max(-10, Math.min(10, sortinoRatio));

        return {
            expectancy: isFinite(expectancy) ? expectancy : 0,
            profitFactor: isFinite(profitFactor) ? profitFactor : (totalPositivePfImpact > 0 ? Infinity : 0),
            avgWinHold: Math.round(avgWinHold),
            avgLossHold: Math.round(avgLossHold),
            avgWin,
            avgLoss,
            winStreak: maxWinStreak,
            lossStreak: maxLossStreak,
            topWin,
            topLoss,
            avgWinPfImpact: avgWinPfImpact,
            avgLossPfImpact: avgLossPfImpact,
            totalPositivePfImpact: totalPositivePfImpact,
            totalAbsoluteNegativePfImpact: totalAbsoluteNegativePfImpact,
            avgPnLPerDay,
            uniqueTradingDays,
            sharpeRatio: boundedSharpeRatio,
            calmarRatio: boundedCalmarRatio,
            sortinoRatio: boundedSortinoRatio,
            annualizedAverageReturn: Math.max(-1, Math.min(10, annualizedAverageReturn)), // Cap between -100% and 1000%
            annualRiskFreeRate,
            annualizedStdDev: Math.max(0, Math.min(5, annualizedStdDev)), // Cap volatility at 500%
            annualizedDownsideDev: Math.max(0, Math.min(5, annualizedDownsideDev)), // Cap downside volatility at 500%
            maxDrawdown: Math.max(0, Math.min(1, maxDrawdown)) // Cap drawdown between 0% and 100%
        };

    }, [processedTrades, capitalChanges, useCashBasis]);
    // --- End Calculations ---

    // Define color palettes for the charts
    const industryColors = ['#4A8DFF', '#34D399', '#FF6B6B', '#FFC107', '#A78BFA', '#64748B'];
    const sectorColors = ['#56B4E9', '#009E73', '#F0E442', '#E69F00', '#D55E00', '#CC79A7'];

    // Calculate and sort top allocations
    const topAllocations = useMemo(() => {
        if (!processedTrades || processedTrades.length === 0 || !portfolioSize || portfolioSize <= 0) {
            return [];
        }

        const openAndPartialTrades = processedTrades.filter(trade =>
            trade.positionStatus === 'Open' || trade.positionStatus === 'Partial'
        );

        // Calculate allocation for each open/partial trade
        // Assuming allocation is (positionSize / portfolioSize) * 100
        const tradesWithAllocation = openAndPartialTrades.map(trade => ({
            ...trade,
            calculatedAllocation: trade.positionSize && portfolioSize > 0 
                ? (trade.positionSize / portfolioSize) * 100
                : 0
        }));

        // Sort by calculatedAllocation descending
        return tradesWithAllocation.sort((a, b) => b.calculatedAllocation - a.calculatedAllocation);

    }, [processedTrades, portfolioSize]);

    const columns = [
        { key: "name", label: "Stock/Asset" },
        { key: "positionStatus", label: "Status" },
        { key: "positionSize", label: "Position Size (₹)" },
        { key: "calculatedAllocation", label: "Allocation (%)" },
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(value);
      };

    const renderCell = (item: Trade & { calculatedAllocation: number }, columnKey: string) => {
        const cellValue = item[columnKey as keyof typeof item];

        switch (columnKey) {
            case 'positionSize':
                return formatCurrency(cellValue as number);
            case 'calculatedAllocation':
                return `${(cellValue as number).toFixed(2)}%`;
            case 'positionStatus':
                return (
                    <span className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium 
                        ${item.positionStatus === 'Open' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                         item.positionStatus === 'Partial' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
                         'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                    >
                        {cellValue}
                    </span>
                );
            default:
                return String(cellValue);
        }
    };

    // Custom Tooltip for Charts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-2.5 bg-background border border-divider shadow-lg rounded-lg">
                    <p className="text-sm font-bold text-foreground">{label}</p>
                    <p className="text-xs text-foreground-600">Trades: {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    // Helper to get date range from global filter
    function getDateRangeFromFilter(filter) {
        const today = new Date();
        let startDate: Date | undefined = undefined;
        let endDate: Date | undefined = undefined;
        if (filter.type === 'all') {
            // Use all trades
            return { startDate: undefined, endDate: undefined };
        } else if (filter.type === 'week') {
            endDate = today;
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
        } else if (filter.type === 'month') {
            const year = filter.year ?? today.getFullYear();
            const month = filter.month ?? today.getMonth();
            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0);
        } else if (filter.type === 'fy') {
            // Financial year: April 1st to March 31st
            const year = today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
            startDate = new Date(year, 3, 1);
            endDate = new Date(year + 1, 2, 31);
        } else if (filter.type === 'cy') {
            // Calendar year
            const year = today.getFullYear();
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31);
        } else if (filter.type === 'custom') {
            startDate = filter.startDate ? new Date(filter.startDate) : undefined;
            endDate = filter.endDate ? new Date(filter.endDate) : undefined;
        }
        return { startDate, endDate };
    }

    const { startDate: globalStartDate, endDate: globalEndDate } = getDateRangeFromFilter(filter);

    // Filter trades by date range using accounting method-aware dates
    const filteredTrades = React.useMemo(() => {
        // Use processedTrades directly; do not re-expand for cash basis
        let baseTrades = processedTrades;
        // Only apply date filtering and accrual filtering
        if (!useCashBasis) {
            // For accrual basis, filter out trades with zero P/L only if they are truly empty/invalid
            baseTrades = baseTrades.filter(trade => {
                // Include all trades that have meaningful data
                if (trade.positionStatus === 'Open') {
                    return true; // Always include open positions
                }
                if (trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial') {
                    // Include closed/partial trades that have P/L data
                    const tradePL = calculateTradePL(trade, false); // accrual basis
                    return tradePL !== 0 || trade.plRs !== 0; // Include if there's any P/L
                }
                return true; // Include other trades by default
            });
        }
        // Apply date filtering
        if (!globalStartDate && !globalEndDate) {
            return baseTrades;
        }
        return baseTrades.filter(trade => {
            const relevantDate = getTradeDateForAccounting(trade, useCashBasis);
            const tradeDate = new Date(relevantDate.split('T')[0]);
            if (globalStartDate && tradeDate < globalStartDate) return false;
            if (globalEndDate && tradeDate > globalEndDate) return false;
            return true;
        });
    }, [processedTrades, globalStartDate, globalEndDate, useCashBasis]);

    // Calculate min and max trade dates for heatmap (within filtered trades) using accounting method-aware dates
    const tradeDates = filteredTrades.map(t => getTradeDateForAccounting(t, useCashBasis).split('T')[0]);
    const minTradeDate = tradeDates.length > 0 ? tradeDates.reduce((a, b) => a < b ? a : b) : '';
    const maxTradeDate = tradeDates.length > 0 ? tradeDates.reduce((a, b) => a > b ? a : b) : '';

    // Debug: Show which trades/exits are being summed for each date in the heatmap
    if (process.env.NODE_ENV === 'development') {
        const dateMap = {};
        filteredTrades.forEach(trade => {
            const date = getTradeDateForAccounting(trade, useCashBasis).split('T')[0];
            const pl = calculateTradePL(trade, useCashBasis);
            if (!dateMap[date]) dateMap[date] = [];
            dateMap[date].push({ id: trade.id, pl });
        });
        console.log('[HEATMAP DEBUG] Trades/exits by date:', dateMap);
    }

    // Ensure proper date format handling
    let heatmapStartDate = '';
    let heatmapEndDate = '';

    // Handle start date with validation
    if (globalStartDate && globalStartDate instanceof Date && !isNaN(globalStartDate.getTime())) {
        heatmapStartDate = globalStartDate.toISOString().split('T')[0];
    } else if (minTradeDate && typeof minTradeDate === 'string' && minTradeDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Ensure minimum 3-month range for proper heatmap display
        const minDate = new Date(minTradeDate);
        minDate.setMonth(minDate.getMonth() - 1); // Start 1 month before earliest trade
        heatmapStartDate = minDate.toISOString().split('T')[0];
    } else {
        heatmapStartDate = '2024-07-01'; // fallback
    }

    // Handle end date with validation
    if (globalEndDate && globalEndDate instanceof Date && !isNaN(globalEndDate.getTime())) {
        heatmapEndDate = globalEndDate.toISOString().split('T')[0];
    } else if (maxTradeDate && typeof maxTradeDate === 'string' && maxTradeDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Ensure minimum 3-month range for proper heatmap display
        const maxDate = new Date(maxTradeDate);
        maxDate.setMonth(maxDate.getMonth() + 1); // End 1 month after latest trade
        heatmapEndDate = maxDate.toISOString().split('T')[0];
    } else {
        // Use current date + 1 month as fallback to ensure we cover recent trades
        const fallbackEndDate = new Date();
        fallbackEndDate.setMonth(fallbackEndDate.getMonth() + 1);
        heatmapEndDate = fallbackEndDate.toISOString().split('T')[0];
    }

    // Ensure minimum date range for proper heatmap display
    const startDateObj = new Date(heatmapStartDate);
    const endDateObj = new Date(heatmapEndDate);
    const daysDifference = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference < 90) { // Less than 3 months
        // Expand the range to at least 3 months
        const centerDate = new Date(startDateObj.getTime() + (endDateObj.getTime() - startDateObj.getTime()) / 2);
        centerDate.setMonth(centerDate.getMonth() - 1.5); // 1.5 months before center
        heatmapStartDate = centerDate.toISOString().split('T')[0];

        centerDate.setMonth(centerDate.getMonth() + 3); // 3 months total range
        heatmapEndDate = centerDate.toISOString().split('T')[0];
    }

    // Helper function to format percentages
    const formatPercentage = (value: number) => {
        return `${(value).toFixed(2)}%`;
    };

    const formatRatio = (value: number) => {
      return value.toFixed(2);
    };

    // StatsCard Component (already exists, but adding for context if it were new)
    interface StatsCardProps {
        title: string;
        value: React.ReactNode;
        icon: string;
        color: "primary" | "success" | "warning" | "danger" | "info"; // Added info color for new stats
        tooltipContent?: string; // Optional tooltip content
    }

    const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, tooltipContent }) => {
        const getColors = () => {
            switch (color) {
                case "primary": return { bg: "bg-blue-50 dark:bg-blue-900/10", text: "text-blue-700 dark:text-blue-400", icon: "text-blue-600 dark:text-blue-400" };
                case "success": return { bg: "bg-emerald-50 dark:bg-emerald-900/10", text: "text-emerald-700 dark:text-emerald-400", icon: "text-emerald-600 dark:text-emerald-400" };
                case "warning": return { bg: "bg-amber-50 dark:bg-amber-900/10", text: "text-amber-700 dark:text-amber-400", icon: "text-amber-600 dark:text-amber-400" };
                case "danger": return { bg: "bg-red-50 dark:bg-red-900/10", text: "text-red-700 dark:text-red-400", icon: "text-red-600 dark:text-red-400" };
                case "info": return { bg: "bg-sky-50 dark:bg-sky-900/10", text: "text-sky-700 dark:text-sky-400", icon: "text-sky-600 dark:text-sky-400" }; // New info color
                default: return { bg: "bg-gray-50 dark:bg-gray-900/10", text: "text-gray-700 dark:text-gray-400", icon: "text-gray-600 dark:text-gray-400" };
            }
        };

        const colors = getColors();

        return (
          <div
            className="will-change-transform"
          >
            <Card className="border border-gray-100 dark:border-gray-800 shadow-sm bg-background">
              <CardBody className="p-6">
                <div 
                  className="flex justify-between items-start will-change-transform"
                >
                  <div className="space-y-2">
                    <motion.p 
                      className="text-foreground-500 text-sm font-medium"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {title}
                    </motion.p>
                    <motion.div 
                      className={`text-2xl font-semibold tracking-tight ${colors.text}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      {value} {tooltipContent && (
                        <Tooltip 
                          content={tooltipContent} 
                          placement="top" 
                          radius="sm" 
                          shadow="md"
                          classNames={{ content: "bg-content1 border border-divider z-50 max-w-xs text-xs" }}
                        >
                          <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-help" />
                        </Tooltip>
                      )}
                    </motion.div>
                  </div>
                  <div 
                    className={`p-3 rounded-xl ${colors.bg} ${colors.icon}`}
                  >
                    <Icon icon={icon} className="text-xl" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        );
      };

    if (isLoading || !mappingLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-foreground">Loading analytics...</p>
            </div>
        );
    }

    return (
        <motion.div 
            className="p-4 sm:p-6 space-y-6 bg-background"
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: 0.1
                    }
                }
            }}
        >
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-bold text-default-700 flex items-center gap-2">
                            <Icon icon="lucide:gauge-circle" className="text-primary" />
                            Key Performance Metrics
                        </h2>
                    </CardHeader>
                    <Divider />
                    <CardBody>
            {!isLoading && (
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                 <StatsCard 
                                    title="Avg. PnL/Day" 
                    value={
                        <div className="flex items-center gap-1">
                                            {formatCurrency(analytics.avgPnLPerDay)}
                             <Tooltip 
                                                content={
                                                    <div className="p-2">
                                                        <p className="font-semibold mb-1">Trading Days Approach</p>
                                                        <p className="text-xs">Calculated using only days with active trades:</p>
                                                        <p className="text-xs mt-1">Total P&L ÷ Number of Trading Days</p>
                                                        <p className="text-xs mt-2 text-default-500">* Trading days: {analytics.uniqueTradingDays}</p>
                                                    </div>
                                                } 
                                placement="top" 
                                radius="sm" 
                                shadow="md"
                                                classNames={{ 
                                                    content: "bg-content1 border border-divider z-50 max-w-xs" 
                                                }}
                            >
                                <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-help" />
                            </Tooltip>
                        </div>
                    }
                                    icon="lucide:calendar-clock" 
                                    color={analytics.avgPnLPerDay >= 0 ? "success" : "danger"}
                />
                                 <StatsCard title="Expectancy (%)" value={<div className="flex items-center gap-1">{analytics.expectancy.toFixed(2)}%</div>} icon="lucide:trending-up" color={analytics.expectancy >= 0 ? "success" : "danger"} tooltipContent="Average amount you can expect to win or lose per trade. (Avg Win PF Impact * Win Rate) - (Avg Loss PF Impact * Loss Rate)"/>
                                 <StatsCard title="Profit Factor" value={<div className="flex items-center gap-1">{isFinite(analytics.profitFactor) ? analytics.profitFactor.toFixed(2) : "∞"}</div>} icon="lucide:line-chart" color={analytics.profitFactor >= 1 ? "success" : "danger"} tooltipContent="Ratio of gross profits to gross losses. Higher than 1 is profitable. Total Positive PF Impact / Total Absolute Negative PF Impact"/>
                                 <StatsCard title="Avg Win Hold" value={`${analytics.avgWinHold} Day${analytics.avgWinHold !== 1 ? 's' : ''}`} icon="lucide:clock" color="success" tooltipContent="Average number of days winning trades were held."/>
                                 <StatsCard title="Avg Loss Hold" value={`${analytics.avgLossHold} Day${analytics.avgLossHold !== 1 ? 's' : ''}`} icon="lucide:clock" color="danger" tooltipContent="Average number of days losing trades were held."/>
                                 <StatsCard title="Avg Win (₹)" value={formatCurrency(analytics.avgWin)} icon="lucide:trending-up" color="success" tooltipContent="Average profit from winning trades."/>
                                 <StatsCard title="Avg Loss (₹)" value={formatCurrency(-analytics.avgLoss)} icon="lucide:trending-down" color="danger" tooltipContent="Average loss from losing trades."/>
                                 <StatsCard title="Win Streak" value={analytics.winStreak.toString()} icon="lucide:medal" color="primary" tooltipContent="Longest consecutive sequence of winning trades."/>
                                 <StatsCard title="Loss Streak" value={analytics.lossStreak.toString()} icon="lucide:alert-triangle" color="danger" tooltipContent="Longest consecutive sequence of losing trades."/>
                                 <StatsCard title="Top Win (₹)" value={formatCurrency(analytics.topWin)} icon="lucide:star" color="success" tooltipContent="Largest profit from a single trade."/>
                                 <StatsCard title="Top Loss (₹)" value={formatCurrency(analytics.topLoss)} icon="lucide:skull" color="danger" tooltipContent="Largest loss from a single trade."/>
                                 <StatsCard
                                    title="Sharpe Ratio"
                                    value={formatRatio(analytics.sharpeRatio)}
                                    icon="lucide:trending-up"
                                    color={analytics.sharpeRatio >= 1 ? "success" : analytics.sharpeRatio >= 0 ? "info" : "danger"}
                                    tooltipContent={
                                        `Measures risk-adjusted return. Higher is better. >1 is good, >2 is excellent.
Formula: (Annualized Return - Risk-Free Rate) / Annualized Standard Deviation
Values: (${(analytics.annualizedAverageReturn * 100).toFixed(1)}% - ${(analytics.annualRiskFreeRate * 100).toFixed(1)}%) / ${(analytics.annualizedStdDev * 100).toFixed(1)}%`
                                    }
                                />
                                <StatsCard
                                    title="Calmar Ratio"
                                    value={formatRatio(analytics.calmarRatio)}
                                    icon="lucide:activity"
                                    color={analytics.calmarRatio >= 1 ? "success" : analytics.calmarRatio >= 0 ? "info" : "danger"}
                                    tooltipContent={
                                        `Measures return relative to maximum drawdown. Higher is better. >1 is good.
Formula: Annualized Return / Max Drawdown
Values: ${(analytics.annualizedAverageReturn * 100).toFixed(1)}% / ${(analytics.maxDrawdown * 100).toFixed(1)}%`
                                    }
                                />
                                <StatsCard
                                    title="Sortino Ratio"
                                    value={formatRatio(analytics.sortinoRatio)}
                                    icon="lucide:arrow-down-left"
                                    color={analytics.sortinoRatio >= 1 ? "success" : analytics.sortinoRatio >= 0 ? "info" : "danger"}
                                    tooltipContent={
                                        `Measures return using only downside risk. Higher is better. >1 is good, >2 is excellent.
Formula: (Annualized Return - Risk-Free Rate) / Annualized Downside Deviation
Values: (${(analytics.annualizedAverageReturn * 100).toFixed(1)}% - ${(analytics.annualRiskFreeRate * 100).toFixed(1)}%) / ${(analytics.annualizedDownsideDev * 100).toFixed(1)}%`
                                    }
                                />
                            </div>
                        )}
                    </CardBody>
                </Card>
            </motion.div>

            <Accordion selectionMode="multiple" defaultExpandedKeys={["1"]} variant="bordered">
                <AccordionItem key="1" aria-label="Industry & Sector Analysis" title={
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Icon icon="lucide:factory" className="text-secondary" />
                        Industry & Sector Analysis
                    </h2>
                }>
                    <div className="space-y-4 p-2">
                        {mappingLoaded && tradesWithIndustry.length > 0 && industryChartData.length > 0 && sectorChartData.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Tooltip content={<p className="text-xs break-words p-1">{industryStats.mostStocks.join(', ')}</p>} placement="top" radius="sm" shadow="md" classNames={{ content: "bg-content1 border border-divider" }}>
                                    <div><StatsCard title="Most Traded Industry" value={industryStats.most} icon="lucide:trending-up" color="primary" /></div>
                                </Tooltip>
                                <Tooltip content={<p className="text-xs break-words p-1">{industryStats.leastStocks.join(', ')}</p>} placement="top" radius="sm" shadow="md" classNames={{ content: "bg-content1 border border-divider" }}>
                                    <div><StatsCard title="Least Traded Industry" value={industryStats.least} icon="lucide:trending-down" color="warning" /></div>
                                </Tooltip>
                                <Tooltip content={<p className="text-xs break-words p-1">{sectorStats.mostStocks.join(', ')}</p>} placement="top" radius="sm" shadow="md" classNames={{ content: "bg-content1 border border-divider" }}>
                                    <div><StatsCard title="Most Traded Sector" value={sectorStats.most} icon="lucide:trending-up" color="primary" /></div>
                                </Tooltip>
                                <Tooltip content={<p className="text-xs break-words p-1">{sectorStats.leastStocks.join(', ')}</p>} placement="top" radius="sm" shadow="md" classNames={{ content: "bg-content1 border border-divider" }}>
                                    <div><StatsCard title="Least Traded Sector" value={sectorStats.least} icon="lucide:trending-down" color="warning" /></div>
                            </Tooltip>
                        </div>
                        ) : (
                            <div className="text-foreground-400 text-lg font-medium text-center w-full py-12">No data in this period.</div>
                        )}
                        {mappingLoaded && tradesWithIndustry.length > 0 && industryChartData.length > 0 && sectorChartData.length > 0 ? (
                            <div className="space-y-6">
                                {industryChartData.length > 0 && <IndustryDistributionChart data={industryChartData} colors={industryColors} title="Industry" />}
                                {sectorChartData.length > 0 && <IndustryDistributionChart data={sectorChartData} colors={sectorColors} title="Sector" />}
                            </div>
                        ) : null}
                    </div>
                </AccordionItem>

                <AccordionItem key="2" aria-label="Setup Performance Analysis" title={
                     <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Icon icon="lucide:settings-2" className="text-success" />
                        Setup Performance Analysis
                    </h2>
                }>
                     <div className="p-2 space-y-6">
                         {setupPerformance.length > 0 ? (
                            <Card className="border-divider">
                                <CardHeader>
                                    <div className="flex flex-col">
                                        <p className="text-md font-semibold">Performance by Setup</p>
                                        <p className="text-sm text-default-500">Which setups generate the most portfolio impact.</p>
                                    </div>
                                </CardHeader>
                                <Divider/>
                                <CardBody className="p-0">
                                    <Table 
                                        aria-label="Setup Performance Table"
                                        classNames={{
                                            th: "bg-transparent border-b border-divider text-xs font-medium text-default-500 uppercase tracking-wider text-right",
                                            td: "py-2.5 text-sm text-right",
                                            wrapper: "p-0"
                                        }}
                                    >
                                        <TableHeader>
                                            <TableColumn className="text-left">Setup</TableColumn>
                                            <TableColumn>Trades</TableColumn>
                                            <TableColumn>Win Rate</TableColumn>
                                            <TableColumn>Total PF Impact</TableColumn>
                                        </TableHeader>
                                        <TableBody 
                                            items={setupPerformance}
                                            emptyContent={"No setup data to display."}
                                        >
                                            {(item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="text-left font-medium">{item.name}</TableCell>
                                                    <TableCell>{item.totalTrades}</TableCell>
                                                    <TableCell className={`font-semibold ${item.winRate >= 50 ? 'text-success-600' : 'text-danger-600'}`}>{item.winRate.toFixed(1)}%</TableCell>
                                                    <TableCell className={`font-semibold ${item.totalPfImpact >= 0 ? 'text-success-600' : 'text-danger-600'}`}>{item.totalPfImpact > 0 ? '+' : ''}{item.totalPfImpact.toFixed(2)}%</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardBody>
                            </Card>
                         ) : (
                            <div className="text-foreground-400 text-lg font-medium text-center w-full py-12">No data in this period.</div>
                         )}

                        {!isLoading && trades.filter(t=>t.setup).length > 0 && setupPerformance.length > 0 ? (
                            <Card className="border-divider">
                                <CardHeader>
                                     <div className="flex flex-col">
                                        <p className="text-md font-semibold">Setup Frequency</p>
                                        <p className="text-sm text-default-500">How often each setup is traded.</p>
                                    </div>
                                </CardHeader>
                                <Divider/>
                 <SetupFrequencyChart trades={trades} />
                            </Card>
            ) : null}
                     </div>
                </AccordionItem>

                 <AccordionItem key="3" aria-label="Position Analysis" title={
                     <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Icon icon="lucide:hand-coins" className="text-warning" />
                        Position Analysis
                    </h2>
                }>
                    <div className="p-2 space-y-6">
                        {!isLoading && trades.length > 0 ? (
                            <>
                                <PnLDistributionCharts trades={trades} />

            <Card className="border border-divider">
                <CardHeader className="flex gap-3 items-center">
                    <Icon icon="lucide:pie-chart" className="text-xl text-primary-500" />
                                <div>
                                    <p className="text-md font-semibold">Top Allocations</p>
                                    <p className="text-sm text-default-500">Largest open positions by portfolio percentage.</p>
                    </div>
                </CardHeader>
                <Divider/>
                <CardBody className="p-0">
                            <Table aria-label="Top Allocations Table" classNames={{ wrapper: "min-h-[222px] p-0", th: "bg-transparent border-b border-divider text-xs font-medium", td: "py-2.5 text-sm" }}>
                        <TableHeader columns={columns}>
                                    {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
                        </TableHeader>
                                <TableBody items={topAllocations} isLoading={isLoading} emptyContent={isLoading ? " " : "No open positions."}>
                            {(item) => (
                                <TableRow key={item.id}>
                                            {(columnKey) => <TableCell>{renderCell(item, columnKey as string)}</TableCell>}
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardBody>
            </Card>
                            </>
                        ) : (
                            <div className="text-foreground-400 text-lg font-medium text-center w-full py-12">No data in this period.</div>
                        )}

            </div>
                </AccordionItem>
            </Accordion>

            {/* Trading Activity Heatmap Card */}
            <motion.div 
                variants={{ 
                    hidden: { opacity: 0, y: 20 }, 
                    visible: { opacity: 1, y: 0 } 
                }}
                className="w-full"
            >
                <Card className="border border-divider bg-background">
                    <CardHeader className="flex justify-between items-center pb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                                <Icon icon="lucide:calendar-days" className="text-xl text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Trading Activity</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Icon icon="lucide:share-2" className="text-lg text-foreground-500 cursor-pointer hover:text-primary transition-colors" />
                        </div>
                    </CardHeader>
                    <CardBody>
                        <div className="overflow-x-auto pb-2 min-h-[180px] flex items-center justify-center">
                            {filteredTrades.length === 0 ? (
                                <div className="text-foreground-400 text-lg font-medium text-center w-full py-12">
                                    No trades taken in this period.
                                </div>
                            ) : (
                                <TradeHeatmap
                                    trades={filteredTrades}
                                    startDate={heatmapStartDate}
                                    endDate={heatmapEndDate}
                                    className="min-w-[750px]"
                                />
                            )}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-divider justify-center text-xs text-foreground-500">
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 bg-default-100 rounded border border-divider"></span>
                                <span>No trades</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 bg-[#ff7f7f] rounded border border-divider"></span>
                                <span>Min. loss</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 bg-[#d32f2f] rounded border border-divider"></span>
                                <span>Max. loss</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 bg-[#c6e48b] rounded border border-divider"></span>
                                <span>Min. profit</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 bg-[#7bc96f] rounded border border-divider"></span>
                                <span>Max. profit</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </motion.div>
        </motion.div>
    );
};

export default DeepAnalyticsPage; 