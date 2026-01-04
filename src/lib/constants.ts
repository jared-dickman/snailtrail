// Shared constants - DRY refactored from LocationModal, useSchedule, MapView, LocationList

export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[number];

// Week starts on Sunday (US standard) - index matches JS Date.getDay()
export const DAY_INDEX_MAP: Record<DayOfWeek, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6
};

export const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly (Every 2 weeks)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom interval' },
] as const;

export type Frequency = typeof FREQUENCIES[number]['value'];

export const PRIORITIES = [
  { value: 'high', label: 'High', color: 'bg-red-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' },
] as const;

export type Priority = typeof PRIORITIES[number]['value'];

// Priority colors for different contexts
export const PRIORITY_COLORS = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
} as const;

export const PRIORITY_HEX_COLORS = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
  default: '#3b82f6',
} as const;

export const TANK_TYPES = ['freshwater', 'saltwater', 'reef'] as const;
export type TankType = typeof TANK_TYPES[number];

export const COMMON_FISH = [
  'Clownfish', 'Tang', 'Wrasse', 'Angelfish', 'Damsel', 'Goby', 'Blenny', 'Chromis'
] as const;

export const EQUIPMENT_LIST = ['Sump', 'Skimmer', 'Reactor', 'UV', 'ATO', 'Dosing'] as const;
