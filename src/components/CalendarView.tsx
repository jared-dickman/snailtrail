import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TankTypeIcon, TankTypeDot } from "@/components/ui/shared";
import { CalendarDays, Clock, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { DaySchedule } from "@/types/schedule";
import { tankTypeBadgeColors } from "@/types/schedule";

interface CalendarViewProps {
  schedules: Record<string, DaySchedule>;
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
  maxStopsPerDay: number;
}

export function CalendarView({
  schedules,
  onDateSelect,
  selectedDate,
  maxStopsPerDay,
}: CalendarViewProps) {

  const scheduledDates = useMemo(() => {
    return Object.entries(schedules)
      .filter(([_, schedule]) => schedule.stops.length > 0)
      .map(([dateStr]) => parseISO(dateStr)); // parseISO handles timezone correctly
  }, [schedules]);

  const getScheduleForDate = (date: Date): DaySchedule | undefined => {
    const key = format(date, "yyyy-MM-dd");
    return schedules[key];
  };

  const hasConflict = (schedule: DaySchedule): boolean => {
    return schedule.stops.length > maxStopsPerDay;
  };

  const getDayContent = (day: Date) => {
    const schedule = getScheduleForDate(day);
    if (!schedule || schedule.stops.length === 0) return null;

    const conflict = hasConflict(schedule);
    const tankTypes = new Set(
      schedule.stops
        .map((s) => s.location.tankInfo?.type)
        .filter((t): t is "freshwater" | "saltwater" | "reef" => !!t)
    );

    // Show stop count badge + tank type dots
    const hasTankTypes = tankTypes.size > 0;
    const stopCount = schedule.stops.length;

    return (
      <div className="absolute -bottom-1 left-0 right-0 flex flex-col items-center gap-0">
        {conflict && <AlertTriangle className="h-2 w-2 text-destructive" />}
        <div className="flex items-center gap-0.5">
          {hasTankTypes ? (
            Array.from(tankTypes).map((type) => (
              <TankTypeDot key={type} type={type} className="h-2 w-2" />
            ))
          ) : (
            <span className="text-[10px] font-medium text-primary bg-primary/20 rounded-full px-1 min-w-[16px] text-center">
              {stopCount}
            </span>
          )}
        </div>
      </div>
    );
  };

  const selectedSchedule = getScheduleForDate(selectedDate);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5" />
          Service Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateSelect(date)}
          weekStartsOn={0}
          modifiers={{
            scheduled: scheduledDates,
          }}
          modifiersClassNames={{
            scheduled: "font-bold",
          }}
          components={{
            DayButton: ({ day, modifiers, ...props }) => {
              const schedule = getScheduleForDate(day.date);
              const stopCount = schedule?.stops.length || 0;
              const conflict = schedule && hasConflict(schedule);

              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      {...props}
                      className={`relative w-full h-full p-1 text-sm rounded-md hover:bg-accent flex flex-col items-center justify-center ${
                        modifiers.selected ? "bg-primary text-primary-foreground" : ""
                      } ${modifiers.today ? "border border-primary" : ""} ${
                        conflict ? "ring-1 ring-destructive" : ""
                      }`}
                    >
                      <span>{format(day.date, "d")}</span>
                      {stopCount > 0 && (
                        <span className={`text-[9px] font-semibold leading-none ${
                          modifiers.selected ? "text-primary-foreground/80" : "text-primary"
                        }`}>
                          •{stopCount}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  {stopCount > 0 && (
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="space-y-2">
                        <div className="font-medium text-sm">
                          {format(day.date, "EEEE, MMM d")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {stopCount} stop{stopCount !== 1 ? "s" : ""}
                          {schedule?.totalDriveTime && (
                            <span className="ml-2">
                              • {Math.round(schedule.totalDriveTime)} min drive
                            </span>
                          )}
                        </div>
                        <ScrollArea className="max-h-32">
                          {schedule?.stops.map((stop) => (
                            <div
                              key={stop.id}
                              className="flex items-center gap-2 py-1 text-xs"
                            >
                              {stop.location.tankInfo?.type && (
                                <TankTypeIcon type={stop.location.tankInfo.type} />
                              )}
                              <span className="truncate">{stop.location.name}</span>
                            </div>
                          ))}
                        </ScrollArea>
                        {conflict && (
                          <div className="flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            Exceeds {maxStopsPerDay} stops
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            },
          }}
        />

        {/* Selected Day Summary */}
        {selectedSchedule && selectedSchedule.stops.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                {format(selectedDate, "EEEE, MMM d")}
              </span>
              <Badge variant={hasConflict(selectedSchedule) ? "destructive" : "secondary"}>
                {selectedSchedule.stops.length} stops
              </Badge>
            </div>

            <div className="flex gap-2 text-xs text-muted-foreground">
              {selectedSchedule.totalDriveTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.round(selectedSchedule.totalDriveTime)} min drive
                </span>
              )}
              {selectedSchedule.estimatedEndTime && (
                <span>• Done by {selectedSchedule.estimatedEndTime}</span>
              )}
            </div>

            <ScrollArea className="max-h-40">
              <div className="space-y-1">
                {selectedSchedule.stops.map((stop, i) => (
                  <div
                    key={stop.id}
                    className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    {stop.location.tankInfo?.type && (
                      <Badge
                        variant="outline"
                        className={tankTypeBadgeColors[stop.location.tankInfo.type]}
                      >
                        <TankTypeIcon type={stop.location.tankInfo.type} />
                      </Badge>
                    )}
                    <span className="truncate flex-1">{stop.location.name}</span>
                    {stop.estimatedArrival && (
                      <span className="text-xs text-muted-foreground">
                        {stop.estimatedArrival}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Legend */}
        <div className="border-t pt-3 flex gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <TankTypeDot type="freshwater" />
            Freshwater
          </div>
          <div className="flex items-center gap-1">
            <TankTypeDot type="saltwater" />
            Saltwater
          </div>
          <div className="flex items-center gap-1">
            <TankTypeDot type="reef" />
            Reef
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
