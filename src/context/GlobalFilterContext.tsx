import React, { createContext, useContext, useState, useMemo } from "react";

export type FilterType = "all" | "week" | "month" | "fy" | "cy" | "custom";
export interface GlobalFilter {
  type: FilterType;
  startDate?: Date;
  endDate?: Date;
  year?: number;
  month?: number; // 0-11
  fyStartYear?: number;
}

const defaultFilter: GlobalFilter = { type: "all" };

// localStorage helpers for global filter
function loadGlobalFilterFromLocalStorage(): GlobalFilter {
  if (typeof window === 'undefined') {
    return defaultFilter;
  }
  try {
    const stored = localStorage.getItem('globalFilter');
    if (stored) {
      const parsedFilter: GlobalFilter = JSON.parse(stored);
      // Convert date strings back to Date objects
      if (parsedFilter.startDate) {
        parsedFilter.startDate = new Date(parsedFilter.startDate);
      }
      if (parsedFilter.endDate) {
        parsedFilter.endDate = new Date(parsedFilter.endDate);
      }
      return parsedFilter;
    }
    return defaultFilter;
  } catch (error) {
    console.error('Error loading global filter from localStorage:', error);
    return defaultFilter;
  }
}

function saveGlobalFilterToLocalStorage(filterObj: GlobalFilter) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    // Create a mutable copy to modify before saving
    const filterToSave = { ...filterObj };

    // If the filter type is 'all', ensure startDate and endDate are not persisted
    if (filterToSave.type === 'all') {
      delete filterToSave.startDate;
      delete filterToSave.endDate;
    }

    localStorage.setItem('globalFilter', JSON.stringify(filterToSave));
  } catch (error) {
    console.error('Error saving global filter to localStorage:', error);
  }
}

const GlobalFilterContext = createContext<{
  filter: GlobalFilter;
  setFilter: React.Dispatch<React.SetStateAction<GlobalFilter>>;
}>({
  filter: defaultFilter,
  setFilter: () => {},
});

export const GlobalFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state directly from localStorage
  const [filter, setFilter] = useState<GlobalFilter>(loadGlobalFilterFromLocalStorage);

  // Effect to save filter to localStorage whenever it changes
  React.useEffect(() => {
    // Only save if the filter is different from the default, to avoid saving empty state
    // A more robust check for default filter state
    const isEffectivelyDefault = filter.type === defaultFilter.type && !filter.startDate && !filter.endDate;

    if (!isEffectivelyDefault) { // Save if it's not the default filter
      saveGlobalFilterToLocalStorage(filter);
    } else { // If it is effectively default, ensure it's cleared from localStorage
      if (localStorage.getItem('globalFilter')) {
        localStorage.removeItem('globalFilter');
      }
    }
  }, [filter]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    filter,
    setFilter
  }), [filter]); // Remove setFilter from dependencies as it's stable

  return (
    <GlobalFilterContext.Provider value={contextValue}>
      {children}
    </GlobalFilterContext.Provider>
  );
};

export const useGlobalFilter = () => useContext(GlobalFilterContext); 