import { useCallback, useEffect } from "react";
import type { DaySchedule, ScheduledStop, ServiceCompletion } from "@/types/schedule";
import type { ServiceLocation } from "@/types/location";
import { format, parseISO, addDays, startOfWeek } from "date-fns";
import { useLocalStorage } from "./useLocalStorage";
import { DAY_INDEX_MAP, type DayOfWeek } from "@/lib/constants";

const STORAGE_KEY = "snailtrail_schedule";
const LOCATIONS_KEY = "snailtrail_locations";

function generateSchedulesFromLocations(locations: ServiceLocation[]): Record<string, DaySchedule> {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const schedules: Record<string, DaySchedule> = {};

  // Only schedule active locations with service schedules
  const schedulableLocations = locations.filter(
    loc => loc.status === 'active' && loc.serviceSchedule
  );

  const byDay: Record<number, ServiceLocation[]> = {};
  schedulableLocations.forEach(loc => {
    // Use first preferred day or default to Monday
    const firstDay = loc.serviceSchedule?.preferredDays?.[0] || 'Monday';
    const dayIdx = DAY_INDEX_MAP[firstDay as DayOfWeek] ?? 0;
    if (!byDay[dayIdx]) byDay[dayIdx] = [];
    byDay[dayIdx].push(loc);
  });

  Object.entries(byDay).forEach(([dayIdxStr, locs]) => {
    const dayIdx = parseInt(dayIdxStr);
    const date = addDays(weekStart, dayIdx);
    const key = format(date, "yyyy-MM-dd");

    const stops: ScheduledStop[] = locs.map((loc, i) => ({
      id: `${key}-${loc.id}`,
      locationId: loc.id,
      location: loc,
      date: key,
      status: "scheduled" as const,
      arrivalTime: `${8 + i}:00`,
      departureTime: `${8 + i}:30`,
      travelTimeFromPrevious: i === 0 ? 25 : 15 + Math.floor(Math.random() * 20),
    }));

    const totalDrive = stops.reduce((sum, s) => sum + (s.travelTimeFromPrevious || 0), 0);

    schedules[key] = {
      date: key,
      stops,
      totalDriveTime: totalDrive,
      totalServiceTime: stops.length * 30,
    };
  });

  return schedules;
}

