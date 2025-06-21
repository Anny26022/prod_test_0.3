# 🏗️ Technical Architecture Documentation

## 📋 **Table of Contents**

1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [Accounting System](#accounting-system)
9. [Performance Optimizations](#performance-optimizations)
10. [Security & Privacy](#security--privacy)
11. [Build & Deployment](#build--deployment)
12. [Testing Strategy](#testing-strategy)
13. [Development Guidelines](#development-guidelines)

---

## 🎯 **System Overview**

### **Application Type**
- **Single Page Application (SPA)** built with React 18
- **Client-side only** - no backend dependencies
- **Progressive Web App (PWA)** capabilities
- **Responsive design** supporting desktop, tablet, and mobile

### **Core Purpose**
A comprehensive trading journal and portfolio analytics platform that provides:
- Advanced trade tracking and management
- Real-time portfolio analytics and performance metrics
- Dual accounting method support (Cash vs Accrual basis)
- Risk management and position sizing tools
- Tax reporting and compliance features

### **Key Architectural Principles**
- **Component-based architecture** with reusable UI components
- **Functional programming** patterns with React hooks
- **Type safety** throughout with TypeScript
- **Performance-first** design with optimized rendering
- **Privacy-focused** with local-only data storage
- **Accessibility-compliant** UI/UX design

---

## 🏛️ **Architecture Patterns**

### **1. Component-Based Architecture**
```
┌─────────────────────────────────────────┐
│                 App.tsx                 │
│           (Root Component)              │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   Layout    │  │    Providers    │   │
│  │ Components  │  │   (Context)     │   │
│  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │    Pages    │  │   Components    │   │
│  │ (Routes)    │  │  (Reusable)     │   │
│  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │    Hooks    │  │     Utils       │   │
│  │ (Business)  │  │  (Helpers)      │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

### **2. Layered Architecture**
- **Presentation Layer**: React components and UI logic
- **Business Logic Layer**: Custom hooks and utility functions
- **Data Access Layer**: Local storage management and data persistence
- **Cross-cutting Concerns**: Context providers, error handling, logging

### **3. Modular Design**
- **Feature-based modules** (trade management, analytics, portfolio)
- **Shared utilities** and common components
- **Separation of concerns** between UI and business logic
- **Dependency injection** through React Context

---

## 🛠️ **Technology Stack**

### **Core Framework**
```typescript
// React 18.3.1 with TypeScript 5.7.3
import React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
```

### **Build Tools & Development**
- **Vite 6.0.11**: Lightning-fast build tool and dev server
- **TypeScript 5.7.3**: Static type checking and enhanced IDE support
- **ESLint**: Code quality and consistency enforcement
- **PostCSS**: CSS processing and optimization

### **UI/UX Framework**
- **HeroUI 2.7.8**: Modern component library (NextUI-based)
- **Tailwind CSS 3.4.17**: Utility-first CSS framework
- **Framer Motion 11.18.2**: Animation and transition library
- **Iconify React**: Comprehensive icon system

### **Data Visualization**
- **Recharts 2.15.3**: React-based charting library
- **Nivo 0.99.0**: Advanced data visualization components
- **React Calendar Heatmap**: Specialized heatmap components

### **Data Management**
- **React Router DOM 5.3.4**: Client-side routing
- **Date-fns 4.1.0**: Modern date manipulation library
- **PapaParse 5.5.3**: CSV parsing and generation
- **XLSX 0.18.5**: Excel file handling

### **Development Dependencies**
```json
{
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.49",
    "tailwindcss": "3.4.17",
    "typescript": "5.7.3"
  }
}
```

---

## 📁 **Project Structure**

### **High-Level Directory Structure**
```
trading-journal-dashboard/
├── public/                 # Static assets
├── src/                   # Source code
│   ├── components/        # Reusable UI components
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page-level components
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions and helpers
│   ├── data/             # Mock data and constants
│   └── styles/           # Global styles and CSS
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── vite.config.ts        # Vite build configuration
└── README.md             # Project documentation
```

### **Detailed Component Structure**
```
src/components/
├── analytics/            # Analytics-specific components
│   ├── PerformanceChart.tsx
│   ├── TradeHeatmap.tsx
│   ├── performance-metrics.tsx
│   └── trade-statistics.tsx
├── dashboard/            # Dashboard widgets
│   ├── DashboardWidget.tsx
│   └── WidgetContainer.tsx
├── tax/                  # Tax analytics components
│   ├── tax-metrics-cards.tsx
│   └── TaxSummary.tsx
├── trade-table/          # Trade table components
│   ├── TradeTableRow.tsx
│   └── TradeTableHeader.tsx
├── icons/                # Custom icon components
│   ├── TradeTrackerLogo.tsx
│   └── AnimatedBrandName.tsx
├── trade-journal.tsx     # Main trade journal component
├── trade-modal.tsx       # Trade creation/editing modal
├── ProfileSettingsModal.tsx
└── GlobalFilterBar.tsx
```

---

## 🔄 **Data Flow Architecture**

### **1. Unidirectional Data Flow**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Action   │───▶│  State Update   │───▶│   UI Re-render  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         └──────────────│  Side Effects   │◀─────────────┘
                        │ (localStorage)  │
                        └─────────────────┘
```

### **2. Context-Based State Management**
```typescript
// Global state providers
<AccountingMethodProvider>
  <GlobalFilterProvider>
    <TruePortfolioProvider>
      <App />
    </TruePortfolioProvider>
  </GlobalFilterProvider>
</AccountingMethodProvider>
```

### **3. Data Persistence Flow**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Component     │───▶│   Custom Hook   │───▶│  localStorage   │
│   (UI Action)   │    │  (Business)     │    │  (Persistence)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         └──────────────│   State Update  │◀─────────────┘
                        │   (Re-render)   │
                        └─────────────────┘
```

---

## 🧩 **Component Architecture**

### **1. Component Hierarchy**
```typescript
// Example component structure
interface ComponentProps {
  // Props interface
}

const Component: React.FC<ComponentProps> = React.memo(({ props }) => {
  // Hooks
  const [state, setState] = useState();
  const { contextValue } = useContext();
  const memoizedValue = useMemo(() => calculation, [deps]);

  // Event handlers
  const handleAction = useCallback(() => {
    // Action logic
  }, [dependencies]);

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
});
```

### **2. Component Categories**

#### **Page Components**
- **Route-level components** that represent full pages
- **Coordinate multiple widgets** and manage page-level state
- **Handle routing** and navigation logic

#### **Container Components**
- **Business logic containers** that manage data and state
- **Connect to context providers** and custom hooks
- **Pass data down** to presentational components

#### **Presentational Components**
- **Pure UI components** focused on rendering
- **Receive data via props** and emit events via callbacks
- **Highly reusable** across different contexts

#### **Utility Components**
- **Cross-cutting components** like modals, tooltips, loaders
- **Provide common functionality** used throughout the app
- **Maintain consistent** UI patterns and behaviors

---

## 🗄️ **State Management**

### **1. Context-Based Global State**

#### **AccountingMethodContext**
```typescript
interface AccountingMethodContextType {
  accountingMethod: 'accrual' | 'cash';
  setAccountingMethod: (method: AccountingMethod) => void;
  toggleAccountingMethod: () => void;
  clearAccountingMethodData: () => void;
}

// Usage throughout the application
const { accountingMethod } = useAccountingMethod();
const useCashBasis = accountingMethod === 'cash';
```

#### **GlobalFilterContext**
```typescript
interface GlobalFilterContextType {
  filter: DateFilter;
  setFilter: (filter: DateFilter) => void;
  startDate: Date | null;
  endDate: Date | null;
  // ... other filter properties
}
```

#### **TruePortfolioContext**
```typescript
interface TruePortfolioContextType {
  portfolioSize: number;
  yearlyStartingCapitals: YearlyStartingCapital[];
  capitalChanges: CapitalChange[];
  getMonthlyTruePortfolio: (month: string, year: number) => MonthlyTruePortfolio;
  getAllMonthlyTruePortfolios: () => MonthlyTruePortfolio[];
  // ... portfolio management methods
}
```

### **2. Local Component State**
```typescript
// useState for component-specific state
const [editingId, setEditingId] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [formData, setFormData] = useState<FormData>(initialState);

// useReducer for complex state logic
const [state, dispatch] = useReducer(tradeReducer, initialState);
```

### **3. Custom Hooks for Business Logic**

#### **useTrades Hook**
```typescript
export const useTrades = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const { accountingMethod } = useAccountingMethod();
  const { filter } = useGlobalFilter();

  // Filtered trades based on global filter and accounting method
  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const relevantDate = getTradeDateForAccounting(trade, useCashBasis);
      return isInGlobalFilter(relevantDate, filter);
    });
  }, [trades, filter, accountingMethod]);

  return {
    trades: filteredTrades,
    addTrade,
    updateTrade,
    deleteTrade,
    // ... other trade operations
  };
};
```

#### **useMilestones Hook**
```typescript
export const useMilestones = () => {
  const { trades } = useTrades();
  const { getAllMonthlyTruePortfolios, portfolioSize } = useTruePortfolio();
  const { accountingMethod } = useAccountingMethod();

  const [achievedMilestones, setAchievedMilestones] = useState<AchievedMilestone[]>([]);

  // Check and award milestones based on current data
  const checkAndAwardMilestones = useCallback(() => {
    // Milestone evaluation logic
  }, [trades, portfolioSize, accountingMethod]);

  return { achievedMilestones, ALL_MILESTONES };
};
```

---

## 💰 **Accounting System**

### **1. Dual Accounting Method Support**

#### **Cash Basis Accounting**
- **P/L Attribution**: Profit/Loss attributed to **exit dates**
- **Trade Recognition**: Trades recognized when **closed/exited**
- **Portfolio Impact**: Changes reflected on **exit completion**
- **Tax Reporting**: Aligned with **realized gains/losses**

#### **Accrual Basis Accounting**
- **P/L Attribution**: Profit/Loss attributed to **entry dates**
- **Trade Recognition**: Trades recognized when **initiated/opened**
- **Portfolio Impact**: Changes reflected on **trade entry**
- **Performance Analysis**: Better for **ongoing performance tracking**

### **2. Accounting Method Implementation**

#### **Core Calculation Function**
```typescript
export const calculateTradePL = (trade: Trade, useCashBasis: boolean): number => {
  if (useCashBasis) {
    // Cash basis: only realized P/L from closed positions
    return trade.positionStatus === 'Closed' ? trade.realisedAmount || 0 : 0;
  } else {
    // Accrual basis: current P/L including unrealized
    if (trade.positionStatus === 'Closed') {
      return trade.realisedAmount || 0;
    } else {
      // Calculate unrealized P/L for open positions
      return calcUnrealizedPL(trade.avgEntry, trade.cmp, trade.openQty, trade.buySell);
    }
  }
};
```

#### **Date Attribution Logic**
```typescript
export const getTradeDateForAccounting = (trade: Trade, useCashBasis: boolean): string => {
  if (useCashBasis) {
    // Use exit date for cash basis (when P/L is realized)
    return trade.exitDate || trade.exit1Date || trade.date;
  } else {
    // Use entry date for accrual basis (when trade is initiated)
    return trade.entryDate || trade.date;
  }
};
```

### **3. Consistent Application**

#### **Global Filter Integration**
```typescript
// All components use accounting method-aware filtering
const filteredTrades = trades.filter(trade => {
  const relevantDate = getTradeDateForAccounting(trade, useCashBasis);
  return isInGlobalFilter(relevantDate, globalFilter);
});
```

#### **Analytics Calculations**
```typescript
// Performance metrics respect accounting method
const totalPL = trades.reduce((sum, trade) => {
  return sum + calculateTradePL(trade, useCashBasis);
}, 0);

