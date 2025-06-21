import React from "react";
import { Tooltip, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { metricVariants, listItemVariants } from "../../utils/animations";
import { Trade } from "../../types/trade";
import { calcWeightedRewardRisk } from "../../utils/tradeCalculations";
import { useTruePortfolioWithTrades } from "../../hooks/use-true-portfolio-with-trades";
import { useAccountingCalculations, useAccountingMethodDisplay } from "../../hooks/use-accounting-calculations";
import MobileTooltip from "../ui/MobileTooltip";

interface MetricProps {
  label: string;
  value: string | number;
  change?: string | number;
  tooltip?: string;
  isPositive?: boolean;
  isNegative?: boolean;
  isPercentage?: boolean;
  isEditing?: boolean;
  onValueChange?: (value: string) => void;
  index?: number;
}

const Metric: React.FC<MetricProps> = React.memo(({ 
  label, 
  value, 
  change, 
  tooltip, 
  isPositive, 
  isNegative,
  isPercentage,
  isEditing,
  onValueChange,
  index = 0
}) => {
  const [editValue, setEditValue] = React.useState(value.toString());
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (onValueChange) {
      onValueChange(editValue);
    }
  };

  return (
    <motion.div 
      className="flex flex-col bg-content2/40 p-2 rounded-lg will-change-transform"
      variants={metricVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      custom={index}
      transition={{ delay: index * 0.1 }}
    >
      <motion.div 
        className="flex items-center gap-1 text-default-600 text-xs font-medium mb-0.5 will-change-transform"
        variants={listItemVariants}
      >
        {label}
        {tooltip && (
          <MobileTooltip content={tooltip}>
            <motion.span
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Icon icon="lucide:info" className="w-3.5 h-3.5 text-default-400" />
            </motion.span>
          </MobileTooltip>
        )}
      </motion.div>
      <motion.div 
        className="flex items-end gap-2"
        variants={listItemVariants}
      >
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Input
                ref={inputRef}
                type="text"
                value={editValue}
                onValueChange={setEditValue}
                onBlur={handleBlur}
                size="sm"
                variant="bordered"
                className="max-w-[100px]"
                classNames={{
                  input: "text-right font-semibold text-base",
                  inputWrapper: "h-7 min-h-unit-7"
                }}
                endContent={isPercentage && <span className="text-default-400 text-sm">%</span>}
              />
            </motion.div>
          ) : (
            <motion.span 
              className="text-lg font-semibold tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isPercentage ? `${value}%` : value}
            </motion.span>
          )}
        </AnimatePresence>
        {change !== undefined && (
          <motion.span 
            className={`text-sm ${isPositive ? 'text-success' : isNegative ? 'text-danger' : 'text-default-500'} flex items-center font-medium`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isPositive && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, delay: 0.3 }}
              >
                <Icon icon="lucide:trending-up" className="w-3 h-3 mr-0.5" />
              </motion.span>
            )}
            {isNegative && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, delay: 0.3 }}
              >
                <Icon icon="lucide:trending-down" className="w-3 h-3 mr-0.5" />
              </motion.span>
            )}
            {isPercentage ? `${change}%` : change}
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  );
});

