import React from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Spinner, Chip } from '@heroui/react';
import { usePriceTicks } from '../hooks/usePriceTicks';
import { format } from 'date-fns';

interface PriceTickerProps {
  symbol: string;
  maxRows?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export const PriceTicker: React.FC<PriceTickerProps> = ({
  symbol,
  maxRows = 10,
  showHeader = true,
  compact = false
}) => {
  const { priceTicks, latestPrice, loading, error, priceChange, lastUpdated } = usePriceTicks(symbol);

  // Format time to HH:MM:SS
  const formatTime = (dateTime: string) => {
    try {
      return format(new Date(dateTime), 'HH:mm:ss');
    } catch (e) {
      return dateTime;
    }
  };

  // Format price to 2 decimal places
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // Format volume to K or M
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  if (loading && priceTicks.length === 0) {
    return (
      <div className="flex justify-center items-center p-4">
        <Spinner size="sm" />
        <span className="ml-2">Loading {symbol}...</span>
      </div>
    );
  }


  if (error) {
    return (
      <div className="p-2 text-red-500 text-sm">
        Error loading {symbol}: {error.message}
      </div>
    );
  }

  if (priceTicks.length === 0) {
    return <div className="p-2 text-gray-500 text-sm">No data available for {symbol}</div>;
  }

  // Get the most recent ticks up to maxRows
  const displayTicks = [...priceTicks].slice(-maxRows).reverse();

  return (
    <div className={`w-full ${!compact ? 'border rounded-lg overflow-hidden' : ''}`}>
      {showHeader && (
        <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
          <div className="flex items-center">
            <span className="font-medium">{symbol}</span>
            {latestPrice && (
              <span className="ml-2 font-medium">{formatPrice(latestPrice.close)}</span>
            )}
            {!isNaN(priceChange) && (
              <Chip
                size="sm"
                color={priceChange >= 0 ? 'success' : 'danger'}
                variant="flat"
                className="ml-2"
              >
                {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
              </Chip>
            )}
          </div>
          {lastUpdated && (
            <div className="text-xs text-gray-500">
              {format(lastUpdated, 'HH:mm:ss')}
            </div>
          )}
        </div>
      )}
      
      <div className="overflow-x-auto">
        <Table removeWrapper aria-label="Price Ticks" className="min-w-full">
          <TableHeader>
            <TableColumn width="25%">TIME</TableColumn>
            <TableColumn width="15%" className="text-right">PRICE</TableColumn>
            {!compact && (
              <>
                <TableColumn width="15%" className="text-right">VOL</TableColumn>
                <TableColumn width="15%" className="text-right">CHG</TableColumn>
              </>
            )}
          </TableHeader>
          <TableBody>
            {displayTicks.map((tick, index) => {
              const isUp = tick.close > tick.open;
              const change = tick.close - tick.open;
              const changePercent = (change / tick.open) * 100;
              
              return (
                <TableRow key={`${tick.dateTime}-${index}`}>
                  <TableCell className="text-xs">{formatTime(tick.dateTime)}</TableCell>
                  <TableCell className={`text-right font-medium ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPrice(tick.close)}
                  </TableCell>
                  {!compact && (
                    <>
                      <TableCell className="text-right text-xs text-gray-500">
                        {formatVolume(tick.volume)}
                      </TableCell>
                      <TableCell className={`text-right text-xs font-medium ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PriceTicker;
