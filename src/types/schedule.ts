import type { ServiceLocation } from "./location";

export interface ServiceCompletion {
  completedAt: string; // ISO datetime
  photoUrl?: string; // tank photo
  waterGallonsUsed?: number;
  nextTimeNotes?: string; // notes for next visit
  oneOffTasksCompleted?: boolean;
}

export interface ScheduledStop {
  id: string;
  locationId: string;
  location: ServiceLocation;
  date: string; // ISO date
  scheduledTime?: string;
  estimatedArrival?: string;
  estimatedDeparture?: string;
  travelTimeFromPrevious?: number;
  status: "scheduled" | "in-progress" | "completed" | "skipped";
  waterGallonsNeeded?: number; // override for this specific day
  oneOffNotes?: string; // special notes for this day only
  oneOffTasks?: string[]; // checklist items for this day
  completion?: ServiceCompletion; // filled when marked complete
}

export interface DaySchedule {
  date: string;
  stops: ScheduledStop[];
  totalDriveTime?: number;
  totalServiceTime?: number;
  estimatedEndTime?: string;
  totalMiles?: number;
  confirmed?: boolean; // user confirmed route before starting
  totalWaterNeeded?: number; // sum of all stops
}

export type TankTypeColor = {
  freshwater: string;
  saltwater: string;
  reef: string;
};

export const tankTypeColors: TankTypeColor = {
  freshwater: "bg-blue-500",
  saltwater: "bg-teal-500",
  reef: "bg-purple-500",
};

export const tankTypeBadgeColors: TankTypeColor = {
  freshwater: "bg-blue-100 text-blue-800",
  saltwater: "bg-teal-100 text-teal-800",
  reef: "bg-purple-100 text-purple-800",
};
