import React, { useState, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Tooltip,
  Input
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { Trade } from "../../types/trade";
import { useTruePortfolioWithTrades } from "../../hooks/use-true-portfolio-with-trades";
import { useTrades } from "../../hooks/use-trades";
import { useAccountingMethod } from "../../context/AccountingMethodContext";
import { getTradesForMonth, calculateTradePL } from "../../utils/accountingUtils";

interface TaxTableProps {
  trades: Trade[];
  taxesByMonth: { [month: string]: number };
  setTaxesByMonth: React.Dispatch<React.SetStateAction<{ [month: string]: number }>>;
}

interface TaxData {
  month: string;
  totalTrades: number;
  winRate: string;
  avgProfit: string;
  avgLoss: string;
  grossPL: number;
  taxes: number;
  netPL: number;
  taxPercent: string;
  grossPFImpact: string;
  netPFImpact: string;
  returnPercent: string;
}

const taxData: TaxData[] = [
  { 
    month: "January", 
    totalTrades: 9, 
    winRate: "#N/A", 
    avgProfit: "#DIV/0!", 
    avgLoss: "-405.81", 
    grossPL: -3652.27, 
    taxes: 355.00, 
    netPL: -4007.27, 
    taxPercent: "-9.72%", 
    grossPFImpact: "-1.25%", 
    netPFImpact: "-1.37%", 
    returnPercent: "-1.25%" 
  },
  { 
    month: "February", 
    totalTrades: 0, 
    winRate: "#N/A", 
    avgProfit: "#DIV/0!", 
    avgLoss: "-678.72", 
    grossPL: -2714.89, 
    taxes: 93.00, 
    netPL: -2807.89, 
    taxPercent: "-3.43%", 
    grossPFImpact: "-0.94%", 
    netPFImpact: "-0.97%", 
    returnPercent: "-0.94%" 
  },
  { 
    month: "March", 
    totalTrades: 6, 
    winRate: "16.67%", 
    avgProfit: "2925", 
    avgLoss: "-591.68", 
    grossPL: -33.40, 
    taxes: 807.00, 
    netPL: -840.40, 
    taxPercent: "-2416.17%", 
    grossPFImpact: "-0.01%", 
    netPFImpact: "-0.26%", 
    returnPercent: "-0.01%" 
  },
  { 
    month: "April", 
    totalTrades: 12, 
    winRate: "33.33%", 
    avgProfit: "3681.2425", 
    avgLoss: "-508.41", 
    grossPL: 10657.72, 
    taxes: 690.35, 
    netPL: 9967.37, 
    taxPercent: "6.48%", 
    grossPFImpact: "3.47%", 
    netPFImpact: "3.24%", 
    returnPercent: "3.47%" 
  },
  { 
    month: "May", 
    totalTrades: 10, 
    winRate: "40%", 
    avgProfit: "4135.65", 
    avgLoss: "-661.93", 
    grossPL: 12571.03, 
    taxes: 972.52, 
    netPL: 11598.51, 
    taxPercent: "7.74%", 
    grossPFImpact: "3.95%", 
    netPFImpact: "3.65%", 
    returnPercent: "3.95%" 
  },
  { 
    month: "June", 
    totalTrades: 12, 
    winRate: "41.67%", 
    avgProfit: "14710.852", 
    avgLoss: "-993.57", 
    grossPL: 10657.72, 
    taxes: 1786.00, 
    netPL: 8871.72, 
    taxPercent: "16.76%", 
    grossPFImpact: "2.88%", 
    netPFImpact: "2.40%", 
    returnPercent: "17.99%" 
  },
  { 
    month: "July", 
    totalTrades: 16, 
    winRate: "50%", 
    avgProfit: "3690.04375", 
    avgLoss: "-763.42", 
    grossPL: 23413.03, 
    taxes: 2127.47, 
    netPL: 21285.56, 
    taxPercent: "9.09%", 
    grossPFImpact: "5.36%", 
    netPFImpact: "4.87%", 
    returnPercent: "5.36%" 
  },
  { 
    month: "August", 
    totalTrades: 9, 
    winRate: "44.44%", 
    avgProfit: "3042.5425", 
    avgLoss: "-971.99", 
    grossPL: 7310.20, 
    taxes: 768.85, 
    netPL: 6541.35, 
    taxPercent: "10.52%", 
    grossPFImpact: "1.59%", 
    netPFImpact: "1.42%", 
    returnPercent: "1.59%" 
  },
  { 
    month: "September", 
    totalTrades: 14, 
    winRate: "42.86%", 
    avgProfit: "15166.51333", 
    avgLoss: "-759.91", 
    grossPL: 84919.78, 
    taxes: 1750.00, 
    netPL: 83169.78, 
    taxPercent: "2.06%", 
    grossPFImpact: "18.16%", 
    netPFImpact: "17.79%", 
    returnPercent: "18.16%" 
  },
  { 
    month: "October", 
    totalTrades: 7, 
    winRate: "42.86%", 
    avgProfit: "248.73", 
    avgLoss: "-745.72", 
    grossPL: -2236.68, 
    taxes: 2956.00, 
    netPL: -5192.68, 
    taxPercent: "-132.16%", 
    grossPFImpact: "-0.23%", 
    netPFImpact: "-0.54%", 
    returnPercent: "-0.23%" 
  },
  { 
    month: "November", 
    totalTrades: 7, 
    winRate: "42.86%", 
    avgProfit: "1272.236667", 
    avgLoss: "-286.52", 
    grossPL: 2670.62, 
    taxes: 173.00, 
    netPL: 2497.62, 
    taxPercent: "6.48%", 
    grossPFImpact: "0.28%", 
    netPFImpact: "0.26%", 
    returnPercent: "0.28%" 
  },
  { 
    month: "December", 
    totalTrades: 20, 
    winRate: "50%", 
    avgProfit: "2818.115", 
    avgLoss: "-2164.22", 
    grossPL: 6538.92, 
    taxes: 4597.00, 
    netPL: 1941.92, 
    taxPercent: "70.30%", 
    grossPFImpact: "0.69%", 
    netPFImpact: "0.20%", 
    returnPercent: "0.69%" 
  }
];

// localStorage helpers
function fetchTaxData() {
  try {
    const stored = localStorage.getItem('taxData');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error fetching tax data:', error);
    return {};
  }
}

function saveTaxData(taxData: any) {
  try {
    localStorage.setItem('taxData', JSON.stringify(taxData));
  } catch (error) {
    console.error('localStorage save error:', error);
  }
}

// Editable Text Component
const EditableText: React.FC<{
  value: string | number;
  onSave: (value: string, eventType: 'enter' | 'blur' | 'escape') => void;
  isEditing: boolean;
  type?: "text" | "number";
  className?: string;
  prefix?: string;
}> = ({ value, onSave, isEditing, type = "text", className = "", prefix = "" }) => {
  const [editValue, setEditValue] = React.useState(value.toString());
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    onSave(editValue, 'blur');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(editValue, 'enter');
    } else if (e.key === 'Escape') {
      onSave(value.toString(), 'escape');
    }
  };

  if (!isEditing) {
    return (
      <motion.span 
        className={`inline-block ${className}`}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.02 }}
      >
        {prefix}{value}
      </motion.span>
    );
  }

  return (
    <Input
      ref={inputRef}
      type={type}
      value={editValue}
      onValueChange={setEditValue}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      autoFocus
      size="sm"
      variant="bordered"
      className={`max-w-[120px] ${className}`}
      classNames={{
        input: "text-right",
        inputWrapper: "h-8 min-h-unit-8"
      }}
      startContent={prefix ? <span className="text-default-400">{prefix}</span> : undefined}
      min={0}
    />
  );
};

