import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartImage } from '../types/trade';
import { ChartImageService } from '../services/chartImageService';
import { formatFileSize } from '../utils/chartImageUtils';

interface ChartImageViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  chartImage: ChartImage | null;
  title?: string;
}

export const ChartImageViewer: React.FC<ChartImageViewerProps> = ({
  isOpen,
  onOpenChange,
  chartImage,
  title = 'Chart Image',
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Load image when modal opens
  useEffect(() => {
    if (isOpen && chartImage) {
      setIsLoading(true);
      setError(null);

      // If chartImage already has a dataUrl, use it directly
      if (chartImage.dataUrl) {
        setImageUrl(chartImage.dataUrl);
        setIsLoading(false);
      } else {
        // Otherwise, fetch from service
        ChartImageService.getChartImageDataUrl(chartImage)
          .then(url => {
            setImageUrl(url);
            setIsLoading(false);
          })
          .catch(err => {
            setError('Failed to load image');
            setIsLoading(false);
            console.error('Failed to load chart image:', err);
          });
      }
    } else {
      setImageUrl(null);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, chartImage]);
  
  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);
  
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  };
  
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
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
  
  const handleWheel = React.useCallback((e: WheelEvent) => {
    // Only prevent default if we're actually zooming
    if (e.deltaY !== 0) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.5, Math.min(5, prev * delta)));
    }
  }, []);

  // Use native event listener with passive: false to avoid preventDefault warnings
  const wheelContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = wheelContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]);
  
  const downloadImage = () => {
    if (imageUrl && chartImage) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = chartImage.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="5xl"
      backdrop="blur"
      classNames={{
        base: "bg-white/95 dark:bg-gray-900/95",
        backdrop: "bg-black/50",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Icon icon="lucide:image" className="w-5 h-5 text-primary-500" />
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  {chartImage && (
                    <p className="text-sm text-gray-500">
                      {chartImage.filename} • {formatFileSize(chartImage.size)}
                      {chartImage.compressed && ' • Compressed'}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
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
                      onPress={handleResetZoom}
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
                    onPress={downloadImage}
                    isDisabled={!imageUrl}
                  >
                    <Icon icon="lucide:download" className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </div>
            </ModalHeader>
            
            <ModalBody className="p-0 overflow-hidden">
              <div
                ref={wheelContainerRef}
                className="relative w-full h-[70vh] bg-gray-50 dark:bg-gray-900 overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="text-center">
                        <Icon icon="lucide:loader-2" className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Loading image...</p>
                      </div>
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="text-center">
                        <Icon icon="lucide:image-off" className="w-8 h-8 text-danger-500 mx-auto mb-2" />
                        <p className="text-sm text-danger-600">{error}</p>
                      </div>
                    </motion.div>
                  ) : imageUrl ? (
                    <motion.div
                      key="image"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <img
                        src={imageUrl}
                        alt={title}
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
                  ) : null}
                </AnimatePresence>
              </div>
            </ModalBody>
            
            <ModalFooter className="border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-gray-500">
                  {zoom > 1 && 'Click and drag to pan • '}
                  Scroll to zoom • Click image to zoom in
                </div>
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
