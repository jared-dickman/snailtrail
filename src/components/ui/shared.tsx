// DRY Shared UI Components - Consolidated from LocationModal, LocationList, CalendarView, WeeklyPlanner, Settings, RouteSummary, TrafficDashboard
import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Droplets, Fish, Waves, type LucideIcon } from 'lucide-react';
import { cn, getDaysUntil } from '@/lib/utils';
import { PRIORITY_COLORS, type Priority, type TankType } from '@/lib/constants';

// Priority indicator dot - consolidated from LocationModal.PriorityBadge & LocationList.PriorityDot
export function PriorityDot({ priority, className }: { priority?: Priority; className?: string }) {
  if (!priority) return null;
  return <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_COLORS[priority], className)} />;
}

// Tank type icon - consolidated from CalendarView.TankIcon & WeeklyPlanner.TankIcon
export function TankTypeIcon({ type, className }: { type: TankType; className?: string }) {
  const iconClass = cn('h-3 w-3', className);
  switch (type) {
    case 'freshwater': return <Droplets className={iconClass} />;
    case 'saltwater': return <Fish className={iconClass} />;
    case 'reef': return <Waves className={iconClass} />;
  }
}

// Tank type colored dot - for calendar legends
export const TANK_TYPE_DOT_COLORS = {
  freshwater: 'bg-blue-500',
  saltwater: 'bg-teal-500',
  reef: 'bg-purple-500',
} as const;

export function TankTypeDot({ type, className }: { type: TankType; className?: string }) {
  return <div className={cn('h-2 w-2 rounded-full', TANK_TYPE_DOT_COLORS[type], className)} />;
}

// Service due badge - consolidated from LocationList.ServiceBadge & LocationModal urgency display
export function ServiceDueBadge({ nextService }: { nextService?: Date }) {
  const days = getDaysUntil(nextService);
  if (days === null) return null;

  if (days < 0) return <Badge variant="destructive" className="text-xs">{Math.abs(days)}d overdue</Badge>;
  if (days === 0) return <Badge className="bg-yellow-500 text-xs">Today</Badge>;
  if (days <= 2) return <Badge variant="secondary" className="text-xs">In {days}d</Badge>;
  return null;
}

// Metric card - consolidated from RouteSummary 4x repeated pattern
interface MetricCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  iconClassName?: string;
  className?: string;
}

export function MetricCard({ icon: Icon, value, label, iconClassName, className }: MetricCardProps) {
  return (
    <div className={cn('flex items-center gap-2 p-2 rounded bg-muted/50', className)}>
      <Icon className={cn('h-4 w-4 text-primary', iconClassName)} />
      <div>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// Form field with icon label - consolidated from Settings repeated pattern
interface FormFieldProps {
  icon?: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ icon: Icon, label, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {label}
      </label>
      {children}
    </div>
  );
}

// Empty state with ascii art - consolidated from LocationList & TrafficDashboard
interface EmptyStateProps {
  icon?: LucideIcon;
  ascii?: string;
  message: string;
  className?: string;
}

export function EmptyState({ icon: Icon, ascii, message, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-8 text-muted-foreground', className)}>
      {ascii && <pre className="text-2xl mb-2">{ascii}</pre>}
      {Icon && <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

// Traffic status dot - consolidated from TrafficDashboard & LocationList
export const TRAFFIC_COLORS = {
  low: 'bg-green-500',
  moderate: 'bg-yellow-500',
  heavy: 'bg-orange-500',
  severe: 'bg-red-500',
} as const;

export type TrafficLevel = keyof typeof TRAFFIC_COLORS;

export function TrafficDot({ level, className }: { level: TrafficLevel; className?: string }) {
  return <span className={cn('w-2 h-2 rounded-full shrink-0', TRAFFIC_COLORS[level], className)} />;
}
