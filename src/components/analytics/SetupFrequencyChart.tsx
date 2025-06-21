import React, { useMemo } from 'react';
import { Trade } from '../../types/trade';
import { Card, CardBody, CardHeader, Divider } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useAccountingMethod } from '../../context/AccountingMethodContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell
} from 'recharts';

interface SetupFrequencyChartProps {
  trades: Trade[];
}

const chartColors = [
  '#4A8DFF', '#34D399', '#FF6B6B', '#FFC107', '#A78BFA', 
  '#56B4E9', '#009E73', '#F0E442', '#E69F00', '#D55E00'
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2.5 bg-background border border-divider shadow-lg rounded-lg">
          <p className="text-sm font-bold text-foreground">{label}</p>
          <p className="text-xs text-foreground-600">Frequency: {payload[0].value}</p>
        </div>
      );
    }
    return null;
};

const SetupFrequencyChart: React.FC<SetupFrequencyChartProps> = ({ trades }) => {
  const { accountingMethod } = useAccountingMethod();
  const useCashBasis = accountingMethod === 'cash';

  const chartData = useMemo(() => {
    // For cash basis, deduplicate trades to avoid double counting
    let uniqueTrades = trades;
    if (useCashBasis) {
      const seenTradeIds = new Set();
      uniqueTrades = trades.filter(trade => {
        const originalId = trade.id.split('_exit_')[0];
        if (seenTradeIds.has(originalId)) return false;
        seenTradeIds.add(originalId);
        return true;
      });
    }

    const setupCounts: { [key: string]: number } = {};
    uniqueTrades.forEach(trade => {
      if (trade.setup) {
        setupCounts[trade.setup] = (setupCounts[trade.setup] || 0) + 1;
      }
    });

    return Object.entries(setupCounts)
      .map(([name, count], index) => ({
        name,
        count,
        fill: chartColors[index % chartColors.length]
      }))
      .sort((a, b) => b.count - a.count);

  }, [trades, useCashBasis]);

  return (
    <Card className="border-divider bg-background">
      <CardHeader>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Icon icon="lucide:pie-chart" className="text-primary" />
            Trade Setup Analysis
          </h2>
      </CardHeader>
      <Divider/>
      <CardBody className="p-4 sm:p-6">
        {chartData.length > 0 ? (
             <motion.div 
                style={{ height: '350px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
             >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={80}
                            tick={{ fontSize: 12, fill: '#11181C' }} // Light mode foreground
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                        />
                        <RechartsTooltip
                            cursor={{ fill: 'transparent' }}
                            content={<CustomTooltip />}
                            trigger="click"
                        />
                        <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                            {chartData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </motion.div>
        ) : (
            <div className="text-center text-foreground-500 h-[350px] flex items-center justify-center">
                No setup data available from trades.
            </div>
        )}
      </CardBody>
    </Card>
  );
};

export default SetupFrequencyChart;