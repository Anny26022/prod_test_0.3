import Dexie, { Table } from 'dexie';
import { Trade } from '../types/trade';

// Database interfaces
export interface TradeRecord extends Trade {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TradeSettings {
  id?: number;
  search_query?: string;
  status_filter?: string;
  sort_descriptor?: any;
  visible_columns?: string[];
  updatedAt?: Date;
}

export interface UserPreferences {
  id?: number;
  is_mobile_menu_open?: boolean;
  is_profile_open?: boolean;
  user_name?: string;
  is_full_width_enabled?: boolean;
  accounting_method?: string;
  theme?: string;
  updatedAt?: Date;
}

export interface PortfolioData {
  id?: number;
  type: 'yearly_capital' | 'capital_change' | 'monthly_override';
  year?: number;
  month?: string;
  amount: number;
  date?: string;
  description?: string;
  updatedAt?: Date;
}

export interface TaxData {
  id?: number;
  year: number;
  data: any;
  updatedAt?: Date;
}

export interface CommentaryData {
  id?: number;
  year: string;
  data: any;
  updatedAt?: Date;
}

export interface DashboardConfig {
  id?: number;
  config: any;
  updatedAt?: Date;
}

export interface MilestonesData {
  id?: number;
  achievements: any[];
  updatedAt?: Date;
}

export interface MiscData {
  id?: number;
  key: string;
  value: any;
  updatedAt?: Date;
}

export interface BackupRecord {
  id?: number;
  type: 'trades' | 'settings' | 'preferences' | 'portfolio' | 'tax' | 'dashboard' | 'milestones' | 'misc' | 'chartImages';
  data: any;
  createdAt: Date;
  description?: string;
}

// Chart image blob storage interface
export interface ChartImageBlob {
  id: string;
  tradeId: string;
  imageType: 'beforeEntry' | 'afterExit';
  filename: string;
  mimeType: string;
  size: number;
  data: Blob;
  uploadedAt: Date;
  compressed: boolean;
  originalSize?: number;
}

// Dexie Database Class
export class TradeJournalDB extends Dexie {
  // Tables
  trades!: Table<TradeRecord>;
  tradeSettings!: Table<TradeSettings>;
  userPreferences!: Table<UserPreferences>;
  portfolioData!: Table<PortfolioData>;
  taxData!: Table<TaxData>;
  commentaryData!: Table<CommentaryData>;
  dashboardConfig!: Table<DashboardConfig>;
  milestonesData!: Table<MilestonesData>;
  miscData!: Table<MiscData>;
  backups!: Table<BackupRecord>;
  chartImageBlobs!: Table<ChartImageBlob>; // NEW: Separate table for chart image blobs

  constructor() {
    super('TradeJournalDB');

    // Define schemas - Version 1 (Original)
    this.version(1).stores({
      trades: 'id, name, date, tradeNo, positionStatus, buySell, setup, createdAt, updatedAt',
      tradeSettings: '++id, updatedAt',
      userPreferences: '++id, updatedAt',
      portfolioData: '++id, type, year, month, date, updatedAt',
      taxData: '++id, year, updatedAt',
      commentaryData: '++id, year, updatedAt',
      dashboardConfig: '++id, updatedAt',
      milestonesData: '++id, updatedAt',
      miscData: '++id, key, updatedAt',
      backups: '++id, type, createdAt'
    });

    // Version 2 - Add Chart Attachments Support
    this.version(2).stores({
      trades: 'id, name, date, tradeNo, positionStatus, buySell, setup, createdAt, updatedAt',
      tradeSettings: '++id, updatedAt',
      userPreferences: '++id, updatedAt',
      portfolioData: '++id, type, year, month, date, updatedAt',
      taxData: '++id, year, updatedAt',
      commentaryData: '++id, year, updatedAt',
      dashboardConfig: '++id, updatedAt',
      milestonesData: '++id, updatedAt',
      miscData: '++id, key, updatedAt',
      backups: '++id, type, createdAt',
      chartImageBlobs: 'id, tradeId, imageType, uploadedAt' // NEW: Chart image blob storage
    }).upgrade(tx => {
      console.log('🔄 Upgrading database to version 2 (Chart Attachments)...');
      // The chartImageBlobs table will be created automatically
      // Existing trades will work without modification as chartAttachments field is optional
      return tx.trades.toCollection().modify(trade => {
        // Ensure chartAttachments field exists (optional, for consistency)
        if (trade.chartAttachments === undefined) {
          trade.chartAttachments = undefined;
        }
      });
    });

    // Add hooks for automatic timestamps
    this.trades.hook('creating', function (primKey, obj, trans) {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.trades.hook('updating', function (modifications, primKey, obj, trans) {
      modifications.updatedAt = new Date();
    });

    // Add hooks for other tables
    [this.tradeSettings, this.userPreferences, this.portfolioData, this.taxData, this.commentaryData, this.dashboardConfig, this.milestonesData, this.miscData, this.backups].forEach(table => {
      table.hook('creating', function (primKey, obj, trans) {
        obj.updatedAt = new Date();
      });

      table.hook('updating', function (modifications, primKey, obj, trans) {
        modifications.updatedAt = new Date();
      });
    });
  }
}

// Create database instance
export const db = new TradeJournalDB();

// Helper function to clean data for IndexedDB storage
function cleanDataForIndexedDB(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'function') {
    return undefined; // Remove functions
  }

  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(item => cleanDataForIndexedDB(item)).filter(item => item !== undefined);
    } else {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        const cleanedValue = cleanDataForIndexedDB(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return cleaned;
    }
  }

