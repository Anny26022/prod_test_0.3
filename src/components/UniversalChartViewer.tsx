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

  // Load all chart images when modal opens
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
  }, [isOpen]);

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
      const images = await DatabaseService.getAllChartImageBlobsWithTradeInfo();
      
      // Convert blobs to data URLs
      const imagesWithDataUrls: ChartImageWithContext[] = [];
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        setLoadingProgress((i / images.length) * 100);
        
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
          console.error(`Failed to load image ${image.filename}:`, err);
        }
      }

      setAllImages(imagesWithDataUrls);
      setLoadingProgress(100);
      
      // Preload first few images
      preloadAdjacentImages(0, imagesWithDataUrls);
      
    } catch (err) {
      setError('Failed to load chart images');
      console.error('Failed to load all chart images:', err);
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
            <ModalHeader className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center gap-4">
                <Icon icon="lucide:images" className="w-6 h-6 text-primary-500" />
                <div className="flex items-center gap-4">
                  {/* Symbol Search Input */}
                  <div className="relative">
                    <Input
                      size="sm"
                      placeholder="Search symbol..."
                      value={symbolSearch}
                      onChange={(e) => handleSymbolSearchChange(e.target.value)}
                      onFocus={() => setShowSymbolDropdown(symbolSearch.length > 0)}
                      onBlur={() => setTimeout(() => setShowSymbolDropdown(false), 200)}
                      className="w-48"
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
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
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

                  {/* Current Symbol Display */}
                  <div>
                    <h3 className="text-xl font-semibold">
                      {currentImage?.tradeName || 'Chart Viewer'}
                    </h3>
                    {currentImage && (
                      <div className="flex items-center gap-2 mt-1">
                        <Chip
                          size="sm"
                          color={currentImage.imageType === 'beforeEntry' ? 'success' : 'warning'}
                          startContent={<Icon icon={getImageTypeIcon(currentImage.imageType)} className="w-3 h-3" />}
                        >
                          {getImageTypeLabel(currentImage.imageType)}
                        </Chip>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Trade #{currentImage.tradeNo}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(currentImage.size)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Filter Controls */}
                <Select
                  size="sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterType)}
                  className="w-40"
                  label="Filter"
                >
                  <SelectItem key="all" value="all">All Charts</SelectItem>
                  <SelectItem key="beforeEntry" value="beforeEntry">Before Entry</SelectItem>
                  <SelectItem key="afterExit" value="afterExit">After Exit</SelectItem>
                </Select>

                {/* Navigation Counter */}
                <div className="text-sm text-gray-600 dark:text-gray-400 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  {filteredImages.length > 0 ? `${currentIndex + 1} / ${filteredImages.length}` : '0 / 0'}
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center gap-1">
                  <Tooltip content="Previous (←)">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={navigatePrevious}
                      isDisabled={currentIndex <= 0}
                    >
                      <Icon icon="lucide:chevron-left" className="w-5 h-5" />
                    </Button>
                  </Tooltip>
                  
                  <Tooltip content="Next (→)">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={navigateNext}
                      isDisabled={currentIndex >= filteredImages.length - 1}
                    >
                      <Icon icon="lucide:chevron-right" className="w-5 h-5" />
                    </Button>
                  </Tooltip>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <Tooltip content="Zoom Out">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={handleZoomOut}
                      isDisabled={zoom <= 0.5}
                    >
                      <Icon icon="lucide:zoom-out" className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                  
                  <span className="text-sm font-mono px-2 min-w-[60px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  
                  <Tooltip content="Zoom In">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={handleZoomIn}
                      isDisabled={zoom >= 5}
                    >
                      <Icon icon="lucide:zoom-in" className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                  
                  <Tooltip content="Reset Zoom">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={resetZoom}
                    >
                      <Icon icon="lucide:maximize" className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                </div>

                {/* Download Button */}
                <Tooltip content="Download Image">
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={downloadCurrentImage}
                    isDisabled={!currentImage?.dataUrl}
                  >
                    <Icon icon="lucide:download" className="w-4 h-4" />
                  </Button>
                </Tooltip>

                {/* Close Button */}
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={onClose}
                >
                  <Icon icon="lucide:x" className="w-5 h-5" />
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

            <ModalFooter className="border-t border-gray-200 dark:border-gray-700 px-6 py-3">
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>Use ← → arrow keys to navigate</span>
                    <span>•</span>
                    <span>Press 1 for Before Entry, 2 for After Exit, 0 for All</span>
                    {zoom > 1 && (
                      <>
                        <span>•</span>
                        <span>Click and drag to pan</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentImage && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {currentImage.tradeDate && new Date(currentImage.tradeDate).toLocaleDateString()}
                    </div>
                  )}
                  <Button color="primary" onPress={onClose}>
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
