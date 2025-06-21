import React, { useMemo } from 'react';
import { Card, CardBody, CardHeader, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trade } from '../../types/trade';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccountingCalculations, useAccountingMethodDisplay } from '../../hooks/use-accounting-calculations';

interface PnLDistributionChartsProps {
    trades: Trade[];
}

const PnLDistributionCharts: React.FC<PnLDistributionChartsProps> = ({ trades }) => {
    const { tradesWithAccountingPL } = useAccountingCalculations(trades);
    const { displayName } = useAccountingMethodDisplay();

    // Calculate PnL by Symbol using accounting method
    const symbolPnLData = useMemo(() => {
        const pnlBySymbol = tradesWithAccountingPL.reduce((acc, trade) => {
            if (trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial') {
                const symbol = trade.name;
                acc[symbol] = (acc[symbol] || 0) + trade.accountingPL;
            }
            return acc;
        }, {} as Record<string, number>);

        // Convert to array and sort by PnL descending
        return Object.entries(pnlBySymbol)
            .map(([symbol, pnl]) => ({ symbol, pnl }))
            .sort((a, b) => b.pnl - a.pnl)
            .slice(0, 10); // Top 10 symbols
    }, [tradesWithAccountingPL]);

    // Calculate PnL by Day of Week using accounting method
    const dayPnLData = useMemo(() => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const pnlByDay = tradesWithAccountingPL.reduce((acc, trade) => {
            if ((trade.positionStatus === 'Closed' || trade.positionStatus === 'Partial') && trade.date) {
                const dayIndex = new Date(trade.date).getDay();
                const day = days[dayIndex];
                acc[day] = (acc[day] || 0) + trade.accountingPL;
            }
            return acc;
        }, {} as Record<string, number>);

        // Convert to array maintaining day order
        return days.map(day => ({
            day,
            pnl: pnlByDay[day] || 0
        }));
    }, [tradesWithAccountingPL]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-background border border-divider p-4 rounded-lg shadow-lg"
                >
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className={`text-sm font-semibold mt-1.5 ${payload[0].value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(payload[0].value)}
                    </p>
                </motion.div>
            );
        }
        return null;
    };

    // Common chart configurations
    const chartConfig = {
        barSize: 28,
        barGap: 0.2,
        style: {
            fontFamily: 'var(--font-sans)',
            backgroundColor: 'transparent'
        }
    };

    const getBarColor = (value: number) => {
        return value >= 0 ? "#10b981" : "#ef4444";
    };

    // Animation variants for Framer Motion
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15
            }
        }
    };

    return (
        <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Accounting Method Indicator */}
            <div className="flex items-center gap-2 text-sm text-default-600 bg-default-50 p-3 rounded-lg">
                <Icon icon="lucide:bar-chart-3" className="w-4 h-4" />
                <span>P/L distributions calculated using {displayName} Accounting</span>
            </div>
            {/* Symbol-wise PnL Chart */}
            <motion.div variants={cardVariants}>
                <Card className="border border-divider shadow-sm hover:shadow-md transition-shadow duration-200 bg-background">
                    <CardHeader className="px-6 py-5">
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold text-foreground">Aggregate PnL vs Symbol</h3>
                            <p className="text-sm text-default-500 mt-1">Top 10 symbols by P&L (Descending)</p>
                        </div>
                    </CardHeader>
                    <Divider/>
                    <CardBody className="px-6 py-5">
                        <div className="h-[320px] bg-background">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={symbolPnLData} 
                                    margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
                                    barSize={chartConfig.barSize}
                                    barGap={chartConfig.barGap}
                                    style={chartConfig.style}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="hsl(var(--heroui-divider))"
                                        opacity={0.5}
                                    />
                                    <XAxis
                                        dataKey="symbol"
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                        interval={0}
                                        tick={{ fill: 'hsl(var(--heroui-foreground))', fontSize: 12 }}
                                        axisLine={{ stroke: 'hsl(var(--heroui-divider))' }}
                                    />
                                    <YAxis
                                        tickFormatter={formatCurrency}
                                        tick={{ fill: 'hsl(var(--heroui-foreground))', fontSize: 12 }}
                                        axisLine={{ stroke: 'hsl(var(--heroui-divider))' }}
                                    />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ fill: 'hsl(var(--heroui-content2))', opacity: 0.1 }}
                                    />
                                    <Bar 
                                        dataKey="pnl" 
                                        name="P&L"
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1000}
                                        animationBegin={0}
                                    >
                                        {symbolPnLData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={getBarColor(entry.pnl)}
                                                fillOpacity={0.9}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardBody>
                </Card>
            </motion.div>

            {/* Day-wise PnL Chart */}
            <motion.div variants={cardVariants}>
                <Card className="border border-divider shadow-sm hover:shadow-md transition-shadow duration-200 bg-background">
                    <CardHeader className="px-6 py-5">
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold text-foreground">Aggregate PnL vs Day</h3>
                            <p className="text-sm text-default-500 mt-1">P&L distribution across weekdays</p>
                        </div>
                    </CardHeader>
                    <Divider/>
                    <CardBody className="px-6 py-5">
                        <div className="h-[320px] bg-background">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={dayPnLData} 
                                    margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                                    barSize={chartConfig.barSize}
                                    barGap={chartConfig.barGap}
                                    style={chartConfig.style}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="hsl(var(--heroui-divider))"
                                        opacity={0.5}
                                    />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fill: 'hsl(var(--heroui-foreground))', fontSize: 12 }}
                                        axisLine={{ stroke: 'hsl(var(--heroui-divider))' }}
                                    />
                                    <YAxis
                                        tickFormatter={formatCurrency}
                                        tick={{ fill: 'hsl(var(--heroui-foreground))', fontSize: 12 }}
                                        axisLine={{ stroke: 'hsl(var(--heroui-divider))' }}
                                    />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ fill: 'hsl(var(--heroui-content2))', opacity: 0.1 }}
                                    />
                                    <Bar 
                                        dataKey="pnl" 
                                        name="P&L"
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1000}
                                        animationBegin={0}
                                    >
                                        {dayPnLData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={getBarColor(entry.pnl)}
                                                fillOpacity={0.9}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardBody>
                </Card>
            </motion.div>
        </motion.div>
    );
};

export default PnLDistributionCharts; 