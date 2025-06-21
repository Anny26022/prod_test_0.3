per lseek import React from "react";
import { Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { Trade } from "../../types/trade";
import { useTrades } from "../../hooks/use-trades";
import { useAccountingCalculations, useAccountingMethodDisplay } from "../../hooks/use-accounting-calculations";

export const TaxMetricsCards: React.FC<{ isEditMode: boolean }> = ({ isEditMode }) => {
  const { trades } = useTrades();
  const {
    totalTrades,
    winRate,
    grossPL,
    useCashBasis,
    maxCumulativePerformance,
    minCumulativePerformance,
    maxDrawdown,
    currentCumulativePerformance
  } = useAccountingCalculations(trades);
  const { displayName, description } = useAccountingMethodDisplay();

  // If you have taxes in Trade, subtract here. For now, netPL = grossPL
  const netPL = grossPL;

  // Helper function to format drawdown display
  const formatDrawdown = (drawdown: number) => {
    if (drawdown === 0) {
      return "🚀 Hurray! Flying high";
    }
    return `${drawdown.toFixed(2)}%`;
  };
  return (
    <div className="space-y-4">
      {/* Portfolio Performance Metrics - Accounting Method Aware */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-lg font-semibold text-foreground-700 dark:text-foreground-300">
            Portfolio Performance
          </h3>
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            useCashBasis
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
          }`}>
            {useCashBasis ? 'Cash Basis' : 'Accrual Basis'}
          </span>
        </div>
        <p className="text-sm text-foreground-500 dark:text-foreground-400 mb-4">
          {useCashBasis
            ? "Portfolio performance calculated based on trade exit dates (when P/L is realized)"
            : "Portfolio performance calculated based on trade entry dates (including unrealized P/L)"
          }
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Max Cumm PF"
            value={`${maxCumulativePerformance.toFixed(2)}%`}
            icon="lucide:trending-up"
            color="success"
            change=""
            isPositive={maxCumulativePerformance >= 0}
            isEditMode={isEditMode}
          />
          <MetricCard
            title="Min Cumm PF"
            value={`${minCumulativePerformance.toFixed(2)}%`}
            icon="lucide:trending-down"
            color="danger"
            change=""
            isPositive={minCumulativePerformance >= 0}
            isEditMode={isEditMode}
          />
          <MetricCard
            title="Drawdown"
            value={formatDrawdown(maxDrawdown)}
            icon={maxDrawdown === 0 ? "lucide:rocket" : "lucide:arrow-down"}
            color={maxDrawdown === 0 ? "success" : "warning"}
            change=""
            isPositive={maxDrawdown === 0}
            isEditMode={isEditMode}
          />
          <MetricCard
            title="Current PF"
            value={`${currentCumulativePerformance.toFixed(2)}%`}
            icon="lucide:bar-chart-3"
            color="primary"
            change=""
            isPositive={currentCumulativePerformance >= 0}
            isEditMode={isEditMode}
          />
        </div>
      </div>

      {/* Trade Statistics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-foreground-700 dark:text-foreground-300">
          Trade Statistics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Trades"
          value={totalTrades.toString()}
          icon="lucide:activity"
          color="primary"
          change=""
          isPositive={true}
          isEditMode={isEditMode}
        />
        <MetricCard
          title="Win Rate"
          value={winRate.toFixed(2) + '%'}
          icon="lucide:target"
          color="success"
          change=""
          isPositive={true}
          isEditMode={isEditMode}
        />
        <MetricCard
          title="Gross P/L"
          value={grossPL.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })}
          icon="lucide:trending-up"
          color="warning"
          change=""
          isPositive={grossPL >= 0}
          isEditMode={isEditMode}
        />
        <MetricCard
          title="Net P/L"
          value={netPL.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })}
          icon="lucide:wallet"
          color="secondary"
          change=""
          isPositive={netPL >= 0}
          isEditMode={isEditMode}
        />
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: "primary" | "success" | "warning" | "secondary" | "danger";
  change: string;
  isPositive: boolean;
  isEditMode: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  change, 
  isPositive,
  isEditMode
}) => {
  const [editValue, setEditValue] = React.useState(value);
  
  React.useEffect(() => {
    setEditValue(value);
  }, [value]);
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <Card className="overflow-visible">
        <CardBody className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-default-500 text-sm mb-1">{title}</p>
              {isEditMode ? (
                <input
                  className="bg-transparent border-b border-primary-500 text-xl font-semibold focus:outline-none w-full"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
              ) : (
                <p className="text-xl font-semibold">{value}</p>
              )}
              <div className={`flex items-center mt-2 text-xs ${isPositive ? 'text-success' : 'text-danger'}`}>
                <Icon icon={isPositive ? "lucide:trending-up" : "lucide:trending-down"} className="mr-1" />
                <span>{change} from last month</span>
              </div>
            </div>
            <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-500`}>
              <Icon icon={icon} className="text-xl" />
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};