import React from "react";
import { Spinner } from "@heroui/react";

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] animate-fade-in">
      <div className="relative">
        <Spinner 
          size="lg"
          color="primary"
          className="animate-spin-slow"
        />
        <div className="absolute inset-0 animate-ping opacity-75 bg-primary-200 rounded-full" style={{ animationDuration: '2s' }} />
      </div>
      <p className="mt-4 text-sm text-foreground-500 animate-pulse">Loading...</p>
    </div>
  );
}; 