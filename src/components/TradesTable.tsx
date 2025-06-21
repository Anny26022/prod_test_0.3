import React from "react";
import { Table, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Trade } from "../types/trade";
import { validateTrade, TradeIssue } from "../utils/tradeValidations";
import { useTrades } from "../hooks/use-trades";
import { calcIndividualMoves } from "../utils/tradeCalculations";

export const TradesTable = () => {
  const { trades, updateTrade } = useTrades();
  const [validationMessages, setValidationMessages] = React.useState<Record<string, TradeIssue[]>>({});
  
  const handleCellChange = (trade: Trade, field: keyof Trade, value: any) => {
    const updatedTrade = { ...trade, [field]: value };
    const issues = validateTrade(updatedTrade);
    
    setValidationMessages(prev => ({
      ...prev,
      [trade.id]: issues
    }));
    
    if (issues.some(issue => issue.type === 'error')) {
      console.error(`Trade ${trade.tradeNo}: ${issues.find(i => i.type === 'error')?.message}`);
      return;
    }
    
    updateTrade(updatedTrade);
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "-";
    return `${value.toFixed(2)}%`;
  };

  const formatRR = (value: number | null | undefined): string => {
    if (value === null || value === undefined || value <= 0) return "-";
    const rrStr = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
    return `${rrStr}R`;
  };

  const renderCell = React.useCallback((trade: Trade, columnKey: React.Key) => {
    const issues = validationMessages[trade.id] || [];
    const hasError = issues.some(i => i.type === 'error');
    const hasWarning = issues.some(i => i.type === 'warning');

    if (columnKey === "stockMove") {
      const entries = [
        { price: trade.entry, qty: trade.initialQty, description: "Initial Entry" },
        { price: trade.pyramid1Price, qty: trade.pyramid1Qty, description: "Pyramid 1" },
        { price: trade.pyramid2Price, qty: trade.pyramid2Qty, description: "Pyramid 2" }
      ].filter(e => e.price > 0 && e.qty > 0);

      const individualMoves = calcIndividualMoves(
        entries,
        trade.cmp,
        trade.avgExitPrice,
        trade.positionStatus,
        trade.buySell
      );

      const tooltipContent = (
        <div className="p-2 text-xs">
          <div className="font-semibold mb-1">Individual Stock Moves:</div>
          {individualMoves.map((move, index) => (
            <div key={index} className="whitespace-nowrap">
              {move.description} ({move.qty} qty): {formatPercentage(move.movePercent)}
            </div>
          ))}
          <div className="text-foreground-500 mt-1.5 text-[10px]">
            {trade.positionStatus === 'Open' ? '* Moves based on Current Market Price vs. individual entry prices.' :
             trade.positionStatus === 'Partial' ? '* Moves weighted: Avg. Exit for exited qty, CMP for open qty, vs. individual entry prices.' :
             '* Moves based on Average Exit Price vs. individual entry prices.'}
          </div>
        </div>
      );

      return (
        <div className="flex items-center gap-1">
          <span>{formatPercentage(trade.stockMove)}</span>
          <Tooltip 
            content={tooltipContent} 
            placement="right"
            classNames={{
              base: "py-1 px-2 shadow-soft-xl backdrop-blur-xl bg-background/80 dark:bg-background/40 border border-foreground-200/20",
              content: "text-foreground-700 dark:text-foreground-300"
            }}
          >
            <Icon icon="lucide:alert-circle" className="w-4 h-4 text-warning-500 cursor-help" />
          </Tooltip>
        </div>
      );
    }

    if (columnKey === "rewardRisk") {
      const rrTooltipContent = (
        <div className="p-2 text-xs max-w-xs">
          <div className="font-semibold mb-1">Reward:Risk (R:R) Calculation:</div>
          <p className="mb-1">Indicates the ratio of potential/actual reward to the initial risk taken.</p>
          <p className="mb-0.5"><b>Risk (per share):</b> Absolute difference between Entry Price and Stop Loss (SL).</p>
          <div className="font-medium mt-1">Reward Basis (per share):</div>
          {trade.positionStatus === 'Open' && <p className="ml-2 text-[11px]">Potential: Current Market Price (CMP) - Entry Price</p>}
          {trade.positionStatus === 'Closed' && <p className="ml-2 text-[11px]">Actual: Average Exit Price - Entry Price</p>}
          {trade.positionStatus === 'Partial' && 
            <ul className="list-disc list-inside ml-2 text-[11px]">
              <li>Exited Qty: Avg. Exit - Entry</li>
              <li>Open Qty: CMP - Entry</li>
              <li className="mt-0.5">Overall: Weighted average of above rewards.</li>
            </ul>
          }
           <p className="text-foreground-500 mt-1.5 text-[10px]">Note: The calculation considers if it's a Buy or Sell trade for reward direction. Displayed R:R is absolute.</p>
        </div>
      );
      return (
        <div className="flex items-center gap-1">
          <span>{formatRR(trade.rewardRisk)}</span>
           <Tooltip 
            content={rrTooltipContent} 
            placement="right"
            classNames={{
              base: "py-1 px-2 shadow-soft-xl backdrop-blur-xl bg-background/80 dark:bg-background/40 border border-foreground-200/20",
              content: "text-foreground-700 dark:text-foreground-300"
            }}
          >
            <Icon icon="lucide:alert-circle" className="w-4 h-4 text-warning-500 cursor-help" />
          </Tooltip>
        </div>
      );
    }

    // Fallback for other cells or specific handling
    const cellValue = trade[columnKey as keyof Trade];
    let displayValue: React.ReactNode = cellValue !== undefined && cellValue !== null ? String(cellValue) : "-";

    // Add other specific cell rendering logic here if needed

    return (
      <div className="relative">
        <div className={`${hasError ? 'border-danger-200' : hasWarning ? 'border-warning-200' : ''}`}>
          {displayValue}
        </div>
        {(hasError || hasWarning) && (
          <div className="absolute top-0 right-0">
            <div className="group relative">
              <Icon 
                icon={hasError ? "lucide:alert-circle" : "lucide:alert-triangle"}
                className={`${hasError ? 'text-danger-500' : 'text-warning-500'} w-4 h-4`}
              />
              <div className="hidden group-hover:block absolute z-50 p-2 text-sm bg-default-100 border border-default-200 rounded-md shadow-lg whitespace-pre-wrap max-w-xs right-0 mt-1">
                {issues.map((issue, idx) => (
                  <div key={idx} className="mb-1 last:mb-0">{issue.message}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [validationMessages]);

  return (
    <div>
      {/* Stats/Summary Section (if you have one) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Your existing stats cards */}
      </div>

      {/* Validation Messages Section */}
      {Object.keys(validationMessages).length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-warning-50 border border-warning-200">
          <h4 className="text-base font-medium text-warning-700 mb-2">Trade Issues Found</h4>
          {Object.entries(validationMessages).map(([tradeId, issues]) => {
            const trade = trades.find(t => t.id === tradeId);
            if (!trade || !issues.length) return null;
            
            return (
              <div key={tradeId} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon 
                    icon="lucide:file-text" 
                    className="text-warning-500"
                  />
                  <strong className="text-warning-700">Trade #{trade.tradeNo} ({trade.name})</strong>
                </div>
                <ul className="list-none pl-6">
                  {issues.map((issue, idx) => (
                    <li 
                      key={idx}
                      className={`flex items-center gap-2 text-sm mb-1 last:mb-0 ${
                        issue.type === 'error' 
                          ? 'text-danger-600' 
                          : 'text-warning-600'
                      }`}
                    >
                      <Icon 
                        icon={issue.type === 'error' ? "lucide:alert-circle" : "lucide:alert-triangle"}
                        className={`${
                          issue.type === 'error' ? 'text-danger-500' : 'text-warning-500'
                        } w-4 h-4 flex-shrink-0`}
                      />
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Component */}
      <Table aria-label="Trades Table">
        {/* ... rest of your table implementation ... */}
      </Table>
    </div>
  );
}; 