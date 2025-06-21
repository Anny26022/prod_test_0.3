import React from "react";
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Divider,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tabs,
  Tab
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { PerformanceMetrics } from "./analytics/performance-metrics";
import { TradeStatistics } from "./analytics/trade-statistics";
import { TopPerformers } from "./analytics/top-performers";
import { PerformanceChart } from "./analytics/performance-chart";
import { useTrades } from "../hooks/use-trades";
import { useDashboardConfig } from "../hooks/use-dashboard-config";
import { pageVariants, cardVariants, fadeInVariants } from "../utils/animations";

interface ChartDataPoint {
  month: string;
  capital: number;
  pl: number;
  plPercentage: number;
  startingCapital?: number;
}

export const TradeAnalytics = React.memo(function TradeAnalytics() {
  const { trades } = useTrades();
  const { dashboardConfig, toggleWidgetVisibility } = useDashboardConfig();
  const [selectedPeriod, setSelectedPeriod] = React.useState("YTD");
  const [selectedView, setSelectedView] = React.useState("performance");
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>([]);
  
  const periods = ["1W", "1M", "3M", "6M", "YTD", "1Y", "ALL"];
  
  const handleChartDataUpdate = React.useCallback((data: ChartDataPoint[]) => {
    setChartData(data);
  }, []);
  
  const containerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const getWidgetVisibility = (id: string) => {
    return dashboardConfig.find(widget => widget.id === id)?.isVisible;
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        variants={fadeInVariants}
      >
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics Dashboard</h2>
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button 
              variant="flat" 
              color="default" 
              startContent={<Icon icon="lucide:customize" />}
              size="sm"
              radius="full"
            >
              Customize Dashboard
            </Button>
          </DropdownTrigger>
          <DropdownMenu 
            aria-label="Customize Dashboard Actions"
            closeOnSelect={false}
            selectionMode="multiple"
            selectedKeys={new Set(dashboardConfig.filter(w => w.isVisible).map(w => w.id))}
            onSelectionChange={(keys) => {
              const selectedKeysArray = Array.from(keys as any); // Convert to array
              dashboardConfig.forEach(widget => {
                const newVisibility = selectedKeysArray.includes(widget.id);
                if (widget.isVisible !== newVisibility) {
                  toggleWidgetVisibility(widget.id);
                }
              });
            }}
          >
            {dashboardConfig.map((widget) => (
              <DropdownItem key={widget.id} textValue={widget.name}>
                <div className="flex items-center gap-2">
                  <span>{widget.name}</span>
                </div>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      </motion.div>
      
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {getWidgetVisibility('portfolio-performance') && (
          <motion.div
            className="lg:col-span-2"
            variants={cardVariants}
          >
            <Card className="dark:bg-gray-900">
              <CardHeader className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold tracking-tight dark:text-white">Portfolio Performance</h3>
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
                        chartData.length > 0 && chartData[chartData.length - 1].plPercentage >= 0 
                          ? 'bg-success-100 dark:bg-success-900' 
                          : 'bg-danger-100 dark:bg-danger-900'
                      }`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <Icon 
                        icon={chartData.length > 0 && chartData[chartData.length - 1].plPercentage >= 0 
                          ? "lucide:trending-up" 
                          : "lucide:trending-down"} 
                        className={chartData.length > 0 && chartData[chartData.length - 1].plPercentage >= 0 
                          ? "text-success-600 dark:text-success-400" 
                          : "text-danger-600 dark:text-danger-400"} 
                      />
                      <span 
                        className={`text-sm font-medium ${
                          chartData.length > 0 && chartData[chartData.length - 1].plPercentage >= 0 
                            ? 'text-success-600 dark:text-success-400' 
                            : 'text-danger-600 dark:text-danger-400'
                        }`}
                      >
                        {chartData && chartData.length > 0 
                          ? `${chartData[chartData.length - 1].plPercentage >= 0 ? '+' : ''}${chartData[chartData.length - 1].plPercentage.toFixed(2)}%`
                          : '0.00%'}
                      </span>
                    </motion.div>
                    <span className="text-sm text-default-500 dark:text-gray-400 font-medium min-w-[40px] text-center">{selectedPeriod}</span>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedView}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PerformanceChart
                      trades={trades}
                      onDataUpdate={handleChartDataUpdate}
                      selectedView={selectedView}
                    />
                  </motion.div>
                </AnimatePresence>
              </CardBody>
            </Card>
          </motion.div>
        )}
        
        {getWidgetVisibility('performance-metrics') && (
          <motion.div
            variants={cardVariants}
          >
            <Card className="dark:bg-gray-900">
              <CardHeader>
                <h3 className="text-xl font-semibold tracking-tight dark:text-white">Performance Metrics</h3>
              </CardHeader>
              <CardBody>
                <PerformanceMetrics trades={trades} isEditing={false} />
              </CardBody>
            </Card>
          </motion.div>
        )}
      </motion.div>
      
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {getWidgetVisibility('trade-statistics') && (
          <motion.div
            variants={cardVariants}
          >
            <Card className="dark:bg-gray-900">
              <CardHeader>
                <h3 className="text-xl font-semibold tracking-tight dark:text-white">Trade Statistics</h3>
              </CardHeader>
              <Divider className="dark:bg-gray-800" />
              <CardBody>
                <TradeStatistics trades={trades} />
              </CardBody>
            </Card>
          </motion.div>
        )}
        
        {getWidgetVisibility('top-performers') && (
          <motion.div
            variants={cardVariants}
          >
            <Card className="dark:bg-gray-900">
              <CardHeader className="flex justify-between items-center">
                <h3 className="text-xl font-semibold tracking-tight dark:text-white">Top Performers</h3>
              </CardHeader>
              <Divider className="dark:bg-gray-800" />
              <CardBody>
                <TopPerformers trades={trades} />
              </CardBody>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
});

export default TradeAnalytics;