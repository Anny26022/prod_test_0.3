import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  useDisclosure,
  Tooltip,
  Pagination,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Chip,
  Card,
  CardBody,
  User,
  SortDescriptor as HeroSortDescriptor,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Textarea
} from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { TradeModal } from "./trade-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";
import { TradeUploadModal } from "./TradeUploadModal";
import { useTrades, SortDescriptor } from "../hooks/use-trades";
import { format } from 'date-fns';
import { useTruePortfolioWithTrades } from "../hooks/use-true-portfolio-with-trades";
import { tableRowVariants, springTransition } from "../utils/animations";
import { calcSLPercent, calcHoldingDays, calcUnrealizedPL, calcRealizedPL_FIFO, calcOpenHeat, calcIndividualMoves, calcTradeOpenHeat } from "../utils/tradeCalculations";
import { fetchPriceTicks, fetchPriceTicksWithFallback, fetchPriceTicksWithHistoricalFallback, fetchPriceTicksSmart } from '../utils/priceTickApi';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useAccountingMethod } from "../context/AccountingMethodContext";
import { calculateTradePL } from "../utils/accountingUtils";
import { getFromLocalStorage, setToLocalStorage, getFromIndexedDB, setToIndexedDB } from "../utils/helpers";
import { useAccountingCalculations } from "../hooks/use-accounting-calculations";
import { formatCurrency as standardFormatCurrency, formatDate as standardFormatDate } from "../utils/formatters";
// Removed Supabase import - using localStorage only

// IndexedDB helpers for misc data using Dexie
import { DatabaseService } from '../db/database';

async function fetchMiscData(key: string) {
  try {
    return await DatabaseService.getMiscData(`misc_${key}`);
  } catch (error) {
    console.error('❌ Error fetching misc data from IndexedDB:', error);
    return null;
  }
}

async function saveMiscData(key: string, value: any): Promise<boolean> {
  try {
    return await DatabaseService.saveMiscData(`misc_${key}`, value);
  } catch (error) {
    console.error('❌ Error saving misc data to IndexedDB:', error);
    return false;
  }
}

const csvUrl = '/name_sector_industry.csv';

// Use standard formatters for consistency
const formatDate = standardFormatDate;
const formatCurrency = (value: number) => {
  // Remove the ₹ symbol from standard formatter since we add it separately
  return standardFormatCurrency(value).replace('₹', '');
};

import { Trade, ChartImage } from "../types/trade";
import MobileTooltip from "./ui/MobileTooltip";
import { ChartImageViewer } from "./ChartImageViewer";
import { UniversalChartViewer } from "./UniversalChartViewer";