// Monthly portfolio calculations
const monthlyPL = getTradesForMonth(month, year, trades, useCashBasis)
  .reduce((sum, trade) => sum + calculateTradePL(trade, useCashBasis), 0);
```

---

## ⚡ **Performance Optimizations**

### **1. React Performance Patterns**

#### **Memoization Strategies**
```typescript
// Component memoization
const ExpensiveComponent = React.memo(({ data, onAction }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.data.id === nextProps.data.id;
});

// Value memoization
const expensiveCalculation = useMemo(() => {
  return trades.reduce((acc, trade) => {
    // Complex calculation
    return acc + calculateComplexMetric(trade);
  }, 0);
}, [trades, dependencies]);

// Callback memoization
const handleTradeUpdate = useCallback((tradeId: string, updates: Partial<Trade>) => {
  setTrades(prev => prev.map(trade =>
    trade.id === tradeId ? { ...trade, ...updates } : trade
  ));
}, []);
```

#### **Efficient Rendering**
```typescript
// Virtualized lists for large datasets
import { FixedSizeList as List } from 'react-window';

const VirtualizedTradeList = ({ trades }) => (
  <List
    height={600}
    itemCount={trades.length}
    itemSize={50}
    itemData={trades}
  >
    {TradeRow}
  </List>
);
```

### **2. Data Management Optimizations**

#### **Debounced Updates**
```typescript
const debouncedSave = useCallback(
  debounce((data: any) => {
    localStorage.setItem('trades', JSON.stringify(data));
  }, 500),
  []
);

