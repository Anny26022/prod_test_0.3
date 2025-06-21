import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Checkbox,
  Select,
  SelectItem,
  Textarea,
  Divider,
  Tabs,
  Tab,
  Chip
} from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Trade, ChartImage, TradeChartAttachments } from "../types/trade";
import { generateId } from "../utils/helpers";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePriceTicks } from "../hooks/usePriceTicks";
import { fetchPriceTicks, fetchPriceTicksWithFallback, fetchPriceTicksWithHistoricalFallback, fetchPriceTicksSmart } from '../utils/priceTickApi';
import { ChartImageUpload } from "./ChartImageUpload";
import { ChartImageViewer } from "./ChartImageViewer";
import { UniversalChartViewer } from "./UniversalChartViewer";
import {
  calcAvgEntry,
  calcPositionSize,
  calcAllocation,
  calcSLPercent,
  calcOpenQty,
  calcExitedQty,
  calcAvgExitPrice,
  calcStockMove,
  calcRewardRisk,
  calcHoldingDays,
  calcRealisedAmount,
  calcPLRs,
  calcPFImpact,
  calcCummPf,
  calcUnrealizedPL,
  calcRealizedPL_FIFO
} from "../utils/tradeCalculations";
import { useTruePortfolioWithTrades } from "../hooks/use-true-portfolio-with-trades";
import { useTrades } from "../hooks/use-trades";
import { validateTrade, TradeIssue } from "../utils/tradeValidations";
import * as Papa from "papaparse"; // Centralized import

  // Debounce helper
  const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

    React.useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  interface TradeModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    trade?: Trade;
    onSave: (trade: Trade) => void;
    mode: "add" | "edit";
    symbol?: string;
    isUploadOnlyMode?: boolean;
    isActionsEditMode?: boolean; // New prop for actions tab edit mode
  }

  type TradeModalFormData = Trade & { slPercent: number };

  const defaultTrade: TradeModalFormData = {
    id: "",
    tradeNo: "",
    date: new Date().toISOString().split("T")[0],
    name: "",
    entry: 0,
    avgEntry: 0,
    sl: 0,
    tsl: 0,
    buySell: "Buy",
    cmp: 0,
    setup: "",
    baseDuration: "",
    initialQty: 0,
    pyramid1Price: 0,
    pyramid1Qty: 0,
    pyramid1Date: "",
    pyramid2Price: 0,
    pyramid2Qty: 0,
    pyramid2Date: "",
    positionSize: 0,
    allocation: 0,
    exit1Price: 0,
    exit1Qty: 0,
    exit1Date: "",
    exit2Price: 0,
    exit2Qty: 0,
    exit2Date: "",
    exit3Price: 0,
    exit3Qty: 0,
    exit3Date: "",
    openQty: 0,
    exitedQty: 0,
    avgExitPrice: 0,
    stockMove: 0,
    rewardRisk: 0,
    holdingDays: 0,
    positionStatus: "Open",
    realisedAmount: 0,
    plRs: 0,
    pfImpact: 0,
    cummPf: 0,
    planFollowed: true,
    exitTrigger: "",
    proficiencyGrowthAreas: "",
    slPercent: 0,
    openHeat: 0
  };

  interface TradeEntry {
    price: number;
    qty: number;
  }

  const recalculateTrade = (
    trade: Partial<TradeModalFormData>, 
    defaultPortfolioSize: number,
    getPortfolioSize?: (month: string, year: number) => number
  ): TradeModalFormData => {
    // Safely parse and filter entries
    const entries: TradeEntry[] = [
      { price: Number(trade.entry || 0), qty: Number(trade.initialQty || 0) },
      { price: Number(trade.pyramid1Price || 0), qty: Number(trade.pyramid1Qty || 0) },
      { price: Number(trade.pyramid2Price || 0), qty: Number(trade.pyramid2Qty || 0) }
    ].filter(e => e.qty > 0 && e.price > 0);

    const avgEntry = entries.length > 0 ? calcAvgEntry(entries) : Number(trade.entry) || 0;
    const totalQty = entries.reduce((sum, e) => sum + e.qty, 0);
    const positionSize = totalQty > 0 ? calcPositionSize(avgEntry, totalQty) : 0;
    // Get the portfolio size for the trade's month/year
    let tradePortfolioSize = defaultPortfolioSize;
    if (trade.date && getPortfolioSize) {
      const tradeDate = new Date(trade.date);
      const month = tradeDate.toLocaleString('default', { month: 'short' });
      const year = tradeDate.getFullYear();
      const monthlyPortfolioSize = getPortfolioSize(month, year);
      if (monthlyPortfolioSize !== undefined) {
        tradePortfolioSize = monthlyPortfolioSize;
      }
    }
    
    const allocation = positionSize > 0 && tradePortfolioSize > 0 ? 
      calcAllocation(positionSize, tradePortfolioSize) : 0;
    
    // Calculate exits
    const exit1Qty = Number(trade.exit1Qty || 0);
    const exit2Qty = Number(trade.exit2Qty || 0);
    const exit3Qty = Number(trade.exit3Qty || 0);
    
    const exitedQty = calcExitedQty(exit1Qty, exit2Qty, exit3Qty);
    const openQty = Math.max(0, totalQty - exitedQty);
    
    const exits: TradeEntry[] = [
      { price: Number(trade.exit1Price || 0), qty: exit1Qty },
      { price: Number(trade.exit2Price || 0), qty: exit2Qty },
      { price: Number(trade.exit3Price || 0), qty: exit3Qty }
    ].filter(e => e.qty > 0 && e.price > 0);
    
    const avgExitPrice = exits.length > 0 ? calcAvgExitPrice(exits) : 0;
    const stockMove = avgEntry > 0 ? calcStockMove(avgEntry, avgExitPrice, Number(trade.cmp || 0), openQty, exitedQty, trade.positionStatus || 'Open', trade.buySell || 'Buy') : 0;
    
    // Calculate SL percentage
    const entryPrice = Number(trade.entry) || 0;
    const slPrice = Number(trade.sl) || 0;
    const slPercent = entryPrice > 0 && slPrice > 0 ? calcSLPercent(slPrice, entryPrice) : 0;
    
    // Calculate reward/risk
    const cmp = Number(trade.cmp) || 0;
    const rewardRisk = entryPrice > 0 && slPrice > 0 ? calcRewardRisk(cmp, entryPrice, slPrice, trade.positionStatus || 'Open', avgExitPrice, openQty, exitedQty, trade.buySell || 'Buy') : 0;
    
    // Calculate holding period
    const entryDate = trade.date || '';
    const exitDate = trade.exit1Date || '';
    const holdingDays = entryDate && exitDate ? calcHoldingDays(entryDate, exitDate) : 0;
    
    // Calculate P&L
    const realisedAmount = exitedQty > 0 ? calcRealisedAmount(exitedQty, avgExitPrice) : 0;
    // Build entry and exit lots for FIFO
    const entryLots = [
      { price: Number(trade.entry || 0), qty: Number(trade.initialQty || 0) },
      { price: Number(trade.pyramid1Price || 0), qty: Number(trade.pyramid1Qty || 0) },
      { price: Number(trade.pyramid2Price || 0), qty: Number(trade.pyramid2Qty || 0) }
    ].filter(e => e.qty > 0 && e.price > 0);
    const exitLots = [
      { price: Number(trade.exit1Price || 0), qty: exit1Qty },
      { price: Number(trade.exit2Price || 0), qty: exit2Qty },
      { price: Number(trade.exit3Price || 0), qty: exit3Qty }
    ].filter(e => e.qty > 0 && e.price > 0);
    const plRs = exitedQty > 0 ? calcRealizedPL_FIFO(entryLots, exitLots, trade.buySell as 'Buy' | 'Sell') : 0;
    // Note: PF Impact calculation in trade modal uses entry date portfolio size
    // This is acceptable for preview as accounting method-specific recalculation
    // will happen when the trade is saved to the main trade processing pipeline
    const pfImpact = tradePortfolioSize > 0 ? calcPFImpact(plRs, tradePortfolioSize) : 0;
    
    return {
      ...(trade as TradeModalFormData),
      avgEntry,
      positionSize,
      allocation,
      exitedQty,
      openQty,
      avgExitPrice,
      stockMove,
      slPercent,
      rewardRisk,
      holdingDays,
      realisedAmount,
      plRs,
      pfImpact
    };
  };

  export const TradeModal: React.FC<TradeModalProps> = React.memo(({
    isOpen,
    onOpenChange,
    trade,
    onSave,
    mode,
    symbol: initialSymbol = "",
    isUploadOnlyMode = false,
    isActionsEditMode = false,
  }) => {
    console.log("[TradeModal] Initial Symbol:", initialSymbol); // Log initial symbol

    // Track if CMP was manually set by user
    const [cmpManuallySet, setCmpManuallySet] = React.useState(false);

    const { trades } = useTrades();
    const { portfolioSize, getPortfolioSize } = useTruePortfolioWithTrades(trades);
    // Reset form when symbol changes - moved after handleChange is defined

  // Unique key for sessionStorage (intentionally using sessionStorage for temporary form data)
  // This is separate from the main IndexedDB migration as it's for temporary auto-save functionality
  const sessionKey = React.useMemo(() => {
    if (mode === 'edit' && trade?.id) return `tradeModal_edit_${trade.id}`;
    if (mode === 'add') return 'tradeModal_add';
    return 'tradeModal';
  }, [mode, trade]);

  // Compute next trade number for add mode
  const nextTradeNo = React.useMemo(() => {
    if (!trades || trades.length === 0) return "1";
    const nums = trades.map(t => parseInt(t.tradeNo, 10)).filter(n => !isNaN(n));
    return nums.length > 0 ? String(Math.max(...nums) + 1) : "1";
  }, [trades]);

  // Enhanced data loading with recovery mechanism
  const [formData, setFormData] = React.useState<TradeModalFormData>(() => {
    if (typeof window !== 'undefined') {
      // First try sessionStorage
      const saved = sessionStorage.getItem(sessionKey + '_formData');
      if (saved) {
        try {
          const parsedData = JSON.parse(saved);
          console.log('📂 Loaded form data from sessionStorage');
          return parsedData;
        } catch (error) {
          console.warn('⚠️ Failed to parse sessionStorage data:', error);
        }
      }

      // If sessionStorage fails, try to recover from localStorage backup
      try {
        const allKeys = Object.keys(localStorage);
        const backupKeys = allKeys.filter(key => key.startsWith(`tradeBackup_${sessionKey}_`))
          .sort((a, b) => {
            const timestampA = parseInt(a.split('_').pop() || '0');
            const timestampB = parseInt(b.split('_').pop() || '0');
            return timestampB - timestampA; // Most recent first
          });

        if (backupKeys.length > 0) {
          const latestBackup = localStorage.getItem(backupKeys[0]);
          if (latestBackup) {
            const backup = JSON.parse(latestBackup);
            console.log('🔄 Recovered form data from backup:', backup.timestamp);
            return backup.formData;
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to recover from backup:', error);
      }
    }

    // Fallback to default initialization
    if (trade) {
      console.log('📝 Initializing with existing trade data');
      return { ...defaultTrade, ...trade, slPercent: (trade as any).slPercent || 0 };
    } else if (mode === 'add') {
      console.log('➕ Initializing new trade form');
      return { ...defaultTrade, tradeNo: nextTradeNo };
    } else {
      console.log('🔧 Initializing with default trade data');
      return defaultTrade;
    }
  });

  // Use formData.name for price ticks to get real-time updates
  const { latestPrice } = usePriceTicks(formData?.name || initialSymbol);

  const [isDirty, setIsDirty] = React.useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = React.useState<boolean>(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [activeTab, setActiveTab] = React.useState<string>(() => {
    // If in upload-only mode, always start with charts tab
    if (isUploadOnlyMode) {
      return 'charts';
    }

    // If in actions edit mode, always start with basic tab (charts disabled)
    if (isActionsEditMode) {
      return 'basic';
    }

    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_activeTab');
      if (saved) return saved;
    }
    return 'basic';
  });

  // Chart viewer and refresh state - declare early to avoid initialization issues
  const [chartViewerImage, setChartViewerImage] = React.useState<ChartImage | null>(null);
  const [isChartViewerOpen, setIsChartViewerOpen] = React.useState(false);
  const [isUniversalViewerOpen, setIsUniversalViewerOpen] = React.useState(false);
  const [chartRefreshTrigger, setChartRefreshTrigger] = React.useState(0);

  // Reset tabs when entering special modes
  React.useEffect(() => {
    if (isUploadOnlyMode) {
      setActiveTab('charts');
      // Trigger chart refresh to ensure latest data is shown
      setChartRefreshTrigger(prev => prev + 1);
      console.log('🔄 Upload-only mode activated, triggering chart refresh');
    } else if (isActionsEditMode) {
      setActiveTab('basic');
      console.log('🔄 Actions edit mode activated, charts tab disabled');
    }
  }, [isUploadOnlyMode, isActionsEditMode]);

  // Chart attachment state
  const [chartAttachments, setChartAttachments] = React.useState<TradeChartAttachments>(() => {
    const existing = trade?.chartAttachments || {};
    // Ensure metadata dates are proper Date objects
    if (existing.metadata) {
      return {
        ...existing,
        metadata: {
          ...existing.metadata,
          createdAt: existing.metadata.createdAt ? new Date(existing.metadata.createdAt) : new Date(),
          updatedAt: existing.metadata.updatedAt ? new Date(existing.metadata.updatedAt) : new Date(),
        }
      };
    }
    return existing;
  });

  // Track upload methods for chart consistency
  const [chartUploadMethods, setChartUploadMethods] = React.useState<{
    beforeEntry?: 'file' | 'url';
    afterExit?: 'file' | 'url';
  }>({});

  // Load chart image blobs when modal opens
  React.useEffect(() => {
    const loadChartImageBlobs = async () => {
      if (!trade?.id) return;

      try {
        const { DatabaseService } = await import('../db/database');

        // Always reload from database to get the latest state
        // This is especially important in upload-only mode to reflect any deletions
        const [blobs, currentTrade] = await Promise.all([
          DatabaseService.getTradeChartImageBlobs(trade.id),
          DatabaseService.getTrade(trade.id)
        ]);

        // Start with the current trade's chart attachments (if any)
        let attachments: TradeChartAttachments = {};

        // If the trade has inline chart attachments, include them
        if (currentTrade?.chartAttachments) {
          attachments = { ...currentTrade.chartAttachments };
        }

        // Process blob storage images and add/update them
        if (blobs.length > 0) {
          for (const blob of blobs) {
            // Create a proper data URL from the blob
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob.data);
            });

            const chartImage: ChartImage = {
              id: blob.id,
              filename: blob.filename,
              size: blob.size,
              mimeType: blob.mimeType,
              dataUrl: dataUrl,
              uploadedAt: blob.uploadedAt,
              compressed: blob.compressed,
              originalSize: blob.originalSize,
              storage: 'blob',
              blobId: blob.id
            };

            attachments[blob.imageType] = chartImage;
          }
        }

        // Calculate metadata if we have any attachments
        if (attachments.beforeEntry || attachments.afterExit) {
          const allImages = [attachments.beforeEntry, attachments.afterExit].filter(Boolean) as ChartImage[];
          const totalSize = allImages.reduce((sum, img) => sum + img.size, 0);
          const oldestUpload = allImages.reduce((oldest, img) =>
            img.uploadedAt < oldest ? img.uploadedAt : oldest,
            allImages[0]?.uploadedAt || new Date()
          );
          const newestUpload = allImages.reduce((newest, img) =>
            img.uploadedAt > newest ? img.uploadedAt : newest,
            allImages[0]?.uploadedAt || new Date()
          );

          attachments.metadata = {
            createdAt: oldestUpload,
            updatedAt: newestUpload,
            totalSize
          };
        }

        setChartAttachments(attachments);
        console.log(`📸 Loaded chart attachments for trade ${trade.id}:`, attachments);
      } catch (error) {
        console.error('Failed to load chart image blobs:', error);
      }
    };

    if (isOpen && trade?.id) {
      loadChartImageBlobs();
    }
  }, [isOpen, trade?.id, isUploadOnlyMode]); // Add isUploadOnlyMode to dependencies to refresh when entering upload mode

  // Enhanced auto-save with backup mechanism and visual feedback
  React.useEffect(() => {
    const saveData = async () => {
      setIsAutoSaving(true);
      try {
        // Save to sessionStorage for temporary persistence
        sessionStorage.setItem(sessionKey + '_formData', JSON.stringify(formData));

        // Also save to localStorage as backup with timestamp
        const backupKey = `tradeBackup_${sessionKey}_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify({
          formData,
          timestamp: Date.now(),
          sessionKey
        }));

        // Clean old backups (keep only last 5)
        const allKeys = Object.keys(localStorage);
        const backupKeys = allKeys.filter(key => key.startsWith(`tradeBackup_${sessionKey}_`))
          .sort((a, b) => {
            const timestampA = parseInt(a.split('_').pop() || '0');
            const timestampB = parseInt(b.split('_').pop() || '0');
            return timestampB - timestampA; // Sort descending
          });

        // Remove old backups, keep only 5 most recent
        backupKeys.slice(5).forEach(key => localStorage.removeItem(key));

        setLastSaved(new Date());
        console.log('💾 Auto-saved form data and created backup');
      } catch (error) {
        console.error('❌ Error auto-saving form data:', error);
      } finally {
        setIsAutoSaving(false);
      }
    };

    // Debounce auto-save to prevent excessive saves
    const timer = setTimeout(saveData, 1000);
    return () => clearTimeout(timer);
  }, [formData, sessionKey]);

  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_activeTab', activeTab);
  }, [activeTab, sessionKey]);

  // Update CMP when latest price changes (only if not manually set)
  React.useEffect(() => {
    if (latestPrice?.close && latestPrice.close > 0 && !cmpManuallySet && formData.cmp === 0) {
      console.log("[TradeModal] Updating CMP with latest price:", latestPrice.close);
      setFormData(prev => ({
        ...prev,
        cmp: latestPrice.close,
        _cmpAutoFetched: true
      }));
    }
  }, [latestPrice, cmpManuallySet, formData.cmp]);

  // Clear sessionStorage on close - but only after successful save
  const [shouldClearSession, setShouldClearSession] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen && shouldClearSession) {
      sessionStorage.removeItem(sessionKey + '_formData');
      sessionStorage.removeItem(sessionKey + '_activeTab');
      setShouldClearSession(false);
    }
  }, [isOpen, sessionKey, shouldClearSession]);

  // Define which fields should be calculated and read-only
  const calculatedFieldNames = React.useMemo(() => [
    // Calculated fields
    'riskReward', 'riskPerShare', 'totalRisk', 'positionSize', 'totalQty',
    'totalInvestment', 'exit1Amount', 'exit2Amount', 'exit3Amount', 'totalExitAmount',
    'pnl', 'pnlPercent', 'roi', 'avgEntry', 'allocation', 'slPercent', 'exitedQty',
    'openQty', 'avgExitPrice', 'stockMove', 'rewardRisk', 'holdingDays',
    'realisedAmount', 'plRs', 'pfImpact', 'cummPf'
    // 'cmp' REMOVED to allow manual entry when auto-fetch fails
  ], []);
  
  const debouncedFormData = useDebounce(formData, 300);

  // Virtualization setup for form fields
  const parentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (trade) {
      setFormData({ ...defaultTrade, ...trade, slPercent: (trade as any).slPercent || 0 });
    } else if (mode === 'add') {
      setFormData({ ...defaultTrade, tradeNo: nextTradeNo });
    } else {
      setFormData(defaultTrade);
    }
  }, [trade, mode, nextTradeNo]);

  // Auto-calculate derived fields when form data changes
  React.useEffect(() => {
    // Skip calculation if form is not dirty and in edit mode
    if (!isDirty && mode === 'edit') return;
    
    // Use a timeout to debounce rapid updates
    const timer = setTimeout(() => {
      setFormData(prevData => {
        // Create a copy of the previous data
        const updatedData = { ...prevData };
        
        // Recalculate all fields using the recalculateTrade function
        const recalculated = recalculateTrade(updatedData, portfolioSize, getPortfolioSize);
        
        // Only update if there are actual changes to prevent infinite loops
        const hasChanges = Object.keys(recalculated).some(key => 
          JSON.stringify(recalculated[key as keyof Trade]) !== JSON.stringify(updatedData[key as keyof Trade])
        );
        
        return hasChanges ? { ...updatedData, ...recalculated } : updatedData;
      });
    }, 100); // 100ms debounce
    
    return () => clearTimeout(timer);
  }, [
    formData.entry,
    formData.initialQty,
    formData.pyramid1Price,
    formData.pyramid1Qty,
    formData.pyramid2Price,
    formData.pyramid2Qty,
    formData.exit1Price,
    formData.exit1Qty,
    formData.exit2Price,
    formData.exit2Qty,
    formData.exit3Price,
    formData.exit3Qty,
    formData.sl,
    formData.cmp,
    formData.date,
    formData.exit1Date,
    portfolioSize,
    isDirty,
    mode
  ]);

  // Chart attachment handlers
  const handleChartImageUploaded = React.useCallback(async (imageType: 'beforeEntry' | 'afterExit', chartImage: ChartImage, uploadMethod?: 'file' | 'url') => {
    const newChartAttachments = {
      ...chartAttachments,
      [imageType]: chartImage,
      metadata: {
        createdAt: chartAttachments.metadata?.createdAt || new Date(),
        updatedAt: new Date(),
        totalSize: (chartAttachments.metadata?.totalSize || 0) + chartImage.size,
      }
    };

    // Update local state
    setChartAttachments(newChartAttachments);
    setIsDirty(true);

    // Track upload method for consistency
    if (uploadMethod) {
      setChartUploadMethods(prev => ({
        ...prev,
        [imageType]: uploadMethod
      }));
      console.log(`📊 Tracked upload method for ${imageType}: ${uploadMethod}`);
    }

    // CRITICAL FIX: Immediately update the trade in the database if it's an existing trade
    // BUT don't auto-save in upload-only mode to prevent modal from closing
    if (mode === 'edit' && trade?.id && !isUploadOnlyMode) {
      try {
        const updatedTrade = {
          ...trade,
          chartAttachments: newChartAttachments
        };

        // Save the updated trade to database immediately
        onSave(updatedTrade);
        console.log(`✅ Chart ${imageType} uploaded and trade updated immediately`);
      } catch (error) {
        console.error('❌ Failed to update trade with chart attachment:', error);
      }
    } else if (isUploadOnlyMode) {
      console.log(`📸 Chart ${imageType} uploaded in upload-only mode - will save when user manually submits`);
    }
  }, [chartAttachments, mode, trade, onSave, isUploadOnlyMode]);

  const handleChartImageDeleted = React.useCallback(async (imageType: 'beforeEntry' | 'afterExit') => {
    console.log(`🗑️ [TradeModal] handleChartImageDeleted called for ${imageType}`);
    console.log(`🗑️ [TradeModal] Current chartAttachments:`, chartAttachments);
    console.log(`🗑️ [TradeModal] Upload-only mode: ${isUploadOnlyMode}`);

    const deletedImage = chartAttachments[imageType];
    console.log(`🗑️ [TradeModal] Deleting image:`, deletedImage?.filename);

    const newAttachments = { ...chartAttachments };
    delete newAttachments[imageType];

    // Check if we have any remaining chart attachments
    const hasRemainingAttachments = newAttachments.beforeEntry || newAttachments.afterExit;
    console.log(`🗑️ [TradeModal] Has remaining attachments: ${hasRemainingAttachments}`);

    const updatedChartAttachments = hasRemainingAttachments ? {
      ...newAttachments,
      metadata: {
        createdAt: chartAttachments.metadata?.createdAt || new Date(),
        updatedAt: new Date(),
        totalSize: Math.max(0, (chartAttachments.metadata?.totalSize || 0) - (deletedImage?.size || 0)),
      }
    } : undefined; // Set to undefined if no attachments remain

    console.log(`🗑️ [TradeModal] Updated chart attachments:`, updatedChartAttachments);

    // Update local state
    setChartAttachments(updatedChartAttachments || {});
    setIsDirty(true);

    // Trigger chart refresh for Universal Chart Viewer
    setChartRefreshTrigger(prev => prev + 1);
    console.log('🔄 Chart deleted, triggering Universal Chart Viewer refresh');

    // CRITICAL FIX: Always update the trade in the database immediately when deleting charts
    // This ensures the chart attachment reference is removed from the trade record
    // Even in upload-only mode, we need to persist deletions to prevent them from reappearing
    if (trade?.id) {
      try {
        const updatedTrade = {
          ...trade,
          chartAttachments: updatedChartAttachments // This will be undefined if no attachments remain
        };

        console.log(`💾 [TradeModal] Saving updated trade to database:`, {
          tradeId: trade.id,
          hasChartAttachments: !!updatedChartAttachments,
          chartAttachments: updatedChartAttachments
        });

        // Save the updated trade to database immediately
        // Note: In upload-only mode, this won't close the modal because we're not changing the modal state
        onSave(updatedTrade);
        console.log(`✅ Chart ${imageType} deleted and trade updated immediately in database (upload-only mode: ${isUploadOnlyMode})`);
      } catch (error) {
        console.error('❌ Failed to update trade after chart deletion:', error);
      }
    } else {
      console.warn(`⚠️ [TradeModal] No trade ID available for saving chart deletion`);
    }

    // Also ensure the form data is updated to reflect the deletion
    if (hasRemainingAttachments) {
      setFormData(prev => ({
        ...prev,
        chartAttachments: updatedChartAttachments
      }));
    } else {
      // Remove chartAttachments property entirely if no attachments remain
      setFormData(prev => {
        const { chartAttachments: _, ...rest } = prev;
        return rest;
      });
    }

    console.log(`🗑️ Chart ${imageType} deleted - ${hasRemainingAttachments ? 'remaining attachments preserved' : 'all attachments removed'}`);
  }, [chartAttachments, trade, onSave, isUploadOnlyMode]);

  const handleChartImageView = React.useCallback((chartImage: ChartImage, title: string) => {
    setChartViewerImage(chartImage);
    setIsChartViewerOpen(true);
  }, []);

  // Handle form field changes
  const handleChange = React.useCallback(async (field: keyof TradeModalFormData, value: any) => {
    // Prevent any changes to calculated fields
    if (calculatedFieldNames.includes(field as string)) {
      console.warn(`Attempted to modify read-only field: ${field}`);
      return;
    }

    // Convert numeric fields to numbers
    const numericFields = [
      'entry', 'sl', 'tsl', 'cmp', 'initialQty',
      'pyramid1Price', 'pyramid1Qty', 'pyramid2Price', 'pyramid2Qty',
      'exit1Price', 'exit1Qty', 'exit2Price', 'exit2Qty', 'exit3Price', 'exit3Qty'
    ];

    const processedValue = numericFields.includes(field as string)
      ? Number(value) || 0
      : value;

    // Track if CMP was manually changed
    if (field === 'cmp') {
      setCmpManuallySet(true);
    }

    // If the field is 'name', fetch the latest price and update cmp (only if CMP is currently 0 or not manually set)
    let updatedFormData = {
      ...formData,
      [field]: processedValue,
      // Mark CMP as manually set if user changed it
      ...(field === 'cmp' ? { _cmpAutoFetched: false } : {})
    };

    if (field === 'name' && processedValue && !cmpManuallySet) {
      try {
        console.log("[TradeModal] Fetching price for symbol:", processedValue);
        // Use smart fetch that prioritizes historical fallback during night hours (3:55-9:15 AM)
        const priceData = await fetchPriceTicksSmart(processedValue);
        const ticks = priceData?.data?.ticks?.[processedValue.toUpperCase()];
        if (ticks && ticks.length > 0) {
          const latestTick = ticks[ticks.length - 1];
          const fetchedPrice = latestTick[4]; // index 4 is close price

          // Only update CMP if it's currently 0 (not manually set) or if we successfully fetched a price
          if (formData.cmp === 0 || fetchedPrice > 0) {
            updatedFormData.cmp = fetchedPrice;
            // Mark as auto-fetched
            updatedFormData._cmpAutoFetched = true;
            console.log("[TradeModal] Updated CMP with fetched price:", fetchedPrice);
          }
        } else {
          // No price data available - keep existing CMP if it's manually set, otherwise set to 0
          if (formData.cmp === 0) {
            updatedFormData.cmp = 0;
            updatedFormData._cmpAutoFetched = false;
          }
        }
      } catch (err) {
        // Fetch failed - keep existing CMP if it's manually set, otherwise set to 0
        if (formData.cmp === 0) {
          updatedFormData.cmp = 0;
          updatedFormData._cmpAutoFetched = false;
        }
        console.warn(`Failed to fetch price for ${processedValue}:`, err);
      }
    }

    setIsDirty(true);
    setFormData(updatedFormData);
  }, [calculatedFieldNames, formData, cmpManuallySet]);

  // Reset form when symbol changes
  React.useEffect(() => {
    if (initialSymbol && mode === 'add') {
      handleChange('name', initialSymbol);
    }
  }, [initialSymbol, mode, handleChange]);

  // Calculate values when form is submitted
  const calculateValues = React.useCallback(() => {
    // Use the recalculateTrade function to ensure all fields are up to date
    const recalculated = recalculateTrade(formData, portfolioSize, getPortfolioSize);
    
    // Update form data with recalculated values
    setFormData(prev => ({
      ...prev,
      ...recalculated
    }));
    
    return recalculated;
  }, [formData, portfolioSize, getPortfolioSize]);

  const [validationIssues, setValidationIssues] = React.useState<TradeIssue[]>([]);

  // Add useEffect to validate on form changes
  React.useEffect(() => {
    const issues = validateTrade(formData);
    setValidationIssues(issues);
  }, [formData]);

  // Enhanced handleSubmit with better error handling and data persistence
  const handleSubmit = React.useCallback(() => {
    console.log('🔄 Starting trade save process...');
    console.log('📊 Current formData:', formData);

    const issues = validateTrade(formData);
    setValidationIssues(issues);

    // Show validation errors to user but allow save with warnings
    if (issues.some(issue => issue.type === 'error')) {
      console.error('❌ Validation errors found:', issues.filter(i => i.type === 'error'));
      alert(`Cannot save trade due to validation errors:\n${issues.filter(i => i.type === 'error').map(i => i.message).join('\n')}`);
      return;
    }

    // Show warnings but continue with save
    if (issues.some(issue => issue.type === 'warning')) {
      console.warn('⚠️ Validation warnings found:', issues.filter(i => i.type === 'warning'));
    }

    try {
      // Clean up chart attachments - remove any that don't have valid data
      const cleanedChartAttachments: TradeChartAttachments = {};
      let hasValidAttachments = false;

      if (chartAttachments.beforeEntry) {
        // Validate beforeEntry attachment
        const beforeEntry = chartAttachments.beforeEntry;
        if (beforeEntry.id && beforeEntry.filename &&
            ((beforeEntry.storage === 'inline' && beforeEntry.data) ||
             (beforeEntry.storage === 'blob' && beforeEntry.blobId))) {
          cleanedChartAttachments.beforeEntry = beforeEntry;
          hasValidAttachments = true;
        } else {
          console.warn('🧹 Removing invalid beforeEntry chart attachment during save');
        }
      }

      if (chartAttachments.afterExit) {
        // Validate afterExit attachment
        const afterExit = chartAttachments.afterExit;
        if (afterExit.id && afterExit.filename &&
            ((afterExit.storage === 'inline' && afterExit.data) ||
             (afterExit.storage === 'blob' && afterExit.blobId))) {
          cleanedChartAttachments.afterExit = afterExit;
          hasValidAttachments = true;
        } else {
          console.warn('🧹 Removing invalid afterExit chart attachment during save');
        }
      }

      // Add metadata if we have valid attachments
      if (hasValidAttachments) {
        cleanedChartAttachments.metadata = {
          createdAt: chartAttachments.metadata?.createdAt || new Date(),
          updatedAt: new Date(),
          totalSize: (cleanedChartAttachments.beforeEntry?.size || 0) + (cleanedChartAttachments.afterExit?.size || 0),
        };
      }

      // Use current formData instead of debounced to ensure latest changes are saved
      const newTrade = {
        ...formData, // Use current formData instead of debouncedFormData
        id: formData.id || generateId(),
        // Include chart attachments only if we have valid ones
        chartAttachments: hasValidAttachments ? cleanedChartAttachments : undefined
      };

      console.log('💾 Saving trade with data:', newTrade);
      const recalculated = recalculateTrade(newTrade, portfolioSize, getPortfolioSize);
      console.log('🧮 Recalculated trade:', recalculated);

      onSave(recalculated);
      setShouldClearSession(true); // Mark for session clearing after successful save
      console.log('✅ Trade saved successfully');
    } catch (error) {
      console.error('💥 Error saving trade:', error);
      alert('Error saving trade. Please try again.');
    }
  }, [formData, chartAttachments, onSave, portfolioSize, getPortfolioSize]);

  const modalMotionProps = React.useMemo(() => ({
        variants: {
          enter: {
            opacity: 1,
            scale: 1,
        y: 0,
            transition: {
          duration: 0.2,
              ease: [0.16, 1, 0.3, 1]
            }
          },
          exit: {
            opacity: 0,
            scale: 0.98,
        y: 10,
            transition: {
          duration: 0.15,
              ease: [0.16, 1, 0.3, 1]
            }
          }
        },
    initial: { opacity: 0, scale: 0.98, y: 10 }
  }), []);

  const basicFields = React.useMemo(() => [
    { name: "tradeNo", label: "Trade No.", type: "text" },
    { name: "date", label: "Date", type: "date" },
    { name: "name", label: "Stock/Asset Name", type: "text" },
    { name: "entry", label: "Entry Price (₹)", type: "number", unit: "₹" },
    { name: "sl", label: "Stop Loss (SL) (₹)", type: "number", unit: "₹" },
    { name: "tsl", label: "Trailing SL (TSL) (₹)", type: "number", unit: "₹" },
    { name: "cmp", label: "Current Market Price (₹)", type: "number", unit: "₹" },
    { name: "buySell", label: "Buy/Sell", type: "select", options: ["Buy", "Sell"] },
    { name: "initialQty", label: "Initial Quantity (qty)", type: "number", unit: "qty" },
    { 
      name: "setup", 
      label: "Setup", 
      type: "select", 
      options: [
        "ITB",
        "Chop BO",
        "IPO Base",
        "3/5/8",
        "21/50",
        "Breakout",
        "Pullback",
        "Reversal",
        "Continuation",
        "Gap Fill",
        "OTB",
        "Stage 2",
        "ONP BO",
        "EP",
        "Pivot Bo",
        "Cheat",
        "Flag",
        "Other"
      ] 
    },
    { name: "baseDuration", label: "Base Duration", type: "text" },
    { name: "positionStatus", label: "Position Status", type: "select", options: ["Open", "Closed", "Partial"] },
    { name: "planFollowed", label: "Plan Followed", type: "checkbox" },
    { 
      name: "exitTrigger", 
      label: "Exit Trigger", 
      type: "select",
      options: [
        "Breakeven exit",
        "Market Pressure",
        "R multiples",
        "Random",
        "SL",
        "Target",
        "Trailing SL"
      ]
    },
    { 
      name: "proficiencyGrowthAreas", 
      label: "Proficiency Growth Areas", 
      type: "select",
      options: [
        "Biased Analysis",
        "Booked Early",
        "Didn't Book Loss",
        "FOMO",
        "Illiquid Stock",
        "Illogical SL",
        "Lack of Patience",
        "Late Entry",
        "Momentum-less stock",
        "Overconfidence",
        "Overtrading",
        "Poor Exit",
        "Poor Po Size",
        "Poor Sector",
        "Poor Stock",
        "Shifted SL Quickly",
        "Too Early Entry",
        "Too Tight SL"
      ]
    }
  ], []);

  const advancedFields = React.useMemo(() => [
    // Pyramid 1
    { name: "pyramid1Price", label: "Pyramid-1 Price (₹)", type: "number", unit: "₹" },
    { name: "pyramid1Qty", label: "Pyramid-1 Quantity (qty)", type: "number", unit: "qty" },
    { name: "pyramid1Date", label: "Pyramid-1 Date", type: "date" },
    
    // Pyramid 2
    { name: "pyramid2Price", label: "Pyramid-2 Price (₹)", type: "number", unit: "₹" },
    { name: "pyramid2Qty", label: "Pyramid-2 Quantity (qty)", type: "number", unit: "qty" },
    { name: "pyramid2Date", label: "Pyramid-2 Date", type: "date" },
    
    // Exit 1
    { name: "exit1Price", label: "Exit-1 Price (₹)", type: "number", unit: "₹" },
    { name: "exit1Qty", label: "Exit-1 Quantity (qty)", type: "number", unit: "qty" },
    { name: "exit1Date", label: "Exit-1 Date", type: "date" },
    
    // Exit 2
    { name: "exit2Price", label: "Exit-2 Price (₹)", type: "number", unit: "₹" },
    { name: "exit2Qty", label: "Exit-2 Quantity (qty)", type: "number", unit: "qty" },
    { name: "exit2Date", label: "Exit-2 Date", type: "date" },
    
    // Exit 3
    { name: "exit3Price", label: "Exit-3 Price (₹)", type: "number", unit: "₹" },
    { name: "exit3Qty", label: "Exit-3 Quantity (qty)", type: "number", unit: "qty" },
    { name: "exit3Date", label: "Exit-3 Date", type: "date" }
  ], []);

  const calculatedFields = [
    // Entry and Position
    { name: "avgEntry", label: "Avg. Entry (₹)", type: "calculated", unit: "₹" },
    { name: "positionSize", label: "Position Size (₹)", type: "calculated", unit: "₹" },
    { name: "allocation", label: "Allocation (%)", type: "calculated", unit: "%" },
    
    // Exit and Position Status
    { name: "openQty", label: "Open Qty (qty)", type: "calculated", unit: "qty" },
    { name: "exitedQty", label: "Exited Qty (qty)", type: "calculated", unit: "qty" },
    { name: "avgExitPrice", label: "Avg. Exit (₹)", type: "calculated", unit: "₹" },
    
    // Performance Metrics
    { name: "stockMove", label: "Stock Move (₹)", type: "calculated", unit: "₹" },
    { name: "slPercent", label: "SL (%)", type: "calculated", unit: "%" },
    { name: "rewardRisk", label: "Reward/Risk (x)", type: "calculated", unit: "x" },
    { name: "holdingDays", label: "Holding Days", type: "calculated", unit: "days" },
    { name: "realisedAmount", label: "Realised (₹)", type: "calculated", unit: "₹" },
    { name: "plRs", label: "P/L (₹)", type: "calculated", unit: "₹" },
    { name: "pfImpact", label: "PF Impact (%)", type: "calculated", unit: "%" },
    { name: "cummPf", label: "Cumulative PF (%)", type: "calculated", unit: "%" }
  ];

  const currentFields = React.useMemo(() => {
    // Always return fields, never empty array to avoid virtualizer issues
    return activeTab === "basic" ? basicFields : advancedFields;
  }, [activeTab]);

  const rowVirtualizer = useVirtualizer({
    count: currentFields.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5
  });

  // Reset virtualizer when tab changes
  React.useEffect(() => {
    if (rowVirtualizer && parentRef.current) {
      rowVirtualizer.scrollToOffset(0);
    }
  }, [activeTab, rowVirtualizer]);

  const renderField = React.useCallback((field: any) => {
    // If it's a calculated field, always render as read-only with consistent styling
    if (calculatedFieldNames.includes(field.name)) {
      const value = formData[field.name as keyof TradeModalFormData];
      let displayValue = value?.toString() || "0";
      
      // Format numbers to 2 decimal places if they're numeric
      if (typeof value === 'number') {
        displayValue = value.toFixed(2);
        if (field.unit === '%' || field.percentage) {
          displayValue = `${displayValue}%`;
        } else if (field.unit === '₹' || field.currency) {
          displayValue = `₹${displayValue}`;
        } else if (field.unit) {
          displayValue = `${displayValue} ${field.unit}`;
        }
      }
      
      return (
        <div key={field.name} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground-600">
            {field.label}
          </label>
          <div className="p-2 rounded-md bg-default-100 border-1 border-default-200 min-h-[40px] flex items-center">
            {displayValue}
          </div>
        </div>
      );
    }

    // Special handling for CMP field
    if (field.name === "cmp") {
      return (
        <div key={field.name} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground-600 flex items-center gap-2">
            {field.label}
            {formData._cmpAutoFetched === false && (
              <Chip size="sm" color="warning" variant="flat" className="text-xs">
                Manual
              </Chip>
            )}
            {formData._cmpAutoFetched === true && (
              <Chip size="sm" color="success" variant="flat" className="text-xs">
                Auto
              </Chip>
            )}
          </label>
          <Input
            type="number"
            value={formData.cmp?.toString() ?? "0"}
            onValueChange={(value) => handleChange("cmp", Number(value))}
            variant="bordered"
            startContent={<span className="text-default-400">₹</span>}
            placeholder={latestPrice?.close ? `Auto: ${latestPrice.close}` : "Enter manually"}
            isDisabled={formData._cmpAutoFetched === true}
            description={
              formData._cmpAutoFetched === false
                ? "Manually entered price"
                : formData._cmpAutoFetched === true
                  ? ""
                  : latestPrice?.close
                    ? "Price available - will auto-update"
                    : ""
            }
            className="transform-gpu"
          />
        </div>
      );
    }

    switch (field.type) {
      case "number":
        return (
          <Input
            key={field.name}
            label={field.label}
            type="number"
            value={formData[field.name]?.toString() ?? "0"}
            onValueChange={(value) => handleChange(field.name, Number(value))}
            variant="bordered"
            startContent={field.unit === '₹' && <span className="text-default-400">₹</span>}
            endContent={field.unit && field.unit !== '₹' && <span className="text-default-400">{field.unit}</span>}
            className="transform-gpu"
          />
        );
      case "date":
        return (
          <Input
            key={field.name}
            label={field.label}
            type="date"
            value={formData[field.name] || ""}
            onValueChange={(value) => handleChange(field.name, value)}
            variant="bordered"
            className="transform-gpu"
          />
        );
      case "select":
        return (
          <Select
            key={field.name}
            label={field.label}
            selectedKeys={[formData[field.name]]}
            onChange={(e) => handleChange(field.name, e.target.value)}
            variant="bordered"
            className="transform-gpu"
          >
            {field.options.map((opt: string) => (
              <SelectItem key={opt}>{opt}</SelectItem>
            ))}
          </Select>
        );
      case "text": // Handle text inputs specifically
        if (field.name === "name") {
          return (
            <NameCell
              key={field.name}
              value={formData.name || ""}
              onSave={(value) => handleChange("name", value)}
            />
          );
        }
        return (
          <Input
            key={field.name}
            label={field.label}
            value={formData[field.name] || ""}
            onValueChange={(value) => handleChange(field.name, value)}
            variant="bordered"
            className="transform-gpu"
          />
        );
      default:
        return (
          <Input
            key={field.name}
            label={field.label}
            value={formData[field.name] || ""}
            onValueChange={(value) => handleChange(field.name, value)}
            variant="bordered"
            className="transform-gpu"
          />
        );
    }
  }, [formData, handleChange, calculatedFieldNames]);

  const renderFields = () => {
    // Don't render fields for charts tab - this function should only be called for basic/advanced
    if (activeTab === "charts") {
      return null;
    }

    return (
      <div
        ref={parentRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-auto"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            {renderField(currentFields[virtualRow.index])}
          </div>
        ))}
      </div>
    );
  };

  const csvUrl = '/name_sector_industry.csv';

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
    const [position, setPosition] = React.useState({
      top: 0,
      left: 0,
      width: 0,
      height: 0
    });

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

        // Update position when editing starts
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        }
      } else {
        setShowDropdown(false);
      }
    }, [editValue, isEditing, stockNames]);

    // Add a resize listener to update position dynamically
    React.useEffect(() => {
      const handleResize = () => {
        if (isEditing && inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [isEditing]);

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

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!showDropdown) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            const next = prev + 1;
            return next >= filtered.length ? 0 : next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            const next = prev - 1;
            return next < 0 ? filtered.length - 1 : next;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleSave(filtered[selectedIndex]);
          } else if (filtered.length === 1) {
            handleSave(filtered[0]);
          } else {
            handleSave();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          setSelectedIndex(-1);
          break;
        case 'Tab':
          if (selectedIndex >= 0) {
            e.preventDefault();
            handleSave(filtered[selectedIndex]);
          }
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
            onBlur={() => setTimeout(() => handleSave(), 100)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {showDropdown && (
            <div
              ref={dropdownRef}
              style={{ 
                position: 'fixed',
                top: position.top + position.height,
                left: position.left,
                width: position.width,
              }}
              className="z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow max-h-48 overflow-y-auto overflow-x-auto"
              role="listbox"
              tabIndex={-1}
            >
              {filtered.map((name, i) => (
                <div
                  key={name}
                  id={`stock-suggestion-${i}`}
                  role="option"
                  aria-selected={i === selectedIndex}
                  className={`px-3 py-1.5 text-sm cursor-pointer whitespace-nowrap ${
                    i === selectedIndex
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-blue-50 dark:hover:bg-blue-800'
                  }`}
                  onMouseDown={() => handleSave(name)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div 
        className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-text"
        onClick={() => setIsEditing(true)}
      >
        {value || <span className="text-gray-400">Stock name</span>}
      </div>
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size={activeTab === 'charts' ? "3xl" : "2xl"}
      scrollBehavior="inside"
      motionProps={modalMotionProps}
      classNames={{
        base: "transform-gpu backdrop-blur-sm",
        wrapper: "transform-gpu",
        backdrop: "bg-black/40",
        closeButton: "text-foreground/60 hover:bg-white/10"
      }}
      backdrop="blur"
    >
      <ModalContent className={`bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-gray-200 dark:border-gray-700 shadow-2xl max-h-[85vh] z-[9999] ${
        activeTab === 'charts'
          ? 'w-[90vw] max-w-4xl'
          : 'w-[95vw] max-w-md'
      }`}>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80">
              <div className="flex justify-between items-center w-full">
                <Tabs
                  selectedKey={activeTab}
                  onSelectionChange={(key) => {
                    // Prevent tab switching in upload-only mode
                    if (isUploadOnlyMode) {
                      return; // Stay on charts tab
                    }

                    // In actions edit mode, prevent switching to charts tab
                    if (isActionsEditMode && key === 'charts') {
                      return; // Don't allow charts tab
                    }

                    setActiveTab(key as string);
                  }}
                  aria-label="Options"
                  color="primary"
                  size="sm"
                  classNames={{
                    tabList: "bg-transparent p-0.5 rounded-xl",
                    cursor: "bg-gray-200 dark:bg-gray-600 rounded-lg shadow-sm",
                    tab: "px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 data-[selected=true]:text-gray-900 dark:data-[selected=true]:text-white data-[hover=true]:bg-gray-100/80 dark:data-[hover=true]:bg-gray-700/50 rounded-lg transition-all duration-200"
                  }}
                >
                  <Tab
                    key="basic"
                    title="Basic"
                    isDisabled={isUploadOnlyMode}
                    className={isUploadOnlyMode ? "opacity-50 cursor-not-allowed" : ""}
                  />
                  <Tab
                    key="advanced"
                    title="Advanced"
                    isDisabled={isUploadOnlyMode}
                    className={isUploadOnlyMode ? "opacity-50 cursor-not-allowed" : ""}
                  />
                  <Tab
                    key="charts"
                    title="Charts"
                    isDisabled={isActionsEditMode}
                    className={
                      isUploadOnlyMode
                        ? "ring-2 ring-primary-500"
                        : isActionsEditMode
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }
                  />
                </Tabs>


              </div>
            </ModalHeader>
            <Divider />
            <ModalBody className="px-2 py-2 overflow-y-auto overflow-x-hidden overscroll-contain will-change-transform touch-auto">

              {/* Form Fields */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15, ease: [0.2, 0, 0.2, 1] }}
                  className="transform-gpu"
                >
                  {activeTab === 'charts' ? (
                    <div className="space-y-6">
                      {isUploadOnlyMode && (
                        <div className="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Icon icon="lucide:upload" className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                              Chart Upload Mode
                            </span>
                          </div>
                          <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                            You can only upload charts in this mode. Other trade details are not editable.
                          </p>
                        </div>
                      )}
                      <div className="flex justify-end mb-6">
                        <Button
                          color="primary"
                          variant="flat"
                          size="sm"
                          onPress={() => setIsUniversalViewerOpen(true)}
                          startContent={<Icon icon="lucide:images" className="w-4 h-4" />}
                        >
                          Browse All Charts
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ChartImageUpload
                          tradeId={formData.id || 'new'}
                          imageType="beforeEntry"
                          currentImage={chartAttachments.beforeEntry}
                          onImageUploaded={(chartImage, uploadMethod) => handleChartImageUploaded('beforeEntry', chartImage, uploadMethod)}
                          onImageDeleted={() => handleChartImageDeleted('beforeEntry')}
                          disabled={false}
                        />

                        <ChartImageUpload
                          tradeId={formData.id || 'new'}
                          imageType="afterExit"
                          currentImage={chartAttachments.afterExit}
                          onImageUploaded={(chartImage, uploadMethod) => handleChartImageUploaded('afterExit', chartImage, uploadMethod)}
                          onImageDeleted={() => handleChartImageDeleted('afterExit')}
                          disabled={false}
                          suggestedUploadMethod={chartUploadMethods.beforeEntry}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Summary Card Section: Show key calculated metrics at the top */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 transform-gpu">
                        <div className="p-2 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/5 transition-all duration-200 shadow-sm hover:shadow">
                          <div className="text-[10px] text-foreground-500">Avg. Entry (₹)</div>
                          <div className="font-medium text-sm">{formData.avgEntry?.toFixed(2) ?? '0.00'}</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-[10px] text-foreground-500">Position (₹)</div>
                          <div className="font-medium text-sm">{(formData.positionSize / 1000)?.toFixed(1) ?? '0.0'}K</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-[10px] text-foreground-500">Alloc. (%)</div>
                          <div className="font-medium text-sm">{formData.allocation?.toFixed(1) ?? '0.0'}%</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">Open Qty (qty)</div>
                          <div className="font-semibold">{formData.openQty ?? 0}</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">Exited Qty (qty)</div>
                          <div className="font-semibold">{formData.exitedQty ?? 0}</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">Avg. Exit (₹)</div>
                          <div className="font-semibold">{formData.avgExitPrice?.toFixed(2) ?? '0.00'}</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">Stock Move (₹)</div>
                          <div className="font-semibold">{formData.stockMove?.toFixed(2) ?? '0.00'}</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">SL (%)</div>
                          <div className="font-semibold">{formData.slPercent?.toFixed(2) ?? '0.00'}%</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">Reward/Risk (x)</div>
                          <div className="font-semibold">{formData.rewardRisk?.toFixed(2) ?? '0.00'}</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">Holding Days</div>
                          <div className="font-semibold">{formData.holdingDays ?? 0}</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">Realised (₹)</div>
                          <div className="font-semibold">{formData.realisedAmount?.toFixed(2) ?? '0.00'}</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">P/L (₹)</div>
                          <div className="font-semibold">{formData.plRs?.toFixed(2) ?? '0.00'}</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">PF Impact (%)</div>
                          <div className="font-semibold">{formData.pfImpact?.toFixed(2) ?? '0.00'}%</div>
                        </div>
                        <div className="p-3 rounded-md bg-default-100 border border-default-200">
                          <div className="text-xs text-foreground-400 mb-1">Cumulative PF (%)</div>
                          <div className="font-semibold">{formData.cummPf?.toFixed(2) ?? '0.00'}%</div>
                        </div>
                      </div>

                      {/* Add Validation Messages below summary cards */}
                      {validationIssues.length > 0 && (
                        <div className="mb-4 backdrop-blur-lg bg-white/5 rounded-lg p-2 border border-white/10 text-sm transform-gpu">
                          {validationIssues.map((issue, index) => (
                            <div
                              key={index}
                              className={`p-2 text-sm rounded-lg mb-1.5 flex items-center gap-2 backdrop-blur-md ${
                                issue.type === 'error'
                                  ? 'bg-danger-500/10 border border-danger-500/20 text-danger-200 backdrop-blur-md'
                                  : 'bg-warning-500/10 border border-warning-500/20 text-warning-200 backdrop-blur-md'
                              }`}
                            >
                              <Icon
                                icon={issue.type === 'error' ? "lucide:alert-circle" : "lucide:alert-triangle"}
                                className={issue.type === 'error' ? "text-danger-500" : "text-warning-500"}
                              />
                              <span className="text-sm">{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {renderFields()}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </ModalBody>
            <Divider />
            <ModalFooter className="border-t border-gray-200 dark:border-gray-700 py-2 px-4 bg-white/80 dark:bg-transparent">
              <Button
                variant="flat"
                onPress={() => onOpenChange(false)}
                className="bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 h-8 min-w-20 text-xs text-gray-800 dark:text-gray-200"
              >
                Cancel
              </Button>
                <Button 
                  color="primary" 
                  onPress={handleSubmit}
                  isDisabled={validationIssues.some(issue => issue.type === 'error')}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md shadow-blue-500/20 h-8 min-w-24 text-sm min-w-8 w-8 h-8 p-0 flex items-center justify-center bg-gray-800 hover:bg-gray-900 text-white shadow-sm rounded-full"
                  isIconOnly
                >
                  <Icon 
                    icon={mode === "add" ? "lucide:plus" : "lucide:check"} 
                    className="h-4 w-4"
                  />
                </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>

      {/* Chart Image Viewer Modal */}
      <ChartImageViewer
        isOpen={isChartViewerOpen}
        onOpenChange={setIsChartViewerOpen}
        chartImage={chartViewerImage}
        title={chartViewerImage ?
          (chartAttachments.beforeEntry?.id === chartViewerImage.id ? 'Before Entry Chart' : 'After Exit Chart')
          : 'Chart Image'
        }
      />

      {/* Universal Chart Viewer Modal */}
      <UniversalChartViewer
        isOpen={isUniversalViewerOpen}
        onOpenChange={setIsUniversalViewerOpen}
        initialChartImage={chartViewerImage}
        initialTradeId={formData.id}
        refreshTrigger={chartRefreshTrigger}
      />
    </Modal>
  );
});

TradeModal.displayName = "TradeModal";