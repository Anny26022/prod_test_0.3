import React from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { Card, Tooltip } from "@heroui/react";
import { motion } from "framer-motion";
import { formatCurrency } from "../../utils/formatters";
import { useAccountingMethod } from "../../context/AccountingMethodContext";
import { calculateTradePL, getTradeDateForAccounting } from "../../utils/accountingUtils";
import MobileTooltip from "../ui/MobileTooltip";

interface TradeHeatmapProps {
  trades: any[];
  startDate: string;
  endDate: string;
  className?: string;
}

const TradeHeatmap: React.FC<TradeHeatmapProps> = ({ trades, startDate, endDate, className }) => {
  const { accountingMethod } = useAccountingMethod();
  const useCashBasis = accountingMethod === 'cash';

  // Aggregate P&L by date using accounting method-aware dates
  const data = trades.reduce((acc, trade) => {
    try {
      // Use accounting method-aware date for aggregation
      const relevantDate = getTradeDateForAccounting(trade, useCashBasis);
      if (!relevantDate) {
        return acc;
      }

      const day = relevantDate.split("T")[0];
      if (!day.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return acc;
      }

      // Calculate P/L based on accounting method - use the same logic as other working components
      let tradePL = 0;

      if (!useCashBasis) {
        // Accrual basis: Use multiple fallbacks like other components
        tradePL = trade.plRs ?? trade.realisedAmount ?? 0;

        // If still 0, try to calculate from trade data for closed positions
        if (tradePL === 0 && (trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial')) {
          const avgEntry = trade.avgEntry || trade.entry || 0;
          const avgExit = trade.avgExitPrice || 0;
          const exitedQty = trade.exitedQty || 0;

          if (avgEntry > 0 && avgExit > 0 && exitedQty > 0) {
            tradePL = trade.buySell === 'Buy'
              ? (avgExit - avgEntry) * exitedQty
              : (avgEntry - avgExit) * exitedQty;
          }
        }
      } else {
        // Cash basis: Use the existing function
        tradePL = calculateTradePL(trade, useCashBasis);
      }

      // For cash basis, we want to aggregate all exits on the same date
      // This is intentional behavior - multiple exits on same date should sum up
      // No deduplication needed here as we want the total P/L impact per day
      acc[day] = (acc[day] || 0) + tradePL;

      return acc;
    } catch (error) {
      return acc;
    }
  }, {} as Record<string, number>);

  // Convert to heatmap format
  const values = Object.keys(data).map(date => ({
    date,
    count: data[date],
  }));



  // Convert string dates to Date objects for CalendarHeatmap
  // Handle invalid date formats and provide fallbacks
  let startDateObj: Date;
  let endDateObj: Date;

  // Helper function to create a valid Date object
  const createValidDate = (dateStr: string, fallback: string): Date => {
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(dateStr + 'T00:00:00.000Z');
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return new Date(fallback + 'T00:00:00.000Z');
  };

  // Get fallback dates from actual trade data
  const tradeDatesArray = Object.keys(data).filter(date => date.match(/^\d{4}-\d{2}-\d{2}$/)).sort();
  const earliestTradeDate = tradeDatesArray[0] || '2024-01-01';
  const latestTradeDate = tradeDatesArray[tradeDatesArray.length - 1] || new Date().toISOString().split('T')[0];



  // Create start date with validation
  startDateObj = createValidDate(startDate, earliestTradeDate);

  // Create end date with validation
  endDateObj = createValidDate(endDate, latestTradeDate);



  // Validate the final Date objects before using them
  if (isNaN(startDateObj.getTime())) {
    startDateObj = new Date('2024-01-01T00:00:00.000Z');
  }

  if (isNaN(endDateObj.getTime())) {
    endDateObj = new Date('2024-12-31T23:59:59.999Z');
  }

  // Custom transformDayElement to add hover effects and better styling
  const transformDayElement = (element: React.ReactElement, value: any) => {
    if (!value) return element;

    const formattedDate = new Date(value.date).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return (
      <MobileTooltip
        key={value.date}
        content={
          <div className="p-2 text-sm">
            <p className="font-medium">{formattedDate}</p>
            <p className={`mt-1 ${value.count >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
              {formatCurrency(value.count)}
            </p>
          </div>
        }
        delay={0}
        closeDelay={0}
      >
        <motion.g
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {React.cloneElement(element, {
            ...element.props,
            key: value ? value.date : `empty-${element.props.x}-${element.props.y}`,
            rx: 2,
            className: `${element.props.className} cursor-pointer`,
          })}
        </motion.g>
      </MobileTooltip>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <style>{`
        .react-calendar-heatmap {
          width: 100%;
          height: 100%;
        }
        .react-calendar-heatmap text {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 0.8rem;
          fill: var(--foreground-500);
        }
        .react-calendar-heatmap rect {
          rx: 2;
          ry: 2;
          height: 15px;
          width: 15px;
          stroke: white;
          stroke-width: 1.5px;
          opacity: 1;
        }
        .react-calendar-heatmap .color-empty {
          fill: #f3f4f6;
        }
        /* Loss colors - from light to dark red */
        .color-scale-1 { fill: #fecaca; }
        .color-scale-2 { fill: #ef4444; }
        /* Profit colors - from light to dark green */
        .color-scale-3 { fill: #bbf7d0; }
        .color-scale-4 { fill: #22c55e; }
        .react-calendar-heatmap-month-label,
        .react-calendar-heatmap-weekday-label {
          font-size: 0.8rem;
          font-weight: 500;
          fill: var(--foreground-500);
        }
        /* Fix spacing and alignment */
        .react-calendar-heatmap .react-calendar-heatmap-all-weeks {
          transform: translateY(35px);
        }
        .react-calendar-heatmap-month-labels {
          transform: translateY(0px);
        }
        .react-calendar-heatmap-weekday-labels {
          transform: translateX(-20px);
        }
        .react-calendar-heatmap-month-label {
          letter-spacing: -0.5px;
        }
      `}</style>
      <div className="relative h-[230px] pt-4">
        <CalendarHeatmap
          startDate={startDateObj}
          endDate={endDateObj}
          values={values}
          classForValue={value => {
            if (!value) return "color-empty";
            const count = value.count;
            if (count > 0) {
              return count > 5000 ? "color-scale-4" : "color-scale-3";
            }
            return count < -5000 ? "color-scale-2" : "color-scale-1";
          }}
          transformDayElement={transformDayElement}
          showWeekdayLabels={true}
          weekdayLabels={['M', 'W', 'F']}
          horizontal={true}
          gutterSize={5}
          monthLabels={[
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
          ]}
        />
      </div>
    </div>
  );
};

export default TradeHeatmap; 