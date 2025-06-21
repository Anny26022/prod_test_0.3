import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
  Tooltip,
  Tabs,
  Tab,
  Chip,
  Switch,
  Card,
  CardBody
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { useTruePortfolio } from "../utils/TruePortfolioContext";
import { YearlyStartingCapitalModal } from "./YearlyStartingCapitalModal";
import { generateId } from "../utils/helpers";
import { useTrades } from "../hooks/use-trades";
import { useMilestones } from "../hooks/use-milestones";
import { useAccountingMethod } from "../context/AccountingMethodContext";
import "../styles/smooth-animations.css";

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const currentYear = new Date().getFullYear();
const startYear = 2000;
const endYear = currentYear + 1; // Allow selecting up to one year in the future
const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userName: string;
  setUserName: (name: string) => void;
  isFullWidthEnabled: boolean;
  setIsFullWidthEnabled: (enabled: boolean) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onOpenChange, userName, setUserName, isFullWidthEnabled, setIsFullWidthEnabled }) => {
  const {
    yearlyStartingCapitals,
    setYearlyStartingCapital,
    getYearlyStartingCapital,
    monthlyStartingCapitalOverrides,
    setMonthlyStartingCapitalOverride,
    removeMonthlyStartingCapitalOverride,
    getMonthlyStartingCapitalOverride,
    capitalChanges,
    addCapitalChange,
    updateCapitalChange,
    deleteCapitalChange,
    portfolioSize
  } = useTruePortfolio();

  const { trades } = useTrades();
  const { achievedMilestones, ALL_MILESTONES } = useMilestones();
  const { accountingMethod, setAccountingMethod } = useAccountingMethod();
  
  const [selectedTab, setSelectedTab] = useState('yearly');
  const [isYearlyCapitalModalOpen, setIsYearlyCapitalModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editingCell, setEditingCell] = useState<{month: string, year: number} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newCapitalAmount, setNewCapitalAmount] = useState('');
  const [newCapitalType, setNewCapitalType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [newCapitalDescription, setNewCapitalDescription] = useState('');

  // Monthly overrides state
  const [overrideMonth, setOverrideMonth] = useState(months[new Date().getMonth()]);
  const [overrideYear, setOverrideYear] = useState(currentYear);
  const [overrideAmount, setOverrideAmount] = useState('');

  const handleAddCapitalChange = () => {
    const amount = parseFloat(newCapitalAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const monthIndex = months.indexOf(selectedMonth);
    const date = new Date(selectedYear, monthIndex, 1).toISOString();

    addCapitalChange({
      amount: newCapitalType === 'deposit' ? amount : -amount,
      type: newCapitalType,
      date,
      description: newCapitalDescription || `${newCapitalType === 'deposit' ? 'Deposit' : 'Withdrawal'} for ${selectedMonth} ${selectedYear}`
    });

    setNewCapitalAmount('');
    setNewCapitalDescription('');
  };
  
  const handleEditCapitalChange = (changeId: string) => {
    const change = capitalChanges.find(c => c.id === changeId);
    if (change) {
      const date = new Date(change.date);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      setEditingCell({ month, year });
      setEditValue((change.type === 'deposit' ? change.amount : -change.amount).toString());
    }
  };

  const handleSaveCapitalChange = () => {
    if (!editingCell) return;

    const value = Number(editValue);
    if (isNaN(value)) return;

    const monthIndex = months.indexOf(editingCell.month);
    const date = new Date(editingCell.year, monthIndex, 1).toISOString();

    // Find existing change for this month/year
    const existingChange = capitalChanges.find(change => {
      const changeDate = new Date(change.date);
      return changeDate.getFullYear() === editingCell.year &&
             changeDate.getMonth() === monthIndex;
    });

    if (value === 0) {
      // If value is 0, remove the change if it exists
      if (existingChange) {
        deleteCapitalChange(existingChange.id);
      }
    } else {
      const type = value > 0 ? 'deposit' : 'withdrawal';
      const amount = Math.abs(value);

      if (existingChange) {
        // Update existing change
        updateCapitalChange({
          ...existingChange,
          amount,
          type,
          description: existingChange.description || 'Updated from settings'
        });
      } else {
        // Add new change
        addCapitalChange({
          amount,
          type,
          date,
          description: 'Added from settings'
        });
      }
    }

    setEditingCell(null);
    setEditValue('');
  };

  const handleAddMonthlyOverride = () => {
    const amount = parseFloat(overrideAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setMonthlyStartingCapitalOverride(overrideMonth, overrideYear, amount);
    setOverrideAmount('');
  };

  const handleRemoveMonthlyOverride = (month: string, year: number) => {
    removeMonthlyStartingCapitalOverride(month, year);
  };

  // Memoize sorted arrays to prevent unnecessary re-renders
  const sortedCapitalChanges = React.useMemo(() =>
    [...capitalChanges].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [capitalChanges]
  );

  const sortedYearlyCapitals = React.useMemo(() =>
    [...yearlyStartingCapitals].sort((a, b) => b.year - a.year),
    [yearlyStartingCapitals]
  );

  const sortedMonthlyOverrides = React.useMemo(() =>
    [...monthlyStartingCapitalOverrides].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return months.indexOf(b.month) - months.indexOf(a.month);
    }),
    [monthlyStartingCapitalOverrides, months]
  );

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-w-[90vw] max-h-[85vh] sm:max-w-2xl",
        wrapper: "items-center justify-center p-4",
        body: "overflow-y-auto p-0",
        backdrop: "bg-black/50"
      }}
    >
      <ModalContent className="bg-background/95 backdrop-blur-xl border border-divider/50 shadow-2xl">
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-3 px-6 py-4 border-b border-divider/50 bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon icon="lucide:settings" className="text-primary text-lg" />
                </div>
                <span className="text-lg font-semibold tracking-tight">Portfolio Settings</span>
              </div>
            </ModalHeader>
            <ModalBody className="p-6 space-y-4">
              {/* Feature Development Banner */}
              <Card className="border-warning/50 bg-warning/5">
                <CardBody className="p-3">
                  <div className="flex items-center gap-3">
                    <Icon icon="lucide:construction" className="text-warning w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-warning-700 dark:text-warning-300">
                        Advanced Features Under Development
                      </h3>
                      <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                        Capital Changes, Monthly Overrides, and Milestones features are being enhanced. Basic portfolio settings are fully functional.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
              <div className="bg-content1/50 rounded-xl p-4 border border-divider/30">
                <Input
                  label="Your Name"
                  labelPlacement="outside"
                  placeholder="Enter your name"
                  value={userName}
                  onValueChange={setUserName}
                  className="w-full"
                  size="sm"
                  variant="bordered"
                  startContent={<Icon icon="lucide:user" className="text-default-400 text-base" />}
                />
              </div>
              <div className="bg-content1/50 rounded-xl p-4 border border-divider/30">
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Icon icon="lucide:monitor" className="text-primary text-base" />
                  Display Settings
                </h4>
                <div className="flex items-center justify-between p-3 border border-divider/50 rounded-lg bg-background/50">
                  <div>
                    <p className="font-medium text-sm text-foreground">Full Width Layout</p>
                    <p className="text-xs text-default-500">Expand content to fill screen width</p>
                  </div>
                  <Switch
                    isSelected={isFullWidthEnabled}
                    onValueChange={setIsFullWidthEnabled}
                    size="sm"
                    aria-label="Toggle full width layout"
                  />
                </div>
              </div>

              <div className="bg-content1/50 rounded-xl p-4 border border-divider/30">
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Icon icon="lucide:calculator" className="text-primary text-base" />
                  P&L Accounting Method
                </h4>
                <div className="accounting-method-container flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-divider/50 rounded-lg bg-background/50 gap-3">
                  <div className="flex-1">
                    <AnimatePresence mode="wait">
                      <motion.p
                        className="font-medium text-sm text-foreground"
                        key={accountingMethod}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{
                          duration: 0.15,
                          ease: [0.4, 0, 0.2, 1],
                          type: "tween"
                        }}
                      >
                        {accountingMethod === 'cash' ? 'Cash Basis Accounting' : 'Accrual Basis Accounting'}
                      </motion.p>
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                      <motion.p
                        className="text-xs text-default-500 mt-1"
                        key={`${accountingMethod}-desc`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: 0.05,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        {accountingMethod === 'cash'
                          ? 'P&L attributed to exit dates'
                          : 'P&L attributed to entry dates'
                        }
                      </motion.p>
                    </AnimatePresence>
                    <div className="mt-2 text-xs text-success-600 flex items-center gap-1">
                      <Icon icon="lucide:lightbulb" className="w-3 h-3" />
                      Cash Basis is recommended for most traders
                    </div>
                  </div>
                  <div className="accounting-toggle-wrapper flex items-center justify-center sm:justify-end gap-2 flex-shrink-0">
                    <motion.span
                      className="text-xs font-medium smooth-text-transition gpu-accelerated"
                      animate={{
                        scale: accountingMethod === 'accrual' ? 1.05 : 1,
                        color: accountingMethod === 'accrual' ? '#3b82f6' : '#71717a',
                        fontWeight: accountingMethod === 'accrual' ? 600 : 500
                      }}
                      transition={{
                        duration: 0.2,
                        ease: [0.4, 0, 0.2, 1],
                        type: "tween"
                      }}
                    >
                      Accrual
                    </motion.span>
                    <motion.div
                      whileTap={{ scale: 0.96 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{
                        duration: 0.1,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                      className="switch-press-feedback"
                    >
                      <Switch
                        isSelected={accountingMethod === 'cash'}
                        onValueChange={(isSelected) => {
                          // Add subtle haptic feedback simulation
                          if (navigator.vibrate) {
                            navigator.vibrate(10);
                          }
                          setAccountingMethod(isSelected ? 'cash' : 'accrual');
                        }}
                        color="success"
                        size="sm"
                        thumbIcon={({ isSelected, className }) =>
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={isSelected ? 'cash' : 'accrual'}
                              initial={{ scale: 0, rotate: -90, opacity: 0 }}
                              animate={{ scale: 1, rotate: 0, opacity: 1 }}
                              exit={{ scale: 0, rotate: 90, opacity: 0 }}
                              transition={{
                                duration: 0.2,
                                ease: [0.4, 0, 0.2, 1],
                                type: "tween"
                              }}
                              className="smooth-icon gpu-accelerated"
                            >
                              <Icon
                                icon={isSelected ? "lucide:banknote" : "lucide:calendar-clock"}
                                className={`${className} transition-colors duration-150 ease-out`}
                              />
                            </motion.div>
                          </AnimatePresence>
                        }
                        classNames={{
                          wrapper: "smooth-switch group-data-[selected=true]:bg-success group-data-[selected=false]:bg-default-200",
                          thumb: "smooth-switch-thumb bg-white shadow-lg group-data-[selected=true]:ml-6 group-data-[pressed=true]:w-7 group-data-[selected]:group-data-[pressed]:ml-4",
                          thumbIcon: "text-default-600 group-data-[selected=true]:text-success-600 transition-colors duration-150"
                        }}
                        aria-label="Toggle accounting method"
                      />
                    </motion.div>
                    <motion.span
                      className="text-xs font-medium smooth-text-transition gpu-accelerated"
                      animate={{
                        scale: accountingMethod === 'cash' ? 1.05 : 1,
                        color: accountingMethod === 'cash' ? '#22c55e' : '#71717a',
                        fontWeight: accountingMethod === 'cash' ? 600 : 500
                      }}
                      transition={{
                        duration: 0.2,
                        ease: [0.4, 0, 0.2, 1],
                        type: "tween"
                      }}
                    >
                      Cash
                    </motion.span>
                  </div>
                </div>
              </div>
              <Tabs
                selectedKey={selectedTab}
                onSelectionChange={(key) => {
                  // Only allow selection of "yearly" tab, disable others
                  if (key === "yearly") {
                    setSelectedTab(key as string);
                  }
                }}
                aria-label="Portfolio settings tabs"
                size="sm"
                variant="underlined"
                classNames={{
                  tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider/50",
                  cursor: "w-full bg-primary",
                  tab: "max-w-fit px-0 h-10",
                  tabContent: "group-data-[selected=true]:text-primary text-default-500 font-medium"
                }}
              >
                <Tab key="yearly" title="Yearly Starting Capital">
                  <AnimatePresence mode="wait">
                    {selectedTab === "yearly" && (
                      <motion.div
                        key="yearly-content"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="py-3 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-content1/30 rounded-lg border border-divider/30">
                            <div className="flex-1">
                              <p className="text-xs text-foreground-500">
                                Set starting capital for January of each year
                              </p>
                            </div>
                            <Button
                              color="primary"
                              onPress={() => setIsYearlyCapitalModalOpen(true)}
                              startContent={<Icon icon="lucide:plus" className="w-3 h-3" />}
                              size="sm"
                              variant="flat"
                              className="w-full sm:w-auto flex-shrink-0 text-xs"
                            >
                              Manage Years
                            </Button>
                          </div>

                          {sortedYearlyCapitals.length === 0 ? (
                            <div className="text-center py-6 text-default-500">
                              <Icon icon="lucide:calendar-x" className="text-2xl mb-2 mx-auto opacity-50" />
                              <p className="text-sm">No yearly capitals set</p>
                              <p className="text-xs opacity-70">Click "Manage Years" to start</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {sortedYearlyCapitals.map((yearData) => (
                                <div
                                  key={yearData.year}
                                  className="flex items-center justify-between p-3 border border-divider/50 rounded-lg bg-background/50 hover:bg-content1/30 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                                      <Icon icon="lucide:calendar" className="w-4 h-4 text-success" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-sm text-foreground">{yearData.year}</p>
                                      <p className="text-xs text-default-500">{new Date(yearData.updatedAt).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-sm text-success-600">₹{yearData.startingCapital.toLocaleString()}</p>
                                    <p className="text-xs text-default-500">Starting Capital</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Tab>
                <Tab
                  key="capital"
                  title={
                    <div className="flex items-center gap-2 opacity-75 cursor-not-allowed text-default-600">
                      <span>Capital Changes</span>
                      <Icon icon="lucide:lock" className="w-3 h-3" />
                    </div>
                  }
                  isDisabled={true}
                >
                  <AnimatePresence mode="wait">
                    {selectedTab === "capital" && (
                      <motion.div
                        key="capital-content"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="py-3 space-y-3">
                          <p className="text-xs text-foreground-500 p-3 bg-content1/30 rounded-lg border border-divider/30">
                            Add deposits and withdrawals to track capital changes
                          </p>

                          {/* Add New Capital Change */}
                          <div className="border border-divider/50 rounded-lg p-3 bg-background/50">
                            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                              <Icon icon="lucide:plus-circle" className="w-4 h-4 text-primary" />
                              Add Capital Change
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Select
                                label="Month"
                                selectedKeys={[selectedMonth]}
                                onSelectionChange={(keys) => setSelectedMonth(Array.from(keys)[0] as string)}
                                className="w-full"
                                size="sm"
                                variant="bordered"
                                aria-label="Select month for capital change"
                              >
                                {months.map((month) => (
                                  <SelectItem key={month}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Select
                                label="Year"
                                selectedKeys={[selectedYear.toString()]}
                                onSelectionChange={(keys) => setSelectedYear(parseInt(Array.from(keys)[0] as string))}
                                className="w-full"
                                size="sm"
                                variant="bordered"
                                aria-label="Select year for capital change"
                              >
                                {years.map((year) => (
                                  <SelectItem key={year}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Select
                                label="Capital Type"
                                selectedKeys={[newCapitalType]}
                                onSelectionChange={(keys) => setNewCapitalType(Array.from(keys)[0] as 'deposit' | 'withdrawal')}
                                className="w-full"
                                size="sm"
                                variant="bordered"
                                aria-label="Select capital change type"
                              >
                                <SelectItem key="deposit">Deposit</SelectItem>
                                <SelectItem key="withdrawal">Withdrawal</SelectItem>
                              </Select>
                              <Input
                                label="Description (optional)"
                                placeholder="e.g., Q1 bonus, new investment"
                                value={newCapitalDescription}
                                onValueChange={setNewCapitalDescription}
                                className="w-full"
                                size="sm"
                                variant="bordered"
                              />
                              <Input
                                label="Amount"
                                placeholder="e.g., 100000"
                                value={newCapitalAmount}
                                onValueChange={setNewCapitalAmount}
                                type="number"
                                min="0"
                                step="1000"
                                startContent={<span className="text-default-400 text-lg">₹</span>}
                                className="w-full"
                                size="sm"
                                variant="bordered"
                              />
                              <Button
                                color="primary"
                                onPress={handleAddCapitalChange}
                                isDisabled={isNaN(parseFloat(newCapitalAmount)) || parseFloat(newCapitalAmount) <= 0}
                                startContent={<Icon icon="lucide:plus" />}
                                className="w-full"
                                size="sm"
                              >
                                Add Capital Change
                              </Button>
                            </div>

                            <h4 className="font-semibold text-lg mb-2">Capital Change History</h4>
                            {sortedCapitalChanges.length === 0 ? (
                              <div className="text-center py-8 text-default-500">
                                <Icon icon="lucide:dollar-sign" className="text-4xl mb-2 mx-auto" />
                                <p>No capital changes recorded yet.</p>
                                <p className="text-sm">Add a capital change above.</p>
                              </div>
                            ) : (
                              <Table
                                aria-label="Capital Changes Table"
                                selectionMode="single"
                                // onRowAction={(key) => handleEditCapitalChange(key as string)}
                                classNames={{
                                  wrapper: "min-h-[200px]",
                                  th: "bg-transparent border-b border-divider text-xs font-medium text-default-500 dark:text-default-300 uppercase tracking-wider",
                                  td: "py-2.5 text-sm"
                                }}
                              >
                                <TableHeader>
                                  <TableColumn key="date" allowsSorting={true}>Date</TableColumn>
                                  <TableColumn key="type" allowsSorting={true}>Type</TableColumn>
                                  <TableColumn key="amount" allowsSorting={true}>Amount</TableColumn>
                                  <TableColumn key="description">Description</TableColumn>
                                  <TableColumn key="actions">Actions</TableColumn>
                                </TableHeader>
                                <TableBody items={sortedCapitalChanges}>
                                  {(item) => (
                                    <TableRow key={item.id}>
                                      <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                      <TableCell>
                                        <Chip color={item.type === 'deposit' ? 'success' : 'danger'} size="sm">
                                          {item.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                        </Chip>
                                      </TableCell>
                                      <TableCell>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.amount)}</TableCell>
                                      <TableCell>{item.description}</TableCell>
                                      <TableCell>
                                        <div className="relative flex items-center gap-2">
                                          <Tooltip content="Delete capital change">
                                            <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => deleteCapitalChange(item.id)}>
                                              <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                            </Button>
                                          </Tooltip>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Tab>
                <Tab
                  key="monthly"
                  title={
                    <div className="flex items-center gap-2 opacity-75 cursor-not-allowed text-default-600">
                      <span>Monthly Overrides</span>
                      <Icon icon="lucide:lock" className="w-3 h-3" />
                    </div>
                  }
                  isDisabled={true}
                >
                  <AnimatePresence mode="wait">
                    {selectedTab === "monthly" && (
                      <motion.div
                        key="monthly-content"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="py-4 space-y-4">
                          <p className="text-sm text-foreground-500">
                            Override starting capital for specific months. This allows you to manually set the starting capital for any month, overriding the automatic calculation.
                          </p>

                          {/* Add New Monthly Override */}
                          <div className="border border-divider rounded-lg p-4 bg-default-50 dark:bg-default-100">
                            <h4 className="font-semibold mb-3">Add Monthly Override</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              <Select
                                label="Month"
                                selectedKeys={[overrideMonth]}
                                onSelectionChange={(keys) => setOverrideMonth(Array.from(keys)[0] as string)}
                                className="w-full"
                                size="sm"
                                variant="bordered"
                                aria-label="Select month for override"
                              >
                                {months.map((month) => (
                                  <SelectItem key={month}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Select
                                label="Year"
                                selectedKeys={[overrideYear.toString()]}
                                onSelectionChange={(keys) => setOverrideYear(parseInt(Array.from(keys)[0] as string))}
                                className="w-full"
                                size="sm"
                                variant="bordered"
                                aria-label="Select year for override"
                              >
                                {years.map((year) => (
                                  <SelectItem key={year}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Input
                                label="Starting Capital"
                                type="number"
                                value={overrideAmount}
                                onValueChange={setOverrideAmount}
                                min="0"
                                step="1000"
                                startContent={<span className="text-default-400">₹</span>}
                              />
                              <div className="sm:col-span-2 lg:col-span-3">
                                <Button
                                  color="primary"
                                  onPress={handleAddMonthlyOverride}
                                  isDisabled={!overrideAmount}
                                  startContent={<Icon icon="lucide:calendar-plus" />}
                                >
                                  Set Monthly Override
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Existing Monthly Overrides */}
                          <div>
                            <h4 className="font-semibold mb-3">Monthly Overrides</h4>
                            {sortedMonthlyOverrides.length === 0 ? (
                              <div className="text-center py-8 text-default-500">
                                <Icon icon="lucide:calendar-check" className="text-4xl mb-2 mx-auto" />
                                <p>No monthly overrides set yet.</p>
                                <p className="text-sm">Add an override above to manually set starting capital for specific months.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {sortedMonthlyOverrides.map((override) => (
                                  <div key={override.id} className="flex items-center gap-3 p-3 border border-divider rounded-lg">
                                    <div className="flex-shrink-0">
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
                                        <Icon icon="lucide:calendar" className="w-5 h-5" />
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{override.month} {override.year}</span>
                                        <span className="text-sm px-2 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                                          Override
                                        </span>
                                      </div>
                                      <div className="text-sm text-default-500 mt-1">
                                        Updated: {new Date(override.updatedAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-lg text-primary">
                                        ₹{override.startingCapital.toLocaleString()}
                                      </div>
                                      <div className="flex gap-1 mt-1">
                                        <Button
                                          size="sm"
                                          variant="flat"
                                          color="danger"
                                          onPress={() => handleRemoveMonthlyOverride(override.month, override.year)}
                                          startContent={<Icon icon="lucide:trash" className="w-3 h-3" />}
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Tab>
                <Tab
                  key="milestones"
                  title={
                    <div className="flex items-center gap-2 opacity-75 cursor-not-allowed text-default-600">
                      <span>Milestones</span>
                      <Icon icon="lucide:lock" className="w-3 h-3" />
                    </div>
                  }
                  isDisabled={true}
                >
                  <AnimatePresence mode="wait">
                    {selectedTab === "milestones" && (
                      <motion.div
                        key="milestones-content"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="py-3 space-y-3">
                          <p className="text-xs text-foreground-500 p-3 bg-content1/30 rounded-lg border border-divider/30">
                            Track your progress and celebrate achievements
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {ALL_MILESTONES.map((milestone) => {
                              const isAchieved = achievedMilestones.some(a => a.id === milestone.id);
                              const achievedAt = isAchieved
                                ? new Date(achievedMilestones.find(a => a.id === milestone.id)?.achievedAt || '').toLocaleDateString()
                                : null;
                              return (
                                <div
                                  key={milestone.id}
                                  className={`p-3 border rounded-lg flex items-center gap-3 transition-colors ${isAchieved
                                    ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
                                    : 'bg-background/50 border-divider/50 hover:bg-content1/30'
                                  }`}
                                >
                                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isAchieved
                                      ? 'bg-success-200 text-success-800 dark:bg-success-800 dark:text-success-200'
                                      : 'bg-default-200 text-default-600 dark:bg-default-700 dark:text-default-300'
                                    }`}
                                  >
                                    <Icon icon={milestone.icon} className="w-3 h-3" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className={`font-medium text-xs ${isAchieved ? 'text-success-800 dark:text-success-200' : 'text-foreground'}`}>
                                      {milestone.name}
                                    </h4>
                                    <p className={`text-xs mt-0.5 ${isAchieved ? 'text-success-700 dark:text-success-300' : 'text-default-500'}`}>
                                      {milestone.description}
                                    </p>
                                    {isAchieved && (
                                      <p className="text-xs text-default-400 mt-1">
                                        {achievedAt}
                                      </p>
                                    )}
                                  </div>
                                  {isAchieved && (
                                    <Icon icon="lucide:check-circle" className="w-4 h-4 text-success flex-shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Tab>
              </Tabs>
            </ModalBody>
            <ModalFooter className="flex-shrink-0 border-t border-divider/50 px-6 py-3 bg-gradient-to-r from-background/50 to-content1/30">
              <Button
                variant="flat"
                onPress={onClose}
                size="sm"
                className="w-full sm:w-auto min-w-20"
                startContent={<Icon icon="lucide:x" className="w-3 h-3" />}
              >
                Close
              </Button>
            </ModalFooter>

            {/* Yearly Starting Capital Modal */}
            <YearlyStartingCapitalModal
              isOpen={isYearlyCapitalModalOpen}
              onOpenChange={setIsYearlyCapitalModalOpen}
            />
          </>
        )}
      </ModalContent>
    </Modal>
  );
}; 