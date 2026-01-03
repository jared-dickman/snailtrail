import { useState, useEffect, useCallback, useMemo } from "react";

/**
 * Generic localStorage hook with SSR safety and JSON serialization.
 * Eliminates duplicate patterns across useLocations, useSettings, useSchedule.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const getInitial = useMemo(() => {
    return typeof initialValue === "function"
      ? (initialValue as () => T)
      : () => initialValue;
  }, []);

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return getInitial();
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : getInitial();
    } catch {
      return getInitial();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage quota exceeded or private mode
    }
  }, [key, state]);

  const remove = useCallback(() => {
    localStorage.removeItem(key);
    setState(getInitial());
  }, [key, getInitial]);

  return [state, setState, remove];
}

/**
 * Variant that merges stored data with defaults (for settings-like data).
 */
export function useLocalStorageWithDefaults<T extends object>(
  key: string,
  defaults: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [state, setState] = useLocalStorage<T>(key, () => {
    if (typeof window === "undefined") return defaults;
    try {
      const stored = localStorage.getItem(key);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  const update = useCallback((updates: Partial<T>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, [setState]);

  const reset = useCallback(() => {
    setState(defaults);
    localStorage.removeItem(key);
  }, [key, defaults, setState]);

  return [state, update, reset];
}
