import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard, EmptyState } from "@/components/ui/shared";
import { Car, Clock, MapPin, Navigation, Fuel, Home, AlertTriangle, Share2, FileDown } from "lucide-react";
import { format } from "date-fns";
import type { DaySchedule } from "@/types/schedule";
import type { HomeBase } from "@/types/settings";

interface RouteSummaryProps {
  schedule: DaySchedule | undefined;
  homeBase: HomeBase | null;
  startTime: string;
  returnHome: boolean;
}

export function RouteSummary({
  schedule,
  homeBase,
  startTime,
  returnHome,
}: RouteSummaryProps) {
  const stopCount = schedule?.stops.length || 0;
  const totalDriveTime = schedule?.totalDriveTime || 0;
  const totalServiceTime = schedule?.totalServiceTime || 0;
  const estimatedEndTime = schedule?.estimatedEndTime || "--:--";
  const totalMiles = schedule?.totalMiles || 0;

  // Rough fuel estimate: 25 mpg average
  const fuelEstimate = totalMiles > 0 ? (totalMiles / 25).toFixed(1) : "0";

  const handleStartNavigation = () => {
    if (!schedule?.stops.length) return;

    const waypoints = schedule.stops
      .map((s) => `${s.location.lat},${s.location.lng}`)
      .join("/");

    const origin = homeBase
      ? `${homeBase.lat},${homeBase.lng}`
      : waypoints.split("/")[0];

    const destination = returnHome && homeBase
      ? `${homeBase.lat},${homeBase.lng}`
      : waypoints.split("/").pop();

    const waypointsList = schedule.stops
      .slice(returnHome ? 0 : 0, returnHome ? undefined : -1)
      .map((s) => `${s.location.lat},${s.location.lng}`)
      .join("|");

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypointsList}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const handleShare = async () => {
    if (!schedule?.stops.length) return;

    const text = `Route for ${format(new Date(schedule.date), "MMM d, yyyy")}:
${schedule.stops.map((s, i) => `${i + 1}. ${s.location.name}`).join("\n")}

Total: ${stopCount} stops, ~${Math.round(totalDriveTime)} min drive`;

    if (navigator.share) {
      await navigator.share({ title: "Route Plan", text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleExportPDF = () => {
    // PDF export would require a library like jsPDF
    // For now, trigger print dialog as a basic export
    window.print();
  };

  if (!schedule || stopCount === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState icon={MapPin} message="No stops scheduled" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Route Summary
          </span>
          <Badge variant="secondary">{format(new Date(schedule.date), "MMM d")}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={MapPin} value={stopCount} label="Stops" />
          <MetricCard icon={Car} value={`${Math.round(totalDriveTime)} min`} label="Drive Time" />
          <MetricCard icon={Clock} value={`${Math.round(totalServiceTime)} min`} label="Service Time" />
          <MetricCard icon={Clock} value={estimatedEndTime} label="Est. End" iconClassName="text-green-600" />
        </div>

        {/* Distance & Fuel */}
        {totalMiles > 0 && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Navigation className="h-4 w-4" />
              {Math.round(totalMiles)} miles
            </span>
            <span className="flex items-center gap-1">
              <Fuel className="h-4 w-4" />
              ~{fuelEstimate} gal
            </span>
          </div>
        )}

        {/* Home Base Info */}
        {homeBase && (
          <div className="flex items-center gap-2 p-2 rounded border text-sm">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span className="truncate flex-1">{homeBase.address}</span>
            {returnHome && <Badge variant="outline">Round trip</Badge>}
          </div>
        )}

        {/* Warnings */}
        {!homeBase && (
          <div className="flex items-center gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-950 text-sm text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-4 w-4" />
            Set home base for accurate routing
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleStartNavigation} className="flex-1">
            <Navigation className="h-4 w-4 mr-2" />
            Start Navigation
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Time Breakdown */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Start:</span>
            <span>{startTime}</span>
          </div>
          <div className="flex justify-between">
            <span>Drive + Service:</span>
            <span>{Math.round(totalDriveTime + totalServiceTime)} min</span>
          </div>
          <div className="flex justify-between font-medium text-foreground">
            <span>Total Duration:</span>
            <span>
              {Math.floor((totalDriveTime + totalServiceTime) / 60)}h{" "}
              {Math.round((totalDriveTime + totalServiceTime) % 60)}m
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
