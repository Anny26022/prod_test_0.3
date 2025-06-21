# 📈 Advanced Trading Journal & Portfolio Analytics Platform

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0.11-646CFF.svg)](https://vitejs.dev/)
[![HeroUI](https://img.shields.io/badge/HeroUI-2.7.8-purple.svg)](https://heroui.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **A comprehensive, feature-rich trading journal and portfolio analytics platform built with modern React, TypeScript, and advanced financial calculations. Designed for serious traders who demand precision, flexibility, and deep insights into their trading performance.**

## 🌟 **Key Highlights**

- **🎯 Dual Accounting Methods**: Support for both Cash Basis and Accrual Basis accounting
- **📊 Advanced Analytics**: Deep performance metrics, risk analysis, and portfolio insights
- **🔄 Real-time Calculations**: Live P/L tracking, position sizing, and risk metrics
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **🎨 Modern UI/UX**: Sleek, intuitive interface with smooth animations
- **💾 Local Storage**: No external dependencies - all data stored locally
- **🔧 Highly Customizable**: Flexible configuration and personalization options

---

## 🚀 **Quick Start**

### Prerequisites
- **Node.js** 18.0+ 
- **npm** or **yarn** package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/trading-journal-dashboard.git
cd trading-journal-dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### First Launch
1. Open your browser to `http://localhost:5173`
2. Complete the initial portfolio setup
3. Configure your accounting method preference
4. Start adding your trades!

---

## 🎯 **Core Features**

### 📝 **Trade Journal Management**
- **Comprehensive Trade Tracking**: Record entry/exit prices, quantities, dates, and strategies
- **Multi-Level Position Building**: Support for pyramid entries (up to 2 levels) and partial exits (up to 3 levels)
- **Real-time Calculations**: Auto-calculated metrics including position size, allocation, reward:risk ratios
- **Inline Editing**: Quick edit capabilities directly in the trade table
- **Advanced Filtering**: Filter by status, date ranges, symbols, and custom criteria
- **Bulk Operations**: Import/export trades via CSV/Excel formats

### 📊 **Advanced Analytics Dashboard**
- **Performance Metrics**: Sharpe ratio, Sortino ratio, Calmar ratio, and custom risk metrics
- **Portfolio Analytics**: True portfolio tracking with capital changes and monthly performance
- **Trade Statistics**: Win rate, average win/loss, consecutive wins/losses, and more
- **Sector Analysis**: Performance breakdown by industry sectors
- **Risk Management**: Drawdown analysis, position sizing insights, and risk exposure metrics

### 💰 **Dual Accounting System**
- **Cash Basis Accounting**: P/L attributed to exit dates (when trades are closed)
- **Accrual Basis Accounting**: P/L attributed to entry dates (when trades are initiated)
- **Real-time Switching**: Toggle between methods with instant recalculation
- **Consistent Application**: All analytics, charts, and reports respect the selected method

### 📈 **Portfolio Management**
- **True Portfolio Tracking**: Accurate portfolio size calculation with deposits/withdrawals
- **Capital Changes Management**: Track deposits, withdrawals, and their impact
- **Monthly Performance**: Detailed month-by-month portfolio performance analysis
- **Historical Tracking**: Maintain complete history of portfolio changes and performance

### 🎖️ **Achievement System**
- **Trading Milestones**: Unlock achievements based on trading performance and consistency
- **Progress Tracking**: Visual progress indicators for various trading goals
- **Gamification**: Motivational elements to encourage consistent trading discipline

---

## 🛠️ **Technology Stack**

### **Frontend Framework**
- **React 18.3.1** - Modern React with hooks and concurrent features
- **TypeScript 5.7.3** - Type-safe development with advanced type checking
- **Vite 6.0.11** - Lightning-fast build tool and development server

### **UI/UX Libraries**
- **HeroUI 2.7.8** - Modern, accessible component library
- **Framer Motion 11.18.2** - Smooth animations and transitions
- **Iconify React** - Comprehensive icon library
- **Tailwind CSS 3.4.17** - Utility-first CSS framework

### **Data Visualization**
- **Recharts 2.15.3** - Responsive charts and graphs
- **Nivo Charts 0.99.0** - Advanced data visualization components
- **React Calendar Heatmap** - Trading activity heatmaps

### **Data Management**
- **React Router DOM 5.3.4** - Client-side routing
- **Date-fns 4.1.0** - Modern date utility library
- **PapaParse 5.5.3** - CSV parsing and generation
- **XLSX 0.18.5** - Excel file handling

---

## 📁 **Project Structure**

```
src/
├── components/           # Reusable UI components
│   ├── analytics/       # Analytics-specific components
│   ├── dashboard/       # Dashboard widgets
│   ├── tax/            # Tax analytics components
│   ├── trade-table/    # Trade table components
│   └── icons/          # Custom icon components
├── context/             # React context providers
│   ├── AccountingMethodContext.tsx
│   └── GlobalFilterContext.tsx
├── hooks/               # Custom React hooks
│   ├── use-trades.ts
│   ├── use-milestones.ts
│   └── use-capital-changes.ts
├── pages/               # Page components
│   ├── DeepAnalyticsPage.tsx
│   └── monthly-performance.tsx
├── types/               # TypeScript type definitions
├── utils/               # Utility functions and helpers
│   ├── tradeCalculations.ts
│   ├── accountingUtils.ts
│   └── TruePortfolioContext.tsx
└── data/                # Mock data and constants
```

---

## ⚙️ **Configuration & Customization**

### **Accounting Method Setup**
Configure your preferred accounting method in the Profile Settings:
- **Cash Basis**: P/L appears on exit dates (recommended for tax reporting)
- **Accrual Basis**: P/L appears on entry dates (recommended for performance analysis)

### **Portfolio Configuration**
Set up your portfolio parameters:
- Initial starting capital
- Monthly capital overrides
- Deposit and withdrawal tracking
- Currency and formatting preferences

### **Dashboard Customization**
Personalize your dashboard:
- Toggle widget visibility
- Customize date ranges
- Configure performance metrics
- Set up custom filters

---

## 📊 **Key Metrics & Calculations**

### **Performance Metrics**
- **Sharpe Ratio**: Risk-adjusted returns calculation
- **Sortino Ratio**: Downside deviation-based risk metric
- **Calmar Ratio**: Return vs maximum drawdown
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Gross profit vs gross loss ratio

### **Risk Metrics**
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Value at Risk (VaR)**: Potential loss estimation
- **Position Sizing**: Kelly criterion and fixed percentage methods
- **Risk-Reward Ratios**: Expected vs actual R-multiples

### **Portfolio Metrics**
- **True Portfolio Size**: Accurate portfolio value with capital changes
- **Monthly Returns**: Period-over-period performance
- **Cumulative Returns**: Total portfolio growth
- **Allocation Analysis**: Position sizing and diversification metrics

---

## 🔧 **Advanced Features**

### **Data Import/Export**
- **CSV Import**: Bulk import trades from CSV files
- **Excel Export**: Export filtered data to Excel format
- **Backup/Restore**: Complete data backup and restoration
- **Template Downloads**: Pre-formatted import templates

### **Real-time Price Integration**
- **Live Price Updates**: Automatic CMP (Current Market Price) updates
- **Price History**: Historical price data integration
- **Market Data API**: Configurable price data sources

### **Filtering & Search**
- **Global Date Filters**: Application-wide date range filtering
- **Advanced Search**: Multi-criteria search and filtering
- **Custom Views**: Save and restore custom filter configurations
- **Quick Filters**: One-click common filter presets

---

## 🎨 **UI/UX Features**

### **Responsive Design**
- **Mobile Optimized**: Full functionality on mobile devices
- **Tablet Support**: Optimized layouts for tablet screens
- **Desktop Experience**: Rich desktop interface with advanced features

### **Accessibility**
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and semantic HTML
- **High Contrast**: Support for high contrast themes
- **Font Scaling**: Responsive typography and scaling

### **Theming**
- **Dark/Light Mode**: Automatic and manual theme switching
- **Custom Themes**: Configurable color schemes
- **Animation Controls**: Customizable animation preferences

---

## 🚀 **Performance Optimizations**

### **Rendering Optimizations**
- **React.memo**: Optimized component re-rendering
- **useMemo/useCallback**: Memoized calculations and functions
- **Virtual Scrolling**: Efficient handling of large datasets
- **Lazy Loading**: On-demand component loading

### **Data Management**
- **Local Storage**: Efficient client-side data persistence
- **Debounced Updates**: Optimized user input handling
- **Batch Operations**: Efficient bulk data operations
- **Memory Management**: Optimized memory usage patterns

---

## 📈 **Analytics Capabilities**

### **Trade Analysis**
- **Performance Attribution**: Identify top-performing strategies
- **Sector Analysis**: Performance breakdown by industry
- **Time-based Analysis**: Performance by time periods
- **Strategy Effectiveness**: Compare different trading approaches

### **Risk Analysis**
- **Drawdown Analysis**: Detailed drawdown periods and recovery
- **Correlation Analysis**: Position correlation and diversification
- **Volatility Metrics**: Risk-adjusted performance measures
- **Stress Testing**: Portfolio performance under various scenarios

### **Reporting**
- **Monthly Reports**: Comprehensive monthly performance summaries
- **Tax Reports**: Tax-optimized reporting with accounting method support
- **Custom Reports**: Configurable report generation
- **Export Options**: Multiple export formats for external analysis

---

## 🔒 **Data Privacy & Security**

### **Local Storage**
- **No External Dependencies**: All data stored locally in your browser
- **Privacy First**: No data transmitted to external servers
- **User Control**: Complete control over your trading data
- **Backup Options**: Manual backup and restore capabilities

### **Data Integrity**
- **Validation**: Comprehensive data validation and error checking
- **Consistency**: Automatic data consistency maintenance
- **Recovery**: Built-in data recovery mechanisms
- **Versioning**: Data format versioning for future compatibility

---

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Development Setup**
```bash
# Fork and clone the repository
git clone https://github.com/your-username/trading-journal-dashboard.git

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **HeroUI Team** - For the excellent component library
- **React Team** - For the amazing React framework
- **TypeScript Team** - For type-safe development
- **Vite Team** - For the lightning-fast build tool
- **Trading Community** - For feedback and feature requests

---

## 📞 **Support & Contact**

- **Documentation**: [Technical Architecture](TECHNICAL_ARCHITECTURE.md)
- **Issues**: [GitHub Issues](https://github.com/your-username/trading-journal-dashboard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/trading-journal-dashboard/discussions)

---

**Built with ❤️ for traders, by traders.**
