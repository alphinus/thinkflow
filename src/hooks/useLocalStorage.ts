'use client';

import { useState, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value - sync read from localStorage on first render
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

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

// Hook for user ideas (DynamicIdea[])
export function useUserIdeas() {
  const [ideas, setIdeas] = useLocalStorage<import('../types').DynamicIdea[]>(
    'thinkflow_user_ideas',
    []
  );

  const addIdea = useCallback((idea: Omit<import('../types').DynamicIdea, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newIdea: import('../types').DynamicIdea = {
      ...idea,
      id: Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    setIdeas(prev => [newIdea, ...prev]);
    return newIdea;
  }, [setIdeas]);

  const updateIdea = useCallback((id: number, updates: Partial<import('../types').DynamicIdea>) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === id
        ? { ...idea, ...updates, updatedAt: new Date().toISOString() }
        : idea
    ));
  }, [setIdeas]);

  const deleteIdea = useCallback((id: number) => {
    setIdeas(prev => prev.filter(idea => idea.id !== id));
  }, [setIdeas]);

  const linkThoughtToIdea = useCallback((ideaId: number, thoughtId: number) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === ideaId
        ? {
            ...idea,
            thoughtIds: [...idea.thoughtIds, thoughtId],
            updatedAt: new Date().toISOString()
          }
        : idea
    ));
  }, [setIdeas]);

  const unlinkThoughtFromIdea = useCallback((ideaId: number, thoughtId: number) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === ideaId
        ? {
            ...idea,
            thoughtIds: idea.thoughtIds.filter(id => id !== thoughtId),
            updatedAt: new Date().toISOString()
          }
        : idea
    ));
  }, [setIdeas]);

  const getIdeaById = useCallback((id: number) => {
    return ideas.find(idea => idea.id === id);
  }, [ideas]);

  return {
    ideas,
    setIdeas,
    addIdea,
    updateIdea,
    deleteIdea,
    linkThoughtToIdea,
    unlinkThoughtFromIdea,
    getIdeaById,
  };
}

// Hook specifically for API config with validation status
export function useApiConfig() {
  const [config, setConfig] = useLocalStorage<{
    provider: 'openai' | 'anthropic' | 'google' | null;
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

// Hook for current user (multi-user support)
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useLocalStorage<import('../types').UserName | null>(
    'thinkflow_current_user',
    null
  );

  return {
    currentUser,
    setCurrentUser,
  };
}
