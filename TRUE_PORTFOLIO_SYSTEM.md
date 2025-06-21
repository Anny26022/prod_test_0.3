# True Portfolio System

## Overview

The True Portfolio System replaces the old manual monthly portfolio size management with an automated, more accurate approach that calculates portfolio size based on actual cash flows and trading performance.

## How It Works

### Core Formula
```
True Portfolio Size = Starting Capital + Capital Changes + Trading P&L
```

### Monthly Calculation
For each month, the system calculates:

1. **Starting Capital**: 
   - January: User-defined yearly starting capital
   - Other months: Previous month's final capital

2. **Capital Changes**: Net deposits minus withdrawals for the month

3. **Trading P&L**: Sum of all trade profits/losses closed in that month

4. **Final Capital**: Starting Capital + Capital Changes + Trading P&L

### Month-to-Month Flow
- Final capital of each month becomes the starting capital of the next month
- Capital changes (deposits/withdrawals) revise the starting capital for that month
- All calculations are automatic and real-time

## Key Features

### 1. Yearly Starting Capital Management
- Set starting capital for January of each year
- Automatic carry-forward to subsequent months
- Easy management through Portfolio Settings

### 2. Monthly Starting Capital Overrides
- Override starting capital for any specific month
- Edit directly in Monthly Performance table or Portfolio Settings
- Both places stay in perfect sync
- Takes priority over automatic calculations

### 3. Capital Changes Tracking
- Record deposits and withdrawals by month
- Automatic integration into portfolio calculations
- Full history and audit trail
- Edit from Monthly Performance table or Portfolio Settings

### 3. Real-time Calculations
- Portfolio size updates automatically with new trades
- All allocation percentages recalculated instantly
- No manual intervention required

### 4. Backward Compatibility
- Existing trade data works seamlessly
- Gradual migration from old system
- No data loss

## Setup Instructions

### 1. Database Setup
Run the SQL script `supabase_true_portfolio_setup.sql` in your Supabase SQL editor to create the required tables.

### 2. Initial Configuration
1. Open the app - you'll see a setup modal
2. Enter your starting capital for the current year
3. The system will automatically calculate portfolio sizes going forward

### 3. Adding Historical Data
1. Go to Portfolio Settings → Yearly Starting Capital
2. Add starting capitals for previous years
3. Add any capital changes (deposits/withdrawals) through Capital Changes tab

## Migration from Old System

If you have existing monthly portfolio sizes, you can migrate them:

1. Use the `migrate_to_true_portfolio.sql` script as a reference
2. Extract January values from each year as yearly starting capitals
3. Convert mid-year portfolio changes to capital changes entries

## Benefits

### 1. Accuracy
- Portfolio size reflects actual cash position
- Accounts for all money in/out movements
- Eliminates manual errors

### 2. Automation
- No need to manually update portfolio sizes
- Calculations happen in real-time
- Consistent across all analytics

### 3. Transparency
- Clear audit trail of all capital movements
- Easy to understand and verify
- Professional-grade portfolio tracking

### 4. Flexibility
- Easy to add/modify capital changes
- Supports complex cash flow scenarios
- Scales with portfolio growth

## Technical Implementation

### Database Tables
- `yearly_starting_capitals`: Stores January starting capital for each year
- `capital_changes`: Stores all deposits and withdrawals

### Context System
- `TruePortfolioContext`: Main context for portfolio calculations
- `useTruePortfolioWithTrades`: Hook that integrates trades data
- Automatic memoization for performance

### UI Components
- `YearlyStartingCapitalModal`: Manage yearly starting capitals
- `TruePortfolioSetup`: Initial setup wizard
- Updated Portfolio Settings with new tabs

## Troubleshooting

### Common Issues

1. **"No yearly starting capital set"**
   - Solution: Set starting capital for the relevant year in Portfolio Settings

2. **Portfolio size seems incorrect**
   - Check yearly starting capital is set correctly
   - Verify capital changes are recorded properly
   - Ensure trades have correct dates

3. **Migration from old system**
   - Use the migration script as a reference
   - Manually verify a few months after migration
   - Contact support if calculations don't match

### Support
For issues or questions about the True Portfolio System, check the console for error messages and ensure all required Supabase tables are created correctly.
