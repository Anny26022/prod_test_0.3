import { DatabaseService } from '../db/database';
import { ChartImageService } from '../services/chartImageService';

/**
 * Migration utilities for Chart Attachments feature
 * Handles database schema updates and data migration
 */

export interface MigrationResult {
  success: boolean;
  message: string;
  details?: {
    tradesProcessed: number;
    blobsCreated: number;
    errors: string[];
  };
}

/**
 * Check if chart attachments migration is needed
 */
export async function checkMigrationNeeded(): Promise<boolean> {
  try {
    // Check if chartImageBlobs table exists and is accessible
    const testBlobs = await DatabaseService.getAllChartImageBlobs();
    console.log('📊 Chart attachments feature is available');
    return false; // Migration not needed
  } catch (error) {
    console.log('🔄 Chart attachments migration may be needed');
    return true;
  }
}

/**
 * Migrate existing trade data to support chart attachments
 */
export async function migrateToChartAttachments(): Promise<MigrationResult> {
  console.log('🚀 Starting chart attachments migration...');
  
  const result: MigrationResult = {
    success: false,
    message: '',
    details: {
      tradesProcessed: 0,
      blobsCreated: 0,
      errors: []
    }
  };

  try {
    // 1. Verify database is accessible
    const dbSize = await DatabaseService.getDatabaseSize();
    console.log(`📊 Database contains ${dbSize.trades} trades`);

    // 2. Get all existing trades
    const trades = await DatabaseService.getAllTrades();
    console.log(`🔍 Processing ${trades.length} trades for migration...`);

    // 3. Process each trade to ensure chart attachments field exists
    let processedCount = 0;
    const errors: string[] = [];

    for (const trade of trades) {
      try {
        // Check if trade already has chart attachments field
        if (trade.chartAttachments === undefined) {
          // Add empty chart attachments field
          const updatedTrade = {
            ...trade,
            chartAttachments: undefined // Explicitly set to undefined for clean structure
          };

          // Save updated trade
          const saved = await DatabaseService.saveTrade(updatedTrade);
          if (saved) {
            processedCount++;
          } else {
            errors.push(`Failed to update trade ${trade.id}`);
          }
        } else {
          // Trade already has chart attachments field
          processedCount++;
        }
      } catch (error) {
        const errorMsg = `Error processing trade ${trade.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    // 4. Verify chartImageBlobs table is working
    try {
      await DatabaseService.getAllChartImageBlobs();
      console.log('✅ Chart image blobs table is accessible');
    } catch (error) {
      errors.push('Chart image blobs table is not accessible');
    }

    // 5. Clean up any orphaned blobs (safety measure)
    try {
      const cleanupResult = await ChartImageService.cleanupOrphanedBlobs();
      console.log(`🧹 Cleanup: ${cleanupResult.cleaned} orphaned blobs removed, ${cleanupResult.errors} errors`);
    } catch (error) {
      console.warn('⚠️ Could not perform cleanup:', error);
    }

    // 6. Determine migration success
    const success = errors.length === 0 && processedCount === trades.length;
    
    result.success = success;
    result.message = success 
      ? `✅ Migration completed successfully! Processed ${processedCount} trades.`
      : `⚠️ Migration completed with issues. Processed ${processedCount}/${trades.length} trades.`;
    
    result.details = {
      tradesProcessed: processedCount,
      blobsCreated: 0, // No blobs created during migration, only schema update
      errors
    };

    console.log(result.message);
    if (errors.length > 0) {
      console.warn('Migration errors:', errors);
    }

    return result;

  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('❌', errorMsg);
    
    result.success = false;
    result.message = errorMsg;
    result.details!.errors.push(errorMsg);
    
    return result;
  }
}

/**
 * Validate chart attachments data integrity
 */
export async function validateChartAttachments(): Promise<{
  isValid: boolean;
  issues: string[];
  statistics: {
    totalTrades: number;
    tradesWithAttachments: number;
    totalImages: number;
    totalSize: number;
    orphanedBlobs: number;
  };
}> {
  console.log('🔍 Validating chart attachments data integrity...');
  
  const issues: string[] = [];
  const statistics = {
    totalTrades: 0,
    tradesWithAttachments: 0,
    totalImages: 0,
    totalSize: 0,
    orphanedBlobs: 0
  };

  try {
    // Get all trades and blobs
    const trades = await DatabaseService.getAllTrades();
    const allBlobs = await DatabaseService.getAllChartImageBlobs();
    
    statistics.totalTrades = trades.length;
    
    // Create sets for validation
    const tradeIds = new Set(trades.map(t => t.id));
    const blobTradeIds = new Set(allBlobs.map(b => b.tradeId));
    
    // Validate trades with chart attachments
    for (const trade of trades) {
      if (trade.chartAttachments) {
        statistics.tradesWithAttachments++;
        
        // Check before entry image
        if (trade.chartAttachments.beforeEntry) {
          statistics.totalImages++;
          statistics.totalSize += trade.chartAttachments.beforeEntry.size;
          
          // Validate blob reference if using blob storage
          if (trade.chartAttachments.beforeEntry.storage === 'blob' && trade.chartAttachments.beforeEntry.blobId) {
            const blob = await DatabaseService.getChartImageBlob(trade.chartAttachments.beforeEntry.blobId);
            if (!blob) {
              issues.push(`Missing blob for trade ${trade.id} before entry image`);
            }
          }
        }
        
        // Check after exit image
        if (trade.chartAttachments.afterExit) {
          statistics.totalImages++;
          statistics.totalSize += trade.chartAttachments.afterExit.size;
          
          // Validate blob reference if using blob storage
          if (trade.chartAttachments.afterExit.storage === 'blob' && trade.chartAttachments.afterExit.blobId) {
            const blob = await DatabaseService.getChartImageBlob(trade.chartAttachments.afterExit.blobId);
            if (!blob) {
              issues.push(`Missing blob for trade ${trade.id} after exit image`);
            }
          }
        }
      }
    }
    
    // Check for orphaned blobs
    for (const blob of allBlobs) {
      if (!tradeIds.has(blob.tradeId)) {
        statistics.orphanedBlobs++;
        issues.push(`Orphaned blob ${blob.id} for non-existent trade ${blob.tradeId}`);
      }
    }
    
    console.log('📊 Validation statistics:', statistics);
    
    if (issues.length > 0) {
      console.warn('⚠️ Validation issues found:', issues);
    } else {
      console.log('✅ Chart attachments data integrity validated successfully');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      statistics
    };
    
  } catch (error) {
    const errorMsg = `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    issues.push(errorMsg);
    console.error('❌', errorMsg);
    
    return {
      isValid: false,
      issues,
      statistics
    };
  }
}

/**
 * Get chart attachments storage statistics
 */
export async function getStorageStatistics(): Promise<{
  trades: {
    total: number;
    withAttachments: number;
    percentage: number;
  };
  images: {
    total: number;
    beforeEntry: number;
    afterExit: number;
    inline: number;
    blob: number;
  };
  storage: {
    totalSize: number;
    inlineSize: number;
    blobSize: number;
    averageImageSize: number;
  };
}> {
  try {
    const trades = await DatabaseService.getAllTrades();
    const allBlobs = await DatabaseService.getAllChartImageBlobs();
    
    let tradesWithAttachments = 0;
    let beforeEntryCount = 0;
    let afterExitCount = 0;
    let inlineCount = 0;
    let blobCount = 0;
    let inlineSize = 0;
    let totalImageSize = 0;
    
    // Analyze trades
    for (const trade of trades) {
      if (trade.chartAttachments) {
        let hasAttachments = false;
        
        if (trade.chartAttachments.beforeEntry) {
          beforeEntryCount++;
          hasAttachments = true;
          totalImageSize += trade.chartAttachments.beforeEntry.size;
          
          if (trade.chartAttachments.beforeEntry.storage === 'inline') {
            inlineCount++;
            inlineSize += trade.chartAttachments.beforeEntry.size;
          } else {
            blobCount++;
          }
        }
        
        if (trade.chartAttachments.afterExit) {
          afterExitCount++;
          hasAttachments = true;
          totalImageSize += trade.chartAttachments.afterExit.size;
          
          if (trade.chartAttachments.afterExit.storage === 'inline') {
            inlineCount++;
            inlineSize += trade.chartAttachments.afterExit.size;
          } else {
            blobCount++;
          }
        }
        
        if (hasAttachments) {
          tradesWithAttachments++;
        }
      }
    }
    
    // Calculate blob storage size
    const blobSize = allBlobs.reduce((total, blob) => total + blob.size, 0);
    const totalImages = beforeEntryCount + afterExitCount;
    
    return {
      trades: {
        total: trades.length,
        withAttachments: tradesWithAttachments,
        percentage: trades.length > 0 ? (tradesWithAttachments / trades.length) * 100 : 0
      },
      images: {
        total: totalImages,
        beforeEntry: beforeEntryCount,
        afterExit: afterExitCount,
        inline: inlineCount,
        blob: blobCount
      },
      storage: {
        totalSize: totalImageSize,
        inlineSize,
        blobSize,
        averageImageSize: totalImages > 0 ? totalImageSize / totalImages : 0
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to get storage statistics:', error);
    throw error;
  }
}
