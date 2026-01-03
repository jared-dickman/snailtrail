import { useCallback } from "react";
import { type AppSettings, defaultSettings } from "@/types/settings";
import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "snailtrail_settings";

export function useSettings() {
  const [settings, setSettings, removeSettings] = useLocalStorage<AppSettings>(
    STORAGE_KEY,
    () => {
      if (typeof window === "undefined") return defaultSettings;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
      } catch {
        return defaultSettings;
      }
    }
  );

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, [setSettings]);

  const resetSettings = useCallback(() => {
    removeSettings();
    setSettings(defaultSettings);
  }, [removeSettings, setSettings]);

  return { settings, updateSettings, resetSettings };
}
