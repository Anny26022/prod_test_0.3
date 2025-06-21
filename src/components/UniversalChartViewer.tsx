import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Tooltip, Select, SelectItem, Chip, Progress, Input } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartImage } from '../types/trade';
import { DatabaseService, ChartImageBlob } from '../db/database';
import { formatFileSize } from '../utils/chartImageUtils';

interface UniversalChartViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialChartImage?: ChartImage | null;
  initialTradeId?: string;
  refreshTrigger?: number; // Add refresh trigger prop
}

interface ChartImageWithContext extends ChartImageBlob {
  tradeName?: string;
  tradeDate?: string;
  tradeNo?: number;
  dataUrl?: string;
}

type FilterType = 'all' | 'beforeEntry' | 'afterExit';

export const UniversalChartViewer: React.FC<UniversalChartViewerProps> = ({
  isOpen,
  onOpenChange,
  initialChartImage,
  initialTradeId,
  refreshTrigger,
}) => {
  const [allImages, setAllImages] = useState<ChartImageWithContext[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [preloadedImages, setPreloadedImages] = useState<Map<string, string>>(new Map());
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);

  // Get unique symbols for search
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(allImages.map(img => img.tradeName).filter(Boolean));
    return Array.from(symbols).sort();
  }, [allImages]);

  // Filter images based on current filter and symbol search
  const filteredImages = useMemo(() => {
    let images = allImages;

    // Apply type filter
    if (filter !== 'all') {
      images = images.filter(img => img.imageType === filter);
    }

    // Apply symbol search
    if (symbolSearch) {
      images = images.filter(img =>
        img.tradeName?.toLowerCase().includes(symbolSearch.toLowerCase())
      );
    }

    return images;
  }, [allImages, filter, symbolSearch]);

  // Get filtered symbols for dropdown
  const filteredSymbols = useMemo(() => {
    if (!symbolSearch) return uniqueSymbols.slice(0, 10);
    return uniqueSymbols
      .filter(symbol => symbol.toLowerCase().includes(symbolSearch.toLowerCase()))
      .slice(0, 10);
  }, [uniqueSymbols, symbolSearch]);

  const currentImage = filteredImages[currentIndex];

  // Load all chart images when modal opens or when refresh is triggered
  useEffect(() => {
    if (isOpen) {
      loadAllImages();
    } else {
      // Cleanup when modal closes
      preloadedImages.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      setPreloadedImages(new Map());
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, refreshTrigger]); // Add refreshTrigger to dependencies

  // Set initial image when provided
  useEffect(() => {
    if (initialChartImage && filteredImages.length > 0) {
      const index = filteredImages.findIndex(img => img.id === initialChartImage.id);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    }
  }, [initialChartImage, filteredImages]);

  // Reset current index when filter or symbol search changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [filter, symbolSearch]);

  // Handle symbol selection
  const handleSymbolSelect = (symbol: string) => {
    setSymbolSearch(symbol);
    setShowSymbolDropdown(false);
    // Find first image for this symbol
    const symbolIndex = filteredImages.findIndex(img => img.tradeName === symbol);
    if (symbolIndex >= 0) {
      setCurrentIndex(symbolIndex);
    }
  };

  // Handle symbol search input
  const handleSymbolSearchChange = (value: string) => {
    setSymbolSearch(value);
    setShowSymbolDropdown(value.length > 0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigatePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateNext();
          break;
        case 'Escape':
          onOpenChange(false);
          break;
        case '1':
          setFilter('beforeEntry');
          break;
        case '2':
          setFilter('afterExit');
          break;
        case '0':
          setFilter('all');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, filteredImages.length]);

  const loadAllImages = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      // Load both blob storage and inline storage charts
      const [blobImages, allTrades] = await Promise.all([
        DatabaseService.getAllChartImageBlobsWithTradeInfo(),
        DatabaseService.getAllTrades()
      ]);

      // Convert blob images to data URLs
      const imagesWithDataUrls: ChartImageWithContext[] = [];
      let processedCount = 0;
      const totalItems = blobImages.length + allTrades.length;

      // Process blob storage images
      for (let i = 0; i < blobImages.length; i++) {
        const image = blobImages[i];
        setLoadingProgress((processedCount / totalItems) * 100);

        try {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(image.data);
          });

          imagesWithDataUrls.push({
            ...image,
            dataUrl
          });
        } catch (err) {
          console.error(`Failed to load blob image ${image.filename}:`, err);
        }
        processedCount++;
      }

      // Process inline storage images from trades
      for (let i = 0; i < allTrades.length; i++) {
        const trade = allTrades[i];
        setLoadingProgress((processedCount / totalItems) * 100);

        try {
          if (trade.chartAttachments) {
            // Process beforeEntry chart if it exists and uses inline storage
            if (trade.chartAttachments.beforeEntry?.storage === 'inline' && trade.chartAttachments.beforeEntry.data) {
              const chartImage = trade.chartAttachments.beforeEntry;

              const dataUrl = `data:${chartImage.mimeType};base64,${chartImage.data}`;

              imagesWithDataUrls.push({
                id: chartImage.id,
                tradeId: trade.id,
                imageType: 'beforeEntry',
                filename: chartImage.filename,
                mimeType: chartImage.mimeType,
                size: chartImage.size,
                data: new Blob(), // Not used for inline
                uploadedAt: new Date(chartImage.uploadedAt),
                compressed: chartImage.compressed || false,
                originalSize: chartImage.originalSize,
                tradeName: trade.name,
                tradeDate: trade.date,
                tradeNo: Number(trade.tradeNo),
                dataUrl
              });
            }

            // Process afterExit chart if it exists and uses inline storage
            if (trade.chartAttachments.afterExit?.storage === 'inline' && trade.chartAttachments.afterExit.data) {
              const chartImage = trade.chartAttachments.afterExit;

              const dataUrl = `data:${chartImage.mimeType};base64,${chartImage.data}`;

              imagesWithDataUrls.push({
                id: chartImage.id,
                tradeId: trade.id,
                imageType: 'afterExit',
                filename: chartImage.filename,
                mimeType: chartImage.mimeType,
                size: chartImage.size,
                data: new Blob(), // Not used for inline
                uploadedAt: new Date(chartImage.uploadedAt),
                compressed: chartImage.compressed || false,
                originalSize: chartImage.originalSize,
                tradeName: trade.name,
                tradeDate: trade.date,
                tradeNo: Number(trade.tradeNo),
                dataUrl
              });
            }
          }
        } catch (error) {
          // Silently skip trades with errors
        }
        processedCount++;
      }



      // Sort images: beforeEntry first, then afterExit, then by trade date
      const sortedImages = imagesWithDataUrls.sort((a, b) => {
        // First sort by image type: beforeEntry (0) comes before afterExit (1)
        const typeOrder = { beforeEntry: 0, afterExit: 1 };
        const typeComparison = typeOrder[a.imageType] - typeOrder[b.imageType];

        if (typeComparison !== 0) {
          return typeComparison;
        }

        // If same type, sort by trade date (newest first)
        const dateA = a.tradeDate ? new Date(a.tradeDate).getTime() : 0;
        const dateB = b.tradeDate ? new Date(b.tradeDate).getTime() : 0;
        return dateB - dateA;
      });

      setAllImages(sortedImages);
      setLoadingProgress(100);

      // Preload first few images
      preloadAdjacentImages(0, imagesWithDataUrls);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load chart images: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const preloadAdjacentImages = useCallback((index: number, images: ChartImageWithContext[]) => {
    const preloadRange = 2; // Preload 2 images before and after current
    const newPreloaded = new Map(preloadedImages);

    for (let i = Math.max(0, index - preloadRange); i <= Math.min(images.length - 1, index + preloadRange); i++) {
      const img = images[i];
      if (img.dataUrl && !newPreloaded.has(img.id)) {
        newPreloaded.set(img.id, img.dataUrl);
      }
    }

    setPreloadedImages(newPreloaded);
  }, [preloadedImages]);

  const navigateNext = useCallback(() => {
    if (currentIndex < filteredImages.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      preloadAdjacentImages(newIndex, filteredImages);
      resetZoom();
    }
  }, [currentIndex, filteredImages, preloadAdjacentImages]);

  const navigatePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      preloadAdjacentImages(newIndex, filteredImages);
      resetZoom();
    }
  }, [currentIndex, filteredImages, preloadAdjacentImages]);

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const downloadCurrentImage = () => {
    if (currentImage?.dataUrl) {
      const link = document.createElement('a');
      link.href = currentImage.dataUrl;
      link.download = currentImage.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getImageTypeLabel = (type: 'beforeEntry' | 'afterExit') => {
    return type === 'beforeEntry' ? 'Before Entry' : 'After Exit';
  };

  const getImageTypeIcon = (type: 'beforeEntry' | 'afterExit') => {
    return type === 'beforeEntry' ? 'lucide:trending-up' : 'lucide:trending-down';
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="full"
      backdrop="blur"
      classNames={{
        base: "bg-white/95 dark:bg-gray-900/95",
        backdrop: "bg-black/60",
      }}
      hideCloseButton
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="flex items-center gap-4">

                {/* Compact Symbol Search */}
                <div className="relative">
                  <Input
                    size="md"
                    placeholder="Search..."
                    value={symbolSearch}
                    onChange={(e) => handleSymbolSearchChange(e.target.value)}
                    onFocus={() => setShowSymbolDropdown(symbolSearch.length > 0)}
                    onBlur={() => setTimeout(() => setShowSymbolDropdown(false), 200)}
                    className="w-40"
                    classNames={{
                      input: "text-sm",
                      inputWrapper: "h-8 min-h-8"
                    }}
                    startContent={<Icon icon="lucide:search" className="w-4 h-4 text-gray-400" />}
                    endContent={
                      symbolSearch && (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => {
                            setSymbolSearch('');
                            setShowSymbolDropdown(false);
                          }}
                          className="w-4 h-4 min-w-4"
                        >
                          <Icon icon="lucide:x" className="w-3 h-3" />
                        </Button>
                      )
                    }
                  />

                  {/* Symbol Dropdown */}
                  {showSymbolDropdown && filteredSymbols.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-32 overflow-y-auto">
                      {filteredSymbols.map((symbol) => (
                        <div
                          key={symbol}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                          onMouseDown={() => handleSymbolSelect(symbol)}
                        >
                          {symbol}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Compact Current Image Info */}
                {currentImage && (
                  <div className="flex items-center gap-3">
                    <Chip
                      size="md"
                      color={currentImage.imageType === 'beforeEntry' ? 'success' : 'warning'}
                      className="text-sm h-6 px-3"
                    >
                      {getImageTypeLabel(currentImage.imageType)}
                    </Chip>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {currentImage.tradeName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Filter Controls */}
                <Select
                  size="md"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterType)}
                  className="w-28"
                  classNames={{
                    trigger: "h-8 min-h-8",
                    value: "text-sm"
                  }}
                  placeholder="Filter"
                  aria-label="Filter charts"
                >
                  <SelectItem key="all" value="all">All</SelectItem>
                  <SelectItem key="beforeEntry" value="beforeEntry">Entry</SelectItem>
                  <SelectItem key="afterExit" value="afterExit">Exit</SelectItem>
                </Select>

                {/* Navigation Counter */}
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-center min-w-[3rem]">
                  {filteredImages.length > 0 ? `${currentIndex + 1}/${filteredImages.length}` : '0/0'}
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center">
                  <Button
                    isIconOnly
                    variant="light"
                    size="md"
                    onPress={navigatePrevious}
                    isDisabled={currentIndex <= 0}
                    className="w-8 h-8 min-w-8"
                  >
                    <Icon icon="lucide:chevron-left" className="w-4 h-4" />
                  </Button>

                  <Button
                    isIconOnly
                    variant="light"
                    size="md"
                    onPress={navigateNext}
                    isDisabled={currentIndex >= filteredImages.length - 1}
                    className="w-8 h-8 min-w-8"
                  >
                    <Icon icon="lucide:chevron-right" className="w-4 h-4" />
                  </Button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded px-2">
                  <Button
                    isIconOnly
                    variant="light"
                    size="md"
                    onPress={handleZoomOut}
                    isDisabled={zoom <= 0.5}
                    className="w-7 h-7 min-w-7"
                  >
                    <Icon icon="lucide:zoom-out" className="w-4 h-4" />
                  </Button>

                  <span className="text-sm font-mono px-2 min-w-[2.5rem] text-center">
                    {Math.round(zoom * 100)}%
                  </span>

                  <Button
                    isIconOnly
                    variant="light"
                    size="md"
                    onPress={handleZoomIn}
                    isDisabled={zoom >= 5}
                    className="w-7 h-7 min-w-7"
                  >
                    <Icon icon="lucide:zoom-in" className="w-4 h-4" />
                  </Button>

                  <Button
                    isIconOnly
                    variant="light"
                    size="md"
                    onPress={resetZoom}
                    className="w-7 h-7 min-w-7"
                  >
                    <Icon icon="lucide:maximize" className="w-4 h-4" />
                  </Button>
                </div>

                {/* Action Buttons */}
                <Button
                  isIconOnly
                  variant="light"
                  size="md"
                  onPress={downloadCurrentImage}
                  isDisabled={!currentImage?.dataUrl}
                  className="w-8 h-8 min-w-8"
                >
                  <Icon icon="lucide:download" className="w-4 h-4" />
                </Button>

                <Button
                  isIconOnly
                  variant="light"
                  size="md"
                  onPress={onClose}
                  className="w-8 h-8 min-w-8"
                >
                  <Icon icon="lucide:x" className="w-4 h-4" />
                </Button>
              </div>
            </ModalHeader>

            <ModalBody className="p-0 overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[80vh]">
                  <Icon icon="lucide:loader-2" className="w-12 h-12 animate-spin text-primary-500 mb-4" />
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">Loading chart images...</p>
                  <Progress value={loadingProgress} className="w-64" />
                  <p className="text-sm text-gray-500 mt-2">{Math.round(loadingProgress)}%</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-[80vh]">
                  <Icon icon="lucide:image-off" className="w-12 h-12 text-danger-500 mb-4" />
                  <p className="text-lg text-danger-600">{error}</p>
                  <Button
                    color="primary"
                    variant="light"
                    onPress={loadAllImages}
                    className="mt-4"
                    startContent={<Icon icon="lucide:refresh-cw" className="w-4 h-4" />}
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[80vh]">
                  <Icon icon="lucide:image-off" className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-lg text-gray-600 dark:text-gray-400">No chart images found</p>
                  <p className="text-sm text-gray-500">Upload some chart images to get started</p>
                </div>
              ) : currentImage ? (
                <div className="relative w-full h-[80vh] bg-gray-50 dark:bg-gray-900 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentImage.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <img
                        src={currentImage.dataUrl}
                        alt={`${currentImage.tradeName} - ${getImageTypeLabel(currentImage.imageType)}`}
                        className={`max-w-none transition-transform ${
                          zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'
                        } ${isDragging ? 'cursor-grabbing' : ''}`}
                        style={{
                          transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                          maxHeight: zoom === 1 ? '100%' : 'none',
                          maxWidth: zoom === 1 ? '100%' : 'none',
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onClick={zoom === 1 ? handleZoomIn : undefined}
                        draggable={false}
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation Overlay */}
                  <div className="absolute inset-y-0 left-0 flex items-center">
                    <Button
                      isIconOnly
                      variant="flat"
                      size="lg"
                      onPress={navigatePrevious}
                      isDisabled={currentIndex <= 0}
                      className="ml-4 bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
                    >
                      <Icon icon="lucide:chevron-left" className="w-6 h-6" />
                    </Button>
                  </div>

                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <Button
                      isIconOnly
                      variant="flat"
                      size="lg"
                      onPress={navigateNext}
                      isDisabled={currentIndex >= filteredImages.length - 1}
                      className="mr-4 bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
                    >
                      <Icon icon="lucide:chevron-right" className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </ModalBody>

            <ModalFooter className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-gray-500">
                  <span>← → keys to navigate</span>
                  {zoom > 1 && <span> • Drag to pan</span>}
                </div>

                <div className="flex items-center gap-3">
                  {currentImage && currentImage.tradeDate && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(currentImage.tradeDate).toLocaleDateString()}
                    </span>
                  )}
                  <Button
                    color="primary"
                    size="md"
                    onPress={onClose}
                    className="h-8 text-sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