export const TaxTable: React.FC<TaxTableProps> = ({ trades = [], taxesByMonth, setTaxesByMonth }) => {
  const { portfolioSize, getPortfolioSize } = useTruePortfolioWithTrades(trades);
  const { accountingMethod } = useAccountingMethod();
  const useCashBasis = accountingMethod === 'cash';
  const [editingCell, setEditingCell] = useState<{ month: string; value: string } | null>(null);

  React.useEffect(() => {
    // Load taxes from localStorage on component mount
    const allTaxData = fetchTaxData();
    const currentYear = new Date().getFullYear().toString();
    const yearTaxData = allTaxData[currentYear] || {};
    setTaxesByMonth(yearTaxData);
  }, [setTaxesByMonth]);

  // Helper function to convert full month name to short month name
  const getShortMonthName = (fullMonth: string): string => {
    return fullMonth.substring(0, 3);
  };

  // Group trades by month based on accounting method
  const monthOrder = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const currentYear = new Date().getFullYear();

  // Create monthly map using accounting method
  const monthlyMap: Record<string, Trade[]> = {};
  monthOrder.forEach(month => {
    // Convert full month name to short month name for getTradesForMonth
    const shortMonth = getShortMonthName(month);
    const monthTrades = getTradesForMonth(trades, shortMonth, currentYear, useCashBasis);
    if (monthTrades.length > 0) {
      monthlyMap[month] = monthTrades;
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleEditStart = (month: string, value: number) => {
    setEditingCell({ month, value: value.toString() });
  };

  const handleEditComplete = useCallback((newValueString: string, eventType: 'enter' | 'blur' | 'escape') => {
    if (editingCell) {
      let newValue = parseFloat(newValueString); 

      // If the input is empty or results in NaN, treat it as 0
      if (isNaN(newValue) || newValueString.trim() === '') {
        newValue = 0; 
      }

      // If a negative number is entered, set it to 0
      if (newValue < 0) {
        newValue = 0;
      }

      // No longer need the `if (newValue >= 0)` check here, as newValue is already sanitized to be non-negative
      setTaxesByMonth(prev => {
        const updatedTaxes = {
          ...prev,
          [editingCell.month]: newValue
        };
        // Save updated taxes to localStorage
        const allTaxData = fetchTaxData();
        const currentYear = new Date().getFullYear().toString();
        const newAllTaxData = {
          ...allTaxData,
          [currentYear]: {
            ...(allTaxData[currentYear] || {}),
            [editingCell.month]: newValue
          }
        };
        saveTaxData(newAllTaxData);
        return updatedTaxes;
      });

      // Set editingCell to null on any save event (Enter, Blur, or Escape)
      setEditingCell(null);
    }
  }, [editingCell, setTaxesByMonth]);



  const columns = React.useMemo(() => [
    {
      key: "month",
      label: "Month",
    },
    {
      key: "grossPL",
      label: "Gross P/L",
    },
    {
      key: "taxes",
      label: (
        <div className="flex items-center gap-1">
          Taxes
          <Tooltip content="Tax amount for the month." placement="top">
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </Tooltip>
        </div>
      ),
    },
    {
      key: "taxPercent",
      label: "Tax %",
    },
    {
      key: "netPL",
      label: "Net P/L",
    },
    {
      key: "grossPFImpact",
      label: "Gross PF Impact",
    },
    {
      key: "netPFImpact",
      label: (
        <div className="flex items-center gap-1">
          Net PF Impact
          <Tooltip content="Portfolio impact after taxes." placement="top">
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer" />
          </Tooltip>
        </div>
      ),
    },
    {
      key: "returnPercent",
      label: "Return %",
    },
    {
      key: "totalTrades",
      label: "Trades",
    },
    {
      key: "winRate",
      label: "Win Rate",
    },
    {
      key: "avgProfit",
      label: "Avg Profit",
    },
    {
      key: "avgLoss",
      label: "Avg Loss",
    },
    {
      key: "avgRR",
      label: "Avg R:R",
    },
  ], []);

  const renderCell = useCallback((item: TaxData, columnKey: string) => {
    const isEditing = editingCell?.month === item.month && columnKey === 'taxes';
    const value = item[columnKey as keyof TaxData];

    if (columnKey === 'taxes') {
        return (
        <TableCell 
          key={columnKey} 
          className="cursor-pointer rounded-md"
          onClick={() => handleEditStart(item.month, item.taxes)}
        >
          <div className="flex items-center justify-end gap-1.5">
            {isEditing ? (
              <EditableText
                value={editingCell?.value || ''}
                onSave={handleEditComplete}
                isEditing={true}
                type="number"
                prefix="₹"
                className="text-right"
              />
            ) : (
              <>
                <span className="text-foreground dark:text-foreground-200">
                  {formatCurrency(item.taxes)}
                </span>
                <span className="text-foreground-400">
                  <Icon icon="lucide:edit-2" className="h-2.5 w-2.5" />
                </span>
              </>
            )}
          </div>
        </TableCell>
        );
      }

    if (columnKey === 'month') {
      return (
        <TableCell key={columnKey}>
          <span className="font-medium text-foreground dark:text-foreground-200">{item.month}</span>
        </TableCell>
      );
    }

    if (typeof value === 'number') {
      const formattedValue = columnKey === 'grossPL' || columnKey === 'netPL' ? formatCurrency(value) : (value >= 0 ? `${value.toFixed(2)}%` : `-${Math.abs(value).toFixed(2)}%`);
        return (
        <TableCell key={columnKey}>
          <span className={`${value >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
            {formattedValue}
          </span>
        </TableCell>
      );
    }

    // Handle specific string values like "#N/A" and "#DIV/0!"
    if (typeof value === 'string' && (value === '#N/A' || value === '#DIV/0!' || value === '-')) {
        return (
        <TableCell key={columnKey}>
          <span className="text-foreground dark:text-foreground-200">
            -
          </span>
        </TableCell>
        );
    }

    return (
      <TableCell key={columnKey}>
        <span className="text-foreground dark:text-foreground-200">
          {String(value)}
        </span>
      </TableCell>
    );
  }, [editingCell, taxesByMonth, formatCurrency, handleEditComplete, handleEditStart]);

  return (
    <div className="rounded-lg border border-default-200 dark:border-default-100 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="overflow-auto max-h-[70vh]">
        <Table
          aria-label="Monthly Tax Breakdown Table"
          classNames={{
            base: "min-w-[800px]",
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
        <TableBody items={monthOrder.map(month => {
          const monthlyTrades = monthlyMap[month] || [];

          // Calculate P/L based on accounting method
          const tradesWithPL = monthlyTrades.map(trade => ({
            ...trade,
            accountingPL: calculateTradePL(trade, useCashBasis)
          }));

          const grossPL = tradesWithPL.reduce((sum, t) => sum + t.accountingPL, 0);
          const winTrades = tradesWithPL.filter(t => t.accountingPL > 0);
          const lossTrades = tradesWithPL.filter(t => t.accountingPL < 0);
          const totalTrades = monthlyTrades.length;
          const winRate = totalTrades > 0 ? ((winTrades.length / totalTrades) * 100).toFixed(2) + '%' : "-";
          const avgProfit = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + t.accountingPL, 0) / winTrades.length : "-";
          const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((sum, t) => sum + t.accountingPL, 0) / lossTrades.length : "-";
          
          const taxes = taxesByMonth[month] || 0;
          const netPL = grossPL - taxes;
          const taxPercent = grossPL !== 0 ? ((taxes / grossPL) * 100).toFixed(2) + '%' : "0.00%";
          
          const portfolioSizeForMonth = getPortfolioSize(getShortMonthName(month), new Date().getFullYear(), trades, useCashBasis);
          const grossPFImpact = portfolioSizeForMonth > 0 ? ((grossPL / portfolioSizeForMonth) * 100).toFixed(2) + '%' : "0.00%";
          const netPFImpact = portfolioSizeForMonth > 0 ? ((netPL / portfolioSizeForMonth) * 100).toFixed(2) + '%' : "0.00%";
          const returnPercent = grossPFImpact; // Using grossPFImpact for now

          // Calculate avg RR based on existing trades (assuming avgGain and avgLoss are available)
          const avgGainValue = typeof avgProfit === 'number' ? avgProfit : 0; // Convert to number if needed
          const avgLossValue = typeof avgLoss === 'number' ? avgLoss : 0; // Convert to number if needed
          const avgRR = avgLossValue !== 0 ? Math.abs(avgGainValue / avgLossValue).toFixed(2) : "0.00";

          return {
            month,
            totalTrades,
            winRate,
            avgProfit: typeof avgProfit === 'number' ? avgProfit.toFixed(2) : avgProfit,
            avgLoss: typeof avgLoss === 'number' ? avgLoss.toFixed(2) : avgLoss,
            grossPL,
            taxes,
            netPL,
            taxPercent,
            grossPFImpact,
            netPFImpact,
            returnPercent,
            avgRR
          };
        })}>
          {(item) => (
            <TableRow key={item.month}>
              {(columnKey) => renderCell(item, columnKey as string)}
          </TableRow>
          )}
        </TableBody>
        </Table>
      </div>
    </div>
  );
};