import React, { useCallback } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Divider,
  Tabs,
  Tab
} from "@heroui/react";
import { Icon } from "@iconify/react";
// Removed Supabase import - using localStorage only

interface TaxEditModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  month: string | null;
}

// localStorage helpers
function fetchTaxData() {
  try {
    const stored = localStorage.getItem('taxData');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error fetching tax data:', error);
    return {};
  }
}

function saveTaxData(taxData: any) {
  try {
    localStorage.setItem('taxData', JSON.stringify(taxData));
  } catch (error) {
    console.error('localStorage save error:', error);
  }
}

export const TaxEditModal: React.FC<TaxEditModalProps> = ({
  isOpen,
  onOpenChange,
  month
}) => {
  if (!month) return null;
  
  // Unique key for sessionStorage
  const sessionKey = React.useMemo(() => month ? `taxEditModal_${month}` : 'taxEditModal', [month]);

  // Restore form state from sessionStorage if present
  const [grossPL, setGrossPL] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_grossPL');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [taxes, setTaxes] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_taxes');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [stcg, setStcg] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_stcg');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [ltcg, setLtcg] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_ltcg');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [stt, setStt] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_stt');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [stampDuty, setStampDuty] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_stampDuty');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [exchangeCharges, setExchangeCharges] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_exchangeCharges');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [gst, setGst] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_gst');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [sebiCharges, setSebiCharges] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_sebiCharges');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [ipft, setIpft] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_ipft');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const [otherCharges, setOtherCharges] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionKey + '_otherCharges');
      if (saved) return Number(saved);
    }
    return 0;
  });
  const taxBreakupSum = stcg + ltcg + stt + stampDuty + exchangeCharges + gst + sebiCharges + ipft + otherCharges;
  const [taxWarning, setTaxWarning] = React.useState("");

  // Save form state to sessionStorage on change
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_grossPL', String(grossPL));
  }, [grossPL, sessionKey]);
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_taxes', String(taxes));
  }, [taxes, sessionKey]);
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_stcg', String(stcg));
  }, [stcg, sessionKey]);
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_ltcg', String(ltcg));
  }, [ltcg, sessionKey]);
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_stt', String(stt));
  }, [stt, sessionKey]);
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_stampDuty', String(stampDuty));
  }, [stampDuty, sessionKey]);
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_exchangeCharges', String(exchangeCharges));
  }, [exchangeCharges, sessionKey]);
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_gst', String(gst));
  }, [gst, sessionKey]);
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_sebiCharges', String(sebiCharges));
  }, [sebiCharges, sessionKey]);
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_ipft', String(ipft));
  }, [ipft, sessionKey]);
  React.useEffect(() => {
    sessionStorage.setItem(sessionKey + '_otherCharges', String(otherCharges));
  }, [otherCharges, sessionKey]);

  // Clear sessionStorage on close
  React.useEffect(() => {
    if (!isOpen) {
      [
        '_grossPL','_taxes','_stcg','_ltcg','_stt','_stampDuty','_exchangeCharges','_gst','_sebiCharges','_ipft','_otherCharges'
      ].forEach(suffix => sessionStorage.removeItem(sessionKey + suffix));
    }
  }, [isOpen, sessionKey]);
  
  // Save tax data to Supabase when saving changes
  const handleSaveChanges = useCallback(() => {
    if (!month) return;
    // Get the selected year from the URL or use current year as fallback
    const pathParts = window.location.pathname.split('/');
    const yearFromUrl = pathParts[pathParts.length - 1];
    const selectedYear = yearFromUrl && !isNaN(Number(yearFromUrl)) ? yearFromUrl : new Date().getFullYear().toString();
    // Get existing tax data from localStorage
    const allTaxData = fetchTaxData();
    const currentData = { ...allTaxData };
    currentData[selectedYear] = currentData[selectedYear] || {};
    currentData[selectedYear][month] = taxes;
    saveTaxData(currentData);
    onOpenChange(false);
    window.dispatchEvent(new Event('storage'));
  }, [month, taxes, onOpenChange]);

  // Calculate Net P/L and Tax Percentage
  const netPL = grossPL - taxes;
  const taxPercent = grossPL !== 0 ? ((taxes / Math.abs(grossPL)) * 100).toFixed(2) : "0.00";

  const handleTaxesChange = (e) => {
    const value = Number(e.target.value);
    if (value > taxBreakupSum) {
      setTaxWarning("Taxes cannot exceed the sum of detailed charges.");
      return; // Do not update taxes if above sum
    } else {
      setTaxWarning("");
      setTaxes(value);
    }
  };

  // Add effect to clamp taxes if breakup sum decreases
  React.useEffect(() => {
    if (taxes > taxBreakupSum) {
      setTaxes(taxBreakupSum);
      setTaxWarning("Taxes cannot exceed the sum of detailed charges.");
    }
    // eslint-disable-next-line
  }, [taxBreakupSum]);

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <h3>Edit {month} Tax Data</h3>
                <Tabs 
                  aria-label="Options" 
                  color="primary"
                  size="sm"
                  classNames={{
                    tabList: "bg-content2/50 p-0.5 rounded-lg",
                    cursor: "bg-primary rounded-md",
                    tab: "px-3 py-1 data-[selected=true]:text-white"
                  }}
                >
                  <Tab key="basic" title="Basic" />
                  <Tab key="advanced" title="Advanced" />
                </Tabs>
              </div>
            </ModalHeader>
            <Divider />
            <ModalBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Total Trades"
                  type="number"
                  variant="bordered"
                  defaultValue={month === "January" ? "9" : ""}
                />
                <Input
                  label="Win Rate (%)"
                  type="text"
                  variant="bordered"
                  defaultValue={month === "January" ? "#N/A" : ""}
                />
                <Input
                  label="Average Profit (₹)"
                  type="text"
                  variant="bordered"
                  defaultValue={month === "January" ? "#DIV/0!" : ""}
                />
                <Input
                  label="Average Loss (₹)"
                  type="text"
                  variant="bordered"
                  defaultValue={month === "January" ? "-405.81" : ""}
                />
                <Input
                  label="Gross P/L (₹)"
                  type="number"
                  variant="bordered"
                  value={String(grossPL)}
                  onChange={e => setGrossPL(Number(e.target.value))}
                />
                <Input
                  label="Taxes (₹)"
                  type="number"
                  variant="bordered"
                  value={String(taxes)}
                  onChange={handleTaxesChange}
                />
                {taxWarning && <div style={{color: 'red', fontSize: '0.9em'}}>{taxWarning}</div>}
                <Input
                  label="Net P/L (₹)"
                  type="number"
                  variant="bordered"
                  value={String(netPL)}
                  isReadOnly
                />
                <Input
                  label="Tax Percentage (%)"
                  type="text"
                  variant="bordered"
                  value={`${taxPercent}%`}
                  isReadOnly
                />
                <Input
                  label="Gross PF Impact (%)"
                  type="text"
                  variant="bordered"
                  defaultValue={month === "January" ? "-1.25%" : ""}
                />
                <Input
                  label="Net PF Impact (%)"
                  type="text"
                  variant="bordered"
                  defaultValue={month === "January" ? "-1.37%" : ""}
                />
                <Input
                  label="Return Percentage (%)"
                  type="text"
                  variant="bordered"
                  defaultValue={month === "January" ? "-1.25%" : ""}
                />
              </div>
              
              <Divider className="my-4" />
              
              <div className="space-y-4">
                <h4 className="text-md font-medium">Tax Calculation Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Short-term Capital Gain"
                    type="number"
                    variant="bordered"
                    value={String(stcg)}
                    onChange={e => setStcg(Number(e.target.value))}
                  />
                  <Input
                    label="Long-term Capital Gain"
                    type="number"
                    variant="bordered"
                    value={String(ltcg)}
                    onChange={e => setLtcg(Number(e.target.value))}
                  />
                  <Input
                    label="Securities Transaction Tax"
                    type="number"
                    variant="bordered"
                    value={String(stt)}
                    onChange={e => setStt(Number(e.target.value))}
                  />
                  <Input
                    label="Stamp Duty"
                    type="number"
                    variant="bordered"
                    value={String(stampDuty)}
                    onChange={e => setStampDuty(Number(e.target.value))}
                  />
                  <Input
                    label="Exchange Transaction Charges"
                    type="number"
                    variant="bordered"
                    value={String(exchangeCharges)}
                    onChange={e => setExchangeCharges(Number(e.target.value))}
                  />
                  <Input
                    label="GST"
                    type="number"
                    variant="bordered"
                    value={String(gst)}
                    onChange={e => setGst(Number(e.target.value))}
                  />
                  <Input
                    label="SEBI Charges"
                    type="number"
                    variant="bordered"
                    value={String(sebiCharges)}
                    onChange={e => setSebiCharges(Number(e.target.value))}
                  />
                  <Input
                    label="IPFT"
                    type="number"
                    variant="bordered"
                    value={String(ipft)}
                    onChange={e => setIpft(Number(e.target.value))}
                  />
                  <Input
                    label="Other Charges"
                    type="number"
                    variant="bordered"
                    value={String(otherCharges)}
                    onChange={e => setOtherCharges(Number(e.target.value))}
                  />
                </div>
              </div>
            </ModalBody>
            <Divider />
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button 
                color="primary" 
                onPress={handleSaveChanges}
                startContent={<Icon icon="lucide:save" />}
              >
                Save Changes
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};