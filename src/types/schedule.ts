import type { ServiceLocation } from "./location";

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
}

export interface DaySchedule {
  date: string;
  stops: ScheduledStop[];
  totalDriveTime?: number;
  totalServiceTime?: number;
  estimatedEndTime?: string;
  totalMiles?: number;
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
