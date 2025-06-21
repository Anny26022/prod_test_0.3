import React from 'react';
import { Card, CardBody, CardHeader, Divider, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTruePortfolio } from '../utils/TruePortfolioContext';

export const TruePortfolioDebug: React.FC = () => {
  const {
    yearlyStartingCapitals,
    capitalChanges,
    portfolioSize,
    setYearlyStartingCapital,
    addCapitalChange
  } = useTruePortfolio();

  const handleTestSetup = () => {

    setYearlyStartingCapital(2024, 100000);
  };

  const handleTestCapitalChange = () => {

    addCapitalChange({
      amount: 10000,
      type: 'deposit',
      date: new Date().toISOString(),
      description: 'Test deposit'
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon icon="lucide:bug" className="text-warning" />
          <span>True Portfolio Debug Panel</span>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Current State</h4>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Portfolio Size:</strong> ₹{portfolioSize.toLocaleString()}
            </div>
            <div>
              <strong>Yearly Starting Capitals:</strong> {yearlyStartingCapitals.length} entries
              <pre className="text-xs bg-default-100 p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(yearlyStartingCapitals, null, 2)}
              </pre>
            </div>
            <div>
              <strong>Capital Changes:</strong> {capitalChanges.length} entries
              <pre className="text-xs bg-default-100 p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(capitalChanges, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <Divider />

        <div>
          <h4 className="font-semibold mb-2">Test Actions</h4>
          <div className="flex gap-2">
            <Button
              size="sm"
              color="primary"
              onPress={handleTestSetup}
              startContent={<Icon icon="lucide:play" />}
            >
              Test Setup (2024, ₹100k)
            </Button>
            <Button
              size="sm"
              color="secondary"
              onPress={handleTestCapitalChange}
              startContent={<Icon icon="lucide:plus" />}
            >
              Test Capital Change (+₹10k)
            </Button>
          </div>
        </div>

        <div className="text-xs text-default-500">
          <p>Check the browser console for detailed logs about Supabase operations.</p>
        </div>
      </CardBody>
    </Card>
  );
};
