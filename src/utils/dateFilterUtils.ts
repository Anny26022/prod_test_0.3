import { GlobalFilter } from "../context/GlobalFilterContext";
import { Trade } from "../types/trade";
import { getTradeDateForAccounting } from "./accountingUtils";

export function isInGlobalFilter(dateStr: string, filter: GlobalFilter): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  switch (filter.type) {
    case "all":
      return true;
    case "week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo && d <= now;
    }
    case "month": {
      return d.getMonth() === (filter.month ?? now.getMonth()) && d.getFullYear() === (filter.year ?? now.getFullYear());
    }
    case "fy": {
      // FY: 1 April to 31 March next year
      let fyStartYear = filter.fyStartYear;
      if (fyStartYear === undefined) {
        // If not provided, infer from today
        fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      }
      const fyStart = new Date(fyStartYear, 3, 1); // 1 April
      const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999); // 31 March next year
      return d >= fyStart && d <= fyEnd;
    }
    case "cy": {
      // CY: 1 Jan to 31 Dec
      const cyYear = filter.year ?? now.getFullYear();
      const cyStart = new Date(cyYear, 0, 1);
      const cyEnd = new Date(cyYear, 11, 31, 23, 59, 59, 999);
      return d >= cyStart && d <= cyEnd;
    }
    case "custom": {
      if (!filter.startDate || !filter.endDate) return true;
      return d >= filter.startDate && d <= filter.endDate;
    }
    default:
      return true;
  }
}

/**
 * Accounting-aware trade filtering function
 * Uses the appropriate date based on accounting method
 */
export function isTradeInGlobalFilter(trade: Trade, filter: GlobalFilter, useCashBasis: boolean = false): boolean {
  const relevantDate = getTradeDateForAccounting(trade, useCashBasis);
  return isInGlobalFilter(relevantDate, filter);
}