useEffect(() => {
  debouncedSave(trades);
}, [trades, debouncedSave]);
```

#### **Lazy Loading**
```typescript
// Code splitting with React.lazy
const DeepAnalyticsPage = React.lazy(() => import('./pages/DeepAnalyticsPage'));

// Lazy component loading
<Suspense fallback={<Loader />}>
  <DeepAnalyticsPage />
</Suspense>
```

### **3. Bundle Optimization**

#### **Vite Configuration**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts', '@nivo/bar', '@nivo/pie'],
          ui: ['@heroui/react', 'framer-motion']
        }
      }
    }
  }
});
```

---

## 🔒 **Security & Privacy**

### **1. Data Privacy Architecture**

#### **Local-Only Storage**
```typescript
// All data stored in browser localStorage
const STORAGE_KEYS = {
  TRADES: 'trades',
  PORTFOLIO: 'portfolioData',
  SETTINGS: 'userSettings',
  MILESTONES: 'achievedMilestones'
} as const;

// No external API calls for sensitive data
const saveTradeData = (trades: Trade[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
  } catch (error) {
    console.error('Failed to save trade data:', error);
  }
};
```

#### **Data Validation**
```typescript
// Input validation and sanitization
const validateTradeData = (trade: Partial<Trade>): ValidationResult => {
  const errors: string[] = [];

  if (!trade.name || trade.name.trim().length === 0) {
    errors.push('Trade name is required');
  }

  if (typeof trade.entry !== 'number' || trade.entry <= 0) {
    errors.push('Entry price must be a positive number');
  }

  return { isValid: errors.length === 0, errors };
};
```

