// Trade calculation utilities

export function calcAvgEntry(entries: { price: number, qty: number }[]) {
  const totalQty = entries.reduce((sum, e) => sum + e.qty, 0);
  const totalValue = entries.reduce((sum, e) => sum + e.price * e.qty, 0);
  return totalQty ? totalValue / totalQty : 0;
}

export function calcPositionSize(avgEntry: number, totalQty: number) {
  return Math.round(avgEntry * totalQty);
}

export function calcAllocation(positionSize: number, portfolioSize: number) {
  return portfolioSize ? (positionSize / portfolioSize) * 100 : 0;
}

export function calcSLPercent(sl: number, entry: number): number {
  if (!entry || !sl) return 0;
  return Math.abs(((entry - sl) / entry) * 100);
}

export function calcOpenQty(initialQty: number, p1Qty: number, p2Qty: number, exitedQty: number) {
  return initialQty + p1Qty + p2Qty - exitedQty;
}

export function calcExitedQty(...exitQtys: number[]) {
  return exitQtys.reduce((sum, qty) => sum + qty, 0);
}

export function calcAvgExitPrice(exits: { price: number, qty: number }[]) {
  const totalQty = exits.reduce((sum, e) => sum + e.qty, 0);
  const totalValue = exits.reduce((sum, e) => sum + e.price * e.qty, 0);
  return totalQty ? totalValue / totalQty : 0;
}

export function calcStockMove(
  avgEntry: number,
  avgExit: number,
  cmp: number,
  openQty: number,
  exitedQty: number,
  positionStatus: 'Open' | 'Closed' | 'Partial',
  buySell: 'Buy' | 'Sell' = 'Buy'
): number {
  // Edge case handling
  if (!avgEntry || avgEntry <= 0) return 0;
  if (typeof openQty !== 'number' || typeof exitedQty !== 'number') return 0;
  if (openQty < 0 || exitedQty < 0) return 0; // Handle negative quantities

  const totalQty = openQty + exitedQty;
  if (totalQty === 0) return 0;

  // Validate position status
  if (!['Open', 'Closed', 'Partial'].includes(positionStatus)) return 0;

  let movePercentage = 0;

  if (positionStatus === 'Open') {
    // For open positions, use CMP for the entire position
    if (!cmp || cmp <= 0) return 0; // Enhanced edge case handling
    movePercentage = ((cmp - avgEntry) / avgEntry) * 100;
  } else if (positionStatus === 'Closed') {
    // For closed positions, use actual exit prices
    if (!avgExit || avgExit <= 0) return 0; // Enhanced edge case handling
    movePercentage = ((avgExit - avgEntry) / avgEntry) * 100;
  } else if (positionStatus === 'Partial') {
    // For partial positions, calculate weighted average of realized and unrealized moves
    if (!cmp || cmp <= 0 || !avgExit || avgExit <= 0) return 0; // Enhanced edge case handling
    
    const realizedMove = ((avgExit - avgEntry) / avgEntry) * 100;
    const unrealizedMove = ((cmp - avgEntry) / avgEntry) * 100;
    
    // Calculate weighted average based on quantities
    movePercentage = (
      (realizedMove * exitedQty + unrealizedMove * openQty) / totalQty
    );
  }

  // Invert the percentage for Sell trades
  return buySell === 'Sell' ? -movePercentage : movePercentage;
}

export function calcRewardRisk(
  target: number,
  entry: number,
  sl: number,
  positionStatus: 'Open' | 'Closed' | 'Partial',
  avgExit: number = 0,
  openQty: number = 0,
  exitedQty: number = 0,
  buySell: 'Buy' | 'Sell' = 'Buy'
): number {
  if (!entry || !sl) return 0;
  
  const totalQty = openQty + exitedQty;
  if (totalQty === 0) return 0;

  // Calculate risk (always positive)
  const risk = Math.abs(entry - sl);
  if (risk === 0) return 0;

  let reward = 0;
  
  if (positionStatus === 'Open') {
    // For open positions, use target price for potential reward
    reward = buySell === 'Buy' ? target - entry : entry - target;
  } else if (positionStatus === 'Closed') {
    // For closed positions, use actual average exit price
    reward = buySell === 'Buy' ? avgExit - entry : entry - avgExit;
  } else if (positionStatus === 'Partial') {
    // For partial positions, calculate weighted average of realized and potential reward
    const realizedReward = buySell === 'Buy' ? avgExit - entry : entry - avgExit;
    const potentialReward = buySell === 'Buy' ? target - entry : entry - target;
    
    reward = (realizedReward * exitedQty + potentialReward * openQty) / totalQty;
  }

  // Return absolute R:R ratio
  return Math.abs(reward / risk);
}

