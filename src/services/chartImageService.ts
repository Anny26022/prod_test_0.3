import { ChartImage, ChartImageBlob, TradeChartAttachments } from '../types/trade';
import { DatabaseService } from '../db/database';
import { createChartImage, CHART_IMAGE_CONFIG, getImageDataUrl } from '../utils/chartImageUtils';
import { generateId } from '../utils/helpers';

export class ChartImageService {
  
  /**
   * Attach a chart image to a trade
   */
  static async attachChartImage(
    tradeId: string,
    imageType: 'beforeEntry' | 'afterExit',
    file: File,
    shouldCompress: boolean = true
  ): Promise<{ success: boolean; chartImage?: ChartImage; error?: string }> {
    try {
      console.log(`📸 Attaching ${imageType} chart image to trade ${tradeId}: ${file.name} (${file.size} bytes)`);
      
      // Create chart image record
      const chartImage = await createChartImage(file, shouldCompress);
      
      // If using blob storage, save the blob separately
      if (chartImage.storage === 'blob' && chartImage.blobId) {
        const imageBlob: ChartImageBlob = {
          id: chartImage.blobId,
          tradeId,
          imageType,
          filename: chartImage.filename,
          mimeType: chartImage.mimeType,
          size: chartImage.size,
          data: new Blob([file], { type: chartImage.mimeType }),
          uploadedAt: chartImage.uploadedAt,
          compressed: chartImage.compressed || false,
          originalSize: chartImage.originalSize,
        };
        
        const blobSaved = await DatabaseService.saveChartImageBlob(imageBlob);
        if (!blobSaved) {
          return { success: false, error: 'Failed to save image blob to database' };
        }
      }
      
      console.log(`✅ Chart image attached successfully: ${chartImage.storage} storage, ${chartImage.size} bytes`);
      return { success: true, chartImage };
      
    } catch (error) {
      console.error('❌ Failed to attach chart image:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Get chart image data URL for display
   */
  static async getChartImageDataUrl(chartImage: ChartImage): Promise<string | null> {
    try {
      if (chartImage.storage === 'inline') {
        return getImageDataUrl(chartImage);
      }
      
      if (chartImage.storage === 'blob' && chartImage.blobId) {
        const blob = await DatabaseService.getChartImageBlob(chartImage.blobId);
        if (blob) {
          return URL.createObjectURL(blob.data);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get chart image data URL:', error);
      return null;
    }
  }
  
  /**
   * Delete a chart image
   */
  static async deleteChartImage(
    tradeId: string,
    imageType: 'beforeEntry' | 'afterExit',
    chartImage: ChartImage
  ): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting ${imageType} chart image for trade ${tradeId}: ${chartImage.filename}`);
      
      // If using blob storage, delete the blob
      if (chartImage.storage === 'blob' && chartImage.blobId) {
        const blobDeleted = await DatabaseService.deleteChartImageBlob(chartImage.blobId);
        if (!blobDeleted) {
          console.warn('⚠️ Failed to delete chart image blob, but continuing...');
        }
      }
      
      console.log(`✅ Chart image deleted successfully`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to delete chart image:', error);
      return false;
    }
  }
  
  /**
   * Delete all chart images for a trade
   */
  static async deleteTradeChartImages(tradeId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting all chart images for trade ${tradeId}`);
      
      // Delete all blob storage for this trade
      const blobsDeleted = await DatabaseService.deleteTradeChartImageBlobs(tradeId);
      if (!blobsDeleted) {
        console.warn('⚠️ Failed to delete some chart image blobs');
      }
      
      console.log(`✅ All chart images deleted for trade ${tradeId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to delete trade chart images:', error);
      return false;
    }
  }
  
  /**
   * Get storage statistics for chart images
   */
  static async getStorageStats(): Promise<{
    totalImages: number;
    totalSize: number;
    inlineImages: number;
    inlineSize: number;
    blobImages: number;
    blobSize: number;
  }> {
    try {
      const allBlobs = await DatabaseService.getAllChartImageBlobs();
      const blobSize = allBlobs.reduce((total, blob) => total + blob.size, 0);
      
      // Note: We can't easily calculate inline image sizes without loading all trades
      // This would be a performance concern, so we'll estimate based on blob data
      
      return {
        totalImages: allBlobs.length,
        totalSize: blobSize,
        inlineImages: 0, // Would need to scan all trades to calculate
        inlineSize: 0,   // Would need to scan all trades to calculate
        blobImages: allBlobs.length,
        blobSize: blobSize,
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        inlineImages: 0,
        inlineSize: 0,
        blobImages: 0,
        blobSize: 0,
      };
    }
  }
  
  /**
   * Cleanup orphaned chart image blobs (blobs without corresponding trades)
   */
  static async cleanupOrphanedBlobs(): Promise<{ cleaned: number; errors: number }> {
    try {
      console.log('🧹 Starting cleanup of orphaned chart image blobs...');

      const allBlobs = await DatabaseService.getAllChartImageBlobs();
      const allTrades = await DatabaseService.getAllTrades();
      const tradeIds = new Set(allTrades.map(trade => trade.id));

      let cleaned = 0;
      let errors = 0;

      for (const blob of allBlobs) {
        if (!tradeIds.has(blob.tradeId)) {
          console.log(`🗑️ Cleaning orphaned blob: ${blob.filename} (trade ${blob.tradeId} not found)`);
          const deleted = await DatabaseService.deleteChartImageBlob(blob.id);
          if (deleted) {
            cleaned++;
          } else {
            errors++;
          }
        }
      }

      console.log(`✅ Cleanup completed: ${cleaned} blobs cleaned, ${errors} errors`);
      return { cleaned, errors };

    } catch (error) {
      console.error('❌ Failed to cleanup orphaned blobs:', error);
      return { cleaned: 0, errors: 1 };
    }
  }

  /**
   * Cleanup orphaned chart attachments in trade records (references without corresponding blobs)
   */
  static async cleanupOrphanedAttachments(): Promise<{ cleaned: number; errors: number }> {
    try {
      console.log('🧹 Starting cleanup of orphaned chart attachments in trade records...');

      const allTrades = await DatabaseService.getAllTrades();
      const allBlobs = await DatabaseService.getAllChartImageBlobs();
      const blobIds = new Set(allBlobs.map(blob => blob.id));

      let cleaned = 0;
      let errors = 0;

      for (const trade of allTrades) {
        if (!trade.chartAttachments) continue;

        let needsUpdate = false;
        const updatedAttachments = { ...trade.chartAttachments };

        // Check beforeEntry attachment
        if (updatedAttachments.beforeEntry) {
          const attachment = updatedAttachments.beforeEntry;
          if (attachment.storage === 'blob' && attachment.blobId && !blobIds.has(attachment.blobId)) {
            console.log(`🗑️ Removing orphaned beforeEntry attachment from trade ${trade.id}: ${attachment.filename}`);
            delete updatedAttachments.beforeEntry;
            needsUpdate = true;
          }
        }

        // Check afterExit attachment
        if (updatedAttachments.afterExit) {
          const attachment = updatedAttachments.afterExit;
          if (attachment.storage === 'blob' && attachment.blobId && !blobIds.has(attachment.blobId)) {
            console.log(`🗑️ Removing orphaned afterExit attachment from trade ${trade.id}: ${attachment.filename}`);
            delete updatedAttachments.afterExit;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          // Check if any attachments remain
          const hasRemainingAttachments = updatedAttachments.beforeEntry || updatedAttachments.afterExit;

          const updatedTrade = {
            ...trade,
            chartAttachments: hasRemainingAttachments ? {
              ...updatedAttachments,
              metadata: {
                ...updatedAttachments.metadata,
                updatedAt: new Date(),
                totalSize: (updatedAttachments.beforeEntry?.size || 0) + (updatedAttachments.afterExit?.size || 0)
              }
            } : undefined
          };

          const saved = await DatabaseService.saveTrade(updatedTrade);
          if (saved) {
            cleaned++;
          } else {
            errors++;
          }
        }
      }

      console.log(`✅ Attachment cleanup completed: ${cleaned} trades cleaned, ${errors} errors`);
      return { cleaned, errors };

    } catch (error) {
      console.error('❌ Failed to cleanup orphaned attachments:', error);
      return { cleaned: 0, errors: 1 };
    }
  }
  
  /**
   * Comprehensive cleanup of all orphaned chart data
   */
  static async cleanupAllOrphanedData(): Promise<{
    blobsCleaned: number;
    attachmentsCleaned: number;
    errors: number
  }> {
    try {
      console.log('🧹 Starting comprehensive cleanup of all orphaned chart data...');

      // First cleanup orphaned blobs
      const blobCleanup = await this.cleanupOrphanedBlobs();

      // Then cleanup orphaned attachments in trade records
      const attachmentCleanup = await this.cleanupOrphanedAttachments();

      const totalErrors = blobCleanup.errors + attachmentCleanup.errors;

      console.log(`✅ Comprehensive cleanup completed: ${blobCleanup.cleaned} blobs, ${attachmentCleanup.cleaned} attachments, ${totalErrors} errors`);

      return {
        blobsCleaned: blobCleanup.cleaned,
        attachmentsCleaned: attachmentCleanup.cleaned,
        errors: totalErrors
      };

    } catch (error) {
      console.error('❌ Failed to perform comprehensive cleanup:', error);
      return { blobsCleaned: 0, attachmentsCleaned: 0, errors: 1 };
    }
  }

  /**
   * Validate chart attachments data structure
   */
  static validateChartAttachments(chartAttachments: any): chartAttachments is TradeChartAttachments {
    if (!chartAttachments || typeof chartAttachments !== 'object') {
      return false;
    }

    // Check beforeEntry if present
    if (chartAttachments.beforeEntry && !this.validateChartImage(chartAttachments.beforeEntry)) {
      return false;
    }

    // Check afterExit if present
    if (chartAttachments.afterExit && !this.validateChartImage(chartAttachments.afterExit)) {
      return false;
    }

    return true;
  }
  
  /**
   * Validate chart image data structure
   */
  private static validateChartImage(chartImage: any): chartImage is ChartImage {
    return (
      chartImage &&
      typeof chartImage === 'object' &&
      typeof chartImage.id === 'string' &&
      typeof chartImage.filename === 'string' &&
      typeof chartImage.mimeType === 'string' &&
      typeof chartImage.size === 'number' &&
      chartImage.uploadedAt instanceof Date &&
      (chartImage.storage === 'inline' || chartImage.storage === 'blob') &&
      CHART_IMAGE_CONFIG.ALLOWED_TYPES.includes(chartImage.mimeType)
    );
  }
}
