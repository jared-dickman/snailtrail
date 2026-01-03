import { useState, useEffect, useCallback } from "react";
import type { DaySchedule, ScheduledStop } from "@/types/schedule";
import type { ServiceLocation } from "@/types/location";
import { format, parseISO, addDays, startOfWeek } from "date-fns";
import { initialLocations } from "@/data/locations";

const STORAGE_KEY = "snailtrail_schedule";

function generateInitialSchedules(): Record<string, DaySchedule> {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const schedules: Record<string, DaySchedule> = {};

  // Map preferred days to day indices (Mon=0, Tue=1, etc.)
  const dayMap: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6
  };

  // Group locations by preferred day
  const byDay: Record<number, ServiceLocation[]> = {};
  initialLocations.forEach(loc => {
    const dayIdx = dayMap[loc.serviceSchedule?.preferredDay || 'Monday'] || 0;
    if (!byDay[dayIdx]) byDay[dayIdx] = [];
    byDay[dayIdx].push(loc);
  });

  // Generate schedules for the week
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

export function useSchedule() {
  const [schedules, setSchedules] = useState<Record<string, DaySchedule>>(() => {
    if (typeof window === "undefined") return generateInitialSchedules();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // If empty or old data, regenerate
      if (Object.keys(parsed).length === 0) return generateInitialSchedules();
      return parsed;
    }
    return generateInitialSchedules();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  }, [schedules]);

  const getScheduleForDate = useCallback(
    (date: Date): DaySchedule | undefined => {
      const key = format(date, "yyyy-MM-dd");
      return schedules[key];
    },
    [schedules]
  );

  const addStopToDate = useCallback(
    (date: Date, location: ServiceLocation) => {
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
        [key]: {
          date: key,
          stops: [...(prev[key]?.stops || []), stop],
        },
      }));
    },
    []
  );

  const removeStopFromDate = useCallback((date: Date, stopId: string) => {
    const key = format(date, "yyyy-MM-dd");
    setSchedules((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        stops: prev[key]?.stops.filter((s) => s.id !== stopId) || [],
      },
    }));
  }, []);

  const moveStop = useCallback(
    (fromDate: Date, toDate: Date, stopId: string) => {
      const fromKey = format(fromDate, "yyyy-MM-dd");
      const toKey = format(toDate, "yyyy-MM-dd");

      setSchedules((prev) => {
        const stop = prev[fromKey]?.stops.find((s) => s.id === stopId);
        if (!stop) return prev;

        const movedStop = { ...stop, date: toKey, id: `${toKey}-${stop.locationId}-${Date.now()}` };

        return {
          ...prev,
          [fromKey]: {
            ...prev[fromKey],
            stops: prev[fromKey]?.stops.filter((s) => s.id !== stopId) || [],
          },
          [toKey]: {
            date: toKey,
            stops: [...(prev[toKey]?.stops || []), movedStop],
          },
        };
      });
    },
    []
  );

  const reorderStops = useCallback((date: Date, stopIds: string[]) => {
    const key = format(date, "yyyy-MM-dd");
    setSchedules((prev) => {
      const schedule = prev[key];
      if (!schedule) return prev;

      const reordered = stopIds
        .map((id) => schedule.stops.find((s) => s.id === id))
        .filter(Boolean) as ScheduledStop[];

      return {
        ...prev,
        [key]: { ...schedule, stops: reordered },
      };
    });
  }, []);

  const updateDayMetrics = useCallback(
    (date: Date, metrics: Partial<Omit<DaySchedule, "date" | "stops">>) => {
      const key = format(date, "yyyy-MM-dd");
      setSchedules((prev) => ({
        ...prev,
        [key]: { ...prev[key], date: key, stops: prev[key]?.stops || [], ...metrics },
      }));
    },
    []
  );

  const getDatesWithSchedules = useCallback((): Date[] => {
    return Object.keys(schedules)
      .filter((k) => schedules[k].stops.length > 0)
      .map((k) => parseISO(k));
  }, [schedules]);

  return {
    schedules,
    getScheduleForDate,
    addStopToDate,
    removeStopFromDate,
    moveStop,
    reorderStops,
    updateDayMetrics,
    getDatesWithSchedules,
  };
}
