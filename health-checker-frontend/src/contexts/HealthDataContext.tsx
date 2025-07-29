import React, { createContext, useContext, ReactNode } from 'react';
import { HealthReport } from '../types/health';
import { useHealthData } from '../hooks/useHealthData';

interface HealthDataContextType {
  healthData: HealthReport | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  timeSinceLastUpdate: number;
}

const HealthDataContext = createContext<HealthDataContextType | undefined>(undefined);

interface HealthDataProviderProps {
  children: ReactNode;
  refreshInterval?: number;
}

export const HealthDataProvider: React.FC<HealthDataProviderProps> = ({
  children,
  refreshInterval = 10000 // 10 seconds default
}) => {
  const healthDataState = useHealthData(refreshInterval);

  return (
    <HealthDataContext.Provider value={healthDataState}>
      {children}
    </HealthDataContext.Provider>
  );
};

export const useHealthDataContext = (): HealthDataContextType => {
  const context = useContext(HealthDataContext);
  if (context === undefined) {
    throw new Error('useHealthDataContext must be used within a HealthDataProvider');
  }
  return context;
};