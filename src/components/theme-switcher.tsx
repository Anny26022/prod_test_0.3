import React from "react";
import { Switch, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTheme } from "@heroui/use-theme";

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  
  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };
  
  return (
    <Tooltip 
      content={`Switch to ${isDark ? "light" : "dark"} mode`}
      placement="bottom"
      className="animate-fade-in"
    >
      <div className="flex items-center gap-2 p-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-foreground-100/50">
        <Icon 
          icon={isDark ? "lucide:moon" : "lucide:sun"} 
          className={`text-lg transition-all duration-300 transform ${
            isDark 
              ? "text-primary-400 rotate-0" 
              : "text-warning-400 rotate-90"
          }`}
        />
        <Switch 
          isSelected={isDark}
          onValueChange={handleToggle}
          size="sm"
          color={isDark ? "primary" : "warning"}
          className="mx-0 shadow-soft-sm hover:shadow-soft-md transition-shadow duration-200"
        />
      </div>
    </Tooltip>
  );
};