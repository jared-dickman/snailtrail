import { useState, useEffect, useCallback } from "react";
import type { ServiceLocation } from "@/types/location";

const STORAGE_KEY = "snailtrail_locations";

export function useLocations() {
  const [locations, setLocations] = useState<ServiceLocation[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const [hasOnboarded, setHasOnboarded] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("snailtrail_onboarded") === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
  }, [locations]);

  const addLocation = useCallback((location: ServiceLocation) => {
    setLocations((prev) => [...prev, location]);
  }, []);

  const updateLocation = useCallback((updated: ServiceLocation) => {
    setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  const deleteLocation = useCallback((id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const markServiced = useCallback((id: string) => {
    setLocations((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const freq = l.serviceSchedule?.frequency || "weekly";
        const days = freq === "weekly" ? 7 : freq === "biweekly" ? 14 : 30;
        const next = new Date();
        next.setDate(next.getDate() + days);
        return { ...l, lastService: new Date(), nextService: next };
      })
    );
  }, []);

  const skipUntil = useCallback((id: string, date: Date) => {
    setLocations((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        return { ...l, nextService: date };
      })
    );
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem("snailtrail_onboarded", "true");
    setHasOnboarded(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem("snailtrail_onboarded");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("snailtrail_schedule");
    localStorage.removeItem("snailtrail_settings");
    setLocations([]);
    setHasOnboarded(false);
  }, []);

  return {
    locations,
    setLocations,
    addLocation,
    updateLocation,
    deleteLocation,
    markServiced,
    skipUntil,
    hasOnboarded,
    completeOnboarding,
    resetOnboarding,
  };
}
