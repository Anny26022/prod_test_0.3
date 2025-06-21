import React, { useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Button,
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { TaxSummaryChart } from "./tax/tax-summary-chart";
import { TaxMetricsCards } from "./tax/tax-metrics-cards";
import { TaxTable } from "./tax/tax-table";
import { TaxEditModal } from "./tax/tax-edit-modal";
import { useTrades } from "../hooks/use-trades";
import { useAccountingMethod } from "../context/AccountingMethodContext";
import { useGlobalFilter } from "../context/GlobalFilterContext";
import { calculateTradePL } from "../utils/accountingUtils";
// Removed Supabase import - using localStorage only

// Editable Text Component
const EditableText: React.FC<{
  value: string | number;
  onSave: (value: string) => void;
  isEditing: boolean;
  type?: "text" | "number";
  className?: string;
  prefix?: string;
}> = ({ value, onSave, isEditing, type = "text", className = "", prefix = "" }) => {
  const [editValue, setEditValue] = React.useState(value.toString());
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    onSave(editValue);
  };

  if (!isEditing) {
    return (
      <motion.span 
        className={`inline-block ${className}`}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.02 }}
      >
        {prefix}{value}
      </motion.span>
    );
  }

  return (
    <Input
      ref={inputRef}
      type={type}
      value={editValue}
      onValueChange={setEditValue}
      onBlur={handleBlur}
      size="sm"
      variant="bordered"
      className={`max-w-[120px] ${className}`}
      classNames={{
        input: "text-right",
        inputWrapper: "h-8 min-h-unit-8"
      }}
      startContent={prefix ? <span className="text-default-400">{prefix}</span> : undefined}
    />
  );
};

// IndexedDB helpers using Dexie
import { DatabaseService } from '../db/database';

async function fetchTaxData(year: number) {
  try {
    const taxRecord = await DatabaseService.getTaxData(year);
    return taxRecord ? taxRecord.data : {};
  } catch (error) {
    console.error('❌ Error fetching tax data from IndexedDB:', error);
    return {};
  }
}

async function saveTaxData(year: number, taxData: any): Promise<boolean> {
  try {
    return await DatabaseService.saveTaxData(year, taxData);
  } catch (error) {
    console.error('❌ IndexedDB save error:', error);
    return false;
  }
}

async function fetchCommentaryData(year: string) {
  try {
    const commentaryRecord = await DatabaseService.getCommentaryData(year);
    return commentaryRecord ? commentaryRecord.data : {};
  } catch (error) {
    console.error('❌ Error fetching commentary data from IndexedDB:', error);
    return {};
  }
}

async function saveCommentaryData(year: string, commentaryData: any): Promise<boolean> {
  try {
    return await DatabaseService.saveCommentaryData(year, commentaryData);
  } catch (error) {
    console.error('❌ IndexedDB commentary save error:', error);
    return false;
  }
}