interface PerformanceMetricsProps {
  trades: Trade[];
  isEditing?: boolean;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ trades, isEditing = false }) => {
  const { portfolioSize, getPortfolioSize } = useTruePortfolioWithTrades(trades);
  const { totalTrades, winRate, avgPosMove, avgNegMove, avgPositionSize, avgHoldingDays, avgR, planFollowed, openPositions, useCashBasis } = useAccountingCalculations(trades);
  const { displayName } = useAccountingMethodDisplay();

  // Calculate remaining metrics not in shared hook
  // Cash percentage - only include open positions, use proper cash basis logic
  let openAndPartialTrades;

  if (useCashBasis) {
    // CRITICAL FIX: Use the same logic as other components for cash basis
    // For cash basis: Get all expanded trades or original trades for open/partial positions
    const openTradesFlat = trades
      .filter(t => t.positionStatus === 'Open' || t.positionStatus === 'Partial')
      .flatMap(trade =>
        Array.isArray(trade._expandedTrades) && trade._expandedTrades.length > 0
          ? trade._expandedTrades.filter(t => t.positionStatus === 'Open' || t.positionStatus === 'Partial')
          : [trade]
      );

    // Group by original ID to avoid double counting
    const tradeGroups = new Map<string, Trade[]>();
    openTradesFlat.forEach(trade => {
      const originalId = trade.id.split('_exit_')[0];
      if (!tradeGroups.has(originalId)) {
        tradeGroups.set(originalId, []);
      }
      tradeGroups.get(originalId)!.push(trade);
    });

    // Use representative trade from each group (they should have same allocation data)
    openAndPartialTrades = Array.from(tradeGroups.entries()).map(([originalId, trades]) => {
      // Use the first trade as representative (they all have the same original allocation data)
      return trades[0];
    });
  } else {
    // For accrual basis: Use trades as-is
    openAndPartialTrades = trades.filter(t => t.positionStatus === 'Open' || t.positionStatus === 'Partial');
  }

  const cashPercentage = 100 - openAndPartialTrades.reduce((sum, t) => {
    // For partial positions, calculate remaining allocation
    const remainingAllocation = t.positionStatus === 'Partial'
      ? (t.allocation || 0) * (t.openQty || 0) / ((t.openQty || 0) + (t.exitedQty || 0))
      : (t.allocation || 0);
    return sum + remainingAllocation;
  }, 0);



  return (
    <div className="space-y-4">

      <motion.div
        className="grid grid-cols-2 gap-4"
        initial="initial"
        animate="animate"
        variants={{
          animate: {
            transition: {
              staggerChildren: 0.05
            }
          }
        }}
      >
      <Metric 
        label="Total Trades" 
        value={totalTrades}
        isEditing={isEditing}
        index={0}
      />
      <Metric 
        label="Win Rate" 
        value={winRate.toFixed(2)}
        isPositive
        isPercentage
        tooltip="Percentage of profitable trades"
        isEditing={isEditing}
        index={1}
      />
      <Metric 
        label="Avg + Move" 
        value={avgPosMove.toFixed(2)}
        isPercentage
        tooltip="Average percentage gain on winning trades"
        isEditing={isEditing}
        index={2}
      />
      <Metric 
        label="Avg - Move" 
        value={avgNegMove.toFixed(2)}
        isPercentage
        tooltip="Average percentage loss on losing trades"
        isEditing={isEditing}
        index={3}
      />
      <Metric 
        label="Avg Position Size" 
        value={avgPositionSize.toFixed(2)}
        isPercentage
        tooltip="Average position size as percentage of portfolio"
        isEditing={isEditing}
        index={4}
      />
      <Metric 
        label="Avg Holding Days" 
        value={avgHoldingDays.toFixed(2)}
        tooltip="Average number of days positions are held"
        isEditing={isEditing}
        index={5}
      />
      <Metric 
        label="Plan Followed" 
        value={planFollowed.toFixed(2)}
        isPercentage
        tooltip="Percentage of trades that followed the trading plan"
        isEditing={isEditing}
        index={6}
      />
      <Metric 
        label="Avg R" 
        value={avgR.toFixed(2)}
        tooltip="Average reward-to-risk ratio across all trades"
        isEditing={isEditing}
        index={7}
      />
      <Metric 
        label="Open Positions" 
        value={openPositions}
        tooltip="Number of currently open positions"
        isEditing={isEditing}
        index={8}
      />
      <Metric 
        label="Cash" 
        value={cashPercentage.toFixed(2)}
        isPercentage
        tooltip="Percentage of portfolio in cash (approximate)"
        isEditing={isEditing}
        index={9}
      />

      </motion.div>
    </div>
  );
};