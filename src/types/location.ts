export interface ServiceSchedule {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  preferredDays?: string[];
  timeWindow?: { open: string; close: string };
  appointmentRequired?: boolean;
}

export interface TankInfo {
  type: 'freshwater' | 'saltwater' | 'reef';
  gallons: number;
  notes?: string;
}

export interface ServiceLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  serviceSchedule?: ServiceSchedule;
  lastService?: Date;
  nextService?: Date;
  tankInfo?: TankInfo;
  contactName?: string;
  contactPhone?: string;
  priority?: 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'inactive';
  estimatedDuration?: number; // minutes expected for service
  waterGallonsNeeded?: number; // default gallons of water per service
  clientNotes?: string; // persistent notes about this client
}

export type TabValue = 'details' | 'schedule' | 'history' | 'tank';
