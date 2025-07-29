import { useState, useEffect, useCallback } from 'react';
import { HealthReport } from '../types/health';
import { HealthCheckAPI } from '../services/api';

interface UseHealthDataResult {
  healthData: HealthReport | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  timeSinceLastUpdate: number;
}

export const useHealthData = (refreshInterval: number = 10000): UseHealthDataResult => {
  const [healthData, setHealthData] = useState<HealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState(0);

  // Track time since last update every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastUpdated) {
        setTimeSinceLastUpdate(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdated]);

  const fetchHealthData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else if (!healthData) {
        setIsLoading(true);
      }
      
      const data = await HealthCheckAPI.getAllHealthChecks();
      
      // Cache the previous data temporarily to prevent flickering
      setHealthData(prevData => {
        // If we have previous data, keep it visible during the update
        if (prevData && showRefreshing) {
          // Update data smoothly after a brief delay
          setTimeout(() => setHealthData(data), 100);
          return prevData;
        }
        return data;
      });
      
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
      console.error('Health data fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [healthData]);

  const refreshData = useCallback(() => {
    return fetchHealthData(true);
  }, [fetchHealthData]);

  useEffect(() => {
    // Initial load
    fetchHealthData(false);

    // Set up periodic refresh
    const interval = setInterval(() => {
      fetchHealthData(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchHealthData, refreshInterval]);

  return {
    healthData,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refreshData,
    timeSinceLastUpdate
  };
};