interface TradeLeg {
  entryDate: string;
  exitDate?: string | null;
  quantity: number;
}

/**
 * Calculate weighted average holding days for a trade with multiple entries and exits
 * @param trades - Array of trade legs with entryDate, exitDate, and quantity
 * @returns Weighted average holding days across all legs
 */
function calculateWeightedHoldingDays(trades: TradeLeg[]): number {
  if (!trades.length) return 0;
  
  let totalDays = 0;
  let totalQuantity = 0;
  
  for (const trade of trades) {
    if (!trade.entryDate) continue;
    
    const entryDate = new Date(trade.entryDate);
    if (isNaN(entryDate.getTime())) continue;
    
    const exitDate = trade.exitDate ? new Date(trade.exitDate) : new Date();
    if (trade.exitDate && isNaN(exitDate.getTime())) continue;
    
    // Normalize dates to start of day
    entryDate.setHours(0, 0, 0, 0);
    exitDate.setHours(0, 0, 0, 0);
    
    const daysHeld = Math.max(1, Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)));
    totalDays += daysHeld * trade.quantity;
    totalQuantity += trade.quantity;
  }
  
  return totalQuantity > 0 ? Math.round(totalDays / totalQuantity) : 0;
}

/**
 * Calculate holding days between entry and exit dates, supporting multiple entries and exits
 * @param entryDate - Initial entry date in ISO format (YYYY-MM-DD)
 * @param exitDate - Final exit date in ISO format (YYYY-MM-DD) or null/undefined for open positions
 * @param pyramidDates - Array of additional entry dates (P1, P2, etc.) with quantities
 * @param exitDates - Array of exit dates (E1, E2, etc.) with quantities
 * @returns Weighted average holding days across all positions
 */
export function calcHoldingDays(
  entryDate: string, 
  exitDate?: string | null,
  pyramidDates: {date: string, qty: number}[] = [],
  exitDates: {date: string, qty: number}[] = []
): number {
  try {
    if (!entryDate) return 0;
    
    // Create trade legs for initial entry
    const tradeLegs: TradeLeg[] = [];
    
    // Add initial entry
    tradeLegs.push({
      entryDate,
      exitDate: exitDate || null,
      quantity: 1 // Base quantity, will be adjusted by pyramid entries
    });
    
    // Add pyramid entries
    for (const p of pyramidDates) {
      if (!p.date) continue;
      tradeLegs.push({
        entryDate: p.date,
        exitDate: exitDate || null,
        quantity: p.qty || 1
      });
    }
    
    // If we have exit dates, distribute them across the trade legs
    if (exitDates.length > 0) {
      // Sort exits by date to process first exit first
      const sortedExits = [...exitDates].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Distribute exits to trade legs (FIFO - First In First Out)
      let remainingExits = [...sortedExits];
      
      for (const leg of tradeLegs) {
        if (remainingExits.length === 0) break;
        
        const exit = remainingExits[0];
        leg.exitDate = exit.date;
        
        // Reduce the exit quantity from this leg's quantity
        const exitQty = Math.min(leg.quantity, exit.qty);
        exit.qty -= exitQty;
        
        // If this exit is fully used, remove it
        if (exit.qty <= 0) {
          remainingExits.shift();
        }
      }
    }
    
    return calculateWeightedHoldingDays(tradeLegs);
  } catch (error) {
    return 0;
  }
}

export function calcRealisedAmount(exitedQty: number, avgExit: number) {
  return exitedQty * avgExit;
}

