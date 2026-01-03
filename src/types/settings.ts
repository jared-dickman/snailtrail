export interface HomeBase {
  lat: number;
  lng: number;
  address: string;
}

export interface WorkingHours {
  start: string; // "08:00"
  end: string;   // "18:00"
}

export interface BreakPreferences {
  enabled: boolean;
  startTime: string;
  duration: number; // minutes
}

export interface AppSettings {
  homeBase: HomeBase | null;
  defaultStartTime: string;
  workingHours: WorkingHours;
  breakPreferences: BreakPreferences;
  maxStopsPerDay: number;
}

export const defaultSettings: AppSettings = {
  homeBase: null,
  defaultStartTime: "08:00",
  workingHours: { start: "08:00", end: "18:00" },
  breakPreferences: { enabled: false, startTime: "12:00", duration: 30 },
  maxStopsPerDay: 12,
};
