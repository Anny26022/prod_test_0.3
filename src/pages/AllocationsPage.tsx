import React, { useMemo } from 'react';
import { Card, CardBody, CardHeader, Divider, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { useTrades } from '../hooks/use-trades';
import { useTruePortfolioWithTrades } from '../hooks/use-true-portfolio-with-trades';
import { Icon } from '@iconify/react';

// Assuming Trade type is available from useTrades or a common types file
// import { Trade } from '../types/trade'; 

// Placeholder type if not explicitly imported
interface Trade {
    id: string;
    name: string;
    positionStatus: "Open" | "Closed" | "Partial";
    positionSize: number; // Assuming positionSize is available
}


const AllocationsPage: React.FC = () => {
    const { trades, isLoading } = useTrades();
    const { portfolioSize } = useTruePortfolioWithTrades(trades);

    // Calculate and sort top allocations
    const topAllocations = useMemo(() => {
        if (!trades || trades.length === 0 || !portfolioSize || portfolioSize <= 0) {
            return [];
        }

        const openAndPartialTrades = trades.filter(trade =>
            trade.positionStatus === 'Open' || trade.positionStatus === 'Partial'
        );

        // Calculate allocation for each open/partial trade
        // Assuming allocation is (positionSize / portfolioSize) * 100
        const tradesWithAllocation = openAndPartialTrades.map(trade => ({
            ...trade,
            calculatedAllocation: trade.positionSize && portfolioSize > 0 
                ? (trade.positionSize / portfolioSize) * 100
                : 0
        }));

        // Sort by calculatedAllocation descending
        return tradesWithAllocation.sort((a, b) => b.calculatedAllocation - a.calculatedAllocation);

    }, [trades, portfolioSize]);

    const columns = [
        { key: "name", label: "Stock/Asset" },
        { key: "positionStatus", label: "Status" },
        { key: "positionSize", label: "Position Size (₹)" },
        { key: "calculatedAllocation", label: "Allocation (%)" },
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(value);
      };

    const renderCell = (item: Trade & { calculatedAllocation: number }, columnKey: string) => {
        const cellValue = item[columnKey as keyof typeof item];

        switch (columnKey) {
            case 'positionSize':
                return formatCurrency(cellValue as number);
            case 'calculatedAllocation':
                return `${(cellValue as number).toFixed(2)}%`;
            case 'positionStatus':
                return (
                    <span className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium 
                        ${item.positionStatus === 'Open' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                         item.positionStatus === 'Partial' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
                         'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                    >
                        {cellValue}
                    </span>
                );
            default:
                return String(cellValue);
        }
    };


    return (
        <div className="p-6 space-y-6">
            <Card className="border border-divider">
                <CardHeader className="flex gap-3 items-center">
                    <Icon icon="lucide:pie-chart" className="text-xl text-primary-500" />
                    <div className="flex flex-col">
                        <p className="text-md font-semibold">Top Portfolio Allocations</p>
                        <p className="text-sm text-default-500">Largest open/partial positions by portfolio percentage.</p>
                    </div>
                </CardHeader>
                <Divider/>
                <CardBody className="p-0">
                    <Table
                         aria-label="Top Allocations Table"
                         classNames={{
                            wrapper: "min-h-[222px] p-0",
                            th: "bg-transparent border-b border-divider text-xs font-medium text-default-500 uppercase tracking-wider",
                            td: "py-2.5 text-sm",
                            base: "max-w-full"
                          }}
                    >
                        <TableHeader columns={columns}>
                            {(column) => (
                                <TableColumn key={column.key}>
                                    {column.label}
                                </TableColumn>
                            )}
                        </TableHeader>
                        <TableBody 
                            items={topAllocations} 
                            isLoading={isLoading} 
                            emptyContent={
                                isLoading ? " " : (
                                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                        <div className="text-default-400 mb-2">
                                            <Icon icon="lucide:pie-chart" className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        </div>
                                        <div className="text-default-500 text-base font-medium mb-1">
                                            No open positions
                                        </div>
                                        <div className="text-default-400 text-sm">
                                            Open some trades to see allocation breakdown
                                        </div>
                                    </div>
                                )
                            }
                        >
                            {(item) => (
                                <TableRow key={item.id}>
                                    {columns.map((column) => (
                                        <TableCell key={`${item.id}-${column.key}`}>
                                            {renderCell(item, column.key)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardBody>
            </Card>
        </div>
    );
};

export default AllocationsPage; 