export function calcPLRs(realisedAmount: number, positionSize: number) {
  return realisedAmount - positionSize;
}

export function calcPFImpact(plRs: number, portfolioValue: number) {
  return portfolioValue ? (plRs / portfolioValue) * 100 : 0;
}

export function calcCummPf(pfImpacts: number[]) {
  return pfImpacts.reduce((sum, pf) => sum + pf, 0);
}

export function calcOpenHeat(
  trades: any[],
  portfolioSize: number, // Keep for backward compatibility or default
  getPortfolioSize?: (month: string, year: number) => number // Pass the getPortfolioSize function
) {
  if (!trades || trades.length === 0) {
    return 0;
  }

  // Sum the individual Open Heat for each open/partial trade
  const totalOpenHeatValue = trades
    .filter(t => t.positionStatus === 'Open' || t.positionStatus === 'Partial')
    .reduce((sum, trade) => {
      // Use the existing calcTradeOpenHeat logic which correctly uses the date-specific portfolio size
      const tradeHeat = calcTradeOpenHeat(trade, portfolioSize, getPortfolioSize);
      return sum + tradeHeat;
    }, 0);

  return totalOpenHeatValue;
}

// Utility to calculate open heat for a single trade
export function calcTradeOpenHeat(trade, defaultPortfolioSize, getPortfolioSize) {
  // Get the trade date and extract month/year
  const tradeDate = new Date(trade.date);
  const month = tradeDate.toLocaleString('default', { month: 'short' });
  const year = tradeDate.getFullYear();

  // Get the portfolio size for the specific month/year of the trade
  const monthlyPortfolioSize = getPortfolioSize ? getPortfolioSize(month, year) : undefined;
  const effectivePortfolioSize = monthlyPortfolioSize !== undefined ? monthlyPortfolioSize : defaultPortfolioSize;

  const entryPrice = trade.avgEntry || trade.entry || 0;
  const sl = trade.sl || 0;
  const tsl = trade.tsl || 0;
  const qty = trade.openQty || 0;
  let stop = 0;
  if (tsl > 0 && sl > 0) {
    stop = tsl; // Both entered, use TSL
  } else if (tsl > 0) {
    stop = tsl; // Only TSL entered
  } else if (sl > 0) {
    stop = sl; // Only SL entered
  } else {
    stop = 0; // Neither entered
  }



  if (!entryPrice || !stop || !qty) {
    return 0;
  }

  // For Buy trades, stop should be below entry price
  // For Sell trades, stop should be above entry price
  const buySell = trade.buySell || 'Buy';
  let risk = 0;

  if (buySell === 'Buy') {
    if (stop >= entryPrice) {
      return 0; // Invalid: stop loss should be below entry for Buy trades
    }
    risk = (entryPrice - stop) * qty;
  } else {
    if (stop <= entryPrice) {
      return 0; // Invalid: stop loss should be above entry for Sell trades
    }
    risk = (stop - entryPrice) * qty;
  }

  const heat = effectivePortfolioSize > 0 ? (Math.max(0, risk) / effectivePortfolioSize) * 100 : 0;
  return heat;
}

// XIRR calculation helper functions
function daysToYears(days: number): number {
  return days / 365;
}

function calculateNPV(rate: number, dates: Date[], cashFlows: number[]): number {
  return cashFlows.reduce((npv, cashFlow, i) => {
    const yearFraction = daysToYears((dates[i].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24));
    return npv + cashFlow / Math.pow(1 + rate, yearFraction);
  }, 0);
}

