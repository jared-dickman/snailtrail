import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResponsiveModal } from '@/components/ui/shared';
import { Droplets, Play, Plus, X, AlertCircle } from 'lucide-react';
import type { DaySchedule, ScheduledStop } from '@/types/schedule';

interface RouteConfirmationModalProps {
  schedule: DaySchedule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (schedule: DaySchedule) => void;
  onUpdateStop: (stopId: string, updates: Partial<ScheduledStop>) => void;
}

function StopCard({ stop, onUpdate }: {
  stop: ScheduledStop;
  onUpdate: (updates: Partial<ScheduledStop>) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [oneOffNotes, setOneOffNotes] = useState(stop.oneOffNotes || '');
  const [oneOffTasks, setOneOffTasks] = useState<string[]>(stop.oneOffTasks || []);
  const [newTask, setNewTask] = useState('');
  const waterNeeded = stop.waterGallonsNeeded || stop.location.waterGallonsNeeded || 0;

  const addTask = () => {
    if (newTask.trim()) {
      const updated = [...oneOffTasks, newTask.trim()];
      setOneOffTasks(updated);
      onUpdate({ oneOffTasks: updated });
      setNewTask('');
    }
  };

  const removeTask = (idx: number) => {
    const updated = oneOffTasks.filter((_, i) => i !== idx);
    setOneOffTasks(updated);
    onUpdate({ oneOffTasks: updated });
  };

  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{stop.location.name}</div>
          <div className="text-xs text-muted-foreground">{stop.location.address}</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Droplets className="h-4 w-4 text-blue-500" />
          <Input
            type="number"
            value={stop.waterGallonsNeeded ?? waterNeeded}
            onChange={(e) => onUpdate({ waterGallonsNeeded: parseInt(e.target.value) || 0 })}
            className="w-16 h-8 text-sm"
            min={0}
          />
          <span className="text-xs text-muted-foreground">gal</span>
        </div>
      </div>

      {/* Client notes reminder */}
      {stop.location.clientNotes && (
        <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          {stop.location.clientNotes}
        </div>
      )}

      {/* One-off notes toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full h-8 text-xs"
        onClick={() => setShowNotes(!showNotes)}
      >
        <Plus className="h-3 w-3 mr-1" />
        {showNotes ? 'Hide' : 'Add'} today's notes/tasks
      </Button>

      {showNotes && (
        <div className="space-y-2 pt-2 border-t">
          <textarea
            value={oneOffNotes}
            onChange={(e) => {
              setOneOffNotes(e.target.value);
              onUpdate({ oneOffNotes: e.target.value || undefined });
            }}
            className="w-full p-2 rounded border bg-background text-sm min-h-[60px] resize-none"
            placeholder="Special notes for today only..."
          />

          <div className="space-y-1">
            <label className="text-xs font-medium">One-off Tasks</label>
            {oneOffTasks.map((task, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 p-1 bg-muted/50 rounded text-xs">{task}</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeTask(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-1">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add task..."
                className="h-8 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
              />
              <Button size="sm" className="h-8" onClick={addTask}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmationContent({ schedule, onConfirm, onUpdateStop, onClose }: {
  schedule: DaySchedule;
  onConfirm: (schedule: DaySchedule) => void;
  onUpdateStop: (stopId: string, updates: Partial<ScheduledStop>) => void;
  onClose: () => void;
}) {
  const totalWater = schedule.stops.reduce((sum, stop) =>
    sum + (stop.waterGallonsNeeded ?? stop.location.waterGallonsNeeded ?? 0), 0
  );
  const totalTime = schedule.stops.reduce((sum, stop) =>
    sum + (stop.location.estimatedDuration || 30), 0
  );

  const handleConfirm = () => {
    onConfirm({ ...schedule, confirmed: true, totalWaterNeeded: totalWater });
    toast.success('Route confirmed - let\'s go!');
    onClose();
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold">{schedule.stops.length}</div>
          <div className="text-xs text-muted-foreground">Stops</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">{totalWater}</div>
          <div className="text-xs text-muted-foreground">Gallons</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{Math.round(totalTime / 60)}h</div>
          <div className="text-xs text-muted-foreground">Est. Time</div>
        </div>
      </div>

      {/* Stops list */}
      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-2 pr-2">
          {schedule.stops.map((stop, i) => (
            <div key={stop.id} className="flex gap-2">
              <div className="flex flex-col items-center">
                <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                  {i + 1}
                </Badge>
                {i < schedule.stops.length - 1 && (
                  <div className="w-px h-full bg-border my-1" />
                )}
              </div>
              <div className="flex-1">
                <StopCard
                  stop={stop}
                  onUpdate={(updates) => onUpdateStop(stop.id, updates)}
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Button onClick={handleConfirm} className="w-full h-12 text-lg">
        <Play className="h-5 w-5 mr-2" />
        Start Route
      </Button>
    </div>
  );
}

export function RouteConfirmationModal({ schedule, open, onOpenChange, onConfirm, onUpdateStop }: RouteConfirmationModalProps) {
  if (!schedule) return null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm Today's Route"
      className="max-w-lg"
    >
      <ConfirmationContent
        schedule={schedule}
        onConfirm={onConfirm}
        onUpdateStop={onUpdateStop}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveModal>
  );
}