  return data;
}

// Database utility functions
export class DatabaseService {
  
  // ===== TRADES =====
  
  static async getAllTrades(): Promise<TradeRecord[]> {
    try {
      return await db.trades.orderBy('tradeNo').toArray();
    } catch (error) {
      console.error('❌ Failed to get trades from IndexedDB:', error);
      return [];
    }
  }

  static async saveTrade(trade: TradeRecord): Promise<boolean> {
    try {
      // Clean trade data to ensure it's serializable
      const cleanedTrade = cleanDataForIndexedDB(trade);

      await db.trades.put(cleanedTrade);
      console.log(`✅ Saved trade: ${trade.name} (${trade.id})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save trade to IndexedDB:', error);
      return false;
    }
  }

  static async saveAllTrades(trades: TradeRecord[]): Promise<boolean> {
    try {
      // Clean trades data to ensure it's serializable
      const cleanedTrades = trades.map(trade => cleanDataForIndexedDB(trade));

      await db.transaction('rw', db.trades, async () => {
        // Clear existing trades and add new ones
        await db.trades.clear();
        await db.trades.bulkAdd(cleanedTrades);
      });
      console.log(`✅ Saved ${trades.length} trades to IndexedDB`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save trades to IndexedDB:', error);
      return false;
    }
  }

  static async deleteTrade(id: string): Promise<boolean> {
    try {
      await db.trades.delete(id);
      console.log(`✅ Deleted trade: ${id}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete trade from IndexedDB:', error);
      return false;
    }
  }

  // ===== SETTINGS =====
  
  static async getTradeSettings(): Promise<TradeSettings | null> {
    try {
      const allSettings = await db.tradeSettings.toArray();
      if (allSettings.length === 0) return null;

      // Sort by updatedAt and return the latest
      allSettings.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      return allSettings[0];
    } catch (error) {
      console.error('❌ Failed to get trade settings from IndexedDB:', error);
      return null;
    }
  }

  static async saveTradeSettings(settings: TradeSettings): Promise<boolean> {
    try {
      // Keep only the latest settings record
      await db.transaction('rw', db.tradeSettings, async () => {
        await db.tradeSettings.clear();
        await db.tradeSettings.add(settings);
      });
      console.log('✅ Saved trade settings to IndexedDB');
      return true;
    } catch (error) {
      console.error('❌ Failed to save trade settings to IndexedDB:', error);
      return false;
    }
  }

  // ===== USER PREFERENCES =====
  
  static async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const allPrefs = await db.userPreferences.toArray();
      if (allPrefs.length === 0) return null;

      // Sort by updatedAt and return the latest
      allPrefs.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      return allPrefs[0];
    } catch (error) {
      console.error('❌ Failed to get user preferences from IndexedDB:', error);
      return null;
    }
  }

