import React from "react";
import { Tooltip, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { Trade } from "../../types/trade";
import { calcWeightedRewardRisk } from '../../utils/tradeCalculations';
import { useAccountingCalculations, useAccountingMethodDisplay } from "../../hooks/use-accounting-calculations";
import MobileTooltip from "../ui/MobileTooltip";

interface StatProps {
  label: string;
  value: string | number;
  tooltip?: string;
  isPercentage?: boolean;
  index?: number;
}

const Stat: React.FC<StatProps> = ({ label, value, tooltip, isPercentage, index = 0 }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value.toString());
  const [isHovered, setIsHovered] = React.useState(false);
  
  return (
    <motion.div 
      className="relative overflow-hidden rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: isHovered ? "0%" : "-100%" }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />
      
      <motion.div 
        className="relative flex justify-between items-center p-3 bg-content2 dark:bg-gray-900 border border-foreground-200/10 dark:border-gray-800"
        whileHover={{ x: 4 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground-700 dark:text-gray-300">
            {label}
          </span>
          {tooltip && (
            <MobileTooltip
              content={tooltip}
              classNames={{
                base: "py-2 px-4 shadow-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800",
                content: "text-sm text-foreground-700 dark:text-gray-300"
              }}
            >
              <motion.span
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="cursor-help"
              >
                <Icon icon="lucide:info" className="w-4 h-4 text-foreground-400 dark:text-gray-500" />
              </motion.span>
            </MobileTooltip>
          )}
        </div>
        
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <Input
                size="sm"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
                autoFocus
                classNames={{
                  inputWrapper: "h-8 min-h-unit-8 bg-white dark:bg-gray-900",
                  input: "text-sm font-medium text-right dark:text-white"
                }}
                endContent={isPercentage && 
                  <span className="text-foreground-400 dark:text-gray-400 text-sm">%</span>
                }
              />
            </motion.div>
          ) : (
            <motion.div 
              className="font-semibold text-sm cursor-pointer text-foreground-800 dark:text-white"
              onClick={() => setIsEditing(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              layout
            >
              {isPercentage ? `${value}%` : value}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

interface TradeStatisticsProps {
  trades: Trade[];
}

export const TradeStatistics: React.FC<TradeStatisticsProps> = ({ trades }) => {
  const { displayName } = useAccountingMethodDisplay();

  // Use accounting-aware calculations from the shared hook
  const {
    totalTrades,
    winRate,
    avgPosMove,
    avgNegMove,
    avgPositionSize,
    avgHoldingDays,
    avgR
  } = useAccountingCalculations(trades);

  return (
    <div className="space-y-4">

      <div className="space-y-2">
        <Stat
          label="Win %"
          value={winRate.toFixed(2)}
          isPercentage
          tooltip="Percentage of profitable trades in the last 12 months"
          index={0}
        />
        <Stat
          label="Avg Gain"
          value={avgPosMove.toFixed(2)}
          isPercentage
          tooltip="Average percentage gain on winning trades"
          index={1}
        />
        <Stat
          label="Avg Loss"
          value={avgNegMove.toFixed(2)}
          isPercentage
          tooltip="Average percentage loss on losing trades"
          index={2}
        />
        <Stat
          label="Avg Position Size"
          value={avgPositionSize.toFixed(2)}
          isPercentage
          tooltip="Average position size as percentage of portfolio"
          index={3}
        />
        <Stat
          label="Avg Holding Days"
          value={avgHoldingDays.toFixed(2)}
          tooltip="Average number of days positions are held"
          index={4}
        />
        <Stat
          label="Avg R:R"
          value={avgR.toFixed(2)}
          tooltip="Average reward-to-risk ratio across all trades (weighted, matches dashboard logic)"
          index={5}
        />
      </div>
    </div>
  );
};