function calculateXIRR(dates: Date[], cashFlows: number[], guess = 0.1): number {
  const EPSILON = 0.0000001;
  const MAX_ITERATIONS = 100;
  
  // Check if we have valid inputs
  if (dates.length !== cashFlows.length || dates.length < 2) {
    return 0;
  }
  
  // Verify that we have at least one positive and one negative cash flow
  const hasPositive = cashFlows.some(cf => cf > 0);
  const hasNegative = cashFlows.some(cf => cf < 0);
  if (!hasPositive || !hasNegative) {
    return 0;
  }

  let rate = guess;
  
  // Newton's method implementation
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const npv = calculateNPV(rate, dates, cashFlows);
    
    if (Math.abs(npv) < EPSILON) {
      return rate;
    }
    
    // Calculate derivative of NPV
    const derivative = cashFlows.reduce((sum, cashFlow, j) => {
      const yearFraction = daysToYears((dates[j].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24));
      return sum - yearFraction * cashFlow / Math.pow(1 + rate, yearFraction + 1);
    }, 0);
    
    // Update rate using Newton's method
    const newRate = rate - npv / derivative;
    
    if (Math.abs(newRate - rate) < EPSILON) {
      return newRate;
    }
    
    rate = newRate;
  }
  
  return rate;
}

