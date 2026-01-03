import { useState, useEffect, useCallback } from "react";
import { type AppSettings, defaultSettings } from "@/types/settings";

const STORAGE_KEY = "snailtrail_settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === "undefined") return defaultSettings;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { settings, updateSettings, resetSettings };
}
