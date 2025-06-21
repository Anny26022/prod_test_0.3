# True Portfolio System Setup Instructions

## Quick Setup Guide

### 1. Database Setup (Required for persistence)

**Option A: Run SQL Script in Supabase**
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase_true_portfolio_setup.sql`
4. Click "Run" to create the required tables

**Option B: Manual Table Creation**
If you prefer to create tables manually, create these two tables:

```sql
-- Table 1: yearly_starting_capitals
CREATE TABLE yearly_starting_capitals (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    capitals JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: capital_changes
CREATE TABLE capital_changes (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    changes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. First Time App Usage

1. **Open the app** - You'll see a welcome setup modal
2. **Enter your starting capital** for the current year (e.g., 2024)
3. **Click "Set Up Portfolio"** - The modal will close and won't show again
4. **Your portfolio system is now active!**

### 3. Adding Historical Data (Optional)

If you have historical trading data:

1. Go to **Portfolio Settings** (profile icon in top right)
2. Click **"Yearly Starting Capital"** tab
3. Click **"Manage Years"** to add previous years
4. Add starting capital for each year you traded
5. Go to **"Capital Changes"** tab to add any deposits/withdrawals

### 4. Verification

Check that everything is working:

1. **Portfolio Size**: Should show your current calculated portfolio size
2. **Monthly Performance**: Should show correct starting capitals and calculations
3. **Trade Allocations**: Should use the true portfolio size for allocation percentages

## Troubleshooting

### Setup Modal Keeps Appearing
- **Cause**: Database tables not created or data not saving
- **Solution**: Run the SQL setup script in Supabase
- **Temporary Fix**: Data is saved to localStorage as backup

### Portfolio Size Shows 100,000 (Default)
- **Cause**: No yearly starting capital set
- **Solution**: Set your starting capital in Portfolio Settings → Yearly Starting Capital

### Capital Changes Not Saving
- **Cause**: Database connection issue
- **Solution**: Check Supabase connection and run setup script
- **Note**: Data is backed up to localStorage automatically

### Console Errors About Missing Tables
- **Cause**: Supabase tables not created
- **Solution**: Run the `supabase_true_portfolio_setup.sql` script

## Features Overview

### ✅ What's Working Now:
- **Automatic Portfolio Calculation**: Based on starting capital + deposits/withdrawals + trading P&L
- **Manual Starting Capital Override**: Edit starting capital for any month directly in Monthly Performance table
- **Real-time Updates**: All components sync automatically
- **Persistent Storage**: Data saved to Supabase + localStorage backup
- **Setup Wizard**: Guides new users through initial setup
- **Historical Support**: Add data for previous years

### 🎯 Key Benefits:
- **Accuracy**: Portfolio size reflects true cash position
- **Automation**: No manual monthly portfolio size updates
- **Transparency**: Clear audit trail of all capital movements
- **Consistency**: Same calculation logic across all features

## Support

If you encounter issues:

1. **Check Browser Console**: Look for error messages (F12 → Console)
2. **Verify Database**: Ensure Supabase tables are created
3. **Test Setup**: Use the debug panel if available
4. **Fallback**: Data is saved to localStorage even if Supabase fails

The system is designed to work even if Supabase is not set up initially, using localStorage as a backup until the database is configured.