### **2. Error Handling**

#### **Graceful Error Recovery**
```typescript
// Error boundaries for component-level error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

#### **Data Recovery Mechanisms**
```typescript
// Backup and recovery system
const createDataBackup = () => {
  const backup = {
    trades: localStorage.getItem(STORAGE_KEYS.TRADES),
    portfolio: localStorage.getItem(STORAGE_KEYS.PORTFOLIO),
    timestamp: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = `trading-journal-backup-${Date.now()}.json`;
  a.click();
};
```

---

## 🚀 **Build & Deployment**

### **1. Build Configuration**

#### **Vite Build Setup**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@heroui/react', 'framer-motion'],
          charts: ['recharts', '@nivo/bar', '@nivo/pie'],
          utils: ['date-fns', 'papaparse', 'xlsx']
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
```

#### **TypeScript Configuration**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### **2. Deployment Strategies**

#### **Static Site Deployment**
```bash
# Build for production
npm run build

# Deploy to various platforms
# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=dist

# GitHub Pages
gh-pages -d dist
```

#### **Environment Configuration**
```typescript
// Environment-specific configurations
const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    enableDebug: true,
    enableAnalytics: false
  },
  production: {
    apiUrl: 'https://api.tradingjournal.com',
    enableDebug: false,
    enableAnalytics: true
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

---

## 🧪 **Testing Strategy**

### **1. Testing Pyramid**

#### **Unit Tests**
```typescript
// Example unit test for calculation functions
import { calculateTradePL, getTradeDateForAccounting } from '../utils/accountingUtils';

describe('Accounting Utils', () => {
  const mockTrade: Trade = {
    id: '1',
    entry: 100,
    cmp: 110,
    openQty: 10,
    buySell: 'Buy',
    positionStatus: 'Open',
    date: '2024-01-01',
    exitDate: '2024-01-15'
  };

  test('calculateTradePL - Cash Basis', () => {
    const result = calculateTradePL(mockTrade, true);
    expect(result).toBe(0); // Open position, no realized P/L
  });

  test('getTradeDateForAccounting - Cash Basis', () => {
    const result = getTradeDateForAccounting(mockTrade, true);
    expect(result).toBe('2024-01-15'); // Exit date for cash basis
  });
});
```

#### **Integration Tests**
```typescript
// Example integration test for hooks
import { renderHook, act } from '@testing-library/react';
import { useTrades } from '../hooks/use-trades';

describe('useTrades Hook', () => {
  test('should add new trade', () => {
    const { result } = renderHook(() => useTrades());

    act(() => {
      result.current.addTrade(mockTrade);
    });

    expect(result.current.trades).toHaveLength(1);
    expect(result.current.trades[0]).toEqual(mockTrade);
  });
});
```

#### **Component Tests**
```typescript
// Example component test
import { render, screen, fireEvent } from '@testing-library/react';
import { TradeJournal } from '../components/trade-journal';

describe('TradeJournal Component', () => {
  test('renders trade table', () => {
    render(<TradeJournal />);
    expect(screen.getByText('Trade Journal')).toBeInTheDocument();
  });

  test('opens trade modal on add button click', () => {
    render(<TradeJournal />);
    fireEvent.click(screen.getByText('Add Trade'));
    expect(screen.getByText('New Trade')).toBeInTheDocument();
  });
});
```

### **2. Testing Tools**
- **Jest**: JavaScript testing framework
- **React Testing Library**: Component testing utilities
- **MSW**: Mock Service Worker for API mocking
- **Cypress**: End-to-end testing (optional)

---

## 📋 **Development Guidelines**

### **1. Code Style & Standards**

#### **TypeScript Best Practices**
```typescript
// Use strict typing
interface TradeFormData {
  name: string;
  entry: number;
  quantity: number;
  date: string;
}

// Prefer type unions over enums
type PositionStatus = 'Open' | 'Closed' | 'Partial';

// Use generic types for reusability
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}
```

#### **React Component Patterns**
```typescript
// Functional components with TypeScript
interface ComponentProps {
  title: string;
  onAction: (id: string) => void;
  children?: React.ReactNode;
}

