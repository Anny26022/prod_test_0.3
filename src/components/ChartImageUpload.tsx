import React, { useState, useCallback, useRef } from 'react';
import { Button, Card, CardBody, Progress, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartImage } from '../types/trade';
import { ChartImageService } from '../services/chartImageService';
import { validateImageFile, formatFileSize, CHART_IMAGE_CONFIG } from '../utils/chartImageUtils';

interface ChartImageUploadProps {
  tradeId: string;
  imageType: 'beforeEntry' | 'afterExit';
  currentImage?: ChartImage;
  onImageUploaded: (chartImage: ChartImage) => void;
  onImageDeleted: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export const ChartImageUpload: React.FC<ChartImageUploadProps> = ({
  tradeId,
  imageType,
  currentImage,
  onImageUploaded,
  onImageDeleted,
  disabled = false,
  compact = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const title = imageType === 'beforeEntry' ? 'Before Entry Chart' : 'After Exit Chart';
  const icon = imageType === 'beforeEntry' ? 'lucide:trending-up' : 'lucide:trending-down';
  
  // Load preview URL for current image
  React.useEffect(() => {
    if (currentImage) {
      // If the image already has a dataUrl (loaded from database), use it directly
      if (currentImage.dataUrl) {
        setPreviewUrl(currentImage.dataUrl);
      } else {
        // Otherwise, fetch from service
        ChartImageService.getChartImageDataUrl(currentImage).then(url => {
          setPreviewUrl(url);
        });
      }
    } else {
      setPreviewUrl(null);
    }
  }, [currentImage]);
  
  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled) return;
    
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file');
        return;
      }
      
      // Show warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('File upload warnings:', validation.warnings);
      }
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      // Upload image
      const result = await ChartImageService.attachChartImage(tradeId, imageType, file, true);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (result.success && result.chartImage) {
        onImageUploaded(result.chartImage);
        console.log(`✅ ${title} uploaded successfully`);
      } else {
        setError(result.error || 'Upload failed');
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      console.error('❌ Chart image upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [tradeId, imageType, onImageUploaded, disabled, title]);
  
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow re-uploading the same file
    event.target.value = '';
  }, [handleFileSelect]);
  
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);
  
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  }, []);
  
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  }, []);
  
  const handleDelete = useCallback(async () => {
    if (!currentImage || disabled) return;
    
    try {
      const success = await ChartImageService.deleteChartImage(tradeId, imageType, currentImage);
      if (success) {
        onImageDeleted();
        console.log(`✅ ${title} deleted successfully`);
      } else {
        setError('Failed to delete image');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Delete failed');
      console.error('❌ Chart image delete error:', error);
    }
  }, [currentImage, tradeId, imageType, onImageDeleted, disabled, title]);
  
  const openFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);
  
  if (compact && !currentImage) {
    return (
      <Tooltip content={`Upload ${title}`}>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={openFileDialog}
          isDisabled={disabled}
          className="text-gray-500 hover:text-primary-500"
        >
          <Icon icon={icon} className="w-4 h-4" />
          <input
            ref={fileInputRef}
            type="file"
            accept={CHART_IMAGE_CONFIG.ALLOWED_TYPES.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </Button>
      </Tooltip>
    );
  }
  
  return (
    <Card className="w-full">
      <CardBody className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon icon={icon} className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          {currentImage && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {formatFileSize(currentImage.size)}
              </span>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={handleDelete}
                isDisabled={disabled}
                className="text-danger-500 hover:text-danger-600"
              >
                <Icon icon="lucide:trash-2" className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        <AnimatePresence mode="wait">
          {currentImage && previewUrl ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative group"
            >
              <img
                src={previewUrl}
                alt={title}
                className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                  variant="solid"
                  color="primary"
                  size="sm"
                  onPress={openFileDialog}
                  isDisabled={disabled}
                  startContent={<Icon icon="lucide:upload" className="w-4 h-4" />}
                >
                  Replace
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                ${dragActive 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={openFileDialog}
            >
              {isUploading ? (
                <div className="space-y-3">
                  <Icon icon="lucide:upload-cloud" className="w-8 h-8 mx-auto text-primary-500 animate-pulse" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
                    <Progress value={uploadProgress} className="mt-2" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Icon icon="lucide:image-plus" className="w-8 h-8 mx-auto text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Drop image here or click to upload
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WebP up to {formatFileSize(CHART_IMAGE_CONFIG.MAX_FILE_SIZE)}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-2 bg-danger-50 dark:bg-danger-950 border border-danger-200 dark:border-danger-800 rounded-lg"
          >
            <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
          </motion.div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={CHART_IMAGE_CONFIG.ALLOWED_TYPES.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </CardBody>
    </Card>
  );
};
