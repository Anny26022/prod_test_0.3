import { DatabaseService } from './database';
import { Trade } from '../types/trade';

// Migration utility to move data from localStorage to IndexedDB
export class MigrationService {
  
  // Check if migration is needed
  static async needsMigration(): Promise<boolean> {
    try {
      // Check if there's data in localStorage
      const hasLocalStorageData = localStorage.getItem('tradeJournalData') !== null;
      
      // Check if IndexedDB is empty
      const dbSize = await DatabaseService.getDatabaseSize();
      const hasIndexedDBData = dbSize.trades > 0;
      
      // Migration needed if localStorage has data but IndexedDB doesn't
      return hasLocalStorageData && !hasIndexedDBData;
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      return false;
    }
  }

  // Perform full migration from localStorage to IndexedDB
  static async migrateFromLocalStorage(): Promise<{ success: boolean; message: string; stats: any }> {
    console.log('🔄 Starting migration from localStorage to IndexedDB...');
    
    const stats = {
      trades: 0,
      settings: 0,
      preferences: 0,
      portfolio: 0,
      errors: 0
    };

    try {
      // 1. Migrate Trades
      console.log('📊 Migrating trades...');
      const tradesResult = await this.migrateTrades();
      stats.trades = tradesResult.count;
      if (!tradesResult.success) stats.errors++;

      // 2. Migrate Trade Settings
      console.log('⚙️ Migrating trade settings...');
      const settingsResult = await this.migrateTradeSettings();
      stats.settings = settingsResult.count;
      if (!settingsResult.success) stats.errors++;

      // 3. Migrate User Preferences
      console.log('👤 Migrating user preferences...');
      const preferencesResult = await this.migrateUserPreferences();
      stats.preferences = preferencesResult.count;
      if (!preferencesResult.success) stats.errors++;

      // 4. Migrate Portfolio Data
      console.log('💰 Migrating portfolio data...');
      const portfolioResult = await this.migratePortfolioData();
      stats.portfolio = portfolioResult.count;
      if (!portfolioResult.success) stats.errors++;

      // 5. Migrate Tax Data
      console.log('📊 Migrating tax data...');
      const taxResult = await this.migrateTaxData();
      if (!taxResult.success) stats.errors++;

      // 6. Migrate Dashboard Config
      console.log('🎛️ Migrating dashboard config...');
      const dashboardResult = await this.migrateDashboardConfig();
      if (!dashboardResult.success) stats.errors++;

      // 7. Migrate Milestones Data
      console.log('🏆 Migrating milestones data...');
      const milestonesResult = await this.migrateMilestonesData();
      if (!milestonesResult.success) stats.errors++;

      // 8. Migrate Misc Data
      console.log('📦 Migrating misc data...');
      const miscResult = await this.migrateMiscData();
      if (!miscResult.success) stats.errors++;

      // 9. Create backup of localStorage data before cleanup
      console.log('💾 Creating backup of localStorage data...');
      await this.createLocalStorageBackup();

      const totalMigrated = stats.trades + stats.settings + stats.preferences + stats.portfolio;
      
      if (stats.errors === 0) {
        console.log(`✅ Migration completed successfully! Migrated ${totalMigrated} records.`);
        return {
          success: true,
          message: `Successfully migrated ${totalMigrated} records to IndexedDB`,
          stats
        };
      } else {
        console.warn(`⚠️ Migration completed with ${stats.errors} errors. Migrated ${totalMigrated} records.`);
        return {
          success: false,
          message: `Migration completed with ${stats.errors} errors. ${totalMigrated} records migrated.`,
          stats
        };
      }

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats
      };
    }
  }

  // Migrate trades data
  private static async migrateTrades(): Promise<{ success: boolean; count: number }> {
    try {
      const tradesData = localStorage.getItem('tradeJournalData');
      if (!tradesData) {
        console.log('📊 No trades data found in localStorage');
        return { success: true, count: 0 };
      }

      const trades: Trade[] = JSON.parse(tradesData);
      const tradesWithTimestamps = trades.map(trade => ({
        ...trade,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const success = await DatabaseService.saveAllTrades(tradesWithTimestamps);
      console.log(`📊 Migrated ${trades.length} trades`);
      
      return { success, count: trades.length };
    } catch (error) {
      console.error('❌ Failed to migrate trades:', error);
      return { success: false, count: 0 };
    }
  }

  // Migrate trade settings
  private static async migrateTradeSettings(): Promise<{ success: boolean; count: number }> {
    try {
      const settingsData = localStorage.getItem('tradeSettings');
      if (!settingsData) {
        console.log('⚙️ No trade settings found in localStorage');
        return { success: true, count: 0 };
      }

      const settings = JSON.parse(settingsData);
      const success = await DatabaseService.saveTradeSettings(settings);
      console.log('⚙️ Migrated trade settings');
      
      return { success, count: 1 };
    } catch (error) {
      console.error('❌ Failed to migrate trade settings:', error);
      return { success: false, count: 0 };
    }
  }

  // Migrate user preferences
  private static async migrateUserPreferences(): Promise<{ success: boolean; count: number }> {
    try {
      const preferencesData = localStorage.getItem('userPreferences');
      if (!preferencesData) {
        console.log('👤 No user preferences found in localStorage');
        return { success: true, count: 0 };
      }

      const preferences = JSON.parse(preferencesData);
      const success = await DatabaseService.saveUserPreferences(preferences);
      console.log('👤 Migrated user preferences');
      
      return { success, count: 1 };
    } catch (error) {
      console.error('❌ Failed to migrate user preferences:', error);
      return { success: false, count: 0 };
    }
  }

  // Migrate portfolio data
  private static async migratePortfolioData(): Promise<{ success: boolean; count: number }> {
    try {
      const portfolioKeys = [
        'yearlyStartingCapitals',
        'capitalChanges', 
        'monthlyStartingCapitalOverrides'
      ];

      const portfolioData: any[] = [];
      let totalCount = 0;

      for (const key of portfolioKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            
            if (key === 'yearlyStartingCapitals') {
              Object.entries(parsed).forEach(([year, amount]) => {
                portfolioData.push({
                  type: 'yearly_capital',
                  year: parseInt(year),
                  amount: amount as number
                });
                totalCount++;
              });
            } else if (key === 'capitalChanges') {
              parsed.forEach((change: any) => {
                portfolioData.push({
                  type: 'capital_change',
                  date: change.date,
                  amount: change.amount,
                  description: change.description
                });
                totalCount++;
              });
            } else if (key === 'monthlyStartingCapitalOverrides') {
              Object.entries(parsed).forEach(([monthYear, amount]) => {
                const [month, year] = monthYear.split(' ');
                portfolioData.push({
                  type: 'monthly_override',
                  month,
                  year: parseInt(year),
                  amount: amount as number
                });
                totalCount++;
              });
            }
          } catch (parseError) {
            console.error(`❌ Failed to parse ${key}:`, parseError);
          }
        }
      }

      if (portfolioData.length > 0) {
        const success = await DatabaseService.savePortfolioData(portfolioData);
        console.log(`💰 Migrated ${totalCount} portfolio records`);
        return { success, count: totalCount };
      }

      return { success: true, count: 0 };
    } catch (error) {
      console.error('❌ Failed to migrate portfolio data:', error);
      return { success: false, count: 0 };
    }
  }

  // Migrate tax data
  private static async migrateTaxData(): Promise<{ success: boolean; count: number }> {
    try {
      const taxData = localStorage.getItem('taxData');
      if (!taxData) {
        console.log('📊 No tax data found in localStorage');
        return { success: true, count: 0 };
      }

      const parsed = JSON.parse(taxData);
      let count = 0;

      // Tax data is stored by year
      for (const [year, data] of Object.entries(parsed)) {
        const success = await DatabaseService.saveTaxData(parseInt(year), data);
        if (success) count++;
      }

      console.log(`📊 Migrated ${count} tax data records`);
      return { success: true, count };
    } catch (error) {
      console.error('❌ Failed to migrate tax data:', error);
      return { success: false, count: 0 };
    }
  }

  // Migrate dashboard config
  private static async migrateDashboardConfig(): Promise<{ success: boolean; count: number }> {
    try {
      const configData = localStorage.getItem('dashboardConfig');
      if (!configData) {
        console.log('🎛️ No dashboard config found in localStorage');
        return { success: true, count: 0 };
      }

      const config = JSON.parse(configData);
      const success = await DatabaseService.saveDashboardConfig(config);
      console.log('🎛️ Migrated dashboard config');

      return { success, count: 1 };
    } catch (error) {
      console.error('❌ Failed to migrate dashboard config:', error);
      return { success: false, count: 0 };
    }
  }

  // Migrate milestones data
  private static async migrateMilestonesData(): Promise<{ success: boolean; count: number }> {
    try {
      const milestonesData = localStorage.getItem('achievedMilestones');
      if (!milestonesData) {
        console.log('🏆 No milestones data found in localStorage');
        return { success: true, count: 0 };
      }

      const achievements = JSON.parse(milestonesData);
      const success = await DatabaseService.saveMilestonesData(achievements);
      console.log('🏆 Migrated milestones data');

      return { success, count: 1 };
    } catch (error) {
      console.error('❌ Failed to migrate milestones data:', error);
      return { success: false, count: 0 };
    }
  }

  // Migrate misc data
  private static async migrateMiscData(): Promise<{ success: boolean; count: number }> {
    try {
      let count = 0;
      const miscKeys = [];

      // Find all misc_ keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('misc_')) {
          miscKeys.push(key);
        }
      }

      // Also migrate other common keys
      const otherKeys = [
        'tradeJournal_rowsPerPage',
        'capitalChanges',
        'monthlyCapitalHistory',
        'capital_changes',
        'monthly_capital_history'
      ];

      for (const key of [...miscKeys, ...otherKeys]) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const success = await DatabaseService.saveMiscData(key, parsed);
            if (success) count++;
          } catch (parseError) {
            // If it's not JSON, save as string
            const success = await DatabaseService.saveMiscData(key, data);
            if (success) count++;
          }
        }
      }

      console.log(`📦 Migrated ${count} misc data records`);
      return { success: true, count };
    } catch (error) {
      console.error('❌ Failed to migrate misc data:', error);
      return { success: false, count: 0 };
    }
  }

  // Create backup of localStorage data
  private static async createLocalStorageBackup(): Promise<void> {
    try {
      const allLocalStorageData: Record<string, string> = {};

      // Collect all localStorage data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allLocalStorageData[key] = localStorage.getItem(key) || '';
        }
      }

      // Save as backup in IndexedDB
      await DatabaseService.createBackup(
        'trades', // Using 'trades' type for localStorage backup
        allLocalStorageData,
        'Complete localStorage backup before migration'
      );

      console.log('💾 Created localStorage backup in IndexedDB');
    } catch (error) {
      console.error('❌ Failed to create localStorage backup:', error);
    }
  }

  // Clean up localStorage after successful migration
  static async cleanupLocalStorage(): Promise<boolean> {
    try {
      const keysToRemove = [
        'tradeJournalData',
        'tradeJournalData_backup',
        'trades_data',
        'trades_data_backup',
        'tradeSettings',
        'userPreferences',
        'yearlyStartingCapitals',
        'capitalChanges',
        'monthlyStartingCapitalOverrides',
        'capital_changes',
        'monthly_capital_history',
        'monthlyCapitalHistory',
        'accountingMethod',
        'globalFilter',
        'dashboardConfig',
        'taxData',
        'achievedMilestones',
        'tradeJournal_rowsPerPage'
      ];

      // Also remove all misc_ keys
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allKeys.push(key);
        }
      }

      const miscKeys = allKeys.filter(key => key.startsWith('misc_'));
      const allKeysToRemove = [...keysToRemove, ...miscKeys];

      allKeysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);

        }
      });


      return true;
    } catch (error) {
      console.error('Failed to cleanup localStorage:', error);
      return false;
    }
  }

  // Rollback migration (restore from localStorage backup)
  static async rollbackMigration(): Promise<boolean> {
    try {
      console.log('🔄 Rolling back migration...');
      
      // Get localStorage backup from IndexedDB
      const backup = await DatabaseService.getLatestBackup('trades');
      if (!backup || !backup.data) {
        console.error('❌ No localStorage backup found for rollback');
        return false;
      }

      // Restore localStorage data
      Object.entries(backup.data).forEach(([key, value]) => {
        localStorage.setItem(key, value as string);
      });

      // Clear IndexedDB
      await DatabaseService.clearAllData();

      console.log('✅ Migration rollback completed');
      return true;
    } catch (error) {
      console.error('❌ Failed to rollback migration:', error);
      return false;
    }
  }
}
