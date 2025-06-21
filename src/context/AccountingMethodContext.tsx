import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AccountingMethod = 'accrual' | 'cash';

interface AccountingMethodContextType {
  accountingMethod: AccountingMethod;
  setAccountingMethod: (method: AccountingMethod) => void;
  toggleAccountingMethod: () => void;
  clearAccountingMethodData: () => void;
}

const AccountingMethodContext = createContext<AccountingMethodContextType | undefined>(undefined);

interface AccountingMethodProviderProps {
  children: ReactNode;
}

export const AccountingMethodProvider: React.FC<AccountingMethodProviderProps> = ({ children }) => {
  const [accountingMethod, setAccountingMethodState] = useState<AccountingMethod>('cash');
  const [isLoading, setIsLoading] = useState(true);

  // Load accounting method from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('accountingMethod');
      if (stored && (stored === 'accrual' || stored === 'cash')) {
        setAccountingMethodState(stored as AccountingMethod);
      } else {
        // If no stored preference, default to cash basis and save it
        setAccountingMethodState('cash');
        localStorage.setItem('accountingMethod', 'cash');
      }
    } catch (error) {
      console.error('Error loading accounting method from localStorage:', error);
      // Even if localStorage fails, ensure we default to cash basis
      setAccountingMethodState('cash');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoized setter to prevent unnecessary re-renders
  const setAccountingMethod = React.useCallback((method: AccountingMethod) => {
    if (method === accountingMethod) return; // Prevent unnecessary updates

    // Immediate state update for responsive UI
    setAccountingMethodState(method);

    // Async localStorage update to prevent blocking
    requestIdleCallback(() => {
      try {
        localStorage.setItem('accountingMethod', method);
      } catch (error) {
        console.error('Error saving accounting method to localStorage:', error);
      }
    });
  }, [accountingMethod]);

  const toggleAccountingMethod = React.useCallback(() => {
    const newMethod = accountingMethod === 'accrual' ? 'cash' : 'accrual';
    setAccountingMethod(newMethod);
  }, [accountingMethod, setAccountingMethod]);

  const clearAccountingMethodData = React.useCallback(() => {
    try {
      localStorage.removeItem('accountingMethod');
      setAccountingMethodState('cash'); // Reset to default
      console.log('🗑️ Cleared accounting method data');
    } catch (error) {
      console.error('❌ Failed to clear accounting method data:', error);
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    accountingMethod,
    setAccountingMethod,
    toggleAccountingMethod,
    clearAccountingMethodData
  }), [accountingMethod, setAccountingMethod, toggleAccountingMethod, clearAccountingMethodData]);

  // Always render children to prevent hook count mismatches
  return (
    <AccountingMethodContext.Provider value={contextValue}>
      {children}
    </AccountingMethodContext.Provider>
  );
};

export const useAccountingMethod = (): AccountingMethodContextType => {
  const context = useContext(AccountingMethodContext);
  if (!context) {
    throw new Error('useAccountingMethod must be used within an AccountingMethodProvider');
  }
  return context;
};