  static async saveUserPreferences(preferences: UserPreferences): Promise<boolean> {
    try {
      // Keep only the latest preferences record
      await db.transaction('rw', db.userPreferences, async () => {
        await db.userPreferences.clear();
        await db.userPreferences.add(preferences);
      });
      console.log('✅ Saved user preferences to IndexedDB');
      return true;
    } catch (error) {
      console.error('❌ Failed to save user preferences to IndexedDB:', error);
      return false;
    }
  }

  // ===== PORTFOLIO DATA =====
  
  static async getPortfolioData(): Promise<PortfolioData[]> {
    try {
      return await db.portfolioData.toArray();
    } catch (error) {
      console.error('❌ Failed to get portfolio data from IndexedDB:', error);
      return [];
    }
  }

  static async savePortfolioData(data: PortfolioData[]): Promise<boolean> {
    try {
      await db.transaction('rw', db.portfolioData, async () => {
        await db.portfolioData.clear();
        await db.portfolioData.bulkAdd(data);
      });
      console.log(`✅ Saved ${data.length} portfolio records to IndexedDB`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save portfolio data to IndexedDB:', error);
      return false;
    }
  }

  // ===== BACKUPS =====

  static async createBackup(type: 'trades' | 'settings' | 'preferences' | 'portfolio' | 'tax' | 'dashboard' | 'milestones' | 'misc', data: any, description?: string): Promise<boolean> {
    try {
      // Clean data before storing
      const cleanedData = cleanDataForIndexedDB(data);

      await db.backups.add({
        type,
        data: cleanedData,
        createdAt: new Date(),
        description
      });

      // Keep only the 5 most recent backups per type
      const allBackups = await db.backups.where('type').equals(type).toArray();
      // Sort by createdAt in memory since we can't chain orderBy after where().equals()
      allBackups.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      if (allBackups.length > 5) {
        const toDelete = allBackups.slice(0, -5);
        await db.backups.bulkDelete(toDelete.map(b => b.id!));
      }

      console.log(`✅ Created backup for ${type}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      return false;
    }
  }

  static async getLatestBackup(type: 'trades' | 'settings' | 'preferences' | 'portfolio' | 'tax' | 'dashboard' | 'milestones' | 'misc'): Promise<BackupRecord | null> {
    try {
      const backups = await db.backups.where('type').equals(type).toArray();
      if (backups.length === 0) return null;

      // Sort by createdAt and return the latest
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return backups[0];
    } catch (error) {
      console.error('❌ Failed to get latest backup:', error);
      return null;
    }
  }

  // ===== TAX DATA =====

  static async getTaxData(year: number): Promise<TaxData | null> {
    try {
      return await db.taxData.where('year').equals(year).first() || null;
    } catch (error) {
      console.error('❌ Failed to get tax data from IndexedDB:', error);
      return null;
    }
  }

  static async saveTaxData(year: number, data: any): Promise<boolean> {
    try {
      await db.taxData.put({ year, data });
      console.log(`✅ Saved tax data for year ${year}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save tax data to IndexedDB:', error);
      return false;
    }
  }

  // ===== COMMENTARY DATA =====

  static async getCommentaryData(year: string): Promise<CommentaryData | null> {
    try {
      return await db.commentaryData.where('year').equals(year).first() || null;
    } catch (error) {
      console.error('❌ Failed to get commentary data from IndexedDB:', error);
      return null;
    }
  }

  static async saveCommentaryData(year: string, data: any): Promise<boolean> {
    try {
      await db.commentaryData.put({ year, data });
      console.log(`✅ Saved commentary data for year ${year}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save commentary data to IndexedDB:', error);
      return false;
    }
  }

  // ===== DASHBOARD CONFIG =====

  static async getDashboardConfig(): Promise<DashboardConfig | null> {
    try {
      const allConfigs = await db.dashboardConfig.toArray();
      if (allConfigs.length === 0) return null;

      // Sort by updatedAt and return the latest
      allConfigs.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      return allConfigs[0];
    } catch (error) {
      console.error('❌ Failed to get dashboard config from IndexedDB:', error);
      return null;
    }
  }

  static async saveDashboardConfig(config: any): Promise<boolean> {
    try {
      await db.transaction('rw', db.dashboardConfig, async () => {
        await db.dashboardConfig.clear();
        await db.dashboardConfig.add({ config });
      });
      console.log('✅ Saved dashboard config to IndexedDB');
      return true;
    } catch (error) {
      console.error('❌ Failed to save dashboard config to IndexedDB:', error);
      return false;
    }
  }

  // ===== MILESTONES DATA =====

  static async getMilestonesData(): Promise<MilestonesData | null> {
    try {
      const allMilestones = await db.milestonesData.toArray();
      if (allMilestones.length === 0) return null;

      // Sort by updatedAt and return the latest
      allMilestones.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      return allMilestones[0];
    } catch (error) {
      console.error('❌ Failed to get milestones data from IndexedDB:', error);
      return null;
    }
  }

  static async saveMilestonesData(achievements: any[]): Promise<boolean> {
    try {
      // Clean achievements data to remove functions and non-serializable data
      const cleanedAchievements = cleanDataForIndexedDB(achievements);

      await db.transaction('rw', db.milestonesData, async () => {
        await db.milestonesData.clear();
        await db.milestonesData.add({ achievements: cleanedAchievements });
      });
      console.log('✅ Saved milestones data to IndexedDB');
      return true;
    } catch (error) {
      console.error('❌ Failed to save milestones data to IndexedDB:', error);
      return false;
    }
  }

  // ===== MISC DATA =====

  static async getMiscData(key: string): Promise<any> {
    try {
      const record = await db.miscData.where('key').equals(key).first();
      return record ? record.value : null;
    } catch (error) {
      console.error('❌ Failed to get misc data from IndexedDB:', error);
      return null;
    }
  }

  static async saveMiscData(key: string, value: any): Promise<boolean> {
    try {
      // Clean the value to ensure it's serializable for IndexedDB
      const cleanedValue = cleanDataForIndexedDB(value);

      if (cleanedValue === undefined) {
        console.warn(`⚠️ Cannot store non-serializable data for key ${key}, skipping`);
        return false;
      }

      await db.miscData.put({ key, value: cleanedValue });
      console.log(`✅ Saved misc data: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save misc data to IndexedDB:', error);
      return false;
    }
  }

  static async deleteMiscData(key: string): Promise<boolean> {
    try {
      await db.miscData.where('key').equals(key).delete();
      console.log(`✅ Deleted misc data: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete misc data from IndexedDB:', error);
      return false;
    }
  }

  // ===== CHART IMAGE BLOBS =====

  static async saveChartImageBlob(imageBlob: ChartImageBlob): Promise<boolean> {
    try {
      await db.chartImageBlobs.put(imageBlob);
      console.log(`📸 Saved chart image blob: ${imageBlob.filename} (${imageBlob.size} bytes)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save chart image blob:', error);
      return false;
    }
  }

  static async getChartImageBlob(id: string): Promise<ChartImageBlob | null> {
    try {
      const blob = await db.chartImageBlobs.get(id);
      return blob || null;
    } catch (error) {
      console.error('❌ Failed to get chart image blob:', error);
      return null;
    }
  }

  static async getTradeChartImageBlobs(tradeId: string): Promise<ChartImageBlob[]> {
    try {
      return await db.chartImageBlobs.where('tradeId').equals(tradeId).toArray();
    } catch (error) {
      console.error('❌ Failed to get trade chart image blobs:', error);
      return [];
    }
  }

  static async deleteChartImageBlob(id: string): Promise<boolean> {
    try {
      await db.chartImageBlobs.delete(id);
      console.log(`🗑️ Deleted chart image blob: ${id}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete chart image blob:', error);
      return false;
    }
  }

  static async updateChartImageBlobTradeId(blobId: string, newTradeId: string): Promise<boolean> {
    try {
      const blob = await db.chartImageBlobs.get(blobId);
      if (!blob) {
        console.warn(`⚠️ Chart image blob not found: ${blobId}`);
        return false;
      }

      await db.chartImageBlobs.update(blobId, { tradeId: newTradeId });
      console.log(`📸 Updated chart image blob tradeId: ${blobId} -> ${newTradeId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to update chart image blob tradeId:', error);
      return false;
    }
  }

  static async deleteTradeChartImageBlobs(tradeId: string): Promise<boolean> {
    try {
      const count = await db.chartImageBlobs.where('tradeId').equals(tradeId).delete();
      console.log(`🗑️ Deleted ${count} chart image blobs for trade: ${tradeId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete trade chart image blobs:', error);
      return false;
    }
  }

  static async getAllChartImageBlobs(): Promise<ChartImageBlob[]> {
    try {
      return await db.chartImageBlobs.toArray();
    } catch (error) {
      console.error('❌ Failed to get all chart image blobs:', error);
      return [];
    }
  }

  static async getChartImageBlobsSize(): Promise<number> {
    try {
      const blobs = await db.chartImageBlobs.toArray();
      return blobs.reduce((total, blob) => total + blob.size, 0);
    } catch (error) {
      console.error('❌ Failed to calculate chart image blobs size:', error);
      return 0;
    }
  }

  // ===== CHART IMAGE CLEANUP UTILITIES =====

  static async clearAllChartImages(): Promise<boolean> {
    try {
      await db.chartImageBlobs.clear();
      console.log('✅ All chart images cleared from database');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear chart images:', error);
      return false;
    }
  }

  static async getOrphanedChartImages(): Promise<ChartImageBlob[]> {
    try {
      const [blobs, trades] = await Promise.all([
        db.chartImageBlobs.toArray(),
        db.trades.toArray()
      ]);

      const tradeIds = new Set(trades.map(trade => trade.id));
      const orphanedBlobs = blobs.filter(blob => !tradeIds.has(blob.tradeId));

      console.log(`Found ${orphanedBlobs.length} orphaned chart images`);
      return orphanedBlobs;
    } catch (error) {
      console.error('❌ Failed to find orphaned chart images:', error);
      return [];
    }
  }

  static async cleanupOrphanedChartImages(): Promise<number> {
    try {
      const orphanedBlobs = await this.getOrphanedChartImages();

      if (orphanedBlobs.length === 0) {
        console.log('✅ No orphaned chart images found');
        return 0;
      }

      const orphanedIds = orphanedBlobs.map(blob => blob.id);
      await db.chartImageBlobs.bulkDelete(orphanedIds);

      console.log(`✅ Cleaned up ${orphanedBlobs.length} orphaned chart images`);
      return orphanedBlobs.length;
    } catch (error) {
      console.error('❌ Failed to cleanup orphaned chart images:', error);
      return 0;
    }
  }

  static async inspectChartImageDatabase(): Promise<void> {
    try {
      const [blobs, trades] = await Promise.all([
        db.chartImageBlobs.toArray(),
        db.trades.toArray()
      ]);

      console.log('=== CHART IMAGE DATABASE INSPECTION ===');
      console.log(`Total chart image blobs: ${blobs.length}`);
      console.log(`Total trades: ${trades.length}`);

      const tradeIds = new Set(trades.map(trade => trade.id));
      const orphanedBlobs = blobs.filter(blob => !tradeIds.has(blob.tradeId));
      const validBlobs = blobs.filter(blob => tradeIds.has(blob.tradeId));

      console.log(`Valid chart images: ${validBlobs.length}`);
      console.log(`Orphaned chart images: ${orphanedBlobs.length}`);

      if (orphanedBlobs.length > 0) {
        console.log('Orphaned chart images:');
        orphanedBlobs.forEach(blob => {
          console.log(`- ${blob.filename} (${blob.size} bytes) for trade ${blob.tradeId}`);
        });
      }

      if (validBlobs.length > 0) {
        console.log('Valid chart images:');
        validBlobs.forEach(blob => {
          const trade = trades.find(t => t.id === blob.tradeId);
          console.log(`- ${blob.filename} (${blob.size} bytes) for trade ${trade?.name || 'Unknown'}`);
        });
      }

      console.log('=== END INSPECTION ===');
    } catch (error) {
      console.error('❌ Failed to inspect chart image database:', error);
    }
  }

  // ===== CHART IMAGE NAVIGATION =====

  static async getAllChartImageBlobsWithTradeInfo(): Promise<Array<ChartImageBlob & { tradeName?: string; tradeDate?: string; tradeNo?: number }>> {
    try {
      const [blobs, trades] = await Promise.all([
        db.chartImageBlobs.orderBy('uploadedAt').toArray(),
        db.trades.toArray()
      ]);

      // Create a map of tradeId to trade info for quick lookup
      const tradeMap = new Map(trades.map(trade => [trade.id, {
        name: trade.name,
        date: trade.date,
        tradeNo: trade.tradeNo
      }]));

      // Enhance blobs with trade information
      return blobs.map(blob => {
        const tradeInfo = tradeMap.get(blob.tradeId);
        return {
          ...blob,
          tradeName: tradeInfo?.name,
          tradeDate: tradeInfo?.date,
          tradeNo: tradeInfo?.tradeNo
        };
      });
    } catch (error) {
      console.error('❌ Failed to get chart image blobs with trade info:', error);
      return [];
    }
  }

  static async getFilteredChartImageBlobs(filter: {
    imageType?: 'beforeEntry' | 'afterExit';
    dateFrom?: string;
    dateTo?: string;
    tradeIds?: string[];
  }): Promise<Array<ChartImageBlob & { tradeName?: string; tradeDate?: string; tradeNo?: number }>> {
    try {
      let blobs = await this.getAllChartImageBlobsWithTradeInfo();

      // Apply filters
      if (filter.imageType) {
        blobs = blobs.filter(blob => blob.imageType === filter.imageType);
      }

      if (filter.dateFrom || filter.dateTo) {
        blobs = blobs.filter(blob => {
          if (!blob.tradeDate) return false;
          const tradeDate = new Date(blob.tradeDate);

          if (filter.dateFrom && tradeDate < new Date(filter.dateFrom)) return false;
          if (filter.dateTo && tradeDate > new Date(filter.dateTo)) return false;

          return true;
        });
      }

      if (filter.tradeIds && filter.tradeIds.length > 0) {
        blobs = blobs.filter(blob => filter.tradeIds!.includes(blob.tradeId));
      }

      return blobs;
    } catch (error) {
      console.error('❌ Failed to get filtered chart image blobs:', error);
      return [];
    }
  }

  // ===== UTILITIES =====

  static async clearAllData(): Promise<boolean> {
    try {
      await db.transaction('rw', [db.trades, db.tradeSettings, db.userPreferences, db.portfolioData, db.taxData, db.commentaryData, db.dashboardConfig, db.milestonesData, db.miscData, db.chartImageBlobs], async () => {
        await db.trades.clear();
        await db.tradeSettings.clear();
        await db.userPreferences.clear();
        await db.portfolioData.clear();
        await db.taxData.clear();
        await db.commentaryData.clear();
        await db.dashboardConfig.clear();
        await db.milestonesData.clear();
        await db.miscData.clear();
        await db.chartImageBlobs.clear();
      });
      console.log('✅ Cleared all data from IndexedDB');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear data from IndexedDB:', error);
      return false;
    }
  }

  static async getDatabaseSize(): Promise<{ trades: number; chartImages: number; total: number }> {
    try {
      const tradesCount = await db.trades.count();
      const settingsCount = await db.tradeSettings.count();
      const prefsCount = await db.userPreferences.count();
      const portfolioCount = await db.portfolioData.count();
      const taxCount = await db.taxData.count();
      const commentaryCount = await db.commentaryData.count();
      const dashboardCount = await db.dashboardConfig.count();
      const milestonesCount = await db.milestonesData.count();
      const miscCount = await db.miscData.count();
      const backupsCount = await db.backups.count();
      const chartImagesCount = await db.chartImageBlobs.count();

      return {
        trades: tradesCount,
        chartImages: chartImagesCount,
        total: tradesCount + settingsCount + prefsCount + portfolioCount + taxCount + commentaryCount + dashboardCount + milestonesCount + miscCount + backupsCount + chartImagesCount
      };
    } catch (error) {
      console.error('❌ Failed to get database size:', error);
      return { trades: 0, chartImages: 0, total: 0 };
    }
  }
}