export function calcXIRR(
  startDate: Date,
  startingCapital: number,
  endDate: Date,
  endingCapital: number,
  capitalChanges: { date: Date; amount: number }[]
): number {
  // Sort all cash flows by date
  const allFlows = [
    { date: startDate, amount: -startingCapital }, // Initial investment is negative
    ...capitalChanges,
    { date: endDate, amount: endingCapital } // Final value is positive
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const dates = allFlows.map(flow => flow.date);
  const cashFlows = allFlows.map(flow => flow.amount);

  return calculateXIRR(dates, cashFlows) * 100; // Convert to percentage
}

/**
 * Calculate unrealized P/L for the open quantity of a trade
 * @param avgEntry - average entry price
 * @param cmp - current market price
 * @param openQty - open quantity
 * @param buySell - 'Buy' or 'Sell'
 * @returns Unrealized P/L for the open quantity
 */
export function calcUnrealizedPL(avgEntry: number, cmp: number, openQty: number, buySell: 'Buy' | 'Sell'): number {
  if (!openQty || !avgEntry || !cmp) return 0;
  if (buySell === 'Buy') {
    return (cmp - avgEntry) * openQty;
  } else {
    return (avgEntry - cmp) * openQty;
  }
}

/**
 * Calculate realized P/L using FIFO logic for multiple entries and exits.
 * @param entries - Array of { price, qty } for each entry lot (in order)
 * @param exits - Array of { price, qty } for each exit lot (in order)
 * @param buySell - 'Buy' or 'Sell'
 * @returns Realized P/L for all exited quantity using FIFO
 */
export function calcRealizedPL_FIFO(
  entries: { price: number, qty: number }[],
  exits: { price: number, qty: number }[],
  buySell: 'Buy' | 'Sell'
): number {
  let entryLots = entries.map(e => ({ ...e })); // clone to avoid mutation
  let totalPL = 0;
  for (const exit of exits) {
    let remainingExitQty = exit.qty;
    while (remainingExitQty > 0 && entryLots.length > 0) {
      const lot = entryLots[0];
      const qtyToUse = Math.min(lot.qty, remainingExitQty);
      if (buySell === 'Buy') {
        totalPL += qtyToUse * (exit.price - lot.price);
      } else {
        totalPL += qtyToUse * (lot.price - exit.price);
      }
      lot.qty -= qtyToUse;
      remainingExitQty -= qtyToUse;
      if (lot.qty === 0) entryLots.shift();
    }
  }
  return totalPL;
}

interface EntryMove {
  entryPrice: number;
  qty: number;
  movePercent: number;
  description: string;
}

  export function calcIndividualMoves(
  entries: { price: number; qty: number; description?: string }[],
  cmp: number,
  avgExit: number,
  positionStatus: 'Open' | 'Closed' | 'Partial',
  buySell: 'Buy' | 'Sell' = 'Buy'
): EntryMove[] {
  // Filter out entries with no quantity or price
  const validEntries = entries.filter(e => e.price > 0 && e.qty > 0);
  
  return validEntries.map(entry => {
    let comparePrice = positionStatus === 'Open' ? cmp : avgExit;
    if (positionStatus === 'Partial') {
      // For partial positions, use both CMP and avgExit
      comparePrice = cmp || avgExit;
    }

    let movePercent = 0;
    if (comparePrice && entry.price) {
      movePercent = ((comparePrice - entry.price) / entry.price) * 100;
      // Invert the percentage for Sell trades
      if (buySell === 'Sell') {
        movePercent = -movePercent;
      }
    }

    return {
      entryPrice: entry.price,
      qty: entry.qty,
      movePercent,
      description: entry.description || `Entry at ₹${entry.price}`
    };
  });
}

/**
 * Calculate the weighted average Reward:Risk (R:R) for a trade, using per-entry breakdown and TSL/SL logic.
 * This matches the logic in trade-journal.tsx for consistency across analytics.
 */
import { Trade } from '../types/trade';
import { calculateTradePL } from './accountingUtils';
export function calcWeightedRewardRisk(trade: Trade): number {
  const entry = Number(trade.entry);
  const sl = Number(trade.sl);
  const tsl = Number(trade.tsl);
  const cmp = Number(trade.cmp);
  const avgExit = Number(trade.avgExitPrice);
  const buySell = trade.buySell;
  const positionStatus = trade.positionStatus;
  const exitedQty = Number(trade.exitedQty);
  const openQty = Number(trade.openQty);
  // Gather all entry lots
  const entries = [
    { label: 'Initial Entry', price: Number(trade.entry), qty: Number(trade.initialQty) },
    { label: 'Pyramid 1', price: Number(trade.pyramid1Price), qty: Number(trade.pyramid1Qty) },
    { label: 'Pyramid 2', price: Number(trade.pyramid2Price), qty: Number(trade.pyramid2Qty) }
  ].filter(e => e.price > 0 && e.qty > 0);
  const totalQtyAll = entries.reduce((sum, e) => sum + (e.qty || 0), 0);
  const entryBreakdown = entries.map(e => {
    // For initial entry, always use SL; for pyramids, use TSL if set and > 0, otherwise SL
    let stop;
    if (e.label === 'Initial Entry') {
      stop = sl;
    } else {
      stop = tsl > 0 ? tsl : sl;
    }
    const rawRisk = e.price - stop; // For Buy
    const risk = Math.abs(rawRisk); // For R:R calculation
    let reward = 0;
    if (positionStatus === 'Open') {
      reward = buySell === 'Buy' ? cmp - e.price : e.price - cmp;
    } else if (positionStatus === 'Closed') {
      reward = buySell === 'Buy' ? avgExit - e.price : e.price - avgExit;
    } else if (positionStatus === 'Partial') {
      const realizedReward = buySell === 'Buy' ? avgExit - e.price : e.price - avgExit;
      const potentialReward = buySell === 'Buy' ? cmp - e.price : e.price - cmp;
      reward = totalQtyAll > 0 ? ((realizedReward * exitedQty + potentialReward * openQty) / totalQtyAll) : 0;
    }
    const rrValue = risk !== 0 ? Math.abs(reward / risk) : 0;
    return {
      rrValue,
      qty: e.qty
    };
  });
  const weightedRR = totalQtyAll > 0
    ? entryBreakdown.reduce((sum, e) => sum + (e.rrValue * (e.qty || 0)), 0) / totalQtyAll
    : 0;
  return weightedRR;
}

// Function to get a sorted list of unique dates from trades
export function getUniqueSortedDates(trades: any[]): Date[] {
  const dates = new Set<number>(); // Use Set to store unique timestamps

  trades.forEach(trade => {
    // Add trade entry date
    if (trade.date) {
      const d = new Date(trade.date);
      d.setHours(0, 0, 0, 0); // Normalize to start of day
      dates.add(d.getTime());
    }

    // Add pyramid dates
    if (trade.pyramid1Date) {
      const d = new Date(trade.pyramid1Date);
      d.setHours(0, 0, 0, 0);
      dates.add(d.getTime());
    }
    if (trade.pyramid2Date) {
      const d = new Date(trade.pyramid2Date);
      d.setHours(0, 0, 0, 0);
      dates.add(d.getTime());
    }

    // Add exit dates
    if (trade.exit1Date) {
      const d = new Date(trade.exit1Date);
      d.setHours(0, 0, 0, 0);
      dates.add(d.getTime());
    }
    if (trade.exit2Date) {
      const d = new Date(trade.exit2Date);
      d.setHours(0, 0, 0, 0);
      dates.add(d.getTime());
    }
    if (trade.exit3Date) {
      const d = new Date(trade.exit3Date);
      d.setHours(0, 0, 0, 0);
      dates.add(d.getTime());
    }
  });

  // Convert timestamps back to Date objects and sort them
  const sortedDates = Array.from(dates)
    .map(timestamp => new Date(timestamp))
    .sort((a, b) => a.getTime() - b.getTime());

  return sortedDates;
}

// Function to calculate daily portfolio values
export function calculateDailyPortfolioValues(trades: any[], capitalChanges: any[], useCashBasis: boolean = false): Map<number, number> {
  const dailyValues = new Map<number, number>(); // Map: timestamp -> portfolio value
  const allRelevantDates = getUniqueSortedDates(trades).concat(capitalChanges.map(cc => {
    const d = new Date(cc.date);
    d.setHours(0, 0, 0, 0);
    return d;
  })).sort((a, b) => a.getTime() - b.getTime());

  if (allRelevantDates.length === 0) {
    dailyValues.set(new Date().setHours(0,0,0,0), 1000); // Default non-zero value for empty portfolio
    return dailyValues;
  }

  let currentCashComponent = 0; // Represents the cash portion of the portfolio (cash + realized P/L)

  // Determine initial cash component from the earliest capital change or a default base
  const initialDate = allRelevantDates[0];
  const initialChange = capitalChanges.find(cc => {
    const d = new Date(cc.date);
    d.setHours(0,0,0,0);
    return d.getTime() === initialDate.getTime();
  });
  if (initialChange) {
    currentCashComponent = initialChange.type === 'deposit' ? initialChange.amount : -initialChange.amount;
  } else {
    // If no initial capital change on the first date, assume a sensible starting point.
    // This helps avoid zero division issues in later calculations if no explicit starting capital is provided.
    currentCashComponent = 1000; 
  }

  // Process each date in chronological order
  for (const date of allRelevantDates) {
    const timestamp = date.getTime();
    
    // Apply capital changes for this specific date
    capitalChanges.filter(cc => {
      const d = new Date(cc.date);
      d.setHours(0,0,0,0);
      return d.getTime() === timestamp;
    }).forEach(cc => {
      currentCashComponent += cc.type === 'deposit' ? cc.amount : -cc.amount;
    });

    // Apply P/L from closed and partially closed trades on this date
    const tradesOnDate = trades.filter(trade => {
      if (trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial') {
        // Use the same fallback logic as other parts of the app
        const exitDates = [
          trade.exit1Date,
          trade.exit2Date,
          trade.exit3Date
        ].filter(date => date && date.trim() !== '');

        const exitDate = exitDates.length > 0
          ? exitDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          : trade.date; // Fallback to trade date

        const d = new Date(exitDate);
        d.setHours(0,0,0,0);
        return d.getTime() === timestamp;
      }
      return false;
    });

    // For cash basis, deduplicate trades to avoid double counting
    let uniqueTradesForDate = tradesOnDate;
    if (useCashBasis) {
      const seenTradeIds = new Set();
      uniqueTradesForDate = tradesOnDate.filter(trade => {
        const originalId = trade.id.split('_exit_')[0];
        if (seenTradeIds.has(originalId)) return false;
        seenTradeIds.add(originalId);
        return true;
      });
    }

    uniqueTradesForDate.forEach(trade => {
      // Use accounting-aware P/L calculation instead of direct plRs
      const accountingPL = calculateTradePL(trade, useCashBasis);
      currentCashComponent += accountingPL;
    });

    // Calculate the total market value of *all open positions* on this date
    dailyValues.set(timestamp, currentCashComponent);
  }

  return dailyValues;
}

// Function to calculate daily returns from portfolio values
export function calculateDailyReturns(dailyPortfolioValues: Map<number, number>): Map<number, number> {
  const dailyReturns = new Map<number, number>();
  const sortedDates = Array.from(dailyPortfolioValues.keys()).sort((a, b) => a - b);

  if (sortedDates.length <= 1) return dailyReturns;

  let prevValue = dailyPortfolioValues.get(sortedDates[0]) || 0;

  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i];
    const currentValue = dailyPortfolioValues.get(currentDate) || 0;

    if (prevValue !== 0) {
      const returns = (currentValue - prevValue) / prevValue;
      dailyReturns.set(currentDate, returns);
    } else {
      dailyReturns.set(currentDate, 0); // Handle division by zero
    }
    prevValue = currentValue;
  }
  return dailyReturns;
}