export const TaxAnalytics: React.FC = () => {
  const { trades } = useTrades(); // This now returns filtered trades based on global filter and accounting method
  const { accountingMethod } = useAccountingMethod();
  const { filter } = useGlobalFilter();
  const useCashBasis = accountingMethod === 'cash';

  // Note: trades are now pre-filtered by global filter and accounting method from useTrades()
  // Get all unique years from filtered trades for year selector (if needed for additional filtering)
  const tradeYears = Array.from(new Set(trades.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a);
  const defaultYear = tradeYears.length > 0 ? String(tradeYears[0]) : String(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = React.useState(defaultYear);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState<string | null>(null);
  const [isDrawdownModalOpen, setIsDrawdownModalOpen] = React.useState(false);
  const [customCommentary, setCustomCommentary] = React.useState<{ [key: string]: string }>({});
  const [editingCommentary, setEditingCommentary] = React.useState<string | null>(null);
  const monthOrder = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  // Function to handle commentary editing
  const handleCommentaryEdit = (tradeKey: string) => {
    setEditingCommentary(tradeKey);
  };

  // Function to save commentary updates
  const handleCommentarySave = (tradeKey: string, newCommentary: string) => {
    setCustomCommentary(prev => ({
      ...prev,
      [tradeKey]: newCommentary
    }));
    setEditingCommentary(null);
  };
  const [taxesByMonth, setTaxesByMonth] = React.useState<{ [month: string]: number }>({});
  
  // Function to load tax data for the selected year
  const loadTaxData = useCallback(async () => {
    try {
      const yearData = await fetchTaxData(selectedYear);
      if (Object.keys(yearData).length > 0) {
        setTaxesByMonth(prev => ({ ...prev, ...yearData }));
      } else {
        const initialData: { [month: string]: number } = {};
        monthOrder.forEach(month => { initialData[month] = 0; });
        setTaxesByMonth(initialData);
      }
    } catch (error) {
      console.error('❌ Failed to load tax data:', error);
    }
  }, [selectedYear]);

  // Function to load commentary data for the selected year
  const loadCommentaryData = useCallback(async () => {
    try {
      const commentaryData = await fetchCommentaryData(selectedYear);
      if (Object.keys(commentaryData).length > 0) {
        setCustomCommentary(commentaryData);
      } else {
        setCustomCommentary({});
      }
    } catch (error) {
      console.error('❌ Failed to load commentary data:', error);
    }
  }, [selectedYear]);

  // Load tax and commentary data on mount and when selectedYear changes
  React.useEffect(() => {
    loadTaxData();
    loadCommentaryData();

    // Note: IndexedDB doesn't have storage events like localStorage
    // Data synchronization would need to be handled differently if needed
  }, [loadTaxData, loadCommentaryData]);
  
  // Save tax data to IndexedDB when it changes
  React.useEffect(() => {
    if (Object.keys(taxesByMonth).length > 0 && selectedYear) {
      saveTaxData(selectedYear, taxesByMonth).then(success => {
        console.log(`📊 [TaxAnalytics] Tax data save ${success ? 'successful' : 'failed'}`);
      });
    }
  }, [taxesByMonth, selectedYear]);

  // Save commentary data to IndexedDB when it changes
  React.useEffect(() => {
    if (Object.keys(customCommentary).length > 0 && selectedYear) {
      saveCommentaryData(selectedYear, customCommentary).then(success => {
        console.log(` [TaxAnalytics] Commentary data save ${success ? 'successful' : 'failed'}`);
      });
    }
  }, [customCommentary, selectedYear]);
  
  // Initialize months with 0 if they don't exist
  React.useEffect(() => {
    const initial: { [month: string]: number } = {};
    let needsUpdate = false;
    
    monthOrder.forEach(month => {
      if (!(month in taxesByMonth)) {
        initial[month] = 0;
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
      setTaxesByMonth(prev => ({ ...initial, ...prev }));
    }
  }, [trades, taxesByMonth]);

  let tradesForYear = trades.filter(t => t.date.startsWith(selectedYear));

  // For cash basis, deduplicate trades to avoid double counting
  if (useCashBasis) {
    const seenTradeIds = new Set();
    tradesForYear = tradesForYear.filter(trade => {
      const originalId = trade.id.split('_exit_')[0];
      if (seenTradeIds.has(originalId)) return false;
      seenTradeIds.add(originalId);
      return true;
    });
  }

  const closedTrades = tradesForYear
    .filter(t => t.positionStatus === "Closed" || t.positionStatus === "Partial")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const cummPfs = closedTrades.map(t => t.cummPf).filter(v => typeof v === 'number' && !isNaN(v));

  // Create detailed drawdown breakdown for the modal - accounting aware
  const drawdownBreakdown = React.useMemo(() => {
    if (closedTrades.length === 0) return [];

    let runningMax = closedTrades[0].cummPf || 0;
    let maxDrawdown = 0;
    let previousPF = 0;

    return closedTrades.map((trade, index) => {
      const currentPF = trade.cummPf || 0;

      // Calculate accounting-aware P/L for this trade
      const accountingAwarePL = calculateTradePL(trade, useCashBasis);

      // Calculate stock-level PF impact (individual trade's impact on portfolio %)
      const stockPFImpact = trade.pfImpact || 0; // This should be the individual trade's PF impact

      // Check if this is a new peak
      const isNewPeak = currentPF > runningMax;

      // Update running max
      if (currentPF > runningMax) {
        runningMax = currentPF;
      }

      // Calculate drawdown from peak as absolute percentage points down from peak
      const drawdownFromPeak = runningMax > 0 ? runningMax - currentPF : 0;

      // Track maximum drawdown (convert to percentage for comparison)
      const drawdownPercentage = runningMax > 0 ? (drawdownFromPeak / runningMax) * 100 : 0;
      if (drawdownPercentage > maxDrawdown) {
        maxDrawdown = drawdownPercentage;
      }

      // Generate system commentary
      let commentary = "";
      let commentaryType = "neutral";

      if (index === 0) {
        commentary = "DD started";
        commentaryType = "start";
      } else if (isNewPeak) {
        commentary = `Touching new peak equity highs`;
        commentaryType = "peak";
      } else if (drawdownFromPeak === 0 && previousPF < runningMax) {
        const recoveryAmount = Math.abs(runningMax - previousPF);
        commentary = `Recovery of ${recoveryAmount.toFixed(2)} from dd low of ${runningMax.toFixed(2)}`;
        commentaryType = "recovery";
      } else if (drawdownFromPeak > 0 && drawdownFromPeak < 5) {
        commentary = `DD going on`;
        commentaryType = "mild";
      } else if (drawdownFromPeak >= 5 && drawdownFromPeak < 15) {
        commentary = `DD in full force (MODERATE DD)`;
        commentaryType = "moderate";
      } else if (drawdownFromPeak >= 15) {
        commentary = `DD in full force (SEVERE DD - RECORD DD IN ${selectedYear})`;
        commentaryType = "severe";
      }

      // Add specific movement details
      if (index > 0) {
        const move = currentPF - previousPF;
        if (Math.abs(move) > 0.5) {
          if (move > 0) {
            commentary += ` • Portfolio up ${move.toFixed(2)}%`;
          } else {
            commentary += ` • Portfolio down ${Math.abs(move).toFixed(2)}%`;
          }
        }
      }

      // Get the appropriate date based on accounting method
      const displayDate = useCashBasis ?
        (trade.exit1Date || trade.exit2Date || trade.exit3Date || trade.date) :
        trade.date;

      // Create unique key for this trade
      const tradeKey = `${displayDate}-${trade.name}-${index}`;

      // Use custom commentary if available, otherwise use system commentary
      const finalCommentary = customCommentary[tradeKey] || commentary || 'No commentary';
      const finalCommentaryType = customCommentary[tradeKey] ? 'custom' : (commentaryType || 'neutral');

      previousPF = currentPF;

      return {
        date: displayDate,
        symbol: trade.name || 'Unknown',
        stockPFImpact: stockPFImpact, // Portfolio % impact of this trade
        cummPFImpact: currentPF, // Cumulative portfolio %
        drawdownFromPeak: drawdownFromPeak, // Portfolio % down from peak
        isNewPeak: isNewPeak,
        commentary: finalCommentary,
        systemCommentary: commentary || 'No commentary',
        commentaryType: finalCommentaryType,
        tradeKey: tradeKey,
        accountingMethod: useCashBasis ? 'Cash' : 'Accrual'
      };
    });
  }, [closedTrades, useCashBasis, selectedYear, customCommentary, editingCommentary]);

  let runningMax = cummPfs.length > 0 ? cummPfs[0] : 0;
  let maxDrawdownPoints = 0;
  cummPfs.forEach(pf => {
    if (pf > runningMax) runningMax = pf;
    // Calculate drawdown as percentage points down from peak
    if (runningMax > 0) {
      const ddPoints = runningMax - pf;
      if (ddPoints > maxDrawdownPoints) maxDrawdownPoints = ddPoints;
    }
  });
  const drawdown = maxDrawdownPoints;
  const maxCummPF = cummPfs.length ? Math.max(...cummPfs) : 0;
  const minCummPF = cummPfs.length ? Math.min(...cummPfs) : 0;
  // Calculate total gross P/L using the same approach as trade journal for consistency
  let totalGrossPL = 0;
  if (useCashBasis) {
    // For cash basis: Use expanded trades to get accurate P/L calculation
    const allTradesForYear = trades.filter(t => t.date.startsWith(selectedYear));
    const expandedTrades = allTradesForYear.flatMap(trade =>
      Array.isArray(trade._expandedTrades)
        ? trade._expandedTrades.filter(t => t._cashBasisExit)
        : (trade._cashBasisExit ? [trade] : [])
    );
    totalGrossPL = expandedTrades.reduce((sum, t) => sum + calculateTradePL(t, useCashBasis), 0);
  } else {
    // For accrual basis: Use deduplicated trades
    totalGrossPL = tradesForYear.reduce((sum, t) => sum + calculateTradePL(t, useCashBasis), 0);
  }
  const totalTaxes = monthOrder.reduce((sum, m) => sum + (taxesByMonth[m] || 0), 0);
  const totalNetPL = totalGrossPL - totalTaxes;
  const formatCurrency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const formatPercent = (value: number) => value.toFixed(2) + "%";

  return (
    <div className="space-y-6">
      <motion.div 
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="light"
                endContent={<Icon icon="lucide:chevron-down" className="text-sm" />}
                size="sm"
                radius="full"
                className="font-medium text-xs h-7 px-3"
              >
                {selectedYear}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Year selection"
              selectionMode="single"
              selectedKeys={[selectedYear]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setSelectedYear(selected);
              }}
            >
              {tradeYears.map((year) => (
                <DropdownItem key={year}>{year}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="light"
            startContent={<Icon icon="lucide:download" className="w-3.5 h-3.5" />}
            size="sm"
            radius="full"
            className="font-medium text-xs h-7 px-3"
          >
            Export
          </Button>
        </div>
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex justify-between items-center">
            <h3 className="text-xl font-semibold tracking-tight">Tax Summary</h3>
            <Tabs 
              aria-label="Chart options" 
              size="sm" 
              color="primary"
              variant="light"
              radius="full"
              classNames={{
                tabList: "gap-2 p-0.5",
                cursor: "bg-primary/20",
                tab: "px-3 py-1 h-7 data-[selected=true]:text-primary font-medium text-xs",
                tabContent: "group-data-[selected=true]:text-primary"
              }}
            >
              <Tab key="gross" title="Gross P/L" />
              <Tab key="net" title="Net P/L" />
              <Tab key="taxes" title="Taxes" />
            </Tabs>
          </CardHeader>
          <Divider />
          <CardBody>
            <TaxSummaryChart taxesByMonth={taxesByMonth} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold tracking-tight">Tax Metrics</h3>
          </CardHeader>
          <Divider />
          <CardBody className="p-6 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-default-600">Max Cumm PF</span>
                  <Tooltip
                    content={
                      <div className="max-w-xs p-2 space-y-2 text-sm">
                        <p className="font-medium text-default-600">Maximum Cumulative Profit Factor</p>
                        <p>The highest point your cumulative profit factor reached during this period.</p>
                        <div className="space-y-1">
                          <p className="font-medium">What it means:</p>
                          <p>• Higher values indicate stronger performance peaks</p>
                          <p>• Shows your best momentum in the market</p>
                          <p>• Helps identify optimal trading conditions</p>
                        </div>
                        <p className="text-xs text-default-400 mt-2">
                          Tip: Use this as a benchmark for your trading potential
                        </p>
                      </div>
                    }
                    placement="right"
                    showArrow
                    classNames={{
                      base: "bg-content1",
                      content: "p-0"
                    }}
                  >
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="min-w-unit-5 w-unit-5 h-unit-5 text-default-400"
                    >
                      <Icon icon="lucide:info" className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                </div>
                <span className="text-[#00B386] font-medium">{maxCummPF.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-default-600">Min Cumm PF</span>
                  <Tooltip
                    content={
                      <div className="max-w-xs p-2 space-y-2 text-sm">
                        <p className="font-medium text-default-600">Minimum Cumulative Profit Factor</p>
                        <p>The lowest point your cumulative profit factor reached during this period.</p>
                        <div className="space-y-1">
                          <p className="font-medium">What it means:</p>
                          <p>• Shows your resilience during tough periods</p>
                          <p>• Helps identify risk management needs</p>
                          <p>• Important for setting stop-loss levels</p>
                        </div>
                        <p className="text-xs text-default-400 mt-2">
                          Tip: Use this to improve your risk management strategy
                        </p>
                      </div>
                    }
                    placement="right"
                    showArrow
                    classNames={{
                      base: "bg-content1",
                      content: "p-0"
                    }}
                  >
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="min-w-unit-5 w-unit-5 h-unit-5 text-default-400"
                    >
                      <Icon icon="lucide:info" className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                </div>
                <span className="text-[#FF3B3B] font-medium">{minCummPF.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-default-600">Drawdown</span>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="min-w-unit-5 w-unit-5 h-unit-5 text-default-400 hover:text-primary transition-colors"
                    onPress={() => setIsDrawdownModalOpen(true)}
                  >
                    <Icon icon="lucide:table" className="w-3 h-3" />
                  </Button>
                </div>
                {drawdown === 0 ? (
                  <span className="text-[#00B386] font-medium flex items-center gap-1">
                    <Icon icon="lucide:rocket" className="w-4 h-4" />
                    Hurray! Flying high
                  </span>
                ) : (
                  <span className="text-[#FF3B3B] font-medium text-sm">{drawdown.toFixed(2)}% OF PF LOST FROM TOP</span>
                )}
              </div>
            </div>

            <Divider className="my-4" />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-default-600">Total Gross P/L</span>
                </div>
                <span className={`font-medium ${totalGrossPL >= 0 ? 'text-[#00B386]' : 'text-[#FF3B3B]'}`}>
                  {formatCurrency(totalGrossPL)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-default-600">Total Taxes</span>
                  <Tooltip
                    content={
                      <div className="max-w-xs text-xs p-1">
                        {totalGrossPL !== 0
                          ? `Taxes are ${((totalTaxes / totalGrossPL) * 100).toFixed(2)}% of Gross P/L.`
                          : `Taxes are 0% of Gross P/L (Total Gross P/L is zero).`
                        }
                      </div>
                    }
                    placement="right"
                    showArrow
                    classNames={{
                      base: "bg-content1",
                      content: "p-0"
                    }}
                  >
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="min-w-unit-5 w-unit-5 h-unit-5 text-default-400"
                    >
                      <Icon icon="lucide:info" className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                </div>
                <span className="text-[#FF3B3B] font-medium">
                  {formatCurrency(totalTaxes)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-default-600">Total Net P/L</span>
                <span className={`font-medium ${totalNetPL >= 0 ? 'text-[#00B386]' : 'text-[#FF3B3B]'}`}>
                  {formatCurrency(totalNetPL)}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold tracking-tight">Monthly Tax Breakdown</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <TaxTable 
            trades={trades}
            taxesByMonth={taxesByMonth}
            setTaxesByMonth={setTaxesByMonth}
          />
        </CardBody>
      </Card>
      <TaxEditModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        month={selectedMonth}
      />

      {/* Drawdown Breakdown Modal */}
      <Modal
        isOpen={isDrawdownModalOpen}
        onOpenChange={setIsDrawdownModalOpen}
        size="3xl"
        scrollBehavior="inside"
        classNames={{
          base: "transform-gpu backdrop-blur-sm",
          wrapper: "transform-gpu",
          backdrop: "bg-black/40",
          closeButton: "text-foreground/60 hover:bg-white/10"
        }}
        backdrop="blur"
      >
        <ModalContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-gray-200 dark:border-gray-700 shadow-2xl max-h-[85vh]">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Icon icon="lucide:trending-down" className="text-primary text-sm" />
                  </div>
                  <div>
                    <span className="text-base font-semibold">Drawdown Breakdown</span>
                    <p className="text-xs text-default-500 mt-0.5">
                      {useCashBasis ? 'Cash Basis' : 'Accrual Basis'} • {selectedYear}
                    </p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="p-4">
                <div className="space-y-3">
                  <div className="p-2 bg-content1/20 rounded-lg border border-divider/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground">
                        {drawdownBreakdown.length} trades • Max DD: <span className="text-danger">{drawdown.toFixed(2)}%</span>
                      </p>
                      <p className="text-xs text-default-500">
                        {useCashBasis ? 'Exit dates' : 'Entry dates'}
                      </p>
                    </div>
                  </div>

                  <Table
                    aria-label="Drawdown breakdown table"
                    classNames={{
                      wrapper: "max-h-[55vh] border border-divider/30 rounded-lg overflow-hidden",
                      table: "border-collapse",
                      th: "bg-content1/50 text-sm font-medium text-default-600 border-b border-divider/30 px-3 py-2.5",
                      td: "py-2.5 px-3 text-sm border-b border-divider/20",
                      tr: "hover:bg-content1/20 transition-colors"
                    }}
                    removeWrapper={false}
                  >
                    <TableHeader>
                      <TableColumn key="date" align="start" width={90}>Date</TableColumn>
                      <TableColumn key="symbol" align="start" width={80}>Symbol</TableColumn>
                      <TableColumn key="stockPF" align="center" width={110}>Stock PF Impact</TableColumn>
                      <TableColumn key="cummPF" align="center" width={110}>Cum PF Impact</TableColumn>
                      <TableColumn key="drawdown" align="center" width={110}>DD From Peak</TableColumn>
                      <TableColumn key="commentary" align="start">Commentary</TableColumn>
                    </TableHeader>
                    <TableBody items={drawdownBreakdown.filter(item => item && item.symbol)}>
                      {(item) => (
                        <TableRow
                          key={`${item.date}-${item.symbol}`}
                          className={`${item.isNewPeak ? "bg-success/10 border-l-4 border-l-success" : "hover:bg-content1/50"} transition-all duration-200`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {item.isNewPeak && (
                                <Icon icon="lucide:crown" className="w-3 h-3 text-warning" />
                              )}
                              <span className="text-sm">{new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm">{item.symbol}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-medium ${item.stockPFImpact >= 0 ? "text-success" : "text-danger"}`}>
                              {item.stockPFImpact >= 0 ? "+" : ""}{item.stockPFImpact.toFixed(2)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-medium">
                              {item.cummPFImpact.toFixed(2)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-medium ${item.drawdownFromPeak > 0 ? "text-danger" : "text-success"}`}>
                              {item.drawdownFromPeak === 0 ? "0.00%" : `-${item.drawdownFromPeak.toFixed(2)}%`}
                            </span>
                          </TableCell>
                          <TableCell>
                            {editingCommentary === item.tradeKey ? (
                              <Input
                                size="sm"
                                value={customCommentary[item.tradeKey] || item.systemCommentary}
                                onValueChange={(value) => setCustomCommentary(prev => ({ ...prev, [item.tradeKey]: value }))}
                                onBlur={() => setEditingCommentary(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setEditingCommentary(null);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingCommentary(null);
                                  }
                                }}
                                variant="bordered"
                                autoFocus
                                classNames={{
                                  input: "text-xs",
                                  inputWrapper: "h-7 min-h-unit-7"
                                }}
                              />
                            ) : (
                              <div
                                className={`text-sm px-2 py-1 rounded font-medium cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all ${
                                  customCommentary[item.tradeKey] ? 'bg-primary/10 text-primary border border-primary/20' :
                                  item.commentaryType === 'peak' ? 'bg-success/10 text-success' :
                                  item.commentaryType === 'recovery' ? 'bg-primary/10 text-primary' :
                                  item.commentaryType === 'mild' ? 'bg-warning/10 text-warning' :
                                  item.commentaryType === 'moderate' ? 'bg-danger/10 text-danger' :
                                  item.commentaryType === 'severe' ? 'bg-danger/20 text-danger' :
                                  'bg-default/10 text-default-600'
                                }`}
                                onClick={() => handleCommentaryEdit(item.tradeKey)}
                                title="Click to edit commentary"
                              >
                                <span className="truncate block max-w-[140px]">{item.commentary}</span>
                                {customCommentary[item.tradeKey] && (
                                  <Icon icon="lucide:edit-3" className="w-3 h-3 ml-1 inline opacity-60" />
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-gray-200 dark:border-gray-700 px-4 py-1.5">
                <Button
                  variant="flat"
                  onPress={onClose}
                  size="sm"
                  className="w-auto px-4 py-1 text-xs h-7"
                  startContent={<Icon icon="lucide:x" className="w-3 h-3" />}
                >
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TaxAnalytics;