function getStoredLocations(): ServiceLocation[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(LOCATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useSchedule(locations?: ServiceLocation[]) {
  const [schedules, setSchedules] = useLocalStorage<Record<string, DaySchedule>>(
    STORAGE_KEY,
    () => {
      if (typeof window === "undefined") return {};
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Object.keys(parsed).length > 0) return parsed;
        }
      } catch {}
      // Generate from stored locations if no schedules exist
      const storedLocs = getStoredLocations();
      return generateSchedulesFromLocations(storedLocs);
    }
  );

  // Regenerate schedules when locations change and schedules are empty
  useEffect(() => {
    if (!locations || locations.length === 0) return;

    // Check if any active locations with schedules are missing from current schedules
    const scheduledLocationIds = new Set(
      Object.values(schedules)
        .flatMap(day => day.stops)
        .map(stop => stop.locationId)
    );

    const missingLocations = locations.filter(
      loc => loc.status === 'active' &&
             loc.serviceSchedule &&
             !scheduledLocationIds.has(loc.id)
    );

    if (missingLocations.length > 0) {
      // Add missing locations to their preferred days
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });

      setSchedules(prev => {
        const updated = { ...prev };

        missingLocations.forEach(loc => {
          const firstDay = loc.serviceSchedule?.preferredDays?.[0] || 'Monday';
          const dayIdx = DAY_INDEX_MAP[firstDay as DayOfWeek] ?? 0;
          const date = addDays(weekStart, dayIdx);
          const key = format(date, "yyyy-MM-dd");

          const stop: ScheduledStop = {
            id: `${key}-${loc.id}`,
            locationId: loc.id,
            location: loc,
            date: key,
            status: "scheduled",
          };

          if (!updated[key]) {
            updated[key] = { date: key, stops: [] };
          }

          // Only add if not already present
          if (!updated[key].stops.some(s => s.locationId === loc.id)) {
            updated[key].stops.push(stop);
          }
        });

        return updated;
      });
    }
  }, [locations, schedules, setSchedules]);

  const getScheduleForDate = useCallback(
    (date: Date): DaySchedule | undefined => schedules[format(date, "yyyy-MM-dd")],
    [schedules]
  );

  const addStopToDate = useCallback((date: Date, location: ServiceLocation) => {
    const key = format(date, "yyyy-MM-dd");
    const stop: ScheduledStop = {
      id: `${key}-${location.id}-${Date.now()}`,
      locationId: location.id,
      location,
      date: key,
      status: "scheduled",
    };
    setSchedules((prev) => ({
      ...prev,
      [key]: { date: key, stops: [...(prev[key]?.stops || []), stop] },
    }));
  }, [setSchedules]);

  const removeStopFromDate = useCallback((date: Date, stopId: string) => {
    const key = format(date, "yyyy-MM-dd");
    setSchedules((prev) => ({
      ...prev,
      [key]: { ...prev[key], stops: prev[key]?.stops.filter((s) => s.id !== stopId) || [] },
    }));
  }, [setSchedules]);

  const moveStop = useCallback((fromDate: Date, toDate: Date, stopId: string) => {
    const fromKey = format(fromDate, "yyyy-MM-dd");
    const toKey = format(toDate, "yyyy-MM-dd");

    setSchedules((prev) => {
      const stop = prev[fromKey]?.stops.find((s) => s.id === stopId);
      if (!stop) return prev;

      const movedStop = { ...stop, date: toKey, id: `${toKey}-${stop.locationId}-${Date.now()}` };
      return {
        ...prev,
        [fromKey]: { ...prev[fromKey], stops: prev[fromKey]?.stops.filter((s) => s.id !== stopId) || [] },
        [toKey]: { date: toKey, stops: [...(prev[toKey]?.stops || []), movedStop] },
      };
    });
  }, [setSchedules]);

  const reorderStops = useCallback((date: Date, stopIds: string[]) => {
    const key = format(date, "yyyy-MM-dd");
    setSchedules((prev) => {
      const schedule = prev[key];
      if (!schedule) return prev;
      const reordered = stopIds
        .map((id) => schedule.stops.find((s) => s.id === id))
        .filter(Boolean) as ScheduledStop[];
      return { ...prev, [key]: { ...schedule, stops: reordered } };
    });
  }, [setSchedules]);

  const updateDayMetrics = useCallback(
    (date: Date, metrics: Partial<Omit<DaySchedule, "date" | "stops">>) => {
      const key = format(date, "yyyy-MM-dd");
      setSchedules((prev) => ({
        ...prev,
        [key]: { ...prev[key], date: key, stops: prev[key]?.stops || [], ...metrics },
      }));
    },
    [setSchedules]
  );

  const getDatesWithSchedules = useCallback(
    (): Date[] => Object.keys(schedules).filter((k) => schedules[k].stops.length > 0).map((k) => parseISO(k)),
    [schedules]
  );

  const updateStop = useCallback((stopId: string, updates: Partial<ScheduledStop>) => {
    setSchedules((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        const stopIdx = updated[key].stops.findIndex((s) => s.id === stopId);
        if (stopIdx !== -1) {
          updated[key] = {
            ...updated[key],
            stops: updated[key].stops.map((s, i) =>
              i === stopIdx ? { ...s, ...updates } : s
            ),
          };
          break;
        }
      }
      return updated;
    });
  }, [setSchedules]);

  const completeStop = useCallback((stopId: string, completion: ServiceCompletion) => {
    updateStop(stopId, { status: "completed", completion });
  }, [updateStop]);

  const confirmSchedule = useCallback((date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    setSchedules((prev) => ({
      ...prev,
      [key]: { ...prev[key], confirmed: true },
    }));
  }, [setSchedules]);

  return {
    schedules,
    getScheduleForDate,
    addStopToDate,
    removeStopFromDate,
    moveStop,
    reorderStops,
    updateDayMetrics,
    getDatesWithSchedules,
    updateStop,
    completeStop,
    confirmSchedule,
  };
}