const Component: React.FC<ComponentProps> = ({ title, onAction, children }) => {
  // Component implementation
};

// Use React.memo for performance
export default React.memo(Component);
```

### **2. File Naming Conventions**
- **Components**: PascalCase (`TradeJournal.tsx`)
- **Hooks**: camelCase with 'use' prefix (`use-trades.ts`)
- **Utils**: camelCase (`tradeCalculations.ts`)
- **Types**: camelCase (`trade.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

### **3. Import Organization**
```typescript
// 1. React and external libraries
import React, { useState, useEffect } from 'react';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';

// 2. Internal utilities and types
import { Trade } from '../types/trade';
import { calculateTradePL } from '../utils/accountingUtils';

// 3. Internal components and hooks
import { useTrades } from '../hooks/use-trades';
import { TradeModal } from './trade-modal';
```

### **4. Performance Guidelines**
- **Use React.memo** for expensive components
- **Implement useMemo** for expensive calculations
- **Use useCallback** for event handlers passed to children
- **Avoid inline objects** in JSX props
- **Implement virtual scrolling** for large lists

### **5. Accessibility Guidelines**
- **Use semantic HTML** elements
- **Implement ARIA labels** for complex interactions
- **Ensure keyboard navigation** support
- **Maintain color contrast** ratios
- **Provide alternative text** for images

---

## 📊 **Monitoring & Analytics**

### **1. Performance Monitoring**
```typescript
// Performance measurement
const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};

// React Profiler for component performance
<Profiler id="TradeJournal" onRender={onRenderCallback}>
  <TradeJournal />
</Profiler>
```

### **2. Error Tracking**
```typescript
// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
```

### **3. User Analytics**
```typescript
// Vercel Analytics integration
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      <MainApp />
      <Analytics />
    </>
  );
}
```

---

## 🔄 **Future Enhancements**

### **1. Planned Features**
- **Real-time market data** integration
- **Advanced charting** capabilities
- **Mobile app** development
- **Cloud synchronization** options
- **Advanced reporting** features

### **2. Technical Improvements**
- **Service Worker** implementation for offline support
- **IndexedDB** migration for better data storage
- **WebAssembly** integration for complex calculations
- **Micro-frontend** architecture for scalability

### **3. Performance Optimizations**
- **React 18 Concurrent Features** adoption
- **Streaming SSR** implementation
- **Edge computing** deployment
- **Advanced caching** strategies

---

## 📚 **Additional Resources**

### **Documentation Links**
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [HeroUI Documentation](https://heroui.com/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### **Development Tools**
- [React Developer Tools](https://react.dev/learn/react-developer-tools)
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

---

**This technical architecture document serves as a comprehensive guide for understanding, maintaining, and extending the Trading Journal & Portfolio Analytics Platform. It should be updated as the system evolves and new features are added.**
```