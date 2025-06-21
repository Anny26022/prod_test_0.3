import { Trade } from '../types/trade';

/**
 * Helper function to get exit dates with fallback logic
 * @param trade - The trade object
 * @returns Array of exit objects with date, qty, and price
 */
export function getExitDatesWithFallback(trade: Trade): Array<{ date: string; qty: number; price: number }> {
  // First, try to get individual exit dates
  const exits = [
    { date: trade.exit1Date, qty: trade.exit1Qty || 0, price: trade.exit1Price || 0 },
    { date: trade.exit2Date, qty: trade.exit2Qty || 0, price: trade.exit2Price || 0 },
    { date: trade.exit3Date, qty: trade.exit3Qty || 0, price: trade.exit3Price || 0 }
  ].filter(exit => exit.date && exit.date.trim() !== '' && exit.qty > 0);



  // If we have individual exit data, return it
  if (exits.length > 0) {
    return exits;
  }

  // Fallback: If no individual exit dates but we have exitedQty and avgExitPrice
  // Create a synthetic exit using the trade date as fallback
  if ((trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial') &&
      trade.exitedQty > 0 && trade.avgExitPrice > 0) {

    // Try to find the latest exit date from available exits (even if qty/price is 0)
    const availableExitDates = [
      trade.exit1Date,
      trade.exit2Date,
      trade.exit3Date
    ].filter(date => date && date.trim() !== '');

    const fallbackDate = availableExitDates.length > 0
      ? availableExitDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : trade.date; // Ultimate fallback to trade entry date

    return [{
      date: fallbackDate,
      qty: trade.exitedQty,
      price: trade.avgExitPrice
    }];
  }

  return [];
}

/**
 * Groups trades by month based on the accounting method
 * @param trades - Array of trades
 * @param useCashBasis - Whether to use cash basis (true) or accrual basis (false)
 * @returns Object with month keys and arrays of trades
 */
export function groupTradesByMonth(trades: Trade[], useCashBasis: boolean = false): Record<string, Trade[]> {
  const groupedTrades: Record<string, Trade[]> = {};

  trades.forEach(trade => {
    if (useCashBasis) {
      // Cash basis: Group by exit dates
      if (trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial') {
        const exits = getExitDatesWithFallback(trade);

        exits.forEach(exit => {
          const exitDate = new Date(exit.date);
          const monthKey = `${exitDate.toLocaleString('default', { month: 'short' })} ${exitDate.getFullYear()}`;

          if (!groupedTrades[monthKey]) {
            groupedTrades[monthKey] = [];
          }

          // Create a partial trade object for this exit
          const partialTrade: Trade = {
            ...trade,
            // Mark this as a partial exit for cash basis calculation
            _cashBasisExit: {
              date: exit.date,
              qty: exit.qty,
              price: exit.price
            }
          };

          groupedTrades[monthKey].push(partialTrade);
        });
      }
    } else {
      // Accrual basis: Group by trade initiation date (current behavior)
      if (trade.date) {
        const tradeDate = new Date(trade.date);
        const monthKey = `${tradeDate.toLocaleString('default', { month: 'short' })} ${tradeDate.getFullYear()}`;
        
        if (!groupedTrades[monthKey]) {
          groupedTrades[monthKey] = [];
        }
        
        groupedTrades[monthKey].push(trade);
      }
    }
  });

  return groupedTrades;
}

/**
 * Calculates P/L for a trade based on accounting method
 * @param trade - The trade object
 * @param useCashBasis - Whether to use cash basis accounting
 * @returns P/L amount
 */
export function calculateTradePL(trade: Trade, useCashBasis: boolean = false): number {
  if (!useCashBasis) {
    // Accrual basis: Use the trade's total realized P/L
    const accrualPL = trade.plRs ?? 0;



    return accrualPL;
  } else {
    // Cash basis: Calculate P/L for the specific exit if it's a cash basis exit
    const cashBasisExit = trade._cashBasisExit;
    if (cashBasisExit) {
      const avgEntry = trade.avgEntry || trade.entry || 0;

      // Use the exit price from the cash basis exit data
      const correctExitPrice = cashBasisExit.price;

      if (avgEntry > 0 && correctExitPrice > 0) {
        const pl = trade.buySell === 'Buy'
          ? (correctExitPrice - avgEntry) * cashBasisExit.qty
          : (avgEntry - correctExitPrice) * cashBasisExit.qty;



        return pl;
      }
    } else {
      // Cash basis for individual trades (not grouped): Use the trade's total realized P/L
      // This handles the case when calculating stats for individual trades
      if (trade.positionStatus === 'Closed') {
        return trade.plRs || 0;
      } else if (trade.positionStatus === 'Partial') {
        // For partial positions, calculate realized P/L from exits only
        const avgEntry = trade.avgEntry || trade.entry || 0;
        let totalRealizedPL = 0;

        // Calculate P/L for each exit
        if (trade.exit1Date && trade.exit1Qty && trade.exit1Price && avgEntry > 0) {
          const pl = trade.buySell === 'Buy'
            ? (trade.exit1Price - avgEntry) * trade.exit1Qty
            : (avgEntry - trade.exit1Price) * trade.exit1Qty;
          totalRealizedPL += pl;
        }

        if (trade.exit2Date && trade.exit2Qty && trade.exit2Price && avgEntry > 0) {
          const pl = trade.buySell === 'Buy'
            ? (trade.exit2Price - avgEntry) * trade.exit2Qty
            : (avgEntry - trade.exit2Price) * trade.exit2Qty;
          totalRealizedPL += pl;
        }

        if (trade.exit3Date && trade.exit3Qty && trade.exit3Price && avgEntry > 0) {
          const pl = trade.buySell === 'Buy'
            ? (trade.exit3Price - avgEntry) * trade.exit3Qty
            : (avgEntry - trade.exit3Price) * trade.exit3Qty;
          totalRealizedPL += pl;
        }

        // Fallback: If no individual exit data but we have partial exit information
        // Use the aggregate partial exit data (exitedQty, avgExitPrice, plRs)
        if (totalRealizedPL === 0 && trade.exitedQty > 0) {
          // Option 1: Use stored plRs if available (most reliable)
          if (trade.plRs !== undefined && trade.plRs !== null) {
            return trade.plRs;
          }

          // Option 2: Calculate from aggregate exit data if avgExitPrice is available
          if (trade.avgExitPrice > 0 && avgEntry > 0) {
            const pl = trade.buySell === 'Buy'
              ? (trade.avgExitPrice - avgEntry) * trade.exitedQty
              : (avgEntry - trade.avgExitPrice) * trade.exitedQty;
            return pl;
          }
        }

        return totalRealizedPL;
      }
    }

    return 0;
  }
}

/**
 * Gets the relevant date for a trade based on accounting method
 * @param trade - The trade object
 * @param useCashBasis - Whether to use cash basis accounting
 * @returns Date string
 */
export function getTradeDateForAccounting(trade: Trade, useCashBasis: boolean = false): string {
  if (!useCashBasis) {
    // Accrual basis: Use trade initiation date
    return trade.date;
  } else {
    // Cash basis: Use exit date if it's a cash basis exit
    const cashBasisExit = trade._cashBasisExit;
    if (cashBasisExit) {
      return cashBasisExit.date;
    }

    // For cash basis without _cashBasisExit, try to find the most recent exit date
    if (trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial') {
      // Find the latest exit date from available exits
      const exitDates = [
        trade.exit1Date,
        trade.exit2Date,
        trade.exit3Date
      ].filter(date => date && date.trim() !== '');

      if (exitDates.length > 0) {
        // Return the latest exit date for cash basis
        const latestExitDate = exitDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
        return latestExitDate;
      }
    }

    // Fallback to trade date if no exit information available
    return trade.date;
  }
}

/**
 * Filters trades for a specific month and year based on accounting method
 * @param trades - Array of trades
 * @param month - Month name (e.g., 'Jan', 'Feb')
 * @param year - Year number
 * @param useCashBasis - Whether to use cash basis accounting
 * @returns Filtered trades for the month
 */
export function getTradesForMonth(trades: Trade[], month: string, year: number, useCashBasis: boolean = false): Trade[] {
  if (!useCashBasis) {
    // Accrual basis: Filter by trade initiation date
    return trades.filter(trade => {
      if (!trade.date) return false;
      const tradeDate = new Date(trade.date);
      const tradeMonth = tradeDate.toLocaleString('default', { month: 'short' });
      const tradeYear = tradeDate.getFullYear();
      return tradeMonth === month && tradeYear === year;
    });
  } else {
    // Cash basis: Filter by exit dates
    const monthTrades: Trade[] = [];
    
    trades.forEach(trade => {
      if (trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial') {
        const exits = getExitDatesWithFallback(trade);

        exits.forEach(exit => {
          const exitDate = new Date(exit.date);
          const exitMonth = exitDate.toLocaleString('default', { month: 'short' });
          const exitYear = exitDate.getFullYear();

          if (exitMonth === month && exitYear === year) {
            // Create a partial trade object for this exit
            const partialTrade: Trade = {
              ...trade,
              _cashBasisExit: {
                date: exit.date,
                qty: exit.qty,
                price: exit.price
              }
            };

            monthTrades.push(partialTrade);
          }
        });
      }
    });
    
    return monthTrades;
  }
}
