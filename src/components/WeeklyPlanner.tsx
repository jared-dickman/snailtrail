import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  GripVertical,
  Clock,
  Car,
  Droplets,
  Fish,
  Waves,
  AlertCircle,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import type { DaySchedule, ScheduledStop } from "@/types/schedule";
import { tankTypeBadgeColors } from "@/types/schedule";

interface WeeklyPlannerProps {
  schedules: Record<string, DaySchedule>;
  selectedDate: Date;
  onReorderStops: (date: Date, stopIds: string[]) => void;
  onMoveStop: (fromDate: Date, toDate: Date, stopId: string) => void;
  maxStopsPerDay: number;
}

const TankIcon = ({ type }: { type: "freshwater" | "saltwater" | "reef" }) => {
  switch (type) {
    case "freshwater":
      return <Droplets className="h-3 w-3" />;
    case "saltwater":
      return <Fish className="h-3 w-3" />;
    case "reef":
      return <Waves className="h-3 w-3" />;
  }
};

interface SortableStopCardProps {
  stop: ScheduledStop;
  index: number;
}

function SortableStopCard({ stop, index }: SortableStopCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const tankType = stop.location.tankInfo?.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border bg-card ${
        isDragging ? "shadow-lg ring-2 ring-primary" : ""
      }`}
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">
        {index + 1}
      </span>

      {tankType && (
        <Badge variant="outline" className={`${tankTypeBadgeColors[tankType]} shrink-0`}>
          <TankIcon type={tankType} />
        </Badge>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{stop.location.name}</div>
        {stop.location.serviceSchedule?.timeWindow && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {stop.location.serviceSchedule.timeWindow.open} -{" "}
            {stop.location.serviceSchedule.timeWindow.close}
          </div>
        )}
      </div>

      {stop.travelTimeFromPrevious !== undefined && stop.travelTimeFromPrevious > 0 && (
        <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
          <Car className="h-3 w-3" />
          {stop.travelTimeFromPrevious}m
        </div>
      )}
    </div>
  );
}

function StopCard({ stop, index }: { stop: ScheduledStop; index: number }) {
  const tankType = stop.location.tankInfo?.type;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-card shadow-lg">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
        {index + 1}
      </span>
      {tankType && (
        <Badge variant="outline" className={tankTypeBadgeColors[tankType]}>
          <TankIcon type={tankType} />
        </Badge>
      )}
      <span className="font-medium text-sm truncate">{stop.location.name}</span>
    </div>
  );
}

export function WeeklyPlanner({
  schedules,
  selectedDate,
  onReorderStops,
  onMoveStop: _onMoveStop,
  maxStopsPerDay,
}: WeeklyPlannerProps) {
  void _onMoveStop; // Reserved for future cross-day drag
  const [activeStop, setActiveStop] = useState<ScheduledStop | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getScheduleForDate = (date: Date): DaySchedule | undefined => {
    const key = format(date, "yyyy-MM-dd");
    return schedules[key];
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    for (const day of weekDays) {
      const schedule = getScheduleForDate(day);
      const idx = schedule?.stops.findIndex((s) => s.id === active.id);
      if (idx !== undefined && idx >= 0) {
        setActiveStop(schedule!.stops[idx]);
        setActiveIndex(idx);
        break;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStop(null);

    if (!over) return;

    // Find which day contains the active item
    let sourceDate: Date | null = null;
    let sourceSchedule: DaySchedule | null = null;

    for (const day of weekDays) {
      const schedule = getScheduleForDate(day);
      if (schedule?.stops.some((s) => s.id === active.id)) {
        sourceDate = day;
        sourceSchedule = schedule;
        break;
      }
    }

    if (!sourceDate || !sourceSchedule) return;

    // Reorder within same day
    if (active.id !== over.id) {
      const oldIndex = sourceSchedule.stops.findIndex((s) => s.id === active.id);
      const newIndex = sourceSchedule.stops.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(
          sourceSchedule.stops.map((s) => s.id),
          oldIndex,
          newIndex
        );
        onReorderStops(sourceDate, newOrder);
      }
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Weekly Planner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const schedule = getScheduleForDate(day);
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
              const hasConflict = schedule && schedule.stops.length > maxStopsPerDay;

              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-lg border p-2 min-h-[200px] ${
                    isSelected ? "ring-2 ring-primary" : ""
                  } ${isToday ? "bg-primary/5" : "bg-muted/30"} ${
                    hasConflict ? "border-destructive" : ""
                  }`}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {format(day, "EEE")}
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        isToday ? "text-primary" : ""
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    {schedule && schedule.stops.length > 0 && (
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Badge
                          variant={hasConflict ? "destructive" : "secondary"}
                          className="text-[10px] px-1"
                        >
                          {schedule.stops.length}
                        </Badge>
                        {hasConflict && <AlertCircle className="h-3 w-3 text-destructive" />}
                      </div>
                    )}
                  </div>

                  <ScrollArea className="h-[140px]">
                    {schedule && schedule.stops.length > 0 ? (
                      <SortableContext
                        items={schedule.stops.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
                          {schedule.stops.map((stop, i) => (
                            <SortableStopCard key={stop.id} stop={stop} index={i} />
                          ))}
                        </div>
                      </SortableContext>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        No stops
                      </div>
                    )}
                  </ScrollArea>

                  {schedule?.totalDriveTime && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground text-center">
                      <Car className="h-3 w-3 inline mr-1" />
                      {Math.round(schedule.totalDriveTime)} min
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeStop && <StopCard stop={activeStop} index={activeIndex} />}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}
