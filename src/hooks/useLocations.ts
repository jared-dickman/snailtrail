import { useCallback } from "react";
import type { ServiceLocation } from "@/types/location";
import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "snailtrail_locations";

export function useLocations() {
  const [locations, setLocations] = useLocalStorage<ServiceLocation[]>(STORAGE_KEY, []);
  const [hasOnboarded, setHasOnboarded, removeOnboarded] = useLocalStorage<boolean>(
    "snailtrail_onboarded",
    false
  );

  const addLocation = useCallback((location: ServiceLocation) => {
    setLocations((prev) => [...prev, location]);
  }, [setLocations]);

  const updateLocation = useCallback((updated: ServiceLocation) => {
    setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, [setLocations]);

  const deleteLocation = useCallback((id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }, [setLocations]);

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
  }, [setLocations]);

  const skipUntil = useCallback((id: string, date: Date) => {
    setLocations((prev) =>
      prev.map((l) => (l.id !== id ? l : { ...l, nextService: date }))
    );
  }, [setLocations]);

  const completeOnboarding = useCallback(() => {
    setHasOnboarded(true);
  }, [setHasOnboarded]);

  const resetOnboarding = useCallback(() => {
    removeOnboarded();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("snailtrail_schedule");
    localStorage.removeItem("snailtrail_settings");
    setLocations([]);
    setHasOnboarded(false);
  }, [removeOnboarded, setLocations, setHasOnboarded]);

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
