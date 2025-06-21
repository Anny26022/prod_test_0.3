import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from "recharts";
import { motion } from "framer-motion";
import { useTrades } from "../../hooks/use-trades";
import { useTruePortfolioWithTrades } from "../../hooks/use-true-portfolio-with-trades";
import { useAccountingMethod } from "../../context/AccountingMethodContext";



const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Custom animated tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="bg-background border border-divider p-4 rounded-lg shadow-lg"
        style={{
          backgroundColor: "hsl(var(--heroui-content1))",
          border: "1px solid hsl(var(--heroui-divider))",
          borderRadius: "8px",
          padding: "8px 12px"
        }}
      >
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-foreground-600">{entry.name}:</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              {entry.name === "P/L %" ? `${entry.value.toFixed(2)}%` : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </motion.div>
    );
  }
  return null;
};

interface TaxSummaryChartProps {
  taxesByMonth: { [month: string]: number };
}

export const TaxSummaryChart: React.FC<TaxSummaryChartProps> = ({ taxesByMonth }) => {
  const { trades } = useTrades();
  const { accountingMethod } = useAccountingMethod();
  const useCashBasis = accountingMethod === 'cash';
  const { getPortfolioSize, getAllMonthlyTruePortfolios } = useTruePortfolioWithTrades(trades);

  // Use the EXACT same logic as Monthly Performance table
  const currentYear = new Date().getFullYear();
  const shortMonthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Get all monthly portfolio data (same as Monthly Performance table)
  const monthlyPortfolios = getAllMonthlyTruePortfolios(trades, useCashBasis);
  const filteredMonthlyPortfolios = monthlyPortfolios.filter(mp => mp.year === currentYear);

  // Output months in calendar order - use same logic as Monthly Performance table
  const chartData = shortMonthOrder.map(month => {
    const longMonth = {
      Jan: "January", Feb: "February", Mar: "March", Apr: "April",
      May: "May", Jun: "June", Jul: "July", Aug: "August",
      Sep: "September", Oct: "October", Nov: "November", Dec: "December"
    }[month];

    // Find corresponding monthly portfolio data (EXACT same logic as Monthly Performance table)
    const monthPortfolio = filteredMonthlyPortfolios.find(mp => mp.month === month) || {
      month,
      year: currentYear,
      startingCapital: 0,
      capitalChanges: 0,
      pl: 0,
      finalCapital: 0
    };
    const grossPL = monthPortfolio.pl; // This uses the correct accounting method
    const taxes = taxesByMonth[longMonth || ""] || 0;
    const netPL = grossPL - taxes;
    const portfolioSize = getPortfolioSize(month, currentYear, trades, useCashBasis);
    const plPercent = portfolioSize > 0 ? (grossPL / portfolioSize) * 100 : 0;

    return {
      month,
      grossPL,
      netPL,
      taxes,
      plPercent
    };
  });

  return (
    <motion.div
      className="h-[350px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--heroui-divider))" />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            yAxisId="left"
            tickFormatter={(value) => formatCurrency(value)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `${value}%`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'transparent' }}
          />
          <Legend />
          <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--heroui-divider))" />
          <Bar
            yAxisId="left"
            dataKey="grossPL"
            name="Gross P/L"
            fill="hsl(var(--heroui-primary-500))"
            radius={[4, 4, 0, 0]}
            barSize={20}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Bar
            yAxisId="left"
            dataKey="netPL"
            name="Net P/L"
            fill="hsl(var(--heroui-success-500))"
            radius={[4, 4, 0, 0]}
            barSize={20}
            animationBegin={200}
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Bar
            yAxisId="left"
            dataKey="taxes"
            name="Taxes"
            fill="hsl(var(--heroui-danger-500))"
            radius={[4, 4, 0, 0]}
            barSize={20}
            animationBegin={400}
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="plPercent"
            name="P/L %"
            stroke="hsl(var(--heroui-warning-500))"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            animationBegin={600}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
};