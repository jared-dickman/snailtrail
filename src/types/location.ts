export interface ServiceSchedule {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  preferredDay?: string;
  timeWindow?: { open: string; close: string };
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
}

export type TabValue = 'details' | 'schedule' | 'history' | 'tank';