export interface TradeJournalProps {
  title?: string;
  statsTitle?: {
    totalTrades?: string;
    openPositions?: string;
    winRate?: string;
    totalPL?: string;
  };
  toggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const TradeJournal = React.memo(function TradeJournal({
  title = "Trade Journal",
  statsTitle = {
    totalTrades: "Total Trades",
    openPositions: "Open Positions",
    winRate: "Win Rate",
    totalPL: "Total P/L"
  },
  toggleFullscreen,
  isFullscreen
}: TradeJournalProps) {
  const {
    trades,
    originalTrades,
    addTrade,
    updateTrade,
    deleteTrade,
    bulkImportTrades,
    isLoading,
    isRecalculating,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortDescriptor,
    setSortDescriptor,
    visibleColumns,
    setVisibleColumns,
    getAccountingAwareValues
  } = useTrades();



  const { portfolioSize, getPortfolioSize } = useTruePortfolioWithTrades(trades);
  const { accountingMethod } = useAccountingMethod();
  const useCashBasis = accountingMethod === 'cash';

  // State for inline editing
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Local state for instant UI updates during inline editing
  const [localTradeUpdates, setLocalTradeUpdates] = React.useState<Map<string, Partial<Trade>>>(new Map());

  // The trades from useTrades hook already include proper filtering, sorting, and cash basis expansion
  // Apply local updates for instant UI feedback
  const processedTrades = React.useMemo(() => {
    return trades.map(trade => {
      const localUpdate = localTradeUpdates.get(trade.id);
      return localUpdate ? { ...trade, ...localUpdate } : trade;
    });
  }, [trades, localTradeUpdates]);



  // Use shared accounting calculations hook to eliminate redundant calculations
  const sharedCalculations = useAccountingCalculations(processedTrades);

  // Memoize trade statistics calculations - now responsive to actual trade data changes
  const tradeStats = useMemo(() => {
    // For cash basis, we need to count unique trades, not expanded entries
    let uniqueTrades = processedTrades;
    if (useCashBasis) {
      const seenTradeIds = new Set();
      uniqueTrades = processedTrades.filter(t => {
        const originalId = t.id.split('_exit_')[0];
        if (seenTradeIds.has(originalId)) return false;
        seenTradeIds.add(originalId);
        return true;
      });
    }

    const openPositions = uniqueTrades.filter(t => t.positionStatus === "Open" || t.positionStatus === "Partial");
    const closedTrades = uniqueTrades.filter(t => t.positionStatus === "Closed");

    // Use shared calculations instead of manual calculation
    const tradesWithAccountingPL = sharedCalculations.tradesWithAccountingPL;

    const winningTrades = tradesWithAccountingPL.filter(t => t.accountingPL > 0);

    return {
      totalTrades: uniqueTrades.length,
      openPositionsCount: openPositions.length,
      winRate: tradesWithAccountingPL.length > 0 ? (winningTrades.length / tradesWithAccountingPL.length) * 100 : 0,
      totalPL: tradesWithAccountingPL.reduce((sum, t) => sum + (t.accountingPL || 0), 0)
    };
  }, [processedTrades, useCashBasis, sharedCalculations]); // Now depends on processed trades with local updates

  // Performance monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.duration > 100) { // Log operations taking more than 100ms

          }
        });
      });
      observer.observe({ entryTypes: ['measure'] });

      // Measure component render time
      const endTime = performance.now();
      if (endTime - startTime > 50) {

      }

      return () => observer.disconnect();
    }
  }, []);

  // This will be moved after items definition

  const handleExport = (format: 'csv' | 'xlsx') => {
    // Use the raw, unfiltered trades from the hook for export
    const allTradesForExport = trades;

    console.log(`📊 Exporting ${allTradesForExport.length} trades using ${useCashBasis ? 'Cash Basis' : 'Accrual Basis'} accounting method`);

    // Define the headers for the export, ensuring they match the allColumns definitions
    const exportHeaders = allColumns
      .filter(col => col.key !== 'actions' && col.key !== 'unrealizedPL') // Exclude non-data columns
      .map(col => ({ label: col.label, key: col.key }));

    const dataToExport = allTradesForExport.map(trade => {
      const row: { [key: string]: any } = {};

      // Get accounting-aware values for P/L related fields
      const accountingValues = getAccountingAwareValues(trade);

      exportHeaders.forEach(header => {
        let value = trade[header.key as keyof Trade];

        // Use accounting-aware values for P/L fields
        if (header.key === 'plRs') {
          value = accountingValues.plRs;
        } else if (header.key === 'realisedAmount') {
          value = accountingValues.realisedAmount;
        } else if (header.key === 'pfImpact') {
          value = accountingValues.pfImpact;
        }

        row[header.label] = value;
      });
      return row;
    });

    // Add accounting method to filename for clarity
    const accountingMethodSuffix = useCashBasis ? '_cash_basis' : '_accrual_basis';
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      const csv = Papa.unparse(dataToExport);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `trade_journal_${dateStr}${accountingMethodSuffix}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Trades");
      XLSX.writeFile(workbook, `trade_journal_${dateStr}${accountingMethodSuffix}.xlsx`);
    }
  };

  // Chart image viewer handler
  const handleChartImageView = React.useCallback((chartImage: ChartImage, title: string) => {
    setChartViewerImage(chartImage);
    setChartViewerTitle(title);
    setIsChartViewerOpen(true);
  }, []);

  const handleAddNewBlankTrade = useCallback(() => {
    // Find the max tradeNo among existing trades (as a number)
    const maxTradeNo = trades.length > 0
      ? Math.max(
          ...trades
            .map(t => Number(t.tradeNo))
            .filter(n => !isNaN(n))
        )
      : 0;

    const newTrade: Trade = {
      id: `trade_${new Date().getTime()}_${Math.random()}`,
      tradeNo: String(maxTradeNo + 1),
      date: new Date().toISOString(),
      name: '',
      setup: '',
      buySell: 'Buy',
      entry: 0,
      avgEntry: 0,
      sl: 0,
      tsl: 0,
      cmp: 0,
      initialQty: 0,
      pyramid1Price: 0,
      pyramid1Qty: 0,
      pyramid1Date: '',
      pyramid2Price: 0,
      pyramid2Qty: 0,
      pyramid2Date: '',
      positionSize: 0,
      allocation: 0,
      exit1Price: 0,
      exit1Qty: 0,
      exit1Date: '',
      exit2Price: 0,
      exit2Qty: 0,
      exit2Date: '',
      exit3Price: 0,
      exit3Qty: 0,
      exit3Date: '',
      openQty: 0,
      exitedQty: 0,
      avgExitPrice: 0,
      stockMove: 0,
      openHeat: 0,
      rewardRisk: 0,
      holdingDays: 0,
      positionStatus: 'Open',
      realisedAmount: 0,
      plRs: 0,
      pfImpact: 0,
      cummPf: 0,
      planFollowed: true,
      exitTrigger: '',
      proficiencyGrowthAreas: '',
      baseDuration: '',
      slPercent: 0,
      notes: '',
      _cmpAutoFetched: false, // Initialize as manual entry
      chartAttachments: undefined, // Initialize without chart attachments
    };
    addTrade(newTrade);
  }, [addTrade, trades]);

  const { isOpen: isAddOpen, onOpen: onAddOpen, onOpenChange: onAddOpenChange } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onOpenChange: onEditOpenChange } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure();
  const { isOpen: isUploadOpen, onOpen: onUploadOpen, onOpenChange: onUploadOpenChange } = useDisclosure();

  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null);
  const [page, setPage] = React.useState(1);
  const [optimisticUpdates, setOptimisticUpdates] = React.useState<Map<string, Partial<Trade>>>(new Map());

  // Chart image viewer state
  const [chartViewerImage, setChartViewerImage] = React.useState<ChartImage | null>(null);
  const [isChartViewerOpen, setIsChartViewerOpen] = React.useState(false);
  const [chartViewerTitle, setChartViewerTitle] = React.useState('');
  const [isUniversalViewerOpen, setIsUniversalViewerOpen] = React.useState(false);
  const [chartRefreshTrigger, setChartRefreshTrigger] = React.useState(0);
  const [isUploadOnlyMode, setIsUploadOnlyMode] = React.useState(false);

  // Dynamic pagination options based on dataset size
  const rowsPerPageOptions = React.useMemo(() => {
    const totalTrades = trades.length;
    if (totalTrades < 500) return [10, 25, 50];
    if (totalTrades < 2000) return [25, 50, 100];
    return [50, 100, 200];
  }, [trades.length]);

  // Load rows per page from IndexedDB with fallback to 10, ensuring it's a valid option
  // This persists the user's preferred rows per page setting across sessions
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [rowsPerPageLoaded, setRowsPerPageLoaded] = React.useState(false);

  // Load rows per page from IndexedDB on mount
  React.useEffect(() => {
    const loadRowsPerPage = async () => {
      try {
        const savedValue = await getFromIndexedDB('tradeJournal_rowsPerPage', 10, (value) => parseInt(value, 10));

        // Get initial options for validation (use default options if trades not loaded yet)
        const initialOptions = trades.length < 500 ? [10, 25, 50] :
                              trades.length < 2000 ? [25, 50, 100] : [50, 100, 200];

        // Set saved value if it's valid, otherwise use default (10)
        setRowsPerPage(initialOptions.includes(savedValue) ? savedValue : 10);
      } catch (error) {
        console.error('❌ Failed to load rows per page:', error);
        setRowsPerPage(10);
      } finally {
        setRowsPerPageLoaded(true);
      }
    };

    loadRowsPerPage();
  }, [trades.length]);

  // Save rows per page to IndexedDB whenever it changes
  React.useEffect(() => {
    if (rowsPerPageLoaded) {
      setToIndexedDB('tradeJournal_rowsPerPage', rowsPerPage.toString());
    }
  }, [rowsPerPage, rowsPerPageLoaded]);

  // Validate and adjust rowsPerPage when options change (e.g., when dataset size changes)
  React.useEffect(() => {
    if (!rowsPerPageOptions.includes(rowsPerPage)) {
      // If current rowsPerPage is not in the new options, set to the closest valid option
      const closestOption = rowsPerPageOptions.reduce((prev, curr) =>
        Math.abs(curr - rowsPerPage) < Math.abs(prev - rowsPerPage) ? curr : prev
      );
      setRowsPerPage(closestOption);
    }
  }, [rowsPerPageOptions, rowsPerPage]);

  // Progressive loading for large datasets
  const [loadedTradesCount, setLoadedTradesCount] = React.useState(() => {
    // Initial load: show more for smaller datasets, less for larger ones
    const initialLoad = trades.length < 100 ? trades.length : Math.min(100, trades.length);
    return initialLoad;
  });

  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // Update loaded count when trades change
  React.useEffect(() => {
    if (trades.length <= loadedTradesCount) {
      setLoadedTradesCount(trades.length);
    }
  }, [trades.length, loadedTradesCount]);

  const loadMoreTrades = useCallback(() => {
    setIsLoadingMore(true);
    // Simulate loading delay for better UX
    setTimeout(() => {
      setLoadedTradesCount(prev => Math.min(prev + 50, trades.length));
      setIsLoadingMore(false);
    }, 300);
  }, [trades.length]);

  // Use progressive loading for large datasets, pagination for smaller ones
  const shouldUseProgressiveLoading = processedTrades.length > 500;

  const pages = shouldUseProgressiveLoading ? 1 : Math.ceil(processedTrades.length / rowsPerPage);

  // Optimized pagination with optimistic updates applied
  const items = React.useMemo(() => {
    let baseItems;
    if (shouldUseProgressiveLoading) {
      baseItems = processedTrades.slice(0, loadedTradesCount);
    } else {
      const start = (page - 1) * rowsPerPage;
      const end = start + rowsPerPage;
      baseItems = processedTrades.slice(start, end);
    }

    // Apply optimistic updates for immediate UI feedback
    return baseItems.map(trade => {
      const optimisticUpdate = optimisticUpdates.get(trade.id);
      return optimisticUpdate ? { ...trade, ...optimisticUpdate } : trade;
    });
  }, [page, processedTrades, rowsPerPage, shouldUseProgressiveLoading, loadedTradesCount, optimisticUpdates]);

  // Optimized page change handler with immediate UI update
  const handlePageChange = React.useCallback((newPage: number) => {
    // Use startTransition for non-urgent updates to prevent blocking
    React.startTransition(() => {
      setPage(newPage);
    });
  }, [setPage]);

  // Remove heavy calculations from useEffect - they're causing the delay
  // These calculations should be done lazily when needed, not on every page change



  // Single source of truth for column definitions
  const allColumns = React.useMemo(() => [
    { key: "tradeNo", label: "Trade No.", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "name", label: "Name" },
    { key: "setup", label: "Setup" },
    { key: "buySell", label: "Buy/Sell", sortable: true },
    { key: "entry", label: "Entry (₹)", sortable: true },
    { key: "avgEntry", label: "Avg. Entry (₹)", sortable: true },
    { key: "sl", label: "SL (₹)", sortable: true },
    { key: "slPercent", label: "SL %", sortable: true },
    { key: "tsl", label: "TSL (₹)", sortable: true },
    { key: "cmp", label: "CMP (₹)", sortable: true },
    { key: "initialQty", label: "Initial Qty", sortable: true },
    { key: "pyramid1Price", label: "P1 Price (₹)", sortable: true },
    { key: "pyramid1Qty", label: "P1 Qty", sortable: true },
    { key: "pyramid1Date", label: "P1 Date", sortable: true },
    { key: "pyramid2Price", label: "P2 Price (₹)", sortable: true },
    { key: "pyramid2Qty", label: "P2 Qty", sortable: true },
    { key: "pyramid2Date", label: "P2 Date", sortable: true },
    { key: "positionSize", label: "Pos. Size", sortable: true },
    { key: "allocation", label: "Allocation (%)", sortable: true },
    { key: "exit1Price", label: "E1 Price (₹)", sortable: true },
    { key: "exit1Qty", label: "E1 Qty", sortable: true },
    { key: "exit1Date", label: "E1 Date", sortable: true },
    { key: "exit2Price", label: "E2 Price (₹)", sortable: true },
    { key: "exit2Qty", label: "E2 Qty", sortable: true },
    { key: "exit2Date", label: "E2 Date", sortable: true },
    { key: "exit3Price", label: "E3 Price (₹)", sortable: true },
    { key: "exit3Qty", label: "E3 Qty", sortable: true },
    { key: "exit3Date", label: "E3 Date", sortable: true },
    { key: "openQty", label: "Open Qty", sortable: true },
    { key: "exitedQty", label: "Exited Qty", sortable: true },
    { key: "avgExitPrice", label: "Avg. Exit (₹)", sortable: true },
    { key: "stockMove", label: "Stock Move (%)", sortable: true },
    { key: "openHeat", label: "Open Heat (%)", sortable: true },
    { key: "rewardRisk", label: "R:R", sortable: true },
    { key: "holdingDays", label: "Holding Days", sortable: true },
    { key: "positionStatus", label: "Status", sortable: true },
    { key: "realisedAmount", label: "Realized Amount", sortable: true },
    { key: "plRs", label: "Realized P/L (₹)", sortable: true },
    { key: "pfImpact", label: "PF Impact (%)", sortable: true },
    { key: "cummPf", label: "Cumm. PF (%)", sortable: true },
    { key: "planFollowed", label: "Plan Followed", sortable: true },
    { key: "exitTrigger", label: "Exit Trigger" },
    { key: "proficiencyGrowthAreas", label: "Growth Areas" },
    { key: "chartAttachments", label: "Charts", sortable: false },
    { key: "actions", label: "Actions", sortable: false },
    { key: 'unrealizedPL', label: 'Unrealized P/L', sortable: false },
    { key: 'notes', label: 'Notes', sortable: false },
  ], []);

  const headerColumns = React.useMemo(() => {
    return allColumns.filter(col => visibleColumns.includes(col.key));
  }, [allColumns, visibleColumns]);

  const handleEdit = (trade: Trade) => {
    setSelectedTrade(trade);
    onEditOpen();
  };

  const handleUploadOnly = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsUploadOnlyMode(true);
    onEditOpen();
  };

  const handleEditModalClose = (isOpen: boolean) => {
    if (!isOpen) {
      setIsUploadOnlyMode(false);
    }
    onEditOpenChange(isOpen);
  };

  const handleDelete = (trade: Trade) => {
    setSelectedTrade(trade);
    onDeleteOpen();
  };

  const handleAddTrade = (trade: Trade) => {
    addTrade(trade);
    onAddOpenChange();
  };

  const handleUpdateTrade = (trade: Trade) => {
    console.log('📊 [TradeJournal] Updating trade with chart attachments:', {
      tradeId: trade.id,
      tradeName: trade.name,
      hasBeforeEntry: !!trade.chartAttachments?.beforeEntry,
      hasAfterExit: !!trade.chartAttachments?.afterExit,
      chartAttachments: trade.chartAttachments
    });

    // Check if this update involves chart changes (deletion/modification)
    const existingTrade = trades.find(t => t.id === trade.id);
    const chartChanged = existingTrade && (
      (existingTrade.chartAttachments?.beforeEntry?.id !== trade.chartAttachments?.beforeEntry?.id) ||
      (existingTrade.chartAttachments?.afterExit?.id !== trade.chartAttachments?.afterExit?.id)
    );

    updateTrade(trade);

    // Trigger chart refresh if charts were modified
    if (chartChanged) {
      setChartRefreshTrigger(prev => prev + 1);
      console.log('🔄 Chart changes detected, triggering Universal Chart Viewer refresh');
    }

    onEditOpenChange();
  };

  const handleDeleteConfirm = async () => {
    if (selectedTrade) {
      // Check if the trade has charts before deletion
      const hasCharts = selectedTrade.chartAttachments?.beforeEntry || selectedTrade.chartAttachments?.afterExit;

      await deleteTrade(selectedTrade.id);

      // Trigger chart refresh if the deleted trade had charts
      if (hasCharts) {
        setChartRefreshTrigger(prev => prev + 1);
        console.log('🔄 Trade with charts deleted, triggering Universal Chart Viewer refresh');
      }

      onDeleteOpenChange();
    }
  };

  const handleImportTrades = useCallback((importedTrades: Trade[]) => {
    // Use bulk import for better performance
    bulkImportTrades(importedTrades);

    // Show success message
    console.log(`Successfully imported ${importedTrades.length} trades`);
  }, [bulkImportTrades]);





  // List of calculated fields that should not be editable
  const nonEditableFields = [
    // Calculated fields
    'avgEntry', 'positionSize', 'allocation', 'openQty', 'exitedQty',
    'avgExitPrice', 'stockMove', 'slPercent', 'openHeat', 'rewardRisk',
    'holdingDays', 'realisedAmount', 'plRs', 'pfImpact', 'cummPf'
    // 'cmp' REMOVED to allow manual editing when auto-fetch fails
    // 'initialQty' REMOVED to allow inline editing
  ];

  // List of user-controlled fields that should never be auto-updated once user has edited them
  const userControlledFields = [
    'positionStatus', 'buySell', 'setup', 'exitTrigger', 'proficiencyGrowthAreas',
    'planFollowed', 'notes', 'name', 'tradeNo'
  ];

  // Check if a field is editable
  const isEditable = (field: string) => !nonEditableFields.includes(field);

  // Check if a field is user-controlled (should not be auto-updated once user has edited it)
  const isUserControlled = (field: string) => userControlledFields.includes(field);

  // Helper function to get accounting-aware portfolio size
  const getAccountingAwarePortfolioSize = React.useCallback((trade: Trade, exitedQty: number = 0) => {
    if (!getPortfolioSize) return portfolioSize;

    // For accrual basis: use entry date portfolio size
    // For cash basis: use exit date portfolio size (if exits exist)
    let relevantDate = trade.date; // Default to entry date

    // For cash basis, use the latest exit date if available
    if (accountingMethod === 'cash' && exitedQty > 0) {
      const exitDates = [
        trade.exit1Date,
        trade.exit2Date,
        trade.exit3Date
      ].filter(date => date && date.trim() !== '').sort();

      if (exitDates.length > 0) {
        relevantDate = exitDates[exitDates.length - 1]; // Use latest exit date
      }
    }

    const date = new Date(relevantDate);
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return getPortfolioSize(month, year);
  }, [getPortfolioSize, portfolioSize, accountingMethod]);



  // Debounced update to reduce API calls and improve performance
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, { field: keyof Trade, value: any }>>(new Map());

  const handleInlineEditSave = React.useCallback(async (tradeId: string, field: keyof Trade, value: any) => {
    try {
      // Prevent editing of non-editable fields
      if (!isEditable(field as string)) {
        return;
      }

      const tradeToUpdate = trades.find(t => t.id === tradeId);
      if (!tradeToUpdate) {
        return;
      }

      // Parse value based on field type
      let parsedValue: any = value;
      if (typeof tradeToUpdate[field] === 'number') {
        parsedValue = Number(value) || 0;
        // Round positionSize to nearest whole number
        if (field === 'positionSize') {
          parsedValue = Math.round(parsedValue);
        }
      } else if (field.endsWith('Date') && value) {
        parsedValue = new Date(value).toISOString();
      } else if (field === 'planFollowed') {
        parsedValue = Boolean(value);
      }

      // Create updated trade with the new value
      const updatedTrade = { ...tradeToUpdate, [field]: parsedValue };

      // Track that this field has been manually edited by the user
      if (!updatedTrade._userEditedFields) {
        updatedTrade._userEditedFields = [];
      }
      if (!updatedTrade._userEditedFields.includes(field as string)) {
        updatedTrade._userEditedFields.push(field as string);

      }

      // If the field is 'name', fetch the latest price and update cmp (only if CMP is currently 0 or not manually set)
      if (field === 'name' && parsedValue) {
        try {
          console.log(`[handleInlineEditSave] Fetching price for ${parsedValue}`);
          let priceData;

          // Use smart fetch that prioritizes historical fallback during night hours (3:55-9:15 AM)
          priceData = await fetchPriceTicksSmart(parsedValue);

          const ticks = priceData?.data?.ticks?.[parsedValue.toUpperCase()];
          if (ticks && ticks.length > 0) {
            const latestTick = ticks[ticks.length - 1];
            const fetchedPrice = latestTick[4]; // index 4 is close price

            // Only update CMP if it's currently 0 (not manually set) or if we successfully fetched a price
            if (tradeToUpdate.cmp === 0 || fetchedPrice > 0) {
              updatedTrade.cmp = fetchedPrice;
              // Add a flag to indicate this was auto-fetched (for UI indication)
              updatedTrade._cmpAutoFetched = true;
              console.log(`[handleInlineEditSave] Successfully fetched price ${fetchedPrice} for ${parsedValue}`);
            }
          } else {
            // No price data available - keep existing CMP if it's manually set, otherwise set to 0
            if (tradeToUpdate.cmp === 0) {
              updatedTrade.cmp = 0;
              updatedTrade._cmpAutoFetched = false;
            }
            console.warn(`[handleInlineEditSave] No price data available for ${parsedValue}`);
          }
        } catch (err) {
          // All fetch attempts failed - keep existing CMP if it's manually set, otherwise set to 0
          if (tradeToUpdate.cmp === 0) {
            updatedTrade.cmp = 0;
            updatedTrade._cmpAutoFetched = false;
          }
          console.error(`[handleInlineEditSave] All price fetch attempts failed for ${parsedValue}:`, err);
        }
      }

      // If the field is 'cmp' and manually edited, mark it as manually set
      if (field === 'cmp') {
        updatedTrade._cmpAutoFetched = false;
      }

      // CRITICAL FIX: Recalculate ALL dependent fields for any significant change
      if ([
        'entry', 'sl', 'tsl', 'initialQty', 'pyramid1Qty', 'pyramid2Qty',
        'exit1Price', 'exit2Price', 'exit3Price', 'exit1Qty', 'exit2Qty', 'exit3Qty',
        'exit1Date', 'exit2Date', 'exit3Date', 'cmp', 'buySell', 'positionStatus'
      ].includes(field as string)) {

        // Recalculate all entry-related fields
        const allEntries = [
          { price: updatedTrade.entry, qty: updatedTrade.initialQty },
          { price: updatedTrade.pyramid1Price, qty: updatedTrade.pyramid1Qty },
          { price: updatedTrade.pyramid2Price, qty: updatedTrade.pyramid2Qty }
        ].filter(e => e.price > 0 && e.qty > 0);

        // Calculate average entry
        const totalQty = allEntries.reduce((sum, e) => sum + e.qty, 0);
        const totalValue = allEntries.reduce((sum, e) => sum + (e.price * e.qty), 0);
        updatedTrade.avgEntry = totalQty > 0 ? totalValue / totalQty : updatedTrade.entry;

        // Recalculate all exit-related fields
        const allExits = [
          { price: updatedTrade.exit1Price, qty: updatedTrade.exit1Qty, date: updatedTrade.exit1Date },
          { price: updatedTrade.exit2Price, qty: updatedTrade.exit2Qty, date: updatedTrade.exit2Date },
          { price: updatedTrade.exit3Price, qty: updatedTrade.exit3Qty, date: updatedTrade.exit3Date }
        ].filter(e => e.price > 0 && e.qty > 0 && e.date);

        // Calculate exit quantities and averages
        const exitedQty = allExits.reduce((sum, e) => sum + e.qty, 0);
        const exitValue = allExits.reduce((sum, e) => sum + (e.price * e.qty), 0);
        const avgExitPrice = exitedQty > 0 ? exitValue / exitedQty : 0;

        updatedTrade.exitedQty = exitedQty;
        updatedTrade.avgExitPrice = avgExitPrice;
        updatedTrade.openQty = totalQty - exitedQty;

        // Calculate position size and allocation
        updatedTrade.positionSize = totalValue;
        const currentPortfolioSize = getPortfolioSize ?
          (() => {
            const tradeDate = new Date(updatedTrade.date);
            const month = tradeDate.toLocaleString('default', { month: 'short' });
            const year = tradeDate.getFullYear();
            return getPortfolioSize(month, year);
          })() : portfolioSize;
        updatedTrade.allocation = currentPortfolioSize > 0 ? (totalValue / currentPortfolioSize) * 100 : 0;

        // Calculate realized P/L using FIFO
        if (exitedQty > 0) {
          const entryLotsForFifo = allEntries.map(e => ({ price: e.price, qty: e.qty }));
          const exitLotsForFifo = allExits.map(e => ({ price: e.price, qty: e.qty }));
          updatedTrade.plRs = calcRealizedPL_FIFO(entryLotsForFifo, exitLotsForFifo, updatedTrade.buySell as 'Buy' | 'Sell');
          updatedTrade.realisedAmount = exitValue;
        } else {
          updatedTrade.plRs = 0;
          updatedTrade.realisedAmount = 0;
        }

        // Calculate accounting-aware portfolio impact
        const accountingAwarePortfolioSize = getAccountingAwarePortfolioSize(updatedTrade, exitedQty);
        updatedTrade.pfImpact = accountingAwarePortfolioSize > 0 ? (updatedTrade.plRs / accountingAwarePortfolioSize) * 100 : 0;

        // Update position status based on quantities ONLY if user has never manually set it
        const hasUserEditedPositionStatus = tradeToUpdate._userEditedFields?.includes('positionStatus');
        const shouldAutoUpdatePositionStatus = field !== 'positionStatus' && !hasUserEditedPositionStatus;

        // Debug logging for position status updates
        if (field !== 'positionStatus') {
          console.log(`🔄 Position Status Check for ${tradeToUpdate.name}:`, {
            field,
            hasUserEditedPositionStatus,
            shouldAutoUpdatePositionStatus,
            userEditedFields: tradeToUpdate._userEditedFields,
            currentStatus: tradeToUpdate.positionStatus,
            openQty: updatedTrade.openQty,
            exitedQty
          });
        }

        if (shouldAutoUpdatePositionStatus) {
          const newStatus = updatedTrade.openQty <= 0 && exitedQty > 0 ? 'Closed'
                          : exitedQty > 0 && updatedTrade.openQty > 0 ? 'Partial'
                          : 'Open';

          if (newStatus !== updatedTrade.positionStatus) {
            console.log(`🔄 Auto-updating position status for ${tradeToUpdate.name}: ${updatedTrade.positionStatus} → ${newStatus}`);
            updatedTrade.positionStatus = newStatus;
          }
        }

        // Calculate other dependent fields
        updatedTrade.openHeat = calcTradeOpenHeat(updatedTrade, currentPortfolioSize, getPortfolioSize);

        // Calculate SL percentage
        if (updatedTrade.sl > 0 && updatedTrade.avgEntry > 0) {
          updatedTrade.slPercent = Math.abs(((updatedTrade.sl - updatedTrade.avgEntry) / updatedTrade.avgEntry) * 100);
        }

        // Calculate stock move
        if (updatedTrade.cmp > 0 && updatedTrade.avgEntry > 0) {
          updatedTrade.stockMove = updatedTrade.buySell === 'Buy'
            ? ((updatedTrade.cmp - updatedTrade.avgEntry) / updatedTrade.avgEntry) * 100
            : ((updatedTrade.avgEntry - updatedTrade.cmp) / updatedTrade.avgEntry) * 100;
        }
      }

      // Optimistic UI update - apply changes locally first for immediate feedback
      setOptimisticUpdates(prev => {
        const newUpdates = new Map(prev);
        const existingUpdate = newUpdates.get(tradeId) || {};

        // Create optimistic update with calculated fields
        const optimisticUpdate: Partial<Trade> = {
          ...existingUpdate,
          [field]: parsedValue,
          // Include user edit tracking
          ...(updatedTrade._userEditedFields !== undefined ? { _userEditedFields: updatedTrade._userEditedFields } : {}),
          // Include calculated fields for instant feedback
          ...(updatedTrade.avgEntry !== undefined ? { avgEntry: updatedTrade.avgEntry } : {}),
          ...(updatedTrade.exitedQty !== undefined ? { exitedQty: updatedTrade.exitedQty } : {}),
          ...(updatedTrade.avgExitPrice !== undefined ? { avgExitPrice: updatedTrade.avgExitPrice } : {}),
          ...(updatedTrade.openQty !== undefined ? { openQty: updatedTrade.openQty } : {}),
          ...(updatedTrade.positionSize !== undefined ? { positionSize: updatedTrade.positionSize } : {}),
          ...(updatedTrade.allocation !== undefined ? { allocation: updatedTrade.allocation } : {}),
          ...(updatedTrade.plRs !== undefined ? { plRs: updatedTrade.plRs } : {}),
          ...(updatedTrade.realisedAmount !== undefined ? { realisedAmount: updatedTrade.realisedAmount } : {}),
          ...(updatedTrade.pfImpact !== undefined ? { pfImpact: updatedTrade.pfImpact } : {}),
          ...(updatedTrade.positionStatus !== undefined ? { positionStatus: updatedTrade.positionStatus } : {}),
          ...(updatedTrade.openHeat !== undefined ? { openHeat: updatedTrade.openHeat } : {}),
          ...(updatedTrade.slPercent !== undefined ? { slPercent: updatedTrade.slPercent } : {}),
          ...(updatedTrade.stockMove !== undefined ? { stockMove: updatedTrade.stockMove } : {}),
          ...(updatedTrade._cmpAutoFetched !== undefined ? { _cmpAutoFetched: updatedTrade._cmpAutoFetched } : {})
        };

        newUpdates.set(tradeId, optimisticUpdate);
        return newUpdates;
      });

      // Debounced background update with callback to clear optimistic updates
      updateTrade(updatedTrade, () => {
        // Clear optimistic update once real update is complete
        setOptimisticUpdates(prev => {
          const newUpdates = new Map(prev);
          newUpdates.delete(tradeId);
          return newUpdates;
        });
      });
    } catch (error) {
      console.error(`❌ Error in handleInlineEditSave for trade ${tradeId} field '${field}':`, error);
      // Clear any optimistic updates on error
      setOptimisticUpdates(prev => {
        const newUpdates = new Map(prev);
        newUpdates.delete(tradeId);
        return newUpdates;
      });
    }
  }, [trades, isEditable, portfolioSize, getPortfolioSize, updateTrade, getAccountingAwarePortfolioSize]);
  // Keyboard navigation for editable fields
  const getEditableFields = React.useCallback(() => {
    const editableColumns = allColumns.filter(col =>
      col.key !== 'actions' &&
      visibleColumns.includes(col.key) &&
      isEditable(col.key)
    );
    return editableColumns.map(col => col.key);
  }, [visibleColumns, isEditable, allColumns]);

  // Tab navigation state
  const [currentTabIndex, setCurrentTabIndex] = React.useState<{row: number, col: number} | null>(null);

  // Get all editable cells in order (row by row, then column by column)
  const getAllEditableCells = React.useCallback(() => {
    const editableFields = getEditableFields();
    const cells: Array<{tradeId: string, field: string, rowIndex: number, colIndex: number}> = [];

    processedTrades.forEach((trade, rowIndex) => {
      editableFields.forEach((field, colIndex) => {
        cells.push({
          tradeId: trade.id,
          field,
          rowIndex,
          colIndex
        });
      });
    });

    return cells;
  }, [processedTrades, getEditableFields]);

  // Handle tab navigation
  const handleTabNavigation = React.useCallback((direction: 'next' | 'prev') => {
    const allCells = getAllEditableCells();
    if (allCells.length === 0) return;

    let newIndex = 0;

    if (currentTabIndex) {
      const currentCellIndex = allCells.findIndex(cell =>
        cell.rowIndex === currentTabIndex.row && cell.colIndex === currentTabIndex.col
      );

      if (direction === 'next') {
        newIndex = (currentCellIndex + 1) % allCells.length;
      } else {
        newIndex = currentCellIndex - 1;
        if (newIndex < 0) newIndex = allCells.length - 1;
      }
    }

    const targetCell = allCells[newIndex];
    setCurrentTabIndex({ row: targetCell.rowIndex, col: targetCell.colIndex });

    // Focus the target cell and activate editing
    setTimeout(() => {
      const cellElement = document.querySelector(
        `[data-trade-id="${targetCell.tradeId}"][data-field="${targetCell.field}"]`
      ) as HTMLElement;

      if (cellElement) {
        cellElement.focus();
        cellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Automatically trigger editing/dropdown for the focused cell
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        cellElement.dispatchEvent(clickEvent);

        // For dropdown cells, also trigger Enter key to open dropdown
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true
        });
        cellElement.dispatchEvent(enterEvent);
      }
    }, 0);
  }, [currentTabIndex, getAllEditableCells]);

  // Global keyboard event handler for tab navigation
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        handleTabNavigation(e.shiftKey ? 'prev' : 'next');
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleTabNavigation]);

  const handleKeyboardNavigation = React.useCallback((e: KeyboardEvent) => {
    // Only handle Tab key navigation
    if (e.key !== 'Tab') return;

    const activeElement = document.activeElement;
    if (!activeElement) return;

    // Check if we're in an editable cell
    const editableCell = activeElement.closest('[data-editable-cell]');
    if (!editableCell) return;

    e.preventDefault();

    const tradeId = editableCell.getAttribute('data-trade-id');
    const currentField = editableCell.getAttribute('data-field');

    if (!tradeId || !currentField) return;

    const editableFields = getEditableFields();
    const currentFieldIndex = editableFields.indexOf(currentField);

    if (currentFieldIndex === -1) return;

    let nextFieldIndex: number;
    let nextTradeIndex: number;

    const currentTradeIndex = items.findIndex(trade => trade.id === tradeId);

    if (e.shiftKey) {
      // Navigate backwards
      if (currentFieldIndex > 0) {
        // Move to previous field in same row
        nextFieldIndex = currentFieldIndex - 1;
        nextTradeIndex = currentTradeIndex;
      } else if (currentTradeIndex > 0) {
        // Move to last field of previous row
        nextFieldIndex = editableFields.length - 1;
        nextTradeIndex = currentTradeIndex - 1;
      } else {
        return; // Already at first field of first row
      }
    } else {
      // Navigate forwards
      if (currentFieldIndex < editableFields.length - 1) {
        // Move to next field in same row
        nextFieldIndex = currentFieldIndex + 1;
        nextTradeIndex = currentTradeIndex;
      } else if (currentTradeIndex < items.length - 1) {
        // Move to first field of next row
        nextFieldIndex = 0;
        nextTradeIndex = currentTradeIndex + 1;
      } else {
        return; // Already at last field of last row
      }
    }

    const nextTrade = items[nextTradeIndex];
    const nextField = editableFields[nextFieldIndex];

    // Focus the next editable cell
    setTimeout(() => {
      const nextCell = document.querySelector(
        `[data-editable-cell][data-trade-id="${nextTrade.id}"][data-field="${nextField}"]`
      ) as HTMLElement;

      if (nextCell) {
        nextCell.focus();
        // If it's an input field, select all text
        const input = nextCell.querySelector('input');
        if (input) {
          input.select();
        }
      }
    }, 0);
  }, [getEditableFields, items]);

  // Add keyboard event listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);





  // Format cell value based on its type
  const formatCellValue = (value: any, key: string) => {
    if (value === undefined || value === null || value === '') return '-';

    // Format dates
    if (key.endsWith('Date')) {
      return formatDate(value as string);
    }

    // Format currency values with single rupee symbol
    if ([
      'entry', 'avgEntry', 'sl', 'tsl', 'cmp', 'pyramid1Price', 'pyramid2Price',
      'exit1Price', 'exit2Price', 'exit3Price', 'avgExitPrice', 'realisedAmount', 'plRs'
    ].includes(key)) {
      return '₹' + formatCurrency(Number(value));
    }

    // Format percentage values
    if (['slPercent', 'openHeat', 'allocation', 'pfImpact', 'cummPf', 'stockMove'].includes(key)) {
      return `${Number(value).toFixed(2)}%`;
    }

    // Format position size to whole number
    if (key === 'positionSize') {
      return String(Math.round(Number(value)));
    }

    // Format reward/risk ratio
    if (key === 'rewardRisk') {
      const rr = Number(value);
      if (rr > 0) {
        const rrStr = rr % 1 === 0 ? rr.toFixed(0) : rr.toFixed(2);
        return `${rrStr}R`;
      } else {
        return '-';
      }
    }

    // Format boolean values
    if (key === 'planFollowed') {
      return value ? 'Yes' : 'No';
    }

    return String(value);
  };

  // Add color to P/L values
  const getValueColor = (value: any, key: string) => {
    if (key !== 'plRs') return '';
    const numValue = Number(value);
    return numValue < 0 ? 'text-danger' : numValue > 0 ? 'text-success' : '';
  };





  // Pre-compute all tooltip data for better performance
  const precomputedTooltips = React.useMemo(() => {
    const tooltipData = new Map();

    items.forEach(trade => {
      const tradeTooltips: any = {};

      // Pre-compute holding days tooltip
      const isOpenPosition = trade.positionStatus === 'Open';
      const isPartialPosition = trade.positionStatus === 'Partial';
      const entryLots = [
        { label: 'Initial Entry', date: trade.date, qty: Number(trade.initialQty) },
        { label: 'Pyramid 1', date: trade.pyramid1Date, qty: Number(trade.pyramid1Qty) },
        { label: 'Pyramid 2', date: trade.pyramid2Date, qty: Number(trade.pyramid2Qty) }
      ].filter(e => e.date && e.qty > 0);

      const exitLots = [
        { date: trade.exit1Date, qty: Number(trade.exit1Qty) },
        { date: trade.exit2Date, qty: Number(trade.exit2Qty) },
        { date: trade.exit3Date, qty: Number(trade.exit3Qty) }
      ].filter(e => e.date && e.qty > 0);

      let remainingExits = exitLots.map(e => ({ ...e }));
      const today = new Date();
      today.setHours(0,0,0,0);
      const lotBreakdown: { label: string, qty: number, days: number, exited: boolean, exitDate?: string }[] = [];

      for (const lot of entryLots) {
        let qtyLeft = lot.qty;
        let entryDate = new Date(lot.date);
        entryDate.setHours(0,0,0,0);

        while (qtyLeft > 0 && remainingExits.length > 0) {
          const exit = remainingExits[0];
          const exitDate = new Date(exit.date);
          exitDate.setHours(0,0,0,0);
          const usedQty = Math.min(qtyLeft, exit.qty);
          const days = Math.max(1, Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)));
          lotBreakdown.push({ label: lot.label, qty: usedQty, days, exited: true, exitDate: exit.date });
          qtyLeft -= usedQty;
          exit.qty -= usedQty;
          if (exit.qty === 0) remainingExits.shift();
        }

        if (qtyLeft > 0) {
          const days = Math.max(1, Math.ceil((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)));
          lotBreakdown.push({ label: lot.label, qty: qtyLeft, days, exited: false });
        }
      }

      let displayDays = 0;
      if (isOpenPosition) {
        const openLots = lotBreakdown.filter(l => !l.exited);
        const totalQty = openLots.reduce((sum, l) => sum + l.qty, 0);
        displayDays = totalQty > 0 ? Math.round(openLots.reduce((sum, l) => sum + l.days * l.qty, 0) / totalQty) : 0;
      } else if (isPartialPosition) {
        const openLots = lotBreakdown.filter(l => !l.exited);
        const exitedLots = lotBreakdown.filter(l => l.exited);
        const openQty = openLots.reduce((sum, l) => sum + l.qty, 0);
        const exitedQty = exitedLots.reduce((sum, l) => sum + l.qty, 0);
        if (openQty > 0) {
          displayDays = Math.round(openLots.reduce((sum, l) => sum + l.days * l.qty, 0) / openQty);
        } else if (exitedQty > 0) {
          displayDays = Math.round(exitedLots.reduce((sum, l) => sum + l.days * l.qty, 0) / exitedQty);
        }
      } else {
        const exitedLots = lotBreakdown.filter(l => l.exited);
        const exitedQty = exitedLots.reduce((sum, l) => sum + l.qty, 0);
        displayDays = exitedQty > 0 ? Math.round(exitedLots.reduce((sum, l) => sum + l.days * l.qty, 0) / exitedQty) : 0;
      }

      tradeTooltips.holdingDays = {
        displayDays,
        lotBreakdown,
        isOpenPosition,
        isPartialPosition
      };

      // Pre-compute R:R tooltip
      const entries = [
        { label: 'Initial Entry', price: Number(trade.entry), qty: Number(trade.initialQty) },
        { label: 'Pyramid 1', price: Number(trade.pyramid1Price), qty: Number(trade.pyramid1Qty) },
        { label: 'Pyramid 2', price: Number(trade.pyramid2Price), qty: Number(trade.pyramid2Qty) }
      ].filter(e => e.price > 0 && e.qty > 0);

      const totalQtyAll = entries.reduce((sum, e) => sum + (e.qty || 0), 0);
      const tsl = Number(trade.tsl);
      const sl = Number(trade.sl);
      const cmp = Number(trade.cmp);
      const avgExit = Number(trade.avgExitPrice);
      const buySell = trade.buySell;
      const positionStatus = trade.positionStatus;
      const exitedQty = Number(trade.exitedQty);
      const openQty = Number(trade.openQty);

      // Calculate FIFO exit allocation per entry
      const rrExitLots = [
        { date: trade.exit1Date, qty: Number(trade.exit1Qty), price: Number(trade.exit1Price) },
        { date: trade.exit2Date, qty: Number(trade.exit2Qty), price: Number(trade.exit2Price) },
        { date: trade.exit3Date, qty: Number(trade.exit3Qty), price: Number(trade.exit3Price) }
      ].filter(e => e.date && e.qty > 0 && e.price > 0);

      // FIFO allocation: determine how much of each entry was exited
      let rrRemainingExits = rrExitLots.map(e => ({ ...e }));
      const entryExitAllocations = entries.map(entry => {
        let entryQtyLeft = entry.qty;
        let totalExitValue = 0;
        let totalExitQty = 0;

        // Allocate exits to this entry using FIFO
        while (entryQtyLeft > 0 && rrRemainingExits.length > 0) {
          const exit = rrRemainingExits[0];
          const usedQty = Math.min(entryQtyLeft, exit.qty);

          totalExitValue += usedQty * exit.price;
          totalExitQty += usedQty;

          entryQtyLeft -= usedQty;
          exit.qty -= usedQty;

          if (exit.qty === 0) rrRemainingExits.shift();
        }

        const avgExitPriceForEntry = totalExitQty > 0 ? totalExitValue / totalExitQty : 0;
        const exitedQtyForEntry = totalExitQty;
        const openQtyForEntry = entryQtyLeft;

        return {
          ...entry,
          exitedQtyForEntry,
          openQtyForEntry,
          avgExitPriceForEntry
        };
      });

      const entryBreakdown = entryExitAllocations.map(e => {
        let stop;
        if (e.label === 'Initial Entry') {
          stop = sl;
        } else {
          stop = tsl > 0 ? tsl : sl;
        }
        const rawRisk = buySell === 'Buy' ? e.price - stop : stop - e.price;
        const risk = Math.abs(rawRisk);
        let reward = 0;
        let rewardFormula = '';

        if (positionStatus === 'Open') {
          reward = buySell === 'Buy' ? cmp - e.price : e.price - cmp;
          rewardFormula = buySell === 'Buy'
            ? `CMP - Entry = ${cmp} - ${e.price} = ${(cmp - e.price).toFixed(2)} (Unrealized)`
            : `Entry - CMP = ${e.price} - ${cmp} = ${(e.price - cmp).toFixed(2)} (Unrealized)`;
        } else if (positionStatus === 'Closed') {
          reward = buySell === 'Buy' ? avgExit - e.price : e.price - avgExit;
          rewardFormula = buySell === 'Buy'
            ? `Avg. Exit - Entry = ${avgExit} - ${e.price} = ${(avgExit - e.price).toFixed(2)} (Realized)`
            : `Entry - Avg. Exit = ${e.price} - ${avgExit} = ${(e.price - avgExit).toFixed(2)} (Realized)`;
        } else if (positionStatus === 'Partial') {
          // Use FIFO-allocated quantities for this specific entry
          const exitedQtyForEntry = e.exitedQtyForEntry;
          const openQtyForEntry = e.openQtyForEntry;
          const avgExitPriceForEntry = e.avgExitPriceForEntry;
          const totalQtyForEntry = exitedQtyForEntry + openQtyForEntry;

          if (exitedQtyForEntry > 0 && openQtyForEntry > 0) {
            // Mixed: part realized, part unrealized for this entry
            const realizedReward = buySell === 'Buy' ? avgExitPriceForEntry - e.price : e.price - avgExitPriceForEntry;
            const unrealizedReward = buySell === 'Buy' ? cmp - e.price : e.price - cmp;
            reward = ((realizedReward * exitedQtyForEntry) + (unrealizedReward * openQtyForEntry)) / totalQtyForEntry;
            rewardFormula = `Weighted: ((Realized: ${realizedReward.toFixed(2)} × ${exitedQtyForEntry}) + (Unrealized: ${unrealizedReward.toFixed(2)} × ${openQtyForEntry})) / ${totalQtyForEntry} = ${reward.toFixed(2)}`;
          } else if (exitedQtyForEntry > 0) {
            // Fully realized for this entry
            reward = buySell === 'Buy' ? avgExitPriceForEntry - e.price : e.price - avgExitPriceForEntry;
            rewardFormula = buySell === 'Buy'
              ? `Avg. Exit - Entry = ${avgExitPriceForEntry.toFixed(2)} - ${e.price} = ${reward.toFixed(2)} (Realized)`
              : `Entry - Avg. Exit = ${e.price} - ${avgExitPriceForEntry.toFixed(2)} = ${reward.toFixed(2)} (Realized)`;
          } else {
            // Fully unrealized for this entry
            reward = buySell === 'Buy' ? cmp - e.price : e.price - cmp;
            rewardFormula = buySell === 'Buy'
              ? `CMP - Entry = ${cmp} - ${e.price} = ${reward.toFixed(2)} (Unrealized)`
              : `Entry - CMP = ${e.price} - ${cmp} = ${reward.toFixed(2)} (Unrealized)`;
          }
        }

        const rrValue = risk !== 0 ? Math.abs(reward / risk) : Infinity;
        const isRiskFree = risk === 0;
        return {
          label: e.label,
          price: e.price,
          risk,
          rawRisk,
          reward,
          rewardFormula,
          rrValue,
          qty: e.qty,
          stop,
          exitedQtyForEntry: e.exitedQtyForEntry || 0,
          openQtyForEntry: e.openQtyForEntry || 0,
          isRiskFree
        };
      });

      // Traditional weighted R:R (excluding risk-free positions)
      const riskyEntries = entryBreakdown.filter(e => !e.isRiskFree);
      const riskyQty = riskyEntries.reduce((sum, e) => sum + (e.qty || 0), 0);
      const traditionalWeightedRR = riskyQty > 0
        ? riskyEntries.reduce((sum, e) => sum + (e.rrValue * (e.qty || 0)), 0) / riskyQty
        : 0;

      // Effective position R:R (total reward vs total risk from risky portions only)
      const totalRiskAmount = riskyEntries.reduce((sum, e) => sum + (e.risk * (e.qty || 0)), 0);
      const totalRewardAmount = entryBreakdown.reduce((sum, e) => sum + (e.reward * (e.qty || 0)), 0);
      const effectiveRR = totalRiskAmount > 0 ? Math.abs(totalRewardAmount / totalRiskAmount) : Infinity;

      // Check if position contains risk-free components
      const hasRiskFreePositions = entryBreakdown.some(e => e.isRiskFree);

      const weightedRR = traditionalWeightedRR;

      tradeTooltips.rewardRisk = {
        entryBreakdown,
        weightedRR,
        totalQtyAll,
        tsl,
        traditionalWeightedRR,
        effectiveRR,
        hasRiskFreePositions,
        totalRiskAmount,
        totalRewardAmount
      };

      // Precompute trade details tooltip
      const fieldsForTooltip = allColumns.slice(allColumns.findIndex(col => col.key === "initialQty")).filter(col => col.key !== 'openHeat');
      const tradeDetailsFields = fieldsForTooltip.map(col => {
        if (col.key === "actions") return null;
        let value = trade[col.key as keyof Trade];
        const originalValue = value; // Store original value for filtering

        // Skip fields with no meaningful values BEFORE formatting
        const shouldSkipField = (key: string, originalVal: any) => {
          if (originalVal === null || originalVal === undefined || originalVal === '' || originalVal === '-') return true;

          // Only hide EXACT zero values (not small decimals like 0.1, 0.01, 0.05)
          // Check the original numeric value before any formatting
          if (originalVal === 0 && [
            'pyramid1Price', 'pyramid2Price', 'pyramid1Qty', 'pyramid2Qty',
            'exit1Price', 'exit2Price', 'exit3Price', 'exit1Qty', 'exit2Qty', 'exit3Qty',
            'tsl', 'rewardRisk', 'stockMove', 'pfImpact', 'cummPf', 'openHeat',
            'unrealizedPL', 'realisedAmount', 'plRs'
          ].includes(key)) return true;

          if (key.includes('Date') && (originalVal === '-' || originalVal === '')) return true;
          return false;
        };

        // Check if we should skip this field BEFORE any processing
        if (shouldSkipField(col.key, originalValue)) return null;

        // Handle accounting-aware calculations
        if (col.key === 'unrealizedPL') {
          if (trade.positionStatus === 'Open' || trade.positionStatus === 'Partial') {
            value = calcUnrealizedPL(trade.avgEntry, trade.cmp, trade.openQty, trade.buySell);
          } else {
            value = "-";
          }
        } else if (col.key === 'plRs') {
          const tooltipValues = getAccountingAwareValues(trade);
          value = tooltipValues.plRs;
        } else if (col.key === 'realisedAmount') {
          const tooltipValues = getAccountingAwareValues(trade);
          value = tooltipValues.realisedAmount;
        } else if (col.key === 'pfImpact') {
          const tooltipValues = getAccountingAwareValues(trade);
          value = tooltipValues.pfImpact;
        } else if (col.key === 'cummPf') {
          // The cummPf value is already calculated correctly based on accounting method in use-trades.ts
          value = `${Number(trade.cummPf ?? 0).toFixed(2)}%`;
        }

        // Format values appropriately
        if (["pyramid1Date", "pyramid2Date", "exit1Date", "exit2Date", "exit3Date"].includes(col.key)) {
          value = value ? formatDate(value as string) : "-";
        } else if (["entry", "avgEntry", "sl", "tsl", "cmp", "pyramid1Price", "pyramid2Price", "exit1Price", "exit2Price", "exit3Price", "avgExitPrice", "realisedAmount", "plRs", "unrealizedPL"].includes(col.key)) {
          value = typeof value === 'number' ? formatCurrency(value) : value;
        } else if (["pfImpact", "rewardRisk", "stockMove", "openHeat", "allocation", "slPercent"].includes(col.key)) {
          if (col.key !== 'pfImpact' && col.key !== 'cummPf') {
            let originalValue = Number(value);
            if (col.key === "rewardRisk") {
              const rrStr = originalValue % 1 === 0 ? originalValue.toFixed(0) : originalValue.toFixed(2);
              value = originalValue > 0 ? `${rrStr}R` : '-';
            } else {
              value = `${originalValue.toFixed(2)}`;
              if (!(col.key.includes("Price") || col.key.includes("Amount") || col.key.includes("Rs"))) {
                 value += "%";
              }
            }
          } else if (col.key === 'pfImpact') {
            value = `${Number(value).toFixed(2)}%`;
          }
        } else if (col.key === "planFollowed") {
          value = trade.planFollowed ? "Yes" : "No";
        } else if (col.key === 'positionSize') {
          value = typeof value === 'number' ? Math.round(value).toString() : value;
        } else if (col.key === 'holdingDays') {
          value = typeof value === 'number' ? `${value} day${value !== 1 ? 's' : ''}` : value;
        } else if (value === undefined || value === null || value === ""){
          value = "-";
        }

        return {
          key: col.key,
          label: col.label,
          value: String(value)
        };
      }).filter(Boolean);

      tradeTooltips.tradeDetails = {
        fields: tradeDetailsFields,
        tradeName: trade.name,
        accountingMethod: useCashBasis ? 'Cash Basis' : 'Accrual Basis'
      };

      // Pre-compute stock move tooltip
      const stockMoveEntries = [
        { price: trade.entry, qty: trade.initialQty, description: 'Initial Entry' },
        { price: trade.pyramid1Price, qty: trade.pyramid1Qty, description: 'Pyramid 1' },
        { price: trade.pyramid2Price, qty: trade.pyramid2Qty, description: 'Pyramid 2' }
      ].filter(e => e.price > 0 && e.qty > 0);

      const individualMoves = calcIndividualMoves(
        stockMoveEntries,
        trade.cmp,
        trade.avgExitPrice,
        trade.positionStatus,
        trade.buySell
      );

      tradeTooltips.stockMove = {
        individualMoves,
        positionStatus: trade.positionStatus
      };

      tooltipData.set(trade.id, tradeTooltips);
    });

    return tooltipData;
  }, [items]);

  // Render holding days with pre-computed data
  const renderHoldingDays = (trade: Trade) => {
    const tooltipData = precomputedTooltips.get(trade.id)?.holdingDays;
    if (!tooltipData) return <div className="py-1 px-2">-</div>;

    const { displayDays, lotBreakdown, isOpenPosition, isPartialPosition } = tooltipData;

    let tooltipContent;
    if (isOpenPosition) {
      tooltipContent = (
        <div className="flex flex-col gap-1 text-xs max-w-xs min-w-[120px]">
          <div className="font-semibold">Holding Days</div>
          {lotBreakdown.filter((l: any) => !l.exited).map((l: any, idx: number) => (
            <div key={idx} className="flex justify-between">
              <span>{l.label}</span>
              <span className="font-mono">{l.days} day{l.days !== 1 ? 's' : ''}</span>
            </div>
          ))}
          <div className="text-foreground-500 mt-1 text-[10px]">
            Days since entry for each open lot.
          </div>
        </div>
      );
    } else if (isPartialPosition) {
      tooltipContent = (
        <div className="flex flex-col gap-1 text-xs max-w-xs min-w-[120px]">
          <div className="font-semibold">Holding Days</div>
          {lotBreakdown.map((l: any, idx: number) => (
            <div key={idx} className="flex justify-between">
              <span>{l.label} {l.exited ? '(sold)' : '(open)'}</span>
              <span className="font-mono">{l.days} day{l.days !== 1 ? 's' : ''}</span>
            </div>
          ))}
          <div className="text-foreground-500 mt-1 text-[10px]">
            Days since entry for open lots, entry to exit for sold lots (FIFO).
          </div>
        </div>
      );
    } else {
      tooltipContent = (
        <div className="flex flex-col gap-1 text-xs max-w-xs min-w-[120px]">
          <div className="font-semibold">Holding Days</div>
          {lotBreakdown.map((l: any, idx: number) => (
            <div key={idx} className="flex justify-between">
              <span>{l.label}</span>
              <span className="font-mono">{l.days} day{l.days !== 1 ? 's' : ''}</span>
            </div>
          ))}
          <div className="text-foreground-500 mt-1 text-[10px]">
            Entry to exit for each lot (FIFO).
          </div>
        </div>
      );
    }

    return (
      <Tooltip
        content={tooltipContent}
        placement="top"
        delay={100}
        closeDelay={50}
        radius="sm"
        shadow="md"
        classNames={{ content: "bg-content1 border border-divider z-50 max-w-xs" }}
      >
        <div className="py-1 px-2 flex items-center gap-0.5 relative">
          {displayDays}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle text-warning cursor-help" style={{marginLeft: 2}}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      </Tooltip>
    );
  };

  const renderCell = React.useCallback((trade: Trade, columnKey: string) => {
    const cellValue = trade[columnKey as keyof Trade];





    // Trade details tooltip for stock name (precomputed)
    if (columnKey === 'name') {
      const tooltipData = precomputedTooltips.get(trade.id)?.tradeDetails;
      if (!tooltipData) {
        return (
          <div className="cursor-help" data-trade-id={trade.id} data-field="name" tabIndex={0}>
            <NameCell
              key={`${trade.id}-name`}
              value={trade.name}
              onSave={(value) => handleInlineEditSave(trade.id, 'name', value)}
            />
          </div>
        );
      }

      const { fields, tradeName, accountingMethod } = tooltipData;
      const tooltipContent = (
        <div className="p-3 text-xs max-w-2xl break-words">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-sm">Trade Details: {tradeName}</h4>
            <div className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">
              {accountingMethod}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {fields.map((field: any) => (
              <div key={field.key} className="bg-content2/40 dark:bg-content2/30 p-1.5 rounded shadow-sm overflow-hidden text-ellipsis whitespace-nowrap">
                <span className="font-medium text-default-700 dark:text-default-300">{field.label}: </span>
                <span className="text-default-600 dark:text-default-400 whitespace-nowrap">{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      );

      return (
        <Tooltip
          content={tooltipContent}
          placement="right-start"
          delay={0}
          closeDelay={0}
          radius="sm"
          shadow="md"
          classNames={{ content: "bg-content1 border border-divider" }}
        >
          <div className="cursor-help" data-trade-id={trade.id} data-field="name" tabIndex={0}>
            <NameCell
              key={`${trade.id}-name`}
              value={trade.name}
              onSave={(value) => handleInlineEditSave(trade.id, 'name', value)}
            />
          </div>
        </Tooltip>
      );
    }

    // Format holding days with lazy tooltip calculation
    if (columnKey === 'holdingDays') {
      return renderHoldingDays(trade);
    }

    // Tooltip for Reward:Risk (R:R) with pre-computed data
    if (columnKey === 'rewardRisk') {
      const tooltipData = precomputedTooltips.get(trade.id)?.rewardRisk;
      if (!tooltipData) {
        return <div className="py-1 px-2">-</div>;
      }

      const {
        entryBreakdown,
        weightedRR,
        totalQtyAll,
        tsl,
        traditionalWeightedRR,
        effectiveRR,
        hasRiskFreePositions,
        totalRiskAmount,
        totalRewardAmount
      } = tooltipData;
      const weightedRRDisplay = totalQtyAll > 0 ? weightedRR.toFixed(2) : '0.00';

      const rrTooltipContent = (
        <div className="flex flex-col gap-1 text-xs max-w-xs min-w-[180px]">
          <div className="font-semibold">Reward:Risk Breakdown</div>
          {entryBreakdown.map((e: any, idx: number) => (
            <div key={idx} className="flex flex-col gap-0.5 border-b border-divider pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
              <div className="font-medium">{e.label} (Entry: {e.price})</div>
              {trade.positionStatus === 'Partial' && (e.exitedQtyForEntry > 0 || e.openQtyForEntry > 0) && (
                <div className="text-[10px] text-foreground-600">
                  {e.exitedQtyForEntry > 0 && `Exited: ${e.exitedQtyForEntry} qty`}
                  {e.exitedQtyForEntry > 0 && e.openQtyForEntry > 0 && ' | '}
                  {e.openQtyForEntry > 0 && `Open: ${e.openQtyForEntry} qty`}
                </div>
              )}
              <div><b>Risk:</b> |{trade.buySell === 'Buy' ? 'Entry - ' : ''}{(e.label === 'Initial Entry' ? 'SL' : (e.stop === tsl && tsl > 0 ? 'TSL' : 'SL'))}{trade.buySell === 'Sell' ? ' - Entry' : ''}| = {trade.buySell === 'Buy' ? `${e.price} - ${e.stop}` : `${e.stop} - ${e.price}`} = {e.rawRisk.toFixed(2)}</div>
              {e.rawRisk < 0 && e.label !== 'Initial Entry' && (
                <div className="text-warning-600 text-[10px]">
                  Negative risk: This pyramid is financed from the cushion of earlier profits.
                </div>
              )}
              <div><b>Reward:</b> {e.rewardFormula}</div>
              <div><b>R:R:</b> |{e.reward.toFixed(2)} / {e.risk.toFixed(2)}| = <span className={`${e.isRiskFree ? 'text-success font-bold' : 'text-primary'}`}>
                {e.isRiskFree ? '∞ (Risk-Free)' : `${e.rrValue % 1 === 0 ? e.rrValue.toFixed(0) : e.rrValue.toFixed(2)}R`}
              </span></div>
            </div>
          ))}
          <div className="font-semibold mt-1 border-t border-divider pt-1">Overall R:R Analysis</div>

          {hasRiskFreePositions && (
            <div className="bg-success-50 dark:bg-success-900/20 p-2 rounded text-[10px] mb-2">
              <div className="font-semibold text-success-700 dark:text-success-300">🎯 Position Contains Risk-Free Components!</div>
              <div className="text-success-600 dark:text-success-400">Some entries have zero risk (TSL at entry price)</div>
            </div>
          )}

          <div className="space-y-1">
            <div>
              <b>Traditional Weighted R:R:</b> <span className='text-primary'>{traditionalWeightedRR % 1 === 0 ? traditionalWeightedRR.toFixed(0) : traditionalWeightedRR.toFixed(2)}R</span>
              <div className="text-[10px] text-foreground-500">
                (Excludes risk-free positions from calculation)
              </div>
            </div>

            <div>
              <b>Effective Position R:R:</b> <span className={`${effectiveRR === Infinity ? 'text-success font-bold' : 'text-primary'}`}>
                {effectiveRR === Infinity ? '∞ (Risk-Free Position)' : `${effectiveRR % 1 === 0 ? effectiveRR.toFixed(0) : effectiveRR.toFixed(2)}R`}
              </span>
              <div className="text-[10px] text-foreground-500">
                Total Reward (₹{Math.abs(totalRewardAmount).toFixed(2)}) ÷ Total Risk (₹{totalRiskAmount.toFixed(2)})
              </div>
            </div>

            {hasRiskFreePositions && (
              <div className="text-[10px] text-warning-600 dark:text-warning-400 mt-1">
                💡 Risk-free positions provide unlimited upside with zero additional downside risk
              </div>
            )}
          </div>
          {tooltipData && (
            <div className="text-foreground-500 mt-1 text-[10px] border-t border-divider pt-1">
              {trade.positionStatus === 'Open' && '* All rewards are unrealized (based on current CMP)'}
              {trade.positionStatus === 'Closed' && '* All rewards are realized (based on actual exit prices)'}
              {trade.positionStatus === 'Partial' && '* FIFO-based: Realized rewards for exited qty per entry, unrealized for remaining qty'}
            </div>
          )}
        </div>
      );

      return (
        <Tooltip
          content={rrTooltipContent}
          placement="top"
          delay={100}
          closeDelay={50}
          radius="sm"
          shadow="md"
          classNames={{ content: "bg-content1 border border-divider z-50 max-w-xs" }}
        >
          <div className="py-1 px-2 flex items-center gap-1 relative">
            {hasRiskFreePositions && effectiveRR === Infinity ? (
              <span className="text-success font-bold">∞ (Risk-Free)</span>
            ) : weightedRR > 0 ? (
              `${weightedRR % 1 === 0 ? weightedRR.toFixed(0) : weightedRR.toFixed(2)}R`
            ) : '-'}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle text-warning cursor-help" style={{marginLeft: 2}}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </Tooltip>
      );
    }

    // Tooltip for Stock Move (%) with pre-computed data
    if (columnKey === 'stockMove') {
      const tooltipData = precomputedTooltips.get(trade.id)?.stockMove;
      if (!tooltipData) {
        return <div className="py-1 px-2">-</div>;
      }

      const { individualMoves, positionStatus } = tooltipData;
      const formatPercentage = (value: number | null | undefined): string => {
        if (value === null || value === undefined) return "-";
        return `${value.toFixed(2)}%`;
      };

      const tooltipContent = (
        <div className="flex flex-col gap-1 text-xs max-w-xs min-w-[180px]">
          <div className="font-semibold">Individual Stock Moves:</div>
          {individualMoves.map((move: any, index: number) => (
            <div key={index} className="flex justify-between">
              <span>{move.description} <span className="text-foreground-400">({move.qty} qty)</span></span>
              <span className="font-mono">{formatPercentage(move.movePercent)}</span>
            </div>
          ))}
          <div className="text-foreground-500 mt-1 text-[10px]">
            {positionStatus === 'Open'
              ? '* Unrealized moves based on CMP vs. entry prices.'
              : positionStatus === 'Partial'
                ? '* Mixed moves: Realized (Avg. Exit) for exited qty, Unrealized (CMP) for open qty.'
                : '* Realized moves based on Avg. Exit vs. entry prices.'}
          </div>
        </div>
      );

      return (
        <Tooltip
          content={tooltipContent}
          placement="top"
          delay={100}
          closeDelay={50}
          radius="sm"
          shadow="md"
          classNames={{ content: "bg-content1 border border-divider z-50 max-w-xs" }}
        >
          <div className="py-1 px-2 flex items-center gap-1 relative">
            {trade.stockMove !== undefined && trade.stockMove !== null ? `${Number(trade.stockMove).toFixed(2)}%` : '-'}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle text-warning cursor-help" style={{marginLeft: 2}}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </Tooltip>
      );
    }



    // Special handling for accounting-aware fields BEFORE non-editable check
    if (columnKey === "plRs" || columnKey === "realisedAmount") {
      // CRITICAL FIX: Always calculate P/L properly using getAccountingAwareValues
      const accountingValues = getAccountingAwareValues(trade);
      const displayValue = columnKey === "realisedAmount" ? accountingValues.realisedAmount : accountingValues.plRs;

      return (
        <div className={`py-1 px-2 text-right whitespace-nowrap ${getValueColor(displayValue, columnKey)}`}>
          {formatCellValue(displayValue, columnKey)}
        </div>
      );
    }

    // Special handling for openHeat BEFORE non-editable check
    if (columnKey === "openHeat") {
      // Only show open heat for open/partial positions
      if (trade.positionStatus === 'Open' || trade.positionStatus === 'Partial') {
        const openHeatValue = calcTradeOpenHeat(trade, portfolioSize, getPortfolioSize);
        return (
          <div className="py-1 px-2 text-right whitespace-nowrap">
            {openHeatValue.toFixed(2)}%
          </div>
        );
      } else {
        return <div className="py-1 px-2 text-right whitespace-nowrap">-</div>;
      }
    }

    // Skip rendering for non-editable fields
    if (!isEditable(columnKey)) {
      return (
        <div className={`py-1 px-2 ${getValueColor(cellValue, columnKey)}`}>
          {formatCellValue(cellValue, columnKey)}
        </div>
      );
    }

    // Handle special cell types
    if (columnKey === 'buySell') {
      return (
        <div
          data-trade-id={trade.id}
          data-field="buySell"
          tabIndex={0}
          className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
        >
          <BuySellCell
            key={`${trade.id}-buySell`}
            value={trade.buySell}
            onSave={(value) => handleInlineEditSave(trade.id, 'buySell', value)}
          />
        </div>
      );
    }

    if (columnKey === 'positionStatus') {
      return (
        <div
          data-trade-id={trade.id}
          data-field="positionStatus"
          tabIndex={0}
          className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
        >
          <PositionStatusCell
            key={`${trade.id}-positionStatus`}
            value={trade.positionStatus}
            onSave={(value) => handleInlineEditSave(trade.id, 'positionStatus', value)}
          />
        </div>
      );
    }



    if (columnKey === 'setup') {
      return (
        <div
          data-trade-id={trade.id}
          data-field="setup"
          tabIndex={0}
          className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
        >
          <SetupCell
            key={`${trade.id}-setup`}
            value={trade.setup || ''}
            onSave={(value) => handleInlineEditSave(trade.id, 'setup', value)}
          />
        </div>
      );
    }

    if (columnKey === 'exitTrigger') {
      return (
        <div data-trade-id={trade.id} data-field="exitTrigger" tabIndex={0}>
          <ExitTriggerCell
            key={`${trade.id}-exitTrigger`}
            value={trade.exitTrigger || ''}
            onSave={(value) => handleInlineEditSave(trade.id, 'exitTrigger', value)}
          />
        </div>
      );
    }

    if (columnKey === 'proficiencyGrowthAreas') {
      return (
        <div data-trade-id={trade.id} data-field="proficiencyGrowthAreas" tabIndex={0}>
          <ProficiencyGrowthAreasCell
            key={`${trade.id}-proficiencyGrowthAreas`}
            value={trade.proficiencyGrowthAreas || ''}
            onSave={(value) => handleInlineEditSave(trade.id, 'proficiencyGrowthAreas', value)}
          />
        </div>
      );
    }

    if (columnKey === 'planFollowed') {
      return (
        <div data-trade-id={trade.id} data-field="planFollowed" tabIndex={0}>
          <PlanFollowedCell
            key={`${trade.id}-planFollowed`}
            value={trade.planFollowed}
            onSave={(value) => handleInlineEditSave(trade.id, 'planFollowed', value)}
          />
        </div>
      );
    }

    if (columnKey === 'notes') {
      return (
        <div data-trade-id={trade.id} data-field="notes" tabIndex={0}>
          <NotesCell
            key={`${trade.id}-notes`}
            value={trade.notes || ''}
            onSave={(value) => handleInlineEditSave(trade.id, 'notes', value)}
          />
        </div>
      );
    }

    switch (columnKey) {
      // Trade number (editable) with mini upload button
      case "tradeNo":
        return (
          <div className="flex items-center gap-0.5">
            <EditableCell
              key={`${trade.id}-${columnKey}`}
              value={cellValue as string}
              onSave={(value) => handleInlineEditSave(trade.id, columnKey as keyof Trade, value)}
              tradeId={trade.id}
              field={columnKey}
            />
            <Tooltip content="Upload Charts">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => handleUploadOnly(trade)}
                className="w-3 h-3 min-w-3 rounded p-0 hover:bg-primary/10 transition opacity-60 hover:opacity-90"
              >
                <Icon icon="lucide:upload" className="w-2.5 h-2.5" />
              </Button>
            </Tooltip>
          </div>
        );


      // Date fields - editable
      case "date":
      case "pyramid1Date":
      case "pyramid2Date":
      case "exit1Date":
      case "exit2Date":
      case "exit3Date":
        return <EditableCell key={`${trade.id}-${columnKey}`} value={cellValue as string} type="date" onSave={(value) => handleInlineEditSave(trade.id, columnKey as keyof Trade, value)} tradeId={trade.id} field={columnKey} />;

      // Price fields - check if editable
      case "entry":
      case "sl":
      case "tsl":
      case "pyramid1Price":
      case "pyramid2Price":
      case "exit1Price":
      case "exit2Price":
      case "exit3Price":
        return <EditableCell key={`${trade.id}-${columnKey}`} value={cellValue as number} type="price" onSave={(value) => handleInlineEditSave(trade.id, columnKey as keyof Trade, value)} tradeId={trade.id} field={columnKey} />;

      // CMP field - special handling for manual vs auto-fetched
      case "cmp":
        return (
          <CMPCell
            key={`${trade.id}-cmp`}
            value={trade.cmp}
            isAutoFetched={trade._cmpAutoFetched}
            onSave={(value) => handleInlineEditSave(trade.id, 'cmp', value)}
          />
        );

      // Non-editable calculated price fields
      case "avgEntry":
      case "avgExitPrice":
        return (
          <div className="py-1 px-2 text-right whitespace-nowrap">
            {formatCellValue(cellValue, columnKey)}
          </div>
        );
      // Non-editable calculated fields (these cases should not be reached due to special handling above)
      case "realisedAmount":
      case "plRs":
        // This case should not be reached due to special handling before non-editable check
        const accountingValues = getAccountingAwareValues(trade);
        const displayValue = columnKey === "realisedAmount" ? accountingValues.realisedAmount : accountingValues.plRs;
        return (
          <div className={`py-1 px-2 text-right whitespace-nowrap ${getValueColor(displayValue, columnKey)}`}>
            {formatCellValue(displayValue, columnKey)}
          </div>
        );

      // Quantity fields - editable
      case "initialQty":
      case "pyramid1Qty":
      case "pyramid2Qty":
      case "exit1Qty":
      case "exit2Qty":
      case "exit3Qty":
        return <EditableCell key={`${trade.id}-${columnKey}`} value={cellValue as number} type="number" onSave={(value) => handleInlineEditSave(trade.id, columnKey as keyof Trade, value)} tradeId={trade.id} field={columnKey} />;

      // Non-editable calculated quantity fields
      case "positionSize":
      case "openQty":
      case "exitedQty":
      case "holdingDays":
        return (
          <div className="py-1 px-2 text-right whitespace-nowrap">
            {formatCellValue(cellValue, columnKey)}
          </div>
        );

      // Non-editable calculated percentage fields
      case "allocation":
      case "stockMove":
        return (
          <div className="py-1 px-2 text-right whitespace-nowrap">
            {formatCellValue(cellValue, columnKey)}
          </div>
        );
      case "pfImpact":
        const pfImpactValues = getAccountingAwareValues(trade);
        return (
          <div className="py-1 px-2 text-right whitespace-nowrap">
            {formatCellValue(pfImpactValues.pfImpact, columnKey)}
          </div>
        );
      case "cummPf":
        return (
          <div className="py-1 px-2 text-right whitespace-nowrap">
            {formatCellValue(cellValue, columnKey)}
          </div>
        );
      // Non-editable calculated reward:risk field
      case "rewardRisk":
        return (
          <div className="py-1 px-2 text-right whitespace-nowrap">
            {formatCellValue(cellValue, columnKey)}
          </div>
        );
      case "buySell":
        return <BuySellCell key={`${trade.id}-buySell`} value={trade.buySell} onSave={(value) => handleInlineEditSave(trade.id, "buySell", value)} />;
      case "positionStatus":
        return <PositionStatusCell key={`${trade.id}-positionStatus`} value={trade.positionStatus} onSave={(value) => handleInlineEditSave(trade.id, "positionStatus", value)} />;
      case "planFollowed":
        return <PlanFollowedCell key={`${trade.id}-planFollowed`} value={trade.planFollowed} onSave={(value) => handleInlineEditSave(trade.id, "planFollowed", value)} />;
      case "slPercent":
        const slPercent = calcSLPercent(trade.sl, trade.entry);
        return (
          <div className="text-right font-medium text-small whitespace-nowrap">
            {slPercent > 0 ? `${slPercent.toFixed(2)}%` : "-"}
          </div>
        );
      case "chartAttachments":
        const hasBeforeEntry = trade.chartAttachments?.beforeEntry;
        const hasAfterExit = trade.chartAttachments?.afterExit;

        // Force re-render by using a key that includes chart attachment info
        const chartKey = `${trade.id}-${hasBeforeEntry?.id || 'no-before'}-${hasAfterExit?.id || 'no-after'}`;

        // Debug logging for chart attachments
        if (trade.name === 'ASIANHOTNR' || trade.name === 'RELIANCE') { // Add your test trade names here
          console.log(`📊 [ChartAttachments] Rendering for ${trade.name}:`, {
            hasBeforeEntry: !!hasBeforeEntry,
            hasAfterExit: !!hasAfterExit,
            beforeEntryId: hasBeforeEntry?.id,
            afterExitId: hasAfterExit?.id,
            chartAttachments: trade.chartAttachments
          });
        }

        if (!hasBeforeEntry && !hasAfterExit) {
          return (
            <div key={chartKey} className="flex items-center justify-center gap-1 py-1 px-2">
              <span className="text-gray-400 text-xs">No charts</span>
            </div>
          );
        }

        return (
          <div key={chartKey} className="flex items-center justify-center gap-1 py-1 px-2">
            {hasBeforeEntry && (
              <Tooltip content="View Before Entry Chart">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => handleChartImageView(
                    hasBeforeEntry,
                    `${trade.name} - Before Entry Chart`
                  )}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <Icon icon="lucide:trending-up" className="w-4 h-4" />
                </Button>
              </Tooltip>
            )}
            {hasAfterExit && (
              <Tooltip content="View After Exit Chart">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => handleChartImageView(
                    hasAfterExit,
                    `${trade.name} - After Exit Chart`
                  )}
                  className="text-green-500 hover:text-green-600"
                >
                  <Icon icon="lucide:trending-down" className="w-4 h-4" />
                </Button>
              </Tooltip>
            )}
            {(hasBeforeEntry || hasAfterExit) && (
              <div className="text-xs text-gray-500 ml-1">
                {hasBeforeEntry && hasAfterExit ? '2' : '1'}
              </div>
            )}
          </div>
        );
      case "actions":
        return (
          <div className="flex items-center justify-end gap-1">
            <Tooltip content="Edit trade (modal)">
              <Button
                isIconOnly
                variant="light"
                onPress={() => handleEdit(trade)}
                className="w-5 h-5 min-w-5 rounded p-0.5 hover:bg-primary/10 transition"
              >
                <Icon icon="lucide:edit-3" className="w-3 h-3" />
              </Button>
            </Tooltip>
            <Tooltip content="Delete trade">
              <Button
                isIconOnly
                variant="light"
                color="danger"
                onPress={() => handleDelete(trade)}
                className="w-5 h-5 min-w-5 rounded p-0.5 hover:bg-danger/10 transition"
              >
                <Icon icon="lucide:trash-2" className="w-3 h-3" />
              </Button>
            </Tooltip>
          </div>
        );
      case 'unrealizedPL':
        if (trade.positionStatus === 'Open' || trade.positionStatus === 'Partial') {
          return (
            <div className="py-1 px-2 text-right whitespace-nowrap">
              {formatCellValue(calcUnrealizedPL(trade.avgEntry, trade.cmp, trade.openQty, trade.buySell), 'plRs')}
            </div>
          );
        } else {
          return <div className="py-1 px-2 text-right whitespace-nowrap">-</div>;
        }

      case 'notes':
        return (
          <NotesCell
            key={`${trade.id}-notes`}
            value={trade.notes || ''}
            onSave={(value) => handleInlineEditSave(trade.id, 'notes', value)}
          />
        );
      default:
        const val = trade[columnKey as keyof Trade];
        return val !== undefined && val !== null ? String(val) : "-";
    }
  }, [editingId, handleInlineEditSave, isEditable, portfolioSize, getPortfolioSize]);

  // Stable stats calculation - prevent layout shifts and excessive recalculation
  const [statsLoaded, setStatsLoaded] = React.useState(true); // Start as loaded to prevent layout shift
  const [lazyStats, setLazyStats] = React.useState({
    totalUnrealizedPL: 0,
    openPfImpact: 0,
    totalRealizedPL: 0,
    realizedPfImpact: 0,
    openHeat: 0,
    winRate: 0
  });

  // Stats calculation that responds to trade data changes
  const stableStatsCalculation = React.useMemo(() => {
    if (originalTrades.length === 0) {
      return {
        totalUnrealizedPL: 0,
        openPfImpact: 0,
        totalRealizedPL: 0,
        realizedPfImpact: 0,
        openHeat: 0,
        winRate: 0
      };
    }

    // CRITICAL FIX: Use processedTrades for stats calculation to include local updates
    const tradesForStats = processedTrades;

    // Debug: Check dataset consistency (ALWAYS LOG)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [Dataset Check] useCashBasis=${useCashBasis}, originalTrades: ${originalTrades.length}, trades: ${trades.length}, tradesForStats: ${tradesForStats.length}`);
    }

    // Calculate unrealized P/L for open positions using filtered trades to respond to search
    // For cash basis, we need to be careful not to double count, so we'll use a Set to track original trade IDs
    let unrealizedPL = 0;
    if (useCashBasis) {
      // For cash basis, only count each original trade once for unrealized P/L
      const processedTradeIds = new Set();
      tradesForStats
        .filter(trade => trade.positionStatus === 'Open' || trade.positionStatus === 'Partial')
        .forEach(trade => {
          const originalId = trade.id.split('_exit_')[0]; // Get original trade ID
          if (!processedTradeIds.has(originalId)) {
            processedTradeIds.add(originalId);
            unrealizedPL += calcUnrealizedPL(trade.avgEntry, trade.cmp, trade.openQty, trade.buySell);
          }
        });
    } else {
      // For accrual basis, straightforward calculation
      unrealizedPL = tradesForStats
        .filter(trade => trade.positionStatus === 'Open' || trade.positionStatus === 'Partial')
        .reduce((sum, trade) => sum + calcUnrealizedPL(trade.avgEntry, trade.cmp, trade.openQty, trade.buySell), 0);
    }

    const openImpact = portfolioSize > 0 ? (unrealizedPL / portfolioSize) * 100 : 0;

    // Calculate realized P/L based on accounting method using processed trades
    let realizedTrades;
    if (useCashBasis) {
      // For cash basis: flatten all expanded trades from _expandedTrades arrays
      realizedTrades = processedTrades.flatMap(trade =>
        Array.isArray(trade._expandedTrades)
          ? trade._expandedTrades.filter(t => t._cashBasisExit)
          : (trade._cashBasisExit ? [trade] : [])
      );
      if (process.env.NODE_ENV === 'development') {
        console.log('[CASH BASIS FIX] Using all expanded trades for realized P/L:', realizedTrades.map(t => ({ id: t.id, pl: calculateTradePL(t, true) })));
      }
    } else {
      // For accrual basis: include all non-open trades
      realizedTrades = processedTrades.filter(trade => trade.positionStatus !== 'Open');
    }



    let debugSum = 0;
    const realizedPL = realizedTrades.reduce((sum, trade, index) => {
      const tradePL = calculateTradePL(trade, useCashBasis);
      debugSum += tradePL;

      // Detailed debug log for each trade's realized P/L calculation
      if (process.env.NODE_ENV === 'development') {
        console.log(`[P/L DEBUG] Trade #${index} | ID: ${trade.id} | Name: ${trade.name} | useCashBasis: ${useCashBasis}`);
        console.log(`[P/L DEBUG] Trade object:`, trade);
        console.log(`[P/L DEBUG] Realized P/L for this trade: ₹${tradePL.toFixed(2)} | Running sum: ₹${(sum + tradePL).toFixed(2)}`);
      }

      // Debug: Track every addition for cash basis
      if (process.env.NODE_ENV === 'development' && useCashBasis && Math.abs(tradePL) > 100) {
        console.log(`💰 [Sum Debug ${index}] ${trade.name}: +₹${tradePL.toFixed(2)} → Total: ₹${(sum + tradePL).toFixed(2)}`);
      }

      return sum + tradePL;
    }, 0);

    // Debug: Compare final sums and do a manual calculation (ALWAYS LOG)
    if (process.env.NODE_ENV === 'development') {


      if (useCashBasis) {
        // Manual calculation to verify
        const manualSum = realizedTrades.reduce((sum, trade) => {
          const pl = calculateTradePL(trade, true);
          return sum + pl;
        }, 0);


      }
    }

    // Debug logging for both accounting methods
    if (process.env.NODE_ENV === 'development') {
      console.log(`💰 [${useCashBasis ? 'Cash' : 'Accrual'} Basis] Realized trades: ${realizedTrades.length}, Total P/L: ₹${realizedPL.toFixed(2)}`);

      if (useCashBasis) {
        // Compare with accrual calculation
        const accrualTrades = tradesForStats.filter(trade => trade.positionStatus !== 'Open');
        const accrualPL = accrualTrades.reduce((sum, trade) => sum + calculateTradePL(trade, false), 0);
        console.log(`💰 [Comparison] Accrual would be: ${accrualTrades.length} trades, ₹${accrualPL.toFixed(2)}`);

        // Check for duplicates in cash basis
        const expandedTrades = realizedTrades.filter(t => t._cashBasisExit);
        const originalTrades = realizedTrades.filter(t => !t._cashBasisExit);
        console.log(`💰 [Cash Breakdown] Expanded: ${expandedTrades.length}, Original: ${originalTrades.length}`);

        // Check for potential double counting
        const originalTradeIds = new Set(originalTrades.map(t => t.id.split('_exit_')[0]));
        const expandedTradeIds = new Set(expandedTrades.map(t => t.id.split('_exit_')[0]));
        const overlap = [...originalTradeIds].filter(id => expandedTradeIds.has(id));
        if (overlap.length > 0) {
          console.log(`⚠️ [Double Counting] ${overlap.length} trades appear in both expanded and original:`, overlap);
        }
      }
    }

    // Calculate realized PF Impact using accounting-aware portfolio sizes (same as tooltip)
    const realizedImpact = realizedTrades.reduce((sum, trade) => {
      const pfImpact = useCashBasis
        ? (trade._cashPfImpact ?? 0)
        : (trade._accrualPfImpact ?? trade.pfImpact ?? 0);
      return sum + pfImpact;
    }, 0);

    // Calculate open heat using filtered trades to respond to search
    // For cash basis, avoid double counting by using original trade IDs
    let filteredTradesForOpenHeat = tradesForStats;
    if (useCashBasis) {
      // For cash basis, only include each original trade once
      const seenTradeIds = new Set();
      filteredTradesForOpenHeat = tradesForStats.filter(trade => {
        const originalId = trade.id.split('_exit_')[0];
        if (seenTradeIds.has(originalId)) {
          return false;
        }
        seenTradeIds.add(originalId);
        return true;
      });
    }
    const openHeat = calcOpenHeat(filteredTradesForOpenHeat, portfolioSize, getPortfolioSize);

    // Calculate win rate using processed trades for cash basis
    let tradesWithAccountingPL;

    if (useCashBasis) {
      // For cash basis: Group trades by original ID and calculate total P/L per original trade
      const tradeGroups = new Map<string, Trade[]>();

      tradesForStats
        .filter(trade => trade._cashBasisExit || trade.positionStatus !== 'Open')
        .forEach(trade => {
          const originalId = trade.id.split('_exit_')[0];
          if (!tradeGroups.has(originalId)) {
            tradeGroups.set(originalId, []);
          }
          tradeGroups.get(originalId)!.push(trade);
        });

      // Calculate total P/L for each original trade
      tradesWithAccountingPL = Array.from(tradeGroups.entries()).map(([originalId, trades]) => {
        // Sum up P/L from all exits for this trade
        const totalPL = trades.reduce((sum, trade) => {
          return sum + calculateTradePL(trade, useCashBasis);
        }, 0);

        // Use the first trade as the representative (they all have the same original data)
        const representativeTrade = trades[0];



        return {
          ...representativeTrade,
          id: originalId, // Use original ID
          accountingPL: totalPL
        };
      });
    } else {
      // For accrual basis: Use trades as-is
      tradesWithAccountingPL = tradesForStats
        .filter(trade => trade.positionStatus !== 'Open')
        .map(trade => ({
          ...trade,
          accountingPL: calculateTradePL(trade, useCashBasis)
        }));
    }

    const winningTrades = tradesWithAccountingPL.filter(t => t.accountingPL > 0);
    const winRate = tradesWithAccountingPL.length > 0 ? (winningTrades.length / tradesWithAccountingPL.length) * 100 : 0;

    console.log('🔍 [Win Rate Debug] Final calculation:', {
      totalTrades: tradesWithAccountingPL.length,
      winningTrades: winningTrades.length,
      winRate: winRate,
      useCashBasis
    });

    return {
      totalUnrealizedPL: unrealizedPL,
      openPfImpact: openImpact,
      totalRealizedPL: realizedPL,
      realizedPfImpact: realizedImpact,
      openHeat,
      winRate
    };
  }, [trades, originalTrades, portfolioSize, useCashBasis, getPortfolioSize]); // Now responds to all trade data changes

  // Update lazy stats when stable calculation changes
  React.useEffect(() => {
    setLazyStats(stableStatsCalculation);
  }, [stableStatsCalculation]);





  // Memoize open trades to prevent unnecessary price fetching (use processed trades to include local updates)
  const openTrades = React.useMemo(() => {
    let filteredOpenTrades = processedTrades.filter(t => t.positionStatus === 'Open' || t.positionStatus === 'Partial');

    // For cash basis, avoid double counting by using original trade IDs
    if (useCashBasis) {
      const seenTradeIds = new Set();
      filteredOpenTrades = filteredOpenTrades.filter(t => {
        const originalId = t.id.split('_exit_')[0];
        if (seenTradeIds.has(originalId)) return false;
        seenTradeIds.add(originalId);
        return true;
      });
    }

    return filteredOpenTrades;
  }, [processedTrades, useCashBasis]);

  // Memoize the price fetching function to prevent re-creation
  const fetchPricesForOpenTrades = React.useCallback(async () => {
    console.log(`[fetchPricesForOpenTrades] Fetching prices for ${openTrades.length} open trades`);

    for (const trade of openTrades) {
      if (trade.name) {
        try {
          console.log(`[fetchPricesForOpenTrades] Fetching price for ${trade.name}`);
          let priceData;

          // Use smart fetch that prioritizes historical fallback during night hours (3:55-9:15 AM)
          priceData = await fetchPriceTicksSmart(trade.name);

          const ticks = priceData?.data?.ticks?.[trade.name.toUpperCase()];
          if (ticks && ticks.length > 0) {
            const latestTick = ticks[ticks.length - 1];
            const newPrice = latestTick[4];

            if (trade.cmp !== newPrice) {
              console.log(`[fetchPricesForOpenTrades] Updating ${trade.name} price from ${trade.cmp} to ${newPrice}`);
              updateTrade({ ...trade, cmp: newPrice, _cmpAutoFetched: true });
            }
          } else {
            console.warn(`[fetchPricesForOpenTrades] No price data available for ${trade.name}`);
          }
        } catch (err) {
          console.error(`[fetchPricesForOpenTrades] All price fetch attempts failed for ${trade.name}:`, err);
          // Continue with next trade instead of stopping
        }
      }
    }
  }, [openTrades, updateTrade]);

  useEffect(() => {
    // Immediate fetch on mount or open trades change
    fetchPricesForOpenTrades();

    // Continue polling every 15 seconds
    const interval = setInterval(fetchPricesForOpenTrades, 15000);
    return () => clearInterval(interval);
  }, [fetchPricesForOpenTrades]);

  return (
    <div className="space-y-4">
      {/* Work in Progress Banner */}
      <Card className="border-warning/50 bg-warning/5">
        <CardBody className="p-3">
          <div className="flex items-center gap-3">
            <Icon icon="lucide:construction" className="text-warning w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-warning-700 dark:text-warning-300">
                CSV Import Feature Under Development
              </h3>
              <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                We're working on improving the CSV import functionality. Manual trade entry is fully functional.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Custom CSS for sticky name column */}
      <style>{`
        .sticky-name-header {
          position: sticky !important;
          left: 0 !important;
          z-index: 30 !important;
          background: rgb(244 244 245) !important; /* bg-default-100 */
          min-width: 200px !important;
          max-width: 200px !important;
        }
        .sticky-name-cell {
          position: sticky !important;
          left: 0 !important;
          z-index: 20 !important;
          background: white !important;
          min-width: 200px !important;
          max-width: 200px !important;
        }
        .dark .sticky-name-header {
          background: rgb(17 24 39) !important; /* dark:bg-gray-950 */
        }
        .dark .sticky-name-cell {
          background: rgb(17 24 39) !important; /* dark:bg-gray-900 */
        }
      `}</style>

      <div className="flex flex-col gap-4 mb-6">
        <AnimatePresence>
          {/* <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          </div> */}
          <div className="flex flex-row justify-between items-center gap-4 w-full">
            <div className="flex items-center gap-3 flex-1">
              <Input
                classNames={{
                  base: "max-w-[300px]",
                  inputWrapper: "h-9 bg-content2 dark:bg-gray-900",
                  input: "text-foreground dark:text-white"
                }}
                placeholder="Search trades..."
                startContent={<Icon icon="lucide:search" className="text-default-400 dark:text-default-300" />}
                value={searchQuery}
                onValueChange={setSearchQuery}
                size="sm"
              />
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant="flat"
                    size="sm"
                    className="bg-default-100 dark:bg-gray-900 text-foreground dark:text-white min-w-[120px] h-9"
                    endContent={<Icon icon="lucide:chevron-down" className="text-sm dark:text-gray-400" />}
                  >
                    Status: {statusFilter || "All"}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Status filter"
                  className="dark:bg-gray-900"
                  selectionMode="single"
                  selectedKeys={statusFilter ? [statusFilter] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setStatusFilter(selected === "All" ? "" : selected);
                  }}
                  classNames={{
                    base: "dark:bg-gray-900",
                  }}
                >
                  <DropdownItem key="All" className="dark:text-white dark:hover:bg-gray-800">All</DropdownItem>
                  <DropdownItem key="Open" className="dark:text-white dark:hover:bg-gray-800">Open</DropdownItem>
                  <DropdownItem key="Closed" className="dark:text-white dark:hover:bg-gray-800">Closed</DropdownItem>
                  <DropdownItem key="Partial" className="dark:text-white dark:hover:bg-gray-800">Partial</DropdownItem>
                </DropdownMenu>
              </Dropdown>

              {/* Temporary debug button to clear filters */}
              {(searchQuery || statusFilter) && (
                <Button
                  size="sm"
                  variant="flat"
                  color="warning"
                  onPress={() => {
                    setSearchQuery('');
                    setStatusFilter('');

                  }}
                  startContent={<Icon icon="lucide:x" />}
                >
                  Clear Filters
                </Button>
              )}



              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant="flat"
                    size="sm"
                    className="bg-default-100 dark:bg-gray-900 text-foreground dark:text-white min-w-[120px] h-9"
                    endContent={<Icon icon="lucide:chevron-down" className="text-sm dark:text-gray-400" />}
                  >
                    Columns
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Columns selection"
                  className="dark:bg-gray-900 max-h-60 overflow-y-auto"
                  closeOnSelect={false}
                  selectionMode="multiple"
                  selectedKeys={new Set(visibleColumns)}
                  onSelectionChange={(keys) => setVisibleColumns(Array.from(keys as Set<string>))}
                  classNames={{
                    base: "dark:bg-gray-900",
                  }}
                >
                  {/* Select All / Deselect All Controls */}
                  <DropdownItem
                    key="select-all"
                    className="dark:text-white transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] hover:bg-primary/10 dark:hover:bg-primary/20"
                    startContent={
                      <Icon
                        icon={visibleColumns.length === allColumns.length ? "lucide:check-square-2" : "lucide:square"}
                        className={`text-sm transition-all duration-200 group-hover:scale-110 ${
                          visibleColumns.length === allColumns.length ? "text-primary" : "text-default-400"
                        }`}
                      />
                    }
                    onPress={() => {
                      // Add haptic feedback
                      if (navigator.vibrate) {
                        navigator.vibrate(15);
                      }

                      const allColumnKeys = allColumns.map(col => col.key);
                      setVisibleColumns(allColumnKeys);

                      // Visual feedback
                      const element = document.querySelector('[data-key="select-all"]');
                      if (element) {
                        element.classList.add('animate-pulse');
                        setTimeout(() => element.classList.remove('animate-pulse'), 200);
                      }
                    }}
                  >
                    Select All
                  </DropdownItem>
                  <DropdownItem
                    key="deselect-all"
                    className="dark:text-white border-b border-divider mb-1 pb-2 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] hover:bg-default/10 dark:hover:bg-default/20"
                    startContent={
                      <Icon
                        icon={visibleColumns.length <= 6 ? "lucide:square" : "lucide:minus-square"}
                        className={`text-sm transition-all duration-200 group-hover:scale-110 ${
                          visibleColumns.length <= 6 ? "text-default-400" : "text-default-500"
                        }`}
                      />
                    }
                    onPress={() => {
                      // Add haptic feedback
                      if (navigator.vibrate) {
                        navigator.vibrate(15);
                      }

                      // Keep essential columns visible including actions
                      const essentialColumns = ["tradeNo", "date", "name", "buySell", "positionStatus", "actions"];
                      setVisibleColumns(essentialColumns);

                      // Visual feedback
                      const element = document.querySelector('[data-key="deselect-all"]');
                      if (element) {
                        element.classList.add('animate-pulse');
                        setTimeout(() => element.classList.remove('animate-pulse'), 200);
                      }
                    }}
                  >
                    Deselect All
                  </DropdownItem>

                  {/* Column Selection Items - Include ALL columns including actions */}
                  <React.Fragment>
                    {allColumns.map((column) => (
                      <DropdownItem key={column.key} className="capitalize dark:text-white dark:hover:bg-gray-800">
                        {column.label}
                      </DropdownItem>
                    ))}
                  </React.Fragment>
                </DropdownMenu>
              </Dropdown>
            </div>

            <motion.div
              className="flex items-center gap-0.5"
            >
              <Tooltip content="Browse All Chart Images">
                <Button
                  isIconOnly
                  variant="light"
                  onPress={() => setIsUniversalViewerOpen(true)}
                  className="w-6 h-6 min-w-6 rounded p-0.5 hover:bg-primary/10 transition"
                >
                  <Icon icon="lucide:images" className="w-3 h-3" />
                </Button>
              </Tooltip>
              <Button
                isIconOnly
                color="primary"
                variant="light"
                onPress={onAddOpen}
                className="w-6 h-6 min-w-6 rounded p-0.5 hover:bg-primary/10 transition"
              >
                <Icon icon="lucide:plus" className="w-3 h-3" />
              </Button>
            </motion.div>
            <MobileTooltip content="CSV Import - Work in Progress" placement="top">
              <Button
                isIconOnly
                variant="light"
                className="w-6 h-6 min-w-6 rounded p-0.5 opacity-50 cursor-not-allowed"
                isDisabled={true}
              >
                <Icon icon="lucide:construction" className="w-3 h-3 text-warning" />
              </Button>
            </MobileTooltip>
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  variant="light"
                  className="w-6 h-6 min-w-6 rounded p-0.5 hover:bg-primary/10 transition"
                >
                  <Icon icon="lucide:download" className="w-3 h-3" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Export options"
                onAction={(key) => handleExport(key as 'csv' | 'xlsx')}
              >
                <DropdownItem key="csv" startContent={<Icon icon="lucide:file-text" />}>
                  Export as CSV
                </DropdownItem>
                <DropdownItem key="xlsx" startContent={<Icon icon="lucide:file-spreadsheet" />}>
                  Export as Excel
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        {/* First three stats: Total Trades, Open Positions, Win Rate - Simple calculations */}
        {[{
          title: statsTitle.totalTrades,
          value: trades.length.toString(),
          icon: "lucide:list",
          color: "primary",
          tooltip: `Total number of trades ${useCashBasis ? '(expanded for individual exits)' : 'you have recorded'} matching current search/filter.`
        }, {
          title: statsTitle.openPositions,
          value: (() => {
            // Count open positions from filtered trades, avoiding double counting for cash basis
            if (useCashBasis) {
              const seenTradeIds = new Set();
              return trades.filter(t => {
                if (t.positionStatus !== "Open") return false;
                const originalId = t.id.split('_exit_')[0];
                if (seenTradeIds.has(originalId)) return false;
                seenTradeIds.add(originalId);
                return true;
              }).length.toString();
            } else {
              return trades.filter(t => t.positionStatus === "Open").length.toString();
            }
          })(),
          icon: "lucide:activity",
          color: "warning",
          tooltip: "Number of trades that are currently open (filtered by search)."
        }, {
          title: statsTitle.winRate,
          value: `${lazyStats.winRate.toFixed(2)}%`,
          icon: "lucide:target",
          color: "success",
          tooltip: `Percentage of trades that are profitable (${useCashBasis ? 'Cash Basis' : 'Accrual Basis'}) matching current search/filter.`
        }].map((stat, idx) => (
          <div key={stat.title} className="flex items-center gap-2">
            <StatsCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={idx === 0 ? "primary" : idx === 1 ? "warning" : "success"}
            />
            {/* Show info icon only on mobile for first three stats */}
            <div className="block sm:hidden">
              <MobileTooltip
                placement="top"
                className="max-w-xs text-xs p-1 bg-content1 border border-divider"
                content={<div>{stat.tooltip}</div>}
              >
                <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer inline-block align-middle ml-2" />
              </MobileTooltip>
            </div>
          </div>
        ))}
        {/* Last three stats: Realized P/L, Unrealized P/L, Open Heat - No more lazy loading */}
        <div className="flex items-center gap-2">
          <StatsCard
            title="Realized P/L"
            value={formatCurrency(lazyStats.totalRealizedPL)}
            icon="lucide:indian-rupee"
            color={lazyStats.totalRealizedPL >= 0 ? "success" : "danger"}
          />
          <MobileTooltip
            key={`realized-tooltip-${useCashBasis}-${processedTrades.length}-${lazyStats.totalRealizedPL}`}
            placement="top"
            className="max-w-xs text-xs p-1 bg-content1 border border-divider"
            content={(() => {

              // Use filtered trades for tooltip breakdown to respond to search
              // CRITICAL FIX: Use the same logic as main stats calculation for consistency
              let closedTrades: Array<Trade & { realizedPL: number; pfImpact: number }>;
              if (useCashBasis) {
                // CRITICAL FIX: Use the same logic as main stats calculation
                // For cash basis: Get all expanded trades that have _cashBasisExit
                const realizedTradesFlat = processedTrades.flatMap(trade =>
                  Array.isArray(trade._expandedTrades)
                    ? trade._expandedTrades.filter(t => t._cashBasisExit)
                    : (trade._cashBasisExit ? [trade] : [])
                );

                // Group by original ID and calculate total P/L per original trade
                const tradeGroups = new Map<string, Trade[]>();
                realizedTradesFlat.forEach(trade => {
                  const originalId = trade.id.split('_exit_')[0];
                  if (!tradeGroups.has(originalId)) {
                    tradeGroups.set(originalId, []);
                  }
                  tradeGroups.get(originalId)!.push(trade);
                });

                // Calculate total P/L for each original trade
                closedTrades = Array.from(tradeGroups.entries()).map(([originalId, trades]) => {
                  // Sum up P/L from all exits for this trade
                  const totalPL = trades.reduce((sum, trade) => {
                    return sum + calculateTradePL(trade, useCashBasis);
                  }, 0);

                  // Use the first trade as the representative (they all have the same original data)
                  const representativeTrade = trades[0];

                  return {
                    ...representativeTrade,
                    id: originalId, // Use original ID
                    realizedPL: totalPL,
                    // Calculate total PF impact from all exits
                    pfImpact: trades.reduce((sum, trade) => sum + (trade._cashPfImpact ?? 0), 0)
                  };
                });
              } else {
                // For accrual basis: Use trades as-is
                closedTrades = processedTrades
                  .filter(t => t.positionStatus === 'Closed' || t.positionStatus === 'Partial')
                  .map(t => ({
                    ...t,
                    realizedPL: calculateTradePL(t, useCashBasis),
                    pfImpact: t._accrualPfImpact ?? t.pfImpact ?? 0
                  }));
              }

              const breakdown = closedTrades
                .map(t => ({
                  name: t.name || 'N/A',
                  realizedPL: t.realizedPL,
                  pfImpact: t.pfImpact
                }))
                .filter(t => Math.abs(t.realizedPL) > 0.01) // Filter out negligible amounts
                .sort((a, b) => Math.abs(b.realizedPL) - Math.abs(a.realizedPL)); // Sort by absolute value

              return (
                <div className="max-w-sm">
                  <div className="mb-2">
                    <div className="font-medium text-foreground-700">
                      <strong>PF Impact:</strong> {lazyStats.realizedPfImpact.toFixed(2)}%
                    </div>
                    <div className="text-foreground-400 text-xs">
                      This is the % of your portfolio that is realized as profit/loss.
                    </div>

                  </div>

                  {breakdown.length > 0 ? (
                    <div>
                      <div className="text-xs font-medium text-foreground-600 mb-2 border-b border-divider pb-1">
                        Top Realized Trades:
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {breakdown.slice(0, 10).map((t, idx) => ( // Show top 10
                          <div key={`${t.name}-${idx}`} className="flex justify-between items-center text-xs">
                            <span className="truncate max-w-[100px]" title={t.name}>
                              {t.name}
                            </span>
                            <div className="flex flex-col items-end ml-2">
                              <span className={`font-mono font-medium whitespace-nowrap ${
                                t.realizedPL >= 0 ? 'text-success' : 'text-danger'
                              }`}>
                                ₹{formatCurrency(t.realizedPL)}
                              </span>
                              <span className={`font-mono text-xs ${
                                t.pfImpact >= 0 ? 'text-success' : 'text-danger'
                              }`}>
                                ({t.pfImpact >= 0 ? '+' : ''}{t.pfImpact.toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {breakdown.length > 10 && (
                        <div className="text-xs text-foreground-400 mt-2 pt-1 border-t border-divider">
                          Showing top 10 of {breakdown.length} realized trades
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-foreground-400 text-xs">No realized trades</div>
                  )}
                </div>
              );
            })()}
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer inline-block align-middle ml-2" />
          </MobileTooltip>
        </div>
        <div className="flex items-center gap-2">
          <StatsCard
            title="Unrealized P/L"
            value={formatCurrency(lazyStats.totalUnrealizedPL)}
            icon="lucide:indian-rupee"
            color={lazyStats.totalUnrealizedPL >= 0 ? "success" : "danger"}
          />
          <MobileTooltip
            placement="top"
            className="max-w-xs text-xs p-1 bg-content1 border border-divider"
            content={(() => {

              // Use filtered trades for unrealized P/L tooltip to respond to search
              let openTrades = trades.filter(t => (t.positionStatus === 'Open' || t.positionStatus === 'Partial'));

              // For cash basis, avoid double counting in tooltip
              if (useCashBasis) {
                const seenTradeIds = new Set();
                openTrades = openTrades.filter(t => {
                  const originalId = t.id.split('_exit_')[0];
                  if (seenTradeIds.has(originalId)) return false;
                  seenTradeIds.add(originalId);
                  return true;
                });
              }
              const breakdown = openTrades
                .map(t => {
                  const unrealizedPL = calcUnrealizedPL(t.avgEntry, t.cmp, t.openQty, t.buySell);
                  const pfImpact = portfolioSize > 0 ? (unrealizedPL / portfolioSize) * 100 : 0;
                  return {
                    name: t.name || 'N/A',
                    unrealizedPL: unrealizedPL,
                    pfImpact: pfImpact
                  };
                })
                .filter(t => Math.abs(t.unrealizedPL) > 0.01) // Filter out negligible amounts
                .sort((a, b) => b.unrealizedPL - a.unrealizedPL); // Sort by P/L value (highest first)

              return (
                <div>
                  <div className="mb-2 font-medium text-foreground-700">This is the % of your portfolio that is currently (unrealized).</div>
                  {breakdown.length > 0 ? (
                    <ul className="space-y-1">
                      {breakdown.map((t, idx) => (
                        <li key={`${t.name}-unrealized-${idx}`} className="flex justify-between items-center">
                          <span className="truncate max-w-[100px]" title={t.name}>{t.name}</span>
                          <div className="flex flex-col items-end ml-2">
                            <span className={`font-mono font-medium whitespace-nowrap ${t.unrealizedPL >= 0 ? 'text-success' : 'text-danger'}`}>
                              ₹{formatCurrency(t.unrealizedPL)}
                            </span>
                            <span className={`font-mono text-xs ${t.pfImpact >= 0 ? 'text-success' : 'text-danger'}`}>
                              ({t.pfImpact >= 0 ? '+' : ''}{t.pfImpact.toFixed(2)}%)
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-foreground-400">No unrealized positions</div>
                  )}
                </div>
              );
            })()}
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer inline-block align-middle ml-2" />
          </MobileTooltip>
        </div>
        <div className="flex items-center gap-1">
          <StatsCard
            title="Open Heat"
            value={`${lazyStats.openHeat.toFixed(2)}%`}
            icon="lucide:flame"
            color="warning"
          />
          <MobileTooltip
            placement="top"
            className="max-w-xs text-xs p-1 bg-content1 border border-divider"
            content={(() => {
              // Use filtered trades for open heat tooltip to respond to search
              let openTrades = trades.filter(t => (t.positionStatus === 'Open' || t.positionStatus === 'Partial'));

              // For cash basis, avoid double counting in tooltip
              if (useCashBasis) {
                const seenTradeIds = new Set();
                openTrades = openTrades.filter(t => {
                  const originalId = t.id.split('_exit_')[0];
                  if (seenTradeIds.has(originalId)) return false;
                  seenTradeIds.add(originalId);
                  return true;
                });
              }
              const breakdown = openTrades
                .map(t => ({
                  name: t.name || 'N/A',
                  risk: calcTradeOpenHeat(t, portfolioSize, getPortfolioSize)
                }))
                .filter(t => t.risk > 0)
                .sort((a, b) => b.risk - a.risk);
              return (
                <div>
                  <div className="mb-2 font-medium text-foreground-700">This is the % of your portfolio you will lose if all initial stops/TSLs are hit on your open/partial positions.</div>
                  {breakdown.length > 0 ? (
                    <ul className="space-y-1">
                      {breakdown.map((t, idx) => (
                        <li key={`${t.name}-risk-${idx}`} className="flex justify-between">
                          <span>{t.name}</span>
                          <span className="font-mono">{t.risk.toFixed(2)}%</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-foreground-400">No open risk</div>
                  )}
                </div>
              );
            })()}
          >
            <Icon icon="lucide:info" className="text-base text-foreground-400 cursor-pointer inline-block align-middle" />
          </MobileTooltip>
        </div>
      </div>

      {/* Background recalculation and stats loading indicators */}
      <AnimatePresence>
        {(isRecalculating || !statsLoaded) && (
          <motion.div
            key="loading-indicator"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg"
          >
            <Icon icon="lucide:calculator" className="text-primary animate-pulse" />
            <span className="text-sm text-primary font-medium">
              {isRecalculating
                ? "Recalculating trade metrics in background..."
                : "Loading statistics..."
              }
            </span>
            <CircularLoader size={16} color="text-primary" />
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border border-divider">
        <CardBody className="p-0">
          {/* Show empty state only when we're sure there are no trades and not loading */}
          {!isLoading && !isRecalculating && items.length === 0 && trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center min-h-[400px]">
              <div className="text-default-400 mb-2">
                <Icon
                  icon={trades.length === 0 ? "lucide:inbox" : "lucide:search-x"}
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                />
              </div>
              <div className="text-default-500 text-xl font-medium mb-2">
                {originalTrades.length === 0 ? "No trades found" : "No matching trades"}
              </div>
              <div className="text-default-400 text-base mb-6">
                {originalTrades.length === 0
                  ? "Add your first trade to get started"
                  : "Try adjusting your search or filter criteria"
                }
              </div>
              {originalTrades.length === 0 && (
                <Button
                  color="primary"
                  variant="shadow"
                  size="sm"
                  onPress={handleAddNewBlankTrade}
                  startContent={<Icon icon="lucide:plus" className="w-4 h-4" />}
                  className="font-medium px-4 py-1.5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all duration-300 shadow-lg shadow-primary/25 border-0 text-white rounded-full"
                >
                  Add Your First Trade
                </Button>
              )}
            </div>
          ) : (
            <>


              <div
                className="relative overflow-auto max-h-[70vh]
                  [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-2
                  [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-800
                  [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb:hover]:bg-gray-400
                  dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500"
                style={{
                  scrollbarWidth: 'thin', /* Firefox - thin horizontal only */
                  scrollbarColor: 'rgb(156 163 175) transparent' /* Firefox - thumb and track colors */
                }}
              >
            <Table
              aria-label="Trade journal table"
            bottomContent={
              shouldUseProgressiveLoading ? (
                // Progressive loading controls for large datasets
                <div className="flex w-full justify-center items-center gap-4 py-4">
                  {loadedTradesCount < trades.length ? (
                    <Button
                      color="primary"
                      variant="flat"
                      size="sm"
                      onPress={loadMoreTrades}
                      isLoading={isLoadingMore}
                      startContent={!isLoadingMore && <Icon icon="lucide:chevron-down" />}
                      className="min-w-[120px]"
                    >
                      {isLoadingMore ? 'Loading...' : `Load More (${trades.length - loadedTradesCount} remaining)`}
                    </Button>
                  ) : (
                    <div className="text-sm text-default-500">
                      All {trades.length} trades loaded
                    </div>
                  )}
                </div>
              ) : pages > 0 ? (
                // Traditional pagination for smaller datasets
                <div className="flex w-full justify-between items-center gap-4 py-2 px-4">
                  {/* Rows per page selector */}
                  <div className="flex items-center gap-2 text-sm text-default-500">
                    <span>Rows per page:</span>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          size="sm"
                          variant="bordered"
                          className="min-w-[60px] h-7"
                          endContent={<Icon icon="lucide:chevron-down" className="w-3 h-3" />}
                        >
                          {rowsPerPage}
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="Rows per page"
                        selectionMode="single"
                        selectedKeys={[String(rowsPerPage)]}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          const newRowsPerPage = Number(selected);
                          setRowsPerPage(newRowsPerPage);
                          setPage(1); // Reset to first page
                          // localStorage persistence is handled by the useEffect hook
                        }}
                      >
                        {rowsPerPageOptions.map(option => (
                          <DropdownItem key={String(option)}>{option}</DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                  </div>

                  {/* Pagination */}
                  <div tabIndex={-1}>
                    <Pagination
                      isCompact
                      showControls
                      showShadow={false}
                      color="primary"
                      size="sm"
                      variant="light"
                      page={page}
                      total={pages}
                      onChange={handlePageChange}
                      classNames={{
                        item: "rounded-full w-5 h-5 text-xs flex items-center justify-center",
                        cursor: "rounded-full w-5 h-5 text-xs flex items-center justify-center",
                        prev: "rounded-full w-5 h-5 text-xs flex items-center justify-center",
                        next: "rounded-full w-5 h-5 text-xs flex items-center justify-center",
                        ellipsis: "px-0.5 text-xs"
                      }}
                    />
                  </div>

                  {/* Trade count info */}
                  <div className="text-sm text-default-500">
                    {`${((page - 1) * rowsPerPage) + 1}-${Math.min(page * rowsPerPage, trades.length)} of ${trades.length}`}
                  </div>
                </div>
              ) : null
            }
              classNames={{
                base: "min-w-full",
                wrapper: "shadow-none p-0 rounded-none",
                table: "table-auto min-w-max",
                thead: "[&>tr]:first:shadow-none",
                th: "bg-default-100 dark:bg-gray-950 text-foreground-600 dark:text-white text-xs font-medium uppercase border-b border-default-200 dark:border-gray-800 sticky top-0 z-20 backdrop-blur-sm",
                td: "py-2.5 text-sm border-b border-default-200 dark:border-gray-800 text-foreground-800 dark:text-gray-200"
              }}
              removeWrapper
            sortDescriptor={sortDescriptor as HeroSortDescriptor}
            onSortChange={setSortDescriptor as (descriptor: HeroSortDescriptor) => void}
          >
            <TableHeader columns={headerColumns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  align={column.key === "actions" ? "end" : "start"}
                  allowsSorting={column.sortable}
                  className={column.key === "name" ? "sticky-name-header" : ""}
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              items={items}
              isLoading={isLoading}
              emptyContent={isLoading ? " " : ""}
            >
              {(item: Trade) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-default-50 dark:hover:bg-gray-800 dark:bg-gray-900 group"
                >
                  {headerColumns.map((column) => (
                    <TableCell
                      key={`${item.id}-${column.key}`}
                      className={column.key === "name" ? "sticky-name-cell" : ""}
                    >
                      {renderCell(item, column.key)}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
            </Table>
            {/* Sleek, small add inline trade icon below the table - only show when there are trades */}
            {items.length > 0 && (
              <div className="p-2 border-t border-divider bg-white dark:bg-gray-900">
                <MobileTooltip content="Add new trade (inline)" placement="top">
                  <Button
                    isIconOnly
                    color="primary"
                    variant="light"
                    onPress={handleAddNewBlankTrade}
                    size="sm"
                    className="mx-auto block"
                  >
                    <Icon icon="lucide:list-plus" className="text-lg" />
                  </Button>
                </MobileTooltip>
              </div>
            )}
            </div>
            </>
          )}
        </CardBody>
      </Card>

      <AnimatePresence>
        {isAddOpen && (
          <TradeModal
            key="add-trade-modal"
            isOpen={isAddOpen}
            onOpenChange={onAddOpenChange}
            onSave={handleAddTrade}
            mode="add"
            symbol={searchQuery} // Pass the search query as the initial symbol
          />
        )}

        {selectedTrade && (
          <React.Fragment key={`trade-modals-${selectedTrade.id}`}>
            <TradeModal
              key="edit-trade-modal"
              isOpen={isEditOpen}
              onOpenChange={handleEditModalClose}
              trade={selectedTrade}
              onSave={handleUpdateTrade}
              mode="edit"
              symbol={selectedTrade?.name || ''}
              isUploadOnlyMode={isUploadOnlyMode}
            />

            <DeleteConfirmModal
              key="delete-confirm-modal"
              isOpen={isDeleteOpen}
              onOpenChange={onDeleteOpenChange}
              onDelete={handleDeleteConfirm}
              tradeName={selectedTrade.name}
            />
          </React.Fragment>
        )}

        <TradeUploadModal
          key="upload-trade-modal"
          isOpen={isUploadOpen}
          onOpenChange={onUploadOpenChange}
          onImport={handleImportTrades}
          portfolioSize={portfolioSize}
          getPortfolioSize={getPortfolioSize}
        />
      </AnimatePresence>

      {/* Chart Image Viewer Modal */}
      <ChartImageViewer
        isOpen={isChartViewerOpen}
        onOpenChange={setIsChartViewerOpen}
        chartImage={chartViewerImage}
        title={chartViewerTitle}
      />

      {/* Universal Chart Viewer Modal */}
      <UniversalChartViewer
        isOpen={isUniversalViewerOpen}
        onOpenChange={setIsUniversalViewerOpen}
        initialChartImage={chartViewerImage}
        refreshTrigger={chartRefreshTrigger}
      />

    </div>
  );
});

interface StatsCardProps {
  title: string;
  value: string;
  icon: string;
  color: "primary" | "success" | "warning" | "danger";
  isLoading?: boolean;
}

// Smooth circular loading animation component
const CircularLoader: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = "text-gray-400" }) => (
  <>
    <style>{`
      @keyframes circular-dash {
        0% {
          stroke-dasharray: 1, 150;
          stroke-dashoffset: 0;
        }
        50% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -35;
        }
        100% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -124;
        }
      }
      .circular-loader {
        animation: spin 2s linear infinite, circular-dash 1.5s ease-in-out infinite;
      }
    `}</style>
    <div className="flex items-center justify-center">
      <svg
        className={color}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="opacity-25"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="31.416"
          strokeDashoffset="23.562"
          className="opacity-75 circular-loader"
        />
      </svg>
    </div>
  </>
);

// Lazy loading stats card with smooth circular loading animation
const LazyStatsCard: React.FC<StatsCardProps & { isLoading?: boolean }> = React.memo(function LazyStatsCard({
  title,
  value,
  icon,
  color,
  isLoading = false
}) {
  const getColors = () => {
    switch (color) {
      case "primary":
        return {
          bg: "bg-blue-50 dark:bg-blue-900/10",
          text: "text-blue-700 dark:text-blue-400",
          icon: "text-blue-600 dark:text-blue-400",
          loader: "text-blue-500"
        };
      case "success":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-900/10",
          text: "text-emerald-700 dark:text-emerald-400",
          icon: "text-emerald-600 dark:text-emerald-400",
          loader: "text-emerald-500"
        };
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-900/10",
          text: "text-amber-700 dark:text-amber-400",
          icon: "text-amber-600 dark:text-amber-400",
          loader: "text-amber-500"
        };
      case "danger":
        return {
          bg: "bg-red-50 dark:bg-red-900/10",
          text: "text-red-700 dark:text-red-400",
          icon: "text-red-600 dark:text-red-400",
          loader: "text-red-500"
        };
      default:
        return {
          bg: "bg-gray-50 dark:bg-gray-900/10",
          text: "text-gray-700 dark:text-gray-400",
          icon: "text-gray-600 dark:text-gray-400",
          loader: "text-gray-500"
        };
    }
  };

  const colors = getColors();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
        <CardBody className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {title}
              </p>
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-20 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <CircularLoader size={18} color={colors.loader} />
                </div>
              ) : (
                <motion.p
                  className={`text-2xl font-semibold tracking-tight ${colors.text}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {value}
                </motion.p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${colors.bg} ${colors.icon}`}>
              <Icon icon={icon} className="text-xl" />
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
});

// Keep the original StatsCard for simple stats that don't need lazy loading
const StatsCard: React.FC<StatsCardProps> = React.memo(function StatsCard({ title, value, icon, color }) {
  const getColors = () => {
    switch (color) {
      case "primary":
        return {
          bg: "bg-blue-50 dark:bg-blue-900/10",
          text: "text-blue-700 dark:text-blue-400",
          icon: "text-blue-600 dark:text-blue-400"
        };
      case "success":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-900/10",
          text: "text-emerald-700 dark:text-emerald-400",
          icon: "text-emerald-600 dark:text-emerald-400"
        };
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-900/10",
          text: "text-amber-700 dark:text-amber-400",
          icon: "text-amber-600 dark:text-amber-400"
        };
      case "danger":
        return {
          bg: "bg-red-50 dark:bg-red-900/10",
          text: "text-red-700 dark:text-red-400",
          icon: "text-red-600 dark:text-red-400"
        };
      default:
        return {
          bg: "bg-gray-50 dark:bg-gray-900/10",
          text: "text-gray-700 dark:text-gray-400",
          icon: "text-gray-600 dark:text-gray-400"
        };
    }
  };

  const colors = getColors();

  return (
    <Card className="border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
      <CardBody className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              {title}
            </p>
            <p className={`text-2xl font-semibold tracking-tight ${colors.text}`}>
              {value}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${colors.bg} ${colors.icon}`}>
            <Icon icon={icon} className="text-xl" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
});

interface EditableCellProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: "text" | "number" | "price" | "date" | "select";
  colorValue?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  tradeId?: string;
  field?: string;
}

const EditableCell: React.FC<EditableCellProps> = React.memo(function EditableCell({
  value,
  onSave,
  type = "text",
  colorValue = false,
  min,
  max,
  options,
  tradeId,
  field
}) {
  const [isEditing, setIsEditing] = React.useState(false);

  // Format date as dd-mm-yyyy for display and editing
  const formatDateForDisplay = (dateStr: string) => {
    try {
      if (!dateStr || dateStr.trim() === '') return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
    } catch (e) {
      return '';
    }
  };

  // Convert dd-mm-yyyy to yyyy-mm-dd for the native date input
  const convertToISODate = (displayDate: string) => {
    try {
      if (!displayDate || displayDate.trim() === '') return '';
      const parts = displayDate.split('-');
      if (parts.length !== 3) return '';
      const [day, month, year] = parts;
      if (!day || !month || !year || day === 'undefined' || month === 'undefined' || year === 'undefined') return '';
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  // Convert yyyy-mm-dd to ISO string
  const convertToFullISO = (dateStr: string) => {
    try {
      return new Date(dateStr).toISOString();
    } catch (e) {
      return '';
    }
  };

  const getInitialEditValue = React.useCallback(() => {
    if (type === 'date') {
      if (!value || value === '' || value === null || value === undefined) {
        return '';
      }
      return formatDateForDisplay(value as string);
    }
    return String(value ?? '');
  }, [type, value]);

  const [editValue, setEditValue] = React.useState(() => getInitialEditValue());
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Track editing state with ref to prevent unwanted updates during editing
  const isEditingRef = React.useRef(false);

  // Update the ref when editing state changes
  React.useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  // Update editValue when value prop changes, but only when not editing
  React.useEffect(() => {
    // Only update if not currently editing and the value has actually changed
    if (!isEditing && !isEditingRef.current) {
      const newEditValue = getInitialEditValue();
      if (newEditValue !== editValue) {
        setEditValue(newEditValue);
      }
    }
  }, [value, type, isEditing, getInitialEditValue, editValue]);

  const handleSave = () => {
    // Update refs and state to exit editing mode
    isEditingRef.current = false;
    setIsEditing(false);

    if (type === "number" || type === "price") {
      onSave(Number(editValue));
    } else if (type === "date") {
      if (editValue) {
        // Convert the dd-mm-yyyy to ISO string
        const isoDate = convertToFullISO(convertToISODate(editValue));
        onSave(isoDate);
      } else {
        onSave("");
      }
    } else {
      onSave(editValue);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Date selection completes editing
    isEditingRef.current = false;
    const isoDate = e.target.value; // yyyy-mm-dd
    if (isoDate) {
      const displayDate = formatDateForDisplay(isoDate);
      setEditValue(displayDate);
      onSave(convertToFullISO(isoDate));
    } else {
      setEditValue('');
      onSave('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(String(value));
    }
  };

  const getValueColor = () => {
    if (!colorValue || type !== "price") return "";
    const numValue = Number(value);
    return numValue < 0 ? "text-danger" : numValue > 0 ? "text-success" : "";
  };

  const handleFocus = () => {
    if (!isEditing) {
      // Update ref immediately to prevent race conditions
      isEditingRef.current = true;
      setEditValue(getInitialEditValue());
      setIsEditing(true);
    }
  };

  const inputTypeForHero = (): "text" | "number" | "date" => {
    if (type === "price") return "number";
    if (type === "select") return "text";
    return type as "text" | "number" | "date";
  };

  return (
    <motion.div
      className="relative"
      initial={false}
      animate={{ height: "auto" }}
      transition={{ duration: 0.2 }}
      data-editable-cell={tradeId && field ? "true" : undefined}
      data-trade-id={tradeId}
      data-field={field}
      tabIndex={tradeId && field ? 0 : undefined}
    >
      <AnimatePresence mode="wait">
        {type === "date" ? (
          <input
            type="date"
            className="h-7 px-2 rounded-md border border-divider bg-content1 dark:bg-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 hover:bg-content2 dark:hover:bg-gray-800 transition-colors cursor-pointer w-[130px]"
            value={convertToISODate(editValue)}
            onChange={handleDateChange}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isEditing ? (
              <Input
                ref={inputRef}
                type={inputTypeForHero()}
                value={editValue}
                onValueChange={(value) => {
                  // Ensure ref is set during typing to prevent unwanted updates
                  isEditingRef.current = true;
                  setEditValue(value);
                }}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                size="sm"
                variant="bordered"
                classNames={{
                  base: "w-full max-w-[160px]",
                  input: "text-right font-medium text-small py-0 dark:text-white",
                  inputWrapper: "h-7 min-h-unit-7 bg-content1 dark:bg-gray-900 shadow-sm"
                }}

                step={type === "price" ? "0.05" : undefined}
                min={min !== undefined ? min : (type === "price" ? 0 : undefined)}
                max={max !== undefined ? max : undefined}
              />
            ) : (
              <motion.div
                className="py-1 px-2 rounded-md cursor-text hover:bg-content2 dark:hover:bg-gray-800 transition-colors w-full max-w-[160px] dark:bg-gray-900 dark:text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  // Update ref immediately to prevent race conditions
                  isEditingRef.current = true;
                  setEditValue(getInitialEditValue());
                  setIsEditing(true);
                }}
                tabIndex={0}
                data-trade-id={tradeId}
                data-field={field}
                onFocus={handleFocus}
                onKeyDown={(e) => {
                  // Prevent default tab behavior since we handle it globally
                  if (e.key === 'Tab') {
                    e.preventDefault();
                  }
                  // Allow Enter to start editing
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFocus();
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  <span className={`font-medium text-small whitespace-nowrap ${getValueColor()}`}>
                    {type === "price" ? `₹${formatCurrency(value as number)}` : String(value)}
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

interface StockCellProps {
  name: string;
  setup: string;
  onSave: (field: "name" | "setup", value: string | number) => void;
}

const StockCell: React.FC<StockCellProps> = ({ name, setup, onSave }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="max-w-[200px]">
        <EditableCell
          value={name}
          onSave={(value) => onSave("name", value)}
        />
      </div>
    </div>
  );
};

interface BuySellCellProps {
  value: "Buy" | "Sell";
  onSave: (value: "Buy" | "Sell") => void;
}

const BuySellCell: React.FC<BuySellCellProps> = React.memo(function BuySellCell({ value, onSave }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger>
        <Button
          size="sm"
          variant={value === "Buy" ? "flat" : "bordered"}
          color={value === "Buy" ? "success" : "danger"}
          className="min-w-[80px] h-7"
          endContent={<Icon icon="lucide:chevron-down" className="w-3.5 h-3.5" />}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault(); // Let global handler manage tab navigation
            } else if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            // Auto-open dropdown when focused via tab navigation
            setTimeout(() => setIsOpen(true), 100);
          }}
        >
          {value}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Buy/Sell selection"
        selectionMode="single"
        selectedKeys={[value]}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as "Buy" | "Sell";
          onSave(selected);
          setIsOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        autoFocus
      >
        <DropdownItem key="Buy">Buy</DropdownItem>
        <DropdownItem key="Sell">Sell</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
});

interface PositionStatusCellProps {
  value: "Open" | "Closed" | "Partial";
  onSave: (value: "Open" | "Closed" | "Partial") => void;
}

const PositionStatusCell: React.FC<PositionStatusCellProps> = React.memo(function PositionStatusCell({ value, onSave }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger>
        <Button
          size="sm"
          variant="flat"
          color={
            value === "Open" ? "primary" :
            value === "Closed" ? "success" : "warning"
          }
          className="min-w-[90px] h-7 capitalize"
          endContent={<Icon icon="lucide:chevron-down" className="w-3.5 h-3.5" />}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
            } else if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            setTimeout(() => setIsOpen(true), 100);
          }}
        >
          {value}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Position status selection"
        selectionMode="single"
        selectedKeys={[value]}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as "Open" | "Closed" | "Partial";
          onSave(selected);
          setIsOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        autoFocus
      >
        <DropdownItem key="Open">Open</DropdownItem>
        <DropdownItem key="Closed">Closed</DropdownItem>
        <DropdownItem key="Partial">Partial</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
});

interface ProficiencyGrowthAreasCellProps {
  value: string;
  onSave: (value: string) => void;
}

const PROFICIENCY_GROWTH_AREAS = [
  'Booked Early',
  "Didn't Book Loss",
  'FOMO',
  'Illiquid Stock',
  'Illogical SL',
  'Lack of Patience',
  'Late Entry',
  'Momentum-less stock',
  'Overconfidence',
  'Overtrading',
  'Poor Exit',
  'Poor Po Size',
  'Poor Sector',
  'Poor Stock',
  'Shifted SL Suickly',
  'Too Early Entry',
  'Too Tight SL'
];
const GROWTH_AREAS_LOCAL_KEY = 'custom_growth_areas_options';

const ProficiencyGrowthAreasCell: React.FC<ProficiencyGrowthAreasCellProps> = React.memo(function ProficiencyGrowthAreasCell({ value, onSave }) {
  const [customOptions, setCustomOptions] = React.useState<string[]>([]);
  const [availableDefaultOptions, setAvailableDefaultOptions] = React.useState<string[]>(PROFICIENCY_GROWTH_AREAS);
  const allOptions = React.useMemo(() => [
    ...availableDefaultOptions,
    ...customOptions
  ], [customOptions, availableDefaultOptions]);

  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const stored = await fetchMiscData(GROWTH_AREAS_LOCAL_KEY);
        if (stored && Array.isArray(stored)) {
          setCustomOptions(stored.filter(o => !PROFICIENCY_GROWTH_AREAS.includes(o)));
        }

        const availableDefaults = await fetchMiscData(`${GROWTH_AREAS_LOCAL_KEY}_defaults`);
        if (availableDefaults && Array.isArray(availableDefaults)) {
          setAvailableDefaultOptions(availableDefaults);
        } else {
          // If no defaults are stored, initialize with all original defaults
          setAvailableDefaultOptions(PROFICIENCY_GROWTH_AREAS);
        }
      } catch (error) {
        console.error('Error loading growth areas options:', error);
        setAvailableDefaultOptions(PROFICIENCY_GROWTH_AREAS);
      }
    };

    loadOptions();
  }, []);

  const handleAddOption = (newValue: string) => {
    if (newValue && !allOptions.some(o => o.toLowerCase() === newValue.toLowerCase())) {
      const newCustomOptions = [...customOptions, newValue];
      setCustomOptions(newCustomOptions);
      saveMiscData(GROWTH_AREAS_LOCAL_KEY, newCustomOptions);
      onSave(newValue);
    } else if (newValue) { // If it's an existing option, just select it
      onSave(newValue);
    }
  };

  const handleDeleteCustomOption = (optionToDelete: string) => {
    const isDefaultOption = PROFICIENCY_GROWTH_AREAS.includes(optionToDelete);
    const confirmMessage = isDefaultOption
      ? `Are you sure you want to permanently delete "${optionToDelete}" globally? This will remove it from all growth area dropdowns across the entire application.`
      : `Are you sure you want to permanently delete "${optionToDelete}"?`;

    if (window.confirm(confirmMessage)) {
      if (isDefaultOption) {
        // Permanently remove from available default options
        const updatedDefaultOptions = availableDefaultOptions.filter(o => o !== optionToDelete);
        setAvailableDefaultOptions(updatedDefaultOptions);
        saveMiscData(`${GROWTH_AREAS_LOCAL_KEY}_defaults`, updatedDefaultOptions);
      } else {
        // Delete custom option
        const updatedCustomOptions = customOptions.filter(o => o !== optionToDelete);
        setCustomOptions(updatedCustomOptions);
        saveMiscData(GROWTH_AREAS_LOCAL_KEY, updatedCustomOptions);
      }

      // If the currently selected value is the one being deleted, clear it
      if (value === optionToDelete) {
        onSave(''); // Clear the selected value
      }
    }
  };

  const handleSelect = (selected: string) => {
    if (selected === '__add_new__') {
      const newValue = window.prompt('Enter new growth area:');
      if (newValue) {
        handleAddOption(newValue);
      }
    } else {
      onSave(selected);
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button size="sm" variant="flat" color="default" className="min-w-[180px] h-7 justify-between"
          endContent={<Icon icon="lucide:chevron-down" className="w-3.5 h-3.5" />}
        >
          {value || <span className="text-default-400">Select Growth Area</span>}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Growth areas selection"
        selectionMode="single"
        selectedKeys={value ? [value] : []}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as string;
          handleSelect(selected);
        }}
      >
        {allOptions
          .map((area) => (
            <DropdownItem key={area} textValue={area}>
              <div className="flex items-center gap-1 w-full">
                <span>{area}</span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  className="min-w-unit-4 w-4 h-4 p-0"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onPress={() => {
                    handleDeleteCustomOption(area);
                  }}
                  aria-label={`Delete ${area}`}
                >
                  <Icon icon="lucide:trash-2" className="w-2.5 h-2.5" />
                </Button>
              </div>
            </DropdownItem>
          ))
          .concat([
            <DropdownItem key="__add_new__" className="text-primary">
              <span className="flex items-center gap-1">
                <Icon icon="lucide:plus" className="w-4 h-4" /> Add new growth area...
              </span>
            </DropdownItem>
          ])}
      </DropdownMenu>
    </Dropdown>
  );
});

interface NameCellProps {
  value: string;
  onSave: (value: string) => void;
}

const NameCell: React.FC<NameCellProps> = React.memo(function NameCell({ value, onSave }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [filtered, setFiltered] = React.useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Update editValue when value prop changes, but only when not editing
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Move stockNames state and effect here
  const [stockNames, setStockNames] = React.useState<string[]>([]);
  React.useEffect(() => {
    async function loadStockNames() {
      const response = await fetch(csvUrl);
      const csvText = await response.text();
      const Papa = (await import('papaparse')).default;
      Papa.parse(csvText, {
        header: true,
        complete: (results) => {
          const names = (results.data as any[]).map(row => row['Stock Name']).filter(Boolean);
          setStockNames(names);
        }
      });
    }
    loadStockNames();
  }, []);

  // Function to find closest matching stock name
  const findClosestMatch = (input: string): string | null => {
    if (!input || !stockNames.length) return null;

    const inputLower = input.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    // First try exact prefix match
    const exactPrefixMatch = stockNames.find(name =>
      name.toLowerCase().startsWith(inputLower)
    );
    if (exactPrefixMatch) return exactPrefixMatch;

    // Then try contains match
    const containsMatch = stockNames.find(name =>
      name.toLowerCase().includes(inputLower)
    );
    if (containsMatch) return containsMatch;

    // Finally try fuzzy match
    for (const name of stockNames) {
      const nameLower = name.toLowerCase();
      let score = 0;
      let inputIndex = 0;

      // Calculate similarity score
      for (let i = 0; i < nameLower.length && inputIndex < inputLower.length; i++) {
        if (nameLower[i] === inputLower[inputIndex]) {
          score++;
          inputIndex++;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = name;
      }
    }

    // Only return match if it's reasonably similar
    return bestScore > (inputLower.length / 2) ? bestMatch : null;
  };

  React.useEffect(() => {
    if (isEditing && editValue) {
      const matches = stockNames.filter(n =>
        n.toLowerCase().includes(editValue.toLowerCase())
      );
      setFiltered(matches.slice(0, 10));
      setShowDropdown(matches.length > 0);
      setSelectedIndex(-1);
    } else {
      setShowDropdown(false);
    }
  }, [editValue, isEditing, stockNames]);

  // Ensure input stays focused when dropdown is shown
  React.useEffect(() => {
    if (isEditing && inputRef.current && showDropdown) {
      inputRef.current.focus();
    }
  }, [isEditing, showDropdown]);

  // Auto-start editing when focused via tab navigation
  const handleAutoEdit = React.useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
      setEditValue(value);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select(); // Select all text for easy replacement
        }
      }, 50);
    }
  }, [isEditing, value]);

  const handleSave = (val?: string) => {
    const finalValue = val ?? editValue;

    // Allow empty values to be saved (clearing the field)
    if (!finalValue.trim()) {
      onSave(''); // Save empty string
      setIsEditing(false);
      setShowDropdown(false);
      setSelectedIndex(-1);
      return;
    }

    // Check if the value exists in stockNames
    const exactMatch = stockNames.find(
      name => name.toLowerCase() === finalValue.toLowerCase()
    );

    if (exactMatch) {
      onSave(exactMatch); // Use the exact case from database
    } else {
      // Try to find closest match
      const closestMatch = findClosestMatch(finalValue);
      if (closestMatch) {
        const confirmed = window.confirm(
          `"${finalValue}" not found. Did you mean "${closestMatch}"?`
        );
        if (confirmed) {
          onSave(closestMatch);
        } else {
          // Revert to previous value if user declines suggestion
           setEditValue(value);
        }
      } else {
         const addNew = window.confirm(`"${finalValue}" is not a valid stock name. Do you want to add it?`);
         if(addNew){
          onSave(finalValue.toUpperCase());
         } else {
          setEditValue(value); // Revert to previous value
         }
      }
    }
    setIsEditing(false);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  // Scroll selected item into view
  React.useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = document.getElementById(`stock-suggestion-${selectedIndex}`);
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  // Update dropdown position on scroll/resize to prevent clipping
  React.useEffect(() => {
    if (!showDropdown || !inputRef.current || !dropdownRef.current) return;

    const updatePosition = () => {
      if (inputRef.current && dropdownRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const dropdown = dropdownRef.current;

        dropdown.style.top = `${rect.bottom + 2}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.width = `${Math.max(220, rect.width)}px`;
      }
    };

    // Update position immediately
    updatePosition();

    // Update position on scroll and resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showDropdown]);

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setIsEditing(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filtered.length === 0) {
      // Allow normal typing when dropdown is not shown
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditing(false);
        setShowDropdown(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => {
          const next = prev + 1;
          const newIndex = next >= filtered.length ? 0 : next;
          // Scroll to selected item
          setTimeout(() => {
            const selectedElement = dropdownRef.current?.querySelector(`[data-index="${newIndex}"]`);
            selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => {
          const next = prev - 1;
          const newIndex = next < 0 ? filtered.length - 1 : next;
          // Scroll to selected item
          setTimeout(() => {
            const selectedElement = dropdownRef.current?.querySelector(`[data-index="${newIndex}"]`);
            selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (selectedIndex >= 0 && filtered[selectedIndex]) {
          handleSave(filtered[selectedIndex]);
        } else if (filtered.length === 1) {
          handleSave(filtered[0]);
        } else {
          handleSave();
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        setShowDropdown(false);
        setSelectedIndex(-1);
        setIsEditing(false);
        break;
      case 'Tab':
        if (selectedIndex >= 0 && filtered[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          handleSave(filtered[selectedIndex]);
        }
        break;
      case 'Home':
        e.preventDefault();
        setSelectedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setSelectedIndex(filtered.length - 1);
        break;
      case 'PageDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 5, filtered.length - 1));
        break;
      case 'PageUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 5, 0));
        break;
    }
  };

  if (isEditing) {
    return (
      <div className="relative min-w-[220px]">
        <input
          ref={inputRef}
          type="text"
          className="w-full min-w-[220px] px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={(e) => {
            // Don't close if focus is moving to the dropdown
            if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
              setTimeout(() => handleSave(), 150);
            }
          }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {showDropdown && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[99999] min-w-[220px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto overflow-x-auto"
            style={{
              top: inputRef.current ? inputRef.current.getBoundingClientRect().bottom + 2 : 0,
              left: inputRef.current ? inputRef.current.getBoundingClientRect().left : 0,
              width: inputRef.current ? Math.max(220, inputRef.current.getBoundingClientRect().width) : 220,
            }}
            role="listbox"
            tabIndex={-1}
            onMouseDown={(e) => {
              // Prevent input from losing focus when clicking dropdown
              e.preventDefault();
            }}
          >
            {filtered.map((name, i) => (
              <div
                key={name}
                data-index={i}
                id={`stock-suggestion-${i}`}
                role="option"
                aria-selected={i === selectedIndex}
                className={`px-3 py-1.5 text-sm cursor-pointer whitespace-nowrap ${
                  i === selectedIndex
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'hover:bg-blue-50 dark:hover:bg-blue-800'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSave(name);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={(e) => {
                  e.preventDefault();
                  handleSave(name);
                }}
              >
                {name}
              </div>
            ))}
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div
      className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-text"
      onClick={() => setIsEditing(true)}
      onFocus={handleAutoEdit}
      tabIndex={0}
    >
      {value || <span className="text-gray-400">Stock name</span>}
    </div>
  );
});

interface SetupCellProps {
  value: string;
  onSave: (value: string) => void;
}

const SETUP_OPTIONS = [
  'ITB',
  'Chop BO',
  'IPO Base',
  '3/5/8',
  '21/50',
  'Breakout',
  'Pullback',
  'Reversal',
  'Continuation',
  'Gap Fill',
  'OTB',
  'Stage 2',
  'ONP BO',
  'EP',
  'Pivot Bo',
  'Cheat',
  'Flag',
  'Other'
];
const SETUP_LOCAL_KEY = 'custom_setup_options';

const SetupCell: React.FC<SetupCellProps> = React.memo(function SetupCell({ value, onSave }) {
  const [customOptions, setCustomOptions] = React.useState<string[]>([]);
  const [availableDefaultOptions, setAvailableDefaultOptions] = React.useState<string[]>(SETUP_OPTIONS);
  const [isOpen, setIsOpen] = React.useState(false);
  const allOptions = React.useMemo(() => [
    ...availableDefaultOptions,
    ...customOptions
  ], [customOptions, availableDefaultOptions]);

  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const stored = await fetchMiscData(SETUP_LOCAL_KEY);
        if (stored && Array.isArray(stored)) {
          setCustomOptions(stored.filter(o => !SETUP_OPTIONS.includes(o)));
        }

        const availableDefaults = await fetchMiscData(`${SETUP_LOCAL_KEY}_defaults`);
        if (availableDefaults && Array.isArray(availableDefaults)) {
          setAvailableDefaultOptions(availableDefaults);
        } else {
          // If no defaults are stored, initialize with all original defaults
          setAvailableDefaultOptions(SETUP_OPTIONS);
        }
      } catch (error) {
        console.error('Error loading setup options:', error);
        setAvailableDefaultOptions(SETUP_OPTIONS);
      }
    };

    loadOptions();
  }, []);

  const handleAddOption = (newValue: string) => {
    if (newValue && !allOptions.some(o => o.toLowerCase() === newValue.toLowerCase())) {
      const newCustomOptions = [...customOptions, newValue];
      setCustomOptions(newCustomOptions);
      saveMiscData(SETUP_LOCAL_KEY, newCustomOptions);
      onSave(newValue);
    } else if (newValue) { // If it's an existing option, just select it
      onSave(newValue);
    }
  };

  const handleDeleteCustomOption = (optionToDelete: string) => {
    const isDefaultOption = SETUP_OPTIONS.includes(optionToDelete);
    const confirmMessage = isDefaultOption
      ? `Are you sure you want to permanently delete "${optionToDelete}" globally? This will remove it from all setup dropdowns across the entire application.`
      : `Are you sure you want to permanently delete "${optionToDelete}"?`;

    if (window.confirm(confirmMessage)) {
      if (isDefaultOption) {
        // Permanently remove from available default options
        const updatedDefaultOptions = availableDefaultOptions.filter(o => o !== optionToDelete);
        setAvailableDefaultOptions(updatedDefaultOptions);
        saveMiscData(`${SETUP_LOCAL_KEY}_defaults`, updatedDefaultOptions);
      } else {
        // Delete custom option
        const updatedCustomOptions = customOptions.filter(o => o !== optionToDelete);
        setCustomOptions(updatedCustomOptions);
        saveMiscData(SETUP_LOCAL_KEY, updatedCustomOptions);
      }

      if (value === optionToDelete) {
        onSave('');
      }
    }
  };

  const handleSelect = (selected: string) => {
    if (selected === '__add_new__') {
      const newValue = window.prompt('Enter new setup:');
      if (newValue) {
        handleAddOption(newValue);
      }
    } else {
      onSave(selected);
    }
  };

  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger>
        <Button
          size="sm"
          variant="flat"
          color="primary"
          className="min-w-[120px] h-7 justify-between"
          endContent={<Icon icon="lucide:chevron-down" className="w-3.5 h-3.5" />}
          onFocus={() => setTimeout(() => setIsOpen(true), 100)}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
            } else if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
        >
          {value || <span className="text-default-400">Setup</span>}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Setup type selection"
        selectionMode="single"
        selectedKeys={value ? [value] : []}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as string;
          handleSelect(selected);
        }}
      >
        {allOptions
          .map((option) => (
            <DropdownItem key={option} textValue={option}>
              <div className="flex items-center gap-1 w-full">
                <span>{option}</span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  className="min-w-unit-4 w-4 h-4 p-0"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onPress={() => {
                    handleDeleteCustomOption(option);
                  }}
                  aria-label={`Delete ${option}`}
                >
                  <Icon icon="lucide:trash-2" className="w-2.5 h-2.5" />
                </Button>
              </div>
            </DropdownItem>
          ))
          .concat([
            <DropdownItem key="__add_new__" className="text-primary">
              <span className="flex items-center gap-1">
                <Icon icon="lucide:plus" className="w-4 h-4" /> Add new setup...
              </span>
            </DropdownItem>
          ])}
      </DropdownMenu>
    </Dropdown>
  );
});

interface ExitTriggerCellProps {
  value: string;
  onSave: (value: string) => void;
}

const EXIT_TRIGGER_OPTIONS = [
  'Breakeven exit',
  'Market Pressure',
  'R multiples',
  'Random',
  'SL',
  'Target',
  'Trailing SL exit',
  "Broke key MA's",
  'Panic sell',
  'Early sell off',
  'Failed BO'
];
const EXIT_TRIGGER_LOCAL_KEY = 'custom_exit_trigger_options';

const ExitTriggerCell: React.FC<ExitTriggerCellProps> = React.memo(function ExitTriggerCell({ value, onSave }) {
  const [customOptions, setCustomOptions] = React.useState<string[]>([]);
  const [availableDefaultOptions, setAvailableDefaultOptions] = React.useState<string[]>(EXIT_TRIGGER_OPTIONS);
  const allOptions = React.useMemo(() => [
    ...availableDefaultOptions,
    ...customOptions
  ], [customOptions, availableDefaultOptions]);

  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const stored = await fetchMiscData(EXIT_TRIGGER_LOCAL_KEY);
        if (stored && Array.isArray(stored)) {
          setCustomOptions(stored.filter(o => !EXIT_TRIGGER_OPTIONS.includes(o)));
        }

        const availableDefaults = await fetchMiscData(`${EXIT_TRIGGER_LOCAL_KEY}_defaults`);
        if (availableDefaults && Array.isArray(availableDefaults)) {
          setAvailableDefaultOptions(availableDefaults);
        } else {
          // If no defaults are stored, initialize with all original defaults
          setAvailableDefaultOptions(EXIT_TRIGGER_OPTIONS);
        }
      } catch (error) {
        console.error('Error loading exit trigger options:', error);
        setAvailableDefaultOptions(EXIT_TRIGGER_OPTIONS);
      }
    };

    loadOptions();
  }, []);

  const handleAddOption = (newValue: string) => {
    if (newValue && !allOptions.some(o => o.toLowerCase() === newValue.toLowerCase())) {
      const newCustomOptions = [...customOptions, newValue];
      setCustomOptions(newCustomOptions);
      saveMiscData(EXIT_TRIGGER_LOCAL_KEY, newCustomOptions);
      onSave(newValue);
    } else if (newValue) { // If it's an existing option, just select it
      onSave(newValue);
    }
  };

  const handleDeleteCustomOption = (optionToDelete: string) => {
    const isDefaultOption = EXIT_TRIGGER_OPTIONS.includes(optionToDelete);
    const confirmMessage = isDefaultOption
      ? `Are you sure you want to permanently delete "${optionToDelete}" globally? This will remove it from all exit trigger dropdowns across the entire application.`
      : `Are you sure you want to permanently delete "${optionToDelete}"?`;

    if (window.confirm(confirmMessage)) {
      if (isDefaultOption) {
        // Permanently remove from available default options
        const updatedDefaultOptions = availableDefaultOptions.filter(o => o !== optionToDelete);
        setAvailableDefaultOptions(updatedDefaultOptions);
        saveMiscData(`${EXIT_TRIGGER_LOCAL_KEY}_defaults`, updatedDefaultOptions);
      } else {
        // Delete custom option
        const updatedCustomOptions = customOptions.filter(o => o !== optionToDelete);
        setCustomOptions(updatedCustomOptions);
        saveMiscData(EXIT_TRIGGER_LOCAL_KEY, updatedCustomOptions);
      }

      if (value === optionToDelete) {
        onSave('');
      }
    }
  };

  const handleSelect = (selected: string) => {
    if (selected === '__add_new__') {
      const newValue = window.prompt('Enter new exit trigger:');
      if (newValue) {
        handleAddOption(newValue);
      }
    } else {
      onSave(selected);
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button size="sm" variant="flat" color="default" className="min-w-[150px] h-7 justify-between"
          endContent={<Icon icon="lucide:chevron-down" className="w-3.5 h-3.5" />}
        >
          {value || <span className="text-default-400">Select Exit Trigger</span>}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Exit trigger selection"
        selectionMode="single"
        selectedKeys={value ? [value] : []}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as string;
          handleSelect(selected);
        }}
      >
        {allOptions
          .map((option) => (
            <DropdownItem key={option} textValue={option}>
              <div className="flex items-center gap-1 w-full">
                <span>{option}</span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  className="min-w-unit-4 w-4 h-4 p-0"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onPress={() => {
                    handleDeleteCustomOption(option);
                  }}
                  aria-label={`Delete ${option}`}
                >
                  <Icon icon="lucide:trash-2" className="w-2.5 h-2.5" />
                </Button>
              </div>
            </DropdownItem>
          ))
          .concat([
            <DropdownItem key="__add_new__" className="text-primary">
              <span className="flex items-center gap-1">
                <Icon icon="lucide:plus" className="w-4 h-4" /> Add new exit trigger...
              </span>
            </DropdownItem>
          ])}
      </DropdownMenu>
    </Dropdown>
  );
});

interface PlanFollowedCellProps {
  value: boolean;
  onSave: (value: boolean) => void;
}

const PlanFollowedCell: React.FC<PlanFollowedCellProps> = ({ value, onSave }) => {
  const displayValue = value ? "Yes" : "No";
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          size="sm"
          variant="flat"
          color={value ? "success" : "danger"}
          className="min-w-[70px] h-7"
          endContent={<Icon icon="lucide:chevron-down" className="w-3.5 h-3.5" />}
        >
          {displayValue}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Plan followed selection"
        selectionMode="single"
        selectedKeys={[displayValue]}
        onSelectionChange={(keys) => {
          const selectedKey = Array.from(keys)[0] as string;
          onSave(selectedKey === "Yes");
        }}
      >
        <DropdownItem key="Yes">Yes</DropdownItem>
        <DropdownItem key="No">No</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

interface NotesCellProps {
  value: string;
  onSave: (value: string) => void;
}

const NotesCell: React.FC<NotesCellProps> = React.memo(function NotesCell({ value, onSave }) {
  const {isOpen, onOpenChange, onClose, onOpen} = useDisclosure();
  const [editValue, setEditValue] = React.useState(value);

  // When opening the popover, ensure the edit value is up-to-date with the cell's value
  React.useEffect(() => {
    if (isOpen) {
      setEditValue(value);
    }
  }, [isOpen, value]);

  const handleSave = () => {
    onSave(editValue);
    onClose();
  };

  const handleCancel = () => {
    setEditValue(value); // Reset any changes
    onClose();
  };

  return (
    <Popover placement="bottom-start" isOpen={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger>
        <div
          onClick={onOpen}
          className="p-2 text-sm rounded-md cursor-pointer hover:bg-default-100 dark:hover:bg-default-900/40 transition-colors w-full max-w-[300px]"
        >
          {value ? (
            <p className="whitespace-pre-wrap truncate text-ellipsis">{value}</p>
          ) : (
            <span className="text-default-500">Add a note...</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <div className="w-[320px] p-4">
          <h4 className="font-bold text-lg mb-3">Trade Review & Notes</h4>
          <Textarea
            label="Notes"
            placeholder="Enter your review, observations, or thoughts..."
            value={editValue}
            onValueChange={setEditValue}
            minRows={6}
            maxRows={12}
            classNames={{
              input: "resize-y"
            }}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button size="sm" variant="flat" color="danger" onPress={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" color="primary" onPress={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

interface CMPCellProps {
  value: number;
  isAutoFetched?: boolean;
  onSave: (value: number) => void;
}

const CMPCell: React.FC<CMPCellProps> = React.memo(function CMPCell({ value, isAutoFetched, onSave }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(String(value || ''));
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value || ''));
    }
  }, [value, isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    const numValue = Number(editValue) || 0;
    onSave(numValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(String(value || ''));
    }
  };

  const handleFocus = () => {
    // Only allow editing when price fetching failed or value was manually entered
    // Don't allow editing when price was successfully auto-fetched
    if (!isEditing && isAutoFetched !== true) {
      setIsEditing(true);
    }
  };

  const formatCurrency = (val: number) => {
    if (val === 0) return '0';
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="relative">
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onValueChange={setEditValue}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          type="number"
          step="0.01"
          min="0"
          size="sm"
          classNames={{
            input: "text-right",
            inputWrapper: "h-7 min-h-7"
          }}
        />
      ) : (
        <Tooltip
          content={
            <div className="text-xs">
              <div className="font-medium">Current Market Price</div>
              <div className="text-default-400">
                {isAutoFetched === false
                  ? "Manually entered - click to edit"
                  : isAutoFetched === true
                    ? "Auto-fetched from market data - not editable"
                    : "Click to enter manually"
                }
              </div>
            </div>
          }
          placement="top"
          delay={500}
        >
          <div
            onClick={handleFocus}
            className={`
              py-1 px-2 text-right rounded-md transition-colors
              flex items-center justify-end gap-1 whitespace-nowrap
              ${isAutoFetched === false
                ? 'border-l-2 border-warning cursor-pointer hover:bg-default-100 dark:hover:bg-default-800'
                : isAutoFetched === true
                  ? 'border-l-2 border-success cursor-not-allowed opacity-75'
                  : 'cursor-pointer hover:bg-default-100 dark:hover:bg-default-800'
              }
            `}
          >
            <span className="font-medium">
              {value > 0 ? `₹${formatCurrency(value)}` : '-'}
            </span>
            {isAutoFetched === false && (
              <Icon
                icon="lucide:edit-3"
                className="w-3 h-3 text-warning opacity-60"
              />
            )}
            {isAutoFetched === true && (
              <Icon
                icon="lucide:refresh-cw"
                className="w-3 h-3 text-success opacity-60"
              />
            )}
          </div>
        </Tooltip>
      )}
    </div>
  );
});

export default TradeJournal;