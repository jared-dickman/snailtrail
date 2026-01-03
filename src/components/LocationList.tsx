import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ServiceLocation } from '@/types/location';

type SortOption = 'name' | 'nextService' | 'priority';
type FilterStatus = 'all' | 'active' | 'paused' | 'inactive';
type FilterDue = 'all' | 'overdue' | 'today' | 'week';

interface LocationListProps {
  locations: ServiceLocation[];
  onSelect: (location: ServiceLocation) => void;
  onCall?: (phone: string) => void;
  onNavigate?: (location: ServiceLocation) => void;
}

function getDaysUntil(date?: Date): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ServiceBadge({ location }: { location: ServiceLocation }) {
  const days = getDaysUntil(location.nextService);
  if (days === null) return null;

  if (days < 0) return <Badge variant="destructive" className="text-xs">{Math.abs(days)}d overdue</Badge>;
  if (days === 0) return <Badge className="bg-yellow-500 text-xs">Today</Badge>;
  if (days <= 2) return <Badge variant="secondary" className="text-xs">In {days}d</Badge>;
  return null;
}

function PriorityDot({ priority }: { priority?: ServiceLocation['priority'] }) {
  if (!priority) return null;
  const colors = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-green-500' };
  return <span className={`w-2 h-2 rounded-full ${colors[priority]} shrink-0`} />;
}

export function LocationList({ locations, onSelect, onCall, onNavigate }: LocationListProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('nextService');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [filterDue, setFilterDue] = useState<FilterDue>('all');

  const filtered = useMemo(() => {
    let result = [...locations];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.contactName?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(l => l.status === filterStatus);
    }

    // Due filter
    if (filterDue !== 'all') {
      result = result.filter(l => {
        const days = getDaysUntil(l.nextService);
        if (days === null) return false;
        if (filterDue === 'overdue') return days < 0;
        if (filterDue === 'today') return days === 0;
        if (filterDue === 'week') return days >= 0 && days <= 7;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'priority') {
        const order = { high: 0, medium: 1, low: 2, undefined: 3 };
        return (order[a.priority as keyof typeof order] ?? 3) - (order[b.priority as keyof typeof order] ?? 3);
      }
      // nextService
      const aDate = a.nextService ? new Date(a.nextService).getTime() : Infinity;
      const bDate = b.nextService ? new Date(b.nextService).getTime() : Infinity;
      return aDate - bDate;
    });

    return result;
  }, [locations, search, sortBy, filterStatus, filterDue]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Search */}
      <div className="p-3 border-b">
        <Input
          placeholder="Search locations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11"
        />
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b flex gap-2 overflow-x-auto">
        <div className="flex gap-1">
          {(['all', 'active', 'paused'] as FilterStatus[]).map(s => (
            <Button
              key={s}
              size="sm"
              variant={filterStatus === s ? 'default' : 'ghost'}
              onClick={() => setFilterStatus(s)}
              className="h-8 text-xs capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="w-px bg-border" />
        <div className="flex gap-1">
          {(['all', 'overdue', 'today', 'week'] as FilterDue[]).map(d => (
            <Button
              key={d}
              size="sm"
              variant={filterDue === d ? 'secondary' : 'ghost'}
              onClick={() => setFilterDue(d)}
              className="h-8 text-xs capitalize"
            >
              {d === 'week' ? '7 days' : d}
            </Button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="px-3 py-2 border-b flex items-center gap-2 text-xs text-muted-foreground">
        <span>Sort:</span>
        {(['nextService', 'name', 'priority'] as SortOption[]).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`capitalize ${sortBy === s ? 'text-foreground font-medium' : ''}`}
          >
            {s === 'nextService' ? 'Due Date' : s}
          </button>
        ))}
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <pre className="text-2xl mb-2">{`><(((*>`}</pre>
            <p>No locations found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(location => (
              <div
                key={location.id}
                className="p-3 hover:bg-muted/50 active:bg-muted cursor-pointer transition-colors"
                onClick={() => onSelect(location)}
              >
                <div className="flex items-start gap-3">
                  <PriorityDot priority={location.priority} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{location.name}</span>
                      <ServiceBadge location={location} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                    {location.tankInfo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {location.tankInfo.gallons}gal {location.tankInfo.type}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {location.contactPhone && onCall && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0"
                        onClick={(e) => { e.stopPropagation(); onCall(location.contactPhone!); }}
                      >
                        <span className="sr-only">Call</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </Button>
                    )}
                    {onNavigate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0"
                        onClick={(e) => { e.stopPropagation(); onNavigate(location); }}
                      >
                        <span className="sr-only">Navigate</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Count */}
      <div className="p-2 border-t text-center text-xs text-muted-foreground">
        {filtered.length} of {locations.length} locations
      </div>
    </div>
  );
}
