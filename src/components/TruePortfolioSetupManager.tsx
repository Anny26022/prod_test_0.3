import React, { useEffect, useState } from 'react';
import { useTruePortfolio } from '../utils/TruePortfolioContext';
import { TruePortfolioSetup } from './TruePortfolioSetup';
import { WelcomeMessageModal } from './WelcomeMessageModal';

const USER_NAME_LOCAL_KEY = 'user_name';
const WELCOME_COMPLETE_LOCAL_KEY = 'welcome_complete';

interface TruePortfolioSetupManagerProps {
  userName: string;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
}

export const TruePortfolioSetupManager: React.FC<TruePortfolioSetupManagerProps> = ({
  userName,
  setUserName
}) => {
  const { yearlyStartingCapitals } = useTruePortfolio();
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [hasCheckedSetup, setHasCheckedSetup] = useState(false);
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState<boolean>(() => localStorage.getItem(WELCOME_COMPLETE_LOCAL_KEY) === 'true');

  // Effect to load user name and welcome status on initial mount
  useEffect(() => {
    const storedUserName = localStorage.getItem(USER_NAME_LOCAL_KEY);
    if (storedUserName) {
      setUserName(storedUserName);
    }
    const storedWelcomeStatus = localStorage.getItem(WELCOME_COMPLETE_LOCAL_KEY);
    if (storedWelcomeStatus === 'true') {
      setHasCompletedWelcome(true);
    }
    setHasCheckedSetup(true); // Mark as checked after trying to load
  }, [setUserName]); // Add setUserName to dependency array

  // Check if initial setup is needed (yearly starting capital not set)
  // This now runs only once after hydration
  useEffect(() => {
    if (hasCheckedSetup && yearlyStartingCapitals.length === 0 && !isWelcomeModalOpen) {
      setIsSetupModalOpen(true);
    }
  }, [yearlyStartingCapitals, hasCheckedSetup, isWelcomeModalOpen]);

  // Handles closing the initial setup modal and opening the welcome message
  const handleSetupComplete = (name: string) => {
    setUserName(name);
    localStorage.setItem(USER_NAME_LOCAL_KEY, name);
    setIsSetupModalOpen(false);
    // Only show welcome message if it hasn't been completed before
    if (!hasCompletedWelcome) {
      setIsWelcomeModalOpen(true);
      localStorage.setItem(WELCOME_COMPLETE_LOCAL_KEY, 'true');
      setHasCompletedWelcome(true);
    }
  };

  return (
    <>
      <TruePortfolioSetup
        isOpen={isSetupModalOpen}
        onOpenChange={setIsSetupModalOpen}
        onSetupComplete={handleSetupComplete} // New prop for callback
        userName={userName}
        setUserName={setUserName}
      />
      <WelcomeMessageModal
        isOpen={isWelcomeModalOpen}
        onOpenChange={setIsWelcomeModalOpen}
        userName={userName}
      />
    </>
  );
};
