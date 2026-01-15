'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage after mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    setIsInitialized(true);
  }, [key]);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// Hook specifically for API config with validation status
export function useApiConfig() {
  const [config, setConfig] = useLocalStorage<{
    provider: 'openai' | 'anthropic' | null;
    apiKey: string | null;
    isValid: boolean;
  }>('thinkflow_api_config', {
    provider: null,
    apiKey: null,
    isValid: false,
  });

  const updateConfig = useCallback((updates: Partial<typeof config>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, [setConfig]);

  const clearConfig = useCallback(() => {
    setConfig({
      provider: null,
      apiKey: null,
      isValid: false,
    });
  }, [setConfig]);

  const hasValidConfig = config.provider && config.apiKey && config.isValid;

  return {
    config,
    updateConfig,
    clearConfig,
    hasValidConfig,
  };
}
