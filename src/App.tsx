import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Route, Switch, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/react";
import { TradeJournal } from "./components/trade-journal";
import { TradeAnalytics } from "./components/trade-analytics";
import { TaxAnalytics } from "./components/tax-analytics";
import { MonthlyPerformanceTable } from "./pages/monthly-performance";
import { ThemeSwitcher } from "./components/theme-switcher";
import { useTheme } from "@heroui/use-theme";
import { TruePortfolioProvider } from "./utils/TruePortfolioContext";
import { TruePortfolioSetupManager } from "./components/TruePortfolioSetupManager";
import { ProfileSettingsModal } from "./components/ProfileSettingsModal";
import { GlobalFilterProvider, useGlobalFilter } from "./context/GlobalFilterContext";
import { AccountingMethodProvider } from "./context/AccountingMethodContext";
import { GlobalFilterBar } from "./components/GlobalFilterBar";
import { TradeTrackerLogo } from './components/icons/TradeTrackerLogo';
import { AnimatedBrandName } from './components/AnimatedBrandName';
import DeepAnalyticsPage from "./pages/DeepAnalyticsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { Analytics } from '@vercel/analytics/react';
import { DatabaseService } from "./db/database";
// Migrated from localStorage to IndexedDB using Dexie

export default function App() {
  const location = useLocation();
  const { theme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [userName, setUserName] = React.useState('');
  const [loadingPrefs, setLoadingPrefs] = React.useState(true);
  const [isFullWidthEnabled, setIsFullWidthEnabled] = React.useState(false);


  const mainContentRef = useRef<HTMLElement>(null);
  const [isMainContentFullscreen, setIsMainContentFullscreen] = useState(false);

  const getDefaultUserName = () => {
    // Default fallback - user name will be loaded from IndexedDB in useEffect
    return 'Aniket Mahato';
  };

  // Memoize IndexedDB helper functions to prevent re-creation on every render
  const fetchUserPreferences = useCallback(async () => {
    try {
      const prefs = await DatabaseService.getUserPreferences();
      return prefs;
    } catch (error) {
      console.error('❌ Error fetching user preferences from IndexedDB:', error);
      return null;
    }
  }, []);

  const saveUserPreferences = useCallback(async (prefs: Partial<{ is_mobile_menu_open: boolean; is_profile_open: boolean; user_name: string; is_full_width_enabled: boolean }>) => {
    try {
      const existing = await fetchUserPreferences() || {};
      const updated = { ...existing, ...prefs };
      await DatabaseService.saveUserPreferences(updated);
    } catch (error) {
      console.error('❌ IndexedDB save error:', error);
    }
  }, [fetchUserPreferences]);

  React.useEffect(() => {
    // Load preferences from IndexedDB on mount
    const loadPreferences = async () => {
      try {
        const prefs = await fetchUserPreferences();
        if (prefs) {
          setIsMobileMenuOpen(!!prefs.is_mobile_menu_open);
          setIsProfileOpen(!!prefs.is_profile_open);
          setUserName(prefs.user_name || ''); // Default to empty string if not found
          setIsFullWidthEnabled(!!prefs.is_full_width_enabled);
        }
      } catch (error) {
        console.error('❌ Failed to load user preferences:', error);
      } finally {
        setLoadingPrefs(false);
      }
    };

    loadPreferences();
  }, [fetchUserPreferences]);

  React.useEffect(() => {
    if (!loadingPrefs) {
      saveUserPreferences({ is_mobile_menu_open: isMobileMenuOpen });
    }
  }, [isMobileMenuOpen, loadingPrefs, saveUserPreferences]);

  React.useEffect(() => {
    if (!loadingPrefs) {
      saveUserPreferences({ is_profile_open: isProfileOpen });
    }
  }, [isProfileOpen, loadingPrefs, saveUserPreferences]);

  React.useEffect(() => {
    if (!loadingPrefs) {
      saveUserPreferences({ user_name: userName });
    }
  }, [userName, loadingPrefs, saveUserPreferences]);

  React.useEffect(() => {
    if (!loadingPrefs) {
      saveUserPreferences({ is_full_width_enabled: isFullWidthEnabled });
    }
  }, [isFullWidthEnabled, loadingPrefs, saveUserPreferences]);

  const handleToggleMainContentFullscreen = () => {
    if (!document.fullscreenElement) {
      mainContentRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMainContentFullscreen(document.fullscreenElement === mainContentRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Memoize navigation items to prevent unnecessary re-renders
  const navItems = useMemo(() => [
    { path: "/", name: "Journal", icon: "lucide:book-open" },
    { path: "/analytics", name: "Analytics", icon: "lucide:bar-chart-2" },
    { path: "/tax-analytics", name: "Tax Analytics", icon: "lucide:calculator" },
    { path: "/monthly-performance", name: "Monthly Performance", icon: "lucide:calendar-check" },
    { path: "/deep-analytics", name: "Deep Analytics", icon: "lucide:pie-chart" }
  ], []);



  return (
    <TruePortfolioProvider>
      <AccountingMethodProvider>
        <GlobalFilterProvider>
          <div className="min-h-screen bg-background font-sans antialiased">
          {/* Navigation */}
          <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-700 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
            <nav className="px-4 sm:px-6">
              <div className="flex h-16 items-center justify-between">
                {/* Logo and Mobile Menu Button */}
                <div className="flex items-center gap-4">
                  <Link 
                    to="/" 
                    className="flex items-center gap-2 font-semibold tracking-tight text-foreground hover:opacity-90 transition-opacity"
                  >
                    <TradeTrackerLogo className="h-5 w-5 text-foreground" />
                    <AnimatedBrandName className="text-foreground" />
                  </Link>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="sm:hidden"
                  >
                    <Icon icon={isMobileMenuOpen ? "lucide:x" : "lucide:menu"} className="h-5 w-5" />
                  </Button>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden sm:flex sm:items-center sm:gap-8">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors rounded-lg
                          ${isActive 
                            ? 'text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 backdrop-blur-md shadow-md' 
                            : 'text-gray-700 dark:text-gray-300 hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800/50 backdrop-blur-sm transition-all duration-300'
                          }`}
                      >
                        <Icon icon={item.icon} className="h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3">
                  <ThemeSwitcher />
                  <Button
                    variant="flat"
                    size="sm"
                    onPress={() => setIsProfileOpen(true)}
                    className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-300 min-h-0 min-w-0 shadow-sm"
                    startContent={<Icon icon="lucide:user" className="h-4 w-4" />}
                  >
                    <span className="font-medium text-sm leading-none">{userName}</span>
                  </Button>
                </div>
              </div>
            </nav>

            {/* Mobile Navigation */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="sm:hidden border-t border-divider overflow-hidden"
                >
                  <div className="space-y-1 px-4 py-3 bg-background/30 backdrop-blur-xl">
                    {navItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors rounded-lg
                          ${isActive 
                            ? 'text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 backdrop-blur-md shadow-md' 
                            : 'text-gray-700 dark:text-gray-300 hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800/50 backdrop-blur-sm transition-all duration-300'
                          }`}
                        >
                          <Icon icon={item.icon} className="h-4 w-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                    {/* Profile Button for Mobile */}
                    <Button
                      variant="light"
                      size="sm"
                      onPress={() => {
                        setIsProfileOpen(true);
                        setIsMobileMenuOpen(false); // Close mobile menu when opening profile
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors rounded-lg text-gray-700 dark:text-gray-300 hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800/50 backdrop-blur-sm transition-all duration-300"
                      startContent={<Icon icon="lucide:user" className="h-4 w-4" />}
                    >
                      <span>{userName || 'Profile'}</span>
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* Global Filter Bar */}
          <GlobalFilterBar />

          {/* Main Content */}
          <main ref={mainContentRef} className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <ErrorBoundary>
              <div className={isFullWidthEnabled ? "py-6" : "max-w-7xl mx-auto py-6"}>
                <Switch>
                  <Route path="/analytics">
                    <TradeAnalytics />
                  </Route>
                  <Route exact path="/" render={(props) => (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TradeJournal {...props} toggleFullscreen={handleToggleMainContentFullscreen} isFullscreen={isMainContentFullscreen} />
                    </motion.div>
                  )} />
                  <Route path="/tax-analytics" component={TaxAnalytics} />
                  <Route path="/monthly-performance" component={MonthlyPerformanceTable} />
                  <Route path="/deep-analytics" component={DeepAnalyticsPage} />
                </Switch>
              </div>
            </ErrorBoundary>
          </main>

          <ProfileSettingsModal
            isOpen={isProfileOpen}
            onOpenChange={setIsProfileOpen}
            userName={userName}
            setUserName={setUserName}
            isFullWidthEnabled={isFullWidthEnabled}
            setIsFullWidthEnabled={setIsFullWidthEnabled}
          />

          <TruePortfolioSetupManager
            userName={userName}
            setUserName={setUserName}
          />
          <Analytics />
          </div>
        </GlobalFilterProvider>
      </AccountingMethodProvider>
    </TruePortfolioProvider>
  );
}