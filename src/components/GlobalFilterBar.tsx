import React from "react";
import { useGlobalFilter } from "../context/GlobalFilterContext";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTrades } from "../hooks/use-trades";
import { useAccountingMethod } from "../context/AccountingMethodContext";

const filterOptions = [
  { key: "all", label: "All Time" },
  { key: "week", label: "Past 1 Week" },
  { key: "month", label: "Past 1 Month" },
  { key: "fy", label: "This FY" },
  { key: "cy", label: "This CY" },
  { key: "pick-month", label: "Pick Month/Year" },
  { key: "custom", label: "Custom Range" },
];

const months = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];
const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

export const GlobalFilterBar: React.FC = () => {
  const { filter, setFilter } = useGlobalFilter();
  const { clearAllTrades } = useTrades();
  const { clearAccountingMethodData } = useAccountingMethod();

  // Comprehensive clear all data handler
  const handleClearAllData = React.useCallback(async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL data including:\n\n' +
      '• All trades and trade data\n' +
      '• Portfolio settings and capital changes\n' +
      '• Custom setups and growth areas\n' +
      '• All cached and backup data\n' +
      '• User preferences and settings\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to continue?'
    );

    if (confirmed) {
      const doubleConfirm = window.confirm(
        '🚨 FINAL CONFIRMATION\n\n' +
        'You are about to delete ALL application data.\n' +
        'This includes everything you have entered.\n\n' +
        'Type "DELETE" in the next prompt to confirm.'
      );

      if (doubleConfirm) {
        const finalConfirm = window.prompt(
          'Type "DELETE" (in capital letters) to confirm deletion of all data:'
        );

        if (finalConfirm === 'DELETE') {
          try {


            // Clear all trades using the hook function (now async)
            await clearAllTrades();

            // Clear accounting method data
            clearAccountingMethodData();

            // Clear all localStorage data comprehensively
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) {
                keysToRemove.push(key);
              }
            }

            // Remove all localStorage keys
            keysToRemove.forEach(key => {
              try {
                localStorage.removeItem(key);

              } catch (error) {
                console.error(`Failed to remove localStorage key ${key}:`, error);
              }
            });

            // Clear all sessionStorage data
            try {
              sessionStorage.clear();
              console.log('🗑️ Cleared all sessionStorage data');
            } catch (error) {
              console.error('❌ Failed to clear sessionStorage:', error);
            }

            // Clear any IndexedDB data if present
            if ('indexedDB' in window) {
              try {
                const dbNames = ['trades', 'portfolio', 'settings', 'cache'];
                dbNames.forEach(dbName => {
                  const deleteReq = indexedDB.deleteDatabase(dbName);
                  deleteReq.onsuccess = () => console.log(`🗑️ Deleted IndexedDB: ${dbName}`);
                  deleteReq.onerror = () => console.log(`⚠️ IndexedDB ${dbName} not found or already deleted`);
                });
              } catch (error) {
                console.error('❌ Error clearing IndexedDB:', error);
              }
            }

            console.log('✅ Comprehensive data clearing completed');

            // Show success message and reload
            alert('✅ All data has been successfully cleared!\n\nThe page will now reload to reset the application.');

            // Force reload to reset all state
            window.location.reload();

          } catch (error) {
            console.error('💥 Error during data clearing:', error);
            alert('❌ An error occurred while clearing data. Please try again or refresh the page manually.');
          }
        } else {
          alert('❌ Deletion cancelled. You must type "DELETE" exactly to confirm.');
        }
      }
    }
  }, [clearAllTrades, clearAccountingMethodData]);

  return (
    <div className="flex items-center gap-4 p-4 border-b border-divider bg-background/80">
      <Dropdown>
        <DropdownTrigger>
          <Button variant="flat" className="font-medium">
            {filterOptions.find(opt => opt.key === filter.type)?.label || "All Time"}
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Global Filter"
          selectionMode="single"
          selectedKeys={[filter.type === "month" ? "pick-month" : filter.type === "custom" ? "custom" : filter.type]}
          onSelectionChange={keys => {
            const selected = Array.from(keys)[0] as string;
            if (selected === "pick-month") {
              setFilter({ type: "month", month: new Date().getMonth(), year: new Date().getFullYear() });
            } else if (selected === "custom") {
              setFilter({ type: "custom", startDate: new Date(), endDate: new Date() });
            } else {
              setFilter({ type: selected as any });
            }
          }}
        >
          {filterOptions.map(opt => (
            <DropdownItem key={opt.key}>{opt.label}</DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
      {/* Month/Year Picker */}
      {filter.type === "month" && (
        <>
          <Dropdown>
            <DropdownTrigger>
              <Button variant="flat">
                {months[filter.month ?? new Date().getMonth()]}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Select Month"
              selectionMode="single"
              selectedKeys={[String(filter.month ?? new Date().getMonth())]}
              onSelectionChange={keys => {
                const monthIdx = Number(Array.from(keys)[0]);
                setFilter(f => ({ ...f, type: "month", month: monthIdx }));
              }}
            >
              {months.map((m, idx) => (
                <DropdownItem key={idx}>{m}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
          <Dropdown>
            <DropdownTrigger>
              <Button variant="flat">
                {filter.year ?? new Date().getFullYear()}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Select Year"
              selectionMode="single"
              selectedKeys={[String(filter.year ?? new Date().getFullYear())]}
              onSelectionChange={keys => {
                const year = Number(Array.from(keys)[0]);
                setFilter(f => ({ ...f, type: "month", year }));
              }}
            >
              {years.map(y => (
                <DropdownItem key={y}>{y}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </>
      )}
      {/* Custom Range Picker */}
      {filter.type === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            label="Start Date"
            value={filter.startDate ? new Date(filter.startDate).toISOString().slice(0, 10) : ""}
            onChange={e => {
              const date = e.target.value ? new Date(e.target.value) : undefined;
              setFilter(f => ({ ...f, startDate: date }));
            }}
            size="sm"
          />
          <span>-</span>
          <Input
            type="date"
            label="End Date"
            value={filter.endDate ? new Date(filter.endDate).toISOString().slice(0, 10) : ""}
            onChange={e => {
              const date = e.target.value ? new Date(e.target.value) : undefined;
              setFilter(f => ({ ...f, endDate: date }));
            }}
            size="sm"
          />
        </div>
      )}
      <div className="flex-1" />
      <Dropdown>
        <DropdownTrigger>
          <Button
            isIconOnly
            size="sm"
            variant="bordered"
            className="ml-auto hover:bg-danger/10 transition"
          >
            <Icon icon="lucide:settings" className="text-lg" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Settings options"
          onAction={(key) => {
            if (key === 'clear-all') {
              handleClearAllData();
            }
          }}
        >
          <DropdownItem
            key="clear-all"
            startContent={<Icon icon="lucide:trash-2" />}
            className="text-danger"
            color="danger"
          >
            Clear All Data
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}; 