export interface Trade {
  id: string;
  tradeNo: string;
  date: string;
  name: string;
  entry: number;
  avgEntry: number;
  sl: number;
  tsl: number;
  buySell: "Buy" | "Sell";
  cmp: number;
  setup: string;
  baseDuration: string;
  initialQty: number;
  pyramid1Price: number;
  pyramid1Qty: number;
  pyramid1Date: string;
  pyramid2Price: number;
  pyramid2Qty: number;
  pyramid2Date: string;
  positionSize: number;
  allocation: number;
  slPercent: number;
  exit1Price: number;
  exit1Qty: number;
  exit1Date: string;
  exit2Price: number;
  exit2Qty: number;
  exit2Date: string;
  exit3Price: number;
  exit3Qty: number;
  exit3Date: string;
  openQty: number;
  exitedQty: number;
  avgExitPrice: number;
  stockMove: number;
  rewardRisk: number;
  holdingDays: number;
  positionStatus: "Open" | "Closed" | "Partial";
  realisedAmount: number;
  plRs: number;
  pfImpact: number;
  cummPf: number;
  planFollowed: boolean;
  exitTrigger: string;
  proficiencyGrowthAreas: string;
  sector?: string;
  openHeat: number;
  notes?: string;

  // Accounting method specific fields
  entryDate?: string;  // For accrual basis - when trade was initiated
  exitDate?: string;   // For cash basis - when trade was closed
  r?: number;          // Risk-reward ratio
  _cashBasisExit?: {   // Cash basis specific exit information
    date: string;
    price: number;
    qty: number;
  };

  // Cached accounting values for performance optimization
  _accrualPL?: number;      // Cached accrual basis P/L
  _cashPL?: number;         // Cached cash basis P/L
  _accrualPfImpact?: number; // Cached accrual basis portfolio impact
  _cashPfImpact?: number;    // Cached cash basis portfolio impact

  // CMP fetching status
  _cmpAutoFetched?: boolean; // True if CMP was auto-fetched, false if manually entered

  // Bulk import optimization flag
  _needsRecalculation?: boolean; // True if trade was imported with skipped calculations

  // User edit tracking - fields that have been manually edited by user
  _userEditedFields?: string[]; // Array of field names that user has manually edited

  // Cash basis display grouping - stores expanded trades for backend calculations
  _expandedTrades?: Trade[]; // Array of expanded trades for cash basis calculations

  // Chart attachments - NEW FEATURE
  chartAttachments?: TradeChartAttachments;
}

// Chart attachment interfaces
export interface TradeChartAttachments {
  beforeEntry?: ChartImage;
  afterExit?: ChartImage;
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    totalSize: number; // Total size in bytes for both images
  };
}

export interface ChartImage {
  id: string;
  filename: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  size: number; // Size in bytes
  uploadedAt: Date;
  // Storage strategy - either inline base64 or separate blob reference
  storage: 'inline' | 'blob';
  // For inline storage (small images < 50KB)
  data?: string; // Base64 encoded image data
  // For blob storage (larger images)
  blobId?: string; // Reference to separate blob storage
  // Image metadata
  dimensions?: {
    width: number;
    height: number;
  };
  compressed?: boolean; // Whether image was compressed
  originalSize?: number; // Original size before compression
}

export interface CapitalChange {
  id: string;
  date: string;
  amount: number;  // Positive for deposits, negative for withdrawals
  type: 'deposit' | 'withdrawal';
  description: string;
}

export interface MonthlyCapital {
  month: string;
  year: number;
  startingCapital: number;
  deposits: number;
  withdrawals: number;
  pl: number;
  finalCapital: number;
}

export interface MonthlyCapitalHistory {
  month: string; // e.g. 'Jan'
  year: number;
  startingCapital: number;
}