// Function to calculate Standard Deviation of returns
export function calculateStandardDeviation(returns: number[]): number {
  if (returns.length < 2) return 0; // Need at least 2 data points for std dev

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  return Math.sqrt(variance);
}

// Function to calculate Max Drawdown
export function calculateMaxDrawdown(dailyPortfolioValues: Map<number, number>): number {
  const sortedDates = Array.from(dailyPortfolioValues.keys()).sort((a, b) => a - b);
  if (sortedDates.length === 0) return 0;

  let peak = dailyPortfolioValues.get(sortedDates[0]) || 0;
  let maxDrawdown = 0;

  for (const dateTimestamp of sortedDates) {
    const value = dailyPortfolioValues.get(dateTimestamp) || 0;
    if (value > peak) {
      peak = value;
    }

    // Only calculate drawdown if peak is positive
    if (peak > 0) {
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  return maxDrawdown; // Returns as a percentage (e.g., 0.10 for 10%)
}

// Function to calculate Downside Deviation (for Sortino Ratio)
export function calculateDownsideDeviation(returns: number[], targetReturn: number = 0): number {
  if (returns.length === 0) return 0;

  // Calculate downside deviation using all returns, but only penalize negative deviations
  const sumOfSquaredDownsideDeviations = returns.reduce((sum, r) => {
    if (r < targetReturn) {
      return sum + Math.pow(r - targetReturn, 2);
    }
    return sum;
  }, 0);

  if (sumOfSquaredDownsideDeviations === 0) return 0;

  // Use total number of observations for denominator (standard approach)
  const downsideVariance = sumOfSquaredDownsideDeviations / returns.length;
  return Math.sqrt(downsideVariance);
}

// Sharpe Ratio
export function calculateSharpeRatio(
  annualizedReturn: number,
  riskFreeRate: number, // Annualized risk-free rate
  portfolioStdDev: number // Annualized standard deviation of portfolio returns
): number {
  const EPSILON = 1e-9; // Define a small epsilon for near-zero checks
  if (Math.abs(portfolioStdDev) < EPSILON) return 0; // Return 0 if std dev is practically zero
  return (annualizedReturn - riskFreeRate) / portfolioStdDev;
}

// Calmar Ratio
export function calculateCalmarRatio(
  annualizedReturn: number,
  maxDrawdown: number // As a decimal, e.g., 0.10 for 10%
): number {
  const EPSILON = 1e-9; // Define a small epsilon for near-zero checks
  if (Math.abs(maxDrawdown) < EPSILON) {
    // If there's no drawdown, return a high value if returns are positive, 0 otherwise
    return annualizedReturn > 0 ? 999 : 0;
  }
  return annualizedReturn / maxDrawdown;
}

// Sortino Ratio
export function calculateSortinoRatio(
  annualizedReturn: number,
  riskFreeRate: number, // Annualized risk-free rate
  downsideDeviation: number // Annualized downside deviation
): number {
  const EPSILON = 1e-9; // Define a small epsilon for near-zero checks
  if (Math.abs(downsideDeviation) < EPSILON) return 0; // Return 0 if downside dev is practically zero
  return (annualizedReturn - riskFreeRate) / downsideDeviation;
}

// Helper to annualize daily return metrics
export function annualizeMetric(dailyMetric: number, numPeriods: number = 252): number {
  // For standard deviation and downside deviation, multiply by sqrt(numPeriods)
  // For returns, multiply by numPeriods
  // This function is generally for converting daily volatility to annual volatility
  return dailyMetric * Math.sqrt(numPeriods);
} 