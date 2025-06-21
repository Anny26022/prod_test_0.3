import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Chip
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTruePortfolio } from '../utils/TruePortfolioContext';

interface YearlyStartingCapitalModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const YearlyStartingCapitalModal: React.FC<YearlyStartingCapitalModalProps> = ({
  isOpen,
  onOpenChange
}) => {
  const {
    yearlyStartingCapitals,
    setYearlyStartingCapital,
    getYearlyStartingCapital
  } = useTruePortfolio();

  const [newYear, setNewYear] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');

  // Get current year and next year for suggestions
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleAddYear = () => {
    const year = parseInt(newYear);
    const amount = parseFloat(newAmount);

    if (isNaN(year) || isNaN(amount) || year < 2000 || year > 2100 || amount <= 0) {
      alert('Please enter a valid year (2000-2100) and amount (> 0)');
      return;
    }

    setYearlyStartingCapital(year, amount);
    setNewYear('');
    setNewAmount('');
  };

  const handleEditYear = (year: number) => {
    setEditingYear(year);
    setEditingAmount(getYearlyStartingCapital(year).toString());
  };

  const handleSaveEdit = () => {
    if (editingYear === null) return;

    const amount = parseFloat(editingAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount (> 0)');
      return;
    }

    setYearlyStartingCapital(editingYear, amount);
    setEditingYear(null);
    setEditingAmount('');
  };

  const handleCancelEdit = () => {
    setEditingYear(null);
    setEditingAmount('');
  };

  // Sort years in descending order
  const sortedYears = [...yearlyStartingCapitals].sort((a, b) => b.year - a.year);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      scrollBehavior="inside"
      classNames={{
        base: "max-w-[90vw] max-h-[85vh] sm:max-w-lg",
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
                  <Icon icon="lucide:calendar" className="text-primary text-lg" />
                </div>
                <div>
                  <span className="text-lg font-semibold tracking-tight">Yearly Starting Capital</span>
                  <p className="text-xs text-default-500 font-normal mt-0.5">
                    Set starting capital for January of each year
                  </p>
                </div>
              </div>
            </ModalHeader>
            <ModalBody className="p-6 space-y-4">
              <div className="space-y-4">
                {/* Add New Year */}
                <div className="bg-content1/50 rounded-xl p-4 border border-divider/30">
                  <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <Icon icon="lucide:plus-circle" className="w-4 h-4 text-primary" />
                    Add New Year
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-3 items-end">
                    <div>
                      <Input
                        label="Year"
                        placeholder={`${nextYear}`}
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                        type="number"
                        min="2000"
                        max="2100"
                        size="sm"
                        variant="bordered"
                        className="w-full"
                        classNames={{
                          input: "text-center",
                          inputWrapper: "min-w-[100px]"
                        }}
                      />
                    </div>
                    <div>
                      <Input
                        label="Starting Capital"
                        placeholder="100000"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        type="number"
                        min="0"
                        step="1000"
                        size="sm"
                        variant="bordered"
                        className="w-full"
                        startContent={<span className="text-default-400 text-sm">₹</span>}
                      />
                    </div>
                    <div>
                      <Button
                        color="primary"
                        onPress={handleAddYear}
                        isDisabled={!newYear || !newAmount}
                        isIconOnly
                        size="sm"
                        className="w-10 h-10 rounded-lg"
                        aria-label="Add new year"
                      >
                        <Icon icon="lucide:plus" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Existing Years */}
                <div className="bg-content1/50 rounded-xl p-4 border border-divider/30">
                  <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <Icon icon="lucide:calendar-check" className="w-4 h-4 text-success" />
                    Existing Years
                  </h3>
                  {sortedYears.length === 0 ? (
                    <div className="text-center py-6 text-default-500">
                      <Icon icon="lucide:calendar-x" className="text-2xl mb-2 mx-auto opacity-50" />
                      <p className="text-sm">No yearly capitals set</p>
                      <p className="text-xs opacity-70">Add your first year above</p>
                    </div>
                  ) : (
                      <div className="space-y-2">
                        {sortedYears.map((yearData) => (
                          <div
                            key={yearData.year}
                            className="flex items-center justify-between p-4 border border-divider/50 rounded-lg bg-background/50 hover:bg-content1/30 transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                yearData.year === currentYear
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-success/10 text-success'
                              }`}>
                                <Icon icon="lucide:calendar" className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-base">{yearData.year}</span>
                                  {yearData.year === currentYear && (
                                    <Chip size="sm" color="primary" variant="flat" className="text-xs">
                                      Current
                                    </Chip>
                                  )}
                                </div>
                                <p className="text-xs text-default-500">
                                  Updated: {new Date(yearData.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                {editingYear === yearData.year ? (
                                  <Input
                                    value={editingAmount}
                                    onChange={(e) => setEditingAmount(e.target.value)}
                                    type="number"
                                    min="0"
                                    step="1000"
                                    className="w-36"
                                    size="sm"
                                    variant="bordered"
                                    startContent={<span className="text-default-400 text-sm">₹</span>}
                                  />
                                ) : (
                                  <div>
                                    <span className="font-bold text-base text-success-600">
                                      ₹{yearData.startingCapital.toLocaleString()}
                                    </span>
                                    <p className="text-xs text-default-500">Starting Capital</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {editingYear === yearData.year ? (
                                <>
                                  <Button
                                    size="sm"
                                    color="success"
                                    variant="flat"
                                    onPress={handleSaveEdit}
                                    isIconOnly
                                    className="min-w-8 w-8 h-8"
                                  >
                                    <Icon icon="lucide:check" className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    color="danger"
                                    variant="flat"
                                    onPress={handleCancelEdit}
                                    isIconOnly
                                    className="min-w-8 w-8 h-8"
                                  >
                                    <Icon icon="lucide:x" className="w-3 h-3" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="flat"
                                  onPress={() => handleEditYear(yearData.year)}
                                  isIconOnly
                                  className="min-w-8 w-8 h-8"
                                >
                                  <Icon icon="lucide:edit" className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
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
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
