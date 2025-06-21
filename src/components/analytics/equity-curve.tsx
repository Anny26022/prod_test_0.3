import React from 'react';
import { Select, SelectItem, Card, CardBody } from '@heroui/react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { calcXIRR } from '../../utils/tradeCalculations';
import { useTrades } from '../../hooks/use-trades';
import { useTruePortfolioWithTrades } from '../../hooks/use-true-portfolio-with-trades';
import { useAccountingMethod } from '../../context/AccountingMethodContext';
import { calculateTradePL } from '../../utils/accountingUtils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface DateRange {
  label: string;
  value: string;
  days: number;
}

const dateRanges: DateRange[] = [
  { label: '1 Day', value: '1D', days: 1 },
  { label: '1 Week', value: '1W', days: 7 },
  { label: '1 Month', value: '1M', days: 30 },
  { label: '3 Months', value: '3M', days: 90 },
  { label: '6 Months', value: '6M', days: 180 },
  { label: 'Year to Date', value: 'YTD', days: 0 },
  { label: 'Financial Year', value: 'FY', days: 0 },
  { label: 'All Time', value: 'ALL', days: 0 }
];

export const EquityCurve: React.FC = () => {
  const { trades } = useTrades();
  const { accountingMethod } = useAccountingMethod();
  const useCashBasis = accountingMethod === 'cash';
  const { portfolioSize, getAllMonthlyTruePortfolios } = useTruePortfolioWithTrades(trades);
  const monthlyPortfolios = getAllMonthlyTruePortfolios();
  const [selectedRange, setSelectedRange] = React.useState<string>('1M');
  const [xirrValue, setXirrValue] = React.useState<number>(0);

  // Get date range based on selection
  const getDateRange = React.useCallback(() => {
    const now = new Date();
    const range = dateRanges.find(r => r.value === selectedRange);
    
    if (!range) return { start: now, end: now };

    let start = new Date();
    
    switch (range.value) {
      case 'YTD':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'FY':
        // Indian Financial Year (April to March)
        const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        start = new Date(fyYear, 3, 1); // April 1st
        break;
      case 'ALL':
        // Find earliest trade date
        const allDates = trades.map(t => new Date(t.date));
        if (allDates.length > 0) {
          start = new Date(Math.min(...allDates.map(d => d.getTime())));
        } else {
          start = new Date(now.getFullYear(), 0, 1); // Default to start of year
        }
        break;
      default:
        start = new Date(now.getTime() - (range.days * 24 * 60 * 60 * 1000));
    }

    return { start, end: now };
  }, [selectedRange, trades, monthlyPortfolios]);

  // Calculate equity curve data points
  const calculateEquityCurve = React.useCallback(() => {
    const { start, end } = getDateRange();

    // For cash basis, deduplicate trades to avoid double counting
    let filteredTrades = trades.filter(t => {
      const date = new Date(t.date);
      return date >= start && date <= end;
    });

    if (useCashBasis) {
      const seenTradeIds = new Set();
      filteredTrades = filteredTrades.filter(trade => {
        const originalId = trade.id.split('_exit_')[0];
        if (seenTradeIds.has(originalId)) return false;
        seenTradeIds.add(originalId);
        return true;
      });
    }

    // Get all relevant events (trades and capital changes) within date range
    const events = [
      ...filteredTrades
        .map(t => ({
          date: new Date(t.date),
          amount: calculateTradePL(t, useCashBasis),
          type: 'trade' as const
        })),
      // Capital changes are now integrated into monthly portfolios
      // We'll use the monthly portfolio data to get capital changes
      ...monthlyPortfolios
        .filter(mp => {
          const monthDate = new Date(mp.year, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(mp.month), 1);
          return monthDate >= start && monthDate <= end && mp.capitalChanges !== 0;
        })
        .map(mp => ({
          date: new Date(mp.year, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(mp.month), 1),
          amount: mp.capitalChanges,
          type: 'capital' as const
        }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance
    let balance = portfolioSize;
    const dataPoints = events.map(event => {
      balance += event.amount;
      return {
        x: event.date,
        y: balance
      };
    });

    // Add starting and ending points if needed
    if (dataPoints.length === 0 || dataPoints[0].x > start) {
      dataPoints.unshift({ x: start, y: portfolioSize });
    }
    if (dataPoints[dataPoints.length - 1].x < end) {
      dataPoints.push({ x: end, y: balance });
    }

    // Calculate XIRR
    const xirrResult = calcXIRR(
      start,
      portfolioSize,
      end,
      balance,
      events.map(e => ({ date: e.date, amount: e.amount }))
    );
    setXirrValue(xirrResult);

    return dataPoints;
  }, [getDateRange, trades, monthlyPortfolios, portfolioSize, useCashBasis]);

  const chartData = React.useMemo(() => {
    const dataPoints = calculateEquityCurve();
    
    return {
      datasets: [
        {
          label: 'Portfolio Value',
          data: dataPoints,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: false
        }
      ]
    };
  }, [calculateEquityCurve]);

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day'
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Portfolio Value (₹)'
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Portfolio Equity Curve'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `Portfolio Value: ₹${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    }
  };

  const handleRangeChange = (value: string) => {
    setSelectedRange(value);
  };

  return (
    <Card className="w-full">
      <CardBody>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <Select
              label="Time Period"
              selectedKeys={[selectedRange]}
              onChange={(e) => handleRangeChange(e.target.value)}
              className="w-48"
            >
              {dateRanges.map((range) => (
                <SelectItem key={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground-600">XIRR:</span>
              <span className={`text-lg font-semibold ${xirrValue >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {xirrValue.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="h-[400px]">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}; 