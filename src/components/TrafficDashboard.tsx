import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrafficDot, TRAFFIC_COLORS, EmptyState, type TrafficLevel } from "@/components/ui/shared";
import {
  Car,
  Clock,
  AlertTriangle,
  Navigation,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  Circle,
  ArrowRight,
  Zap,
  Loader2,
} from "lucide-react";
import type { ServiceLocation } from "@/types/location";

interface TrafficStop {
  location: ServiceLocation;
  eta: string;
  etaMinutes: number;
  distance: string;
  trafficLevel: TrafficLevel;
  status: "completed" | "current" | "upcoming";
  incidents?: string[];
}

interface TrafficDashboardProps {
  locations: ServiceLocation[];
  homeBase?: { lat: number; lng: number; address: string } | null;
  returnHome?: boolean;
  onNavigate: (location: ServiceLocation) => void;
}

const TRAFFIC_LABELS: Record<TrafficLevel, string> = {
  low: "Light Traffic",
  moderate: "Moderate",
  heavy: "Heavy",
  severe: "Severe Delays",
};

export function TrafficDashboard({ locations, homeBase, returnHome = true, onNavigate }: TrafficDashboardProps) {
  const [stops, setStops] = useState<TrafficStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [routeActive, setRouteActive] = useState(false);

  // Fetch real traffic data from API
  const fetchTrafficData = useCallback(async () => {
    if (locations.length === 0) return;

    setLoading(true);

    const now = new Date();
    let cumulativeMinutes = 0;
    const trafficStops: TrafficStop[] = [];

    // Build ordered list of points: homeBase (if exists) + all locations
    const points: { lat: number; lng: number; location?: ServiceLocation }[] = [];
    if (homeBase) {
      points.push({ lat: homeBase.lat, lng: homeBase.lng });
    }
    locations.forEach((loc) => {
      points.push({ lat: loc.lat, lng: loc.lng, location: loc });
    });

    // Fetch traffic for each leg of the journey
    for (let i = 0; i < points.length - 1; i++) {
      const origin = points[i];
      const dest = points[i + 1];

      if (!dest.location) continue; // Skip if no destination location

      try {
        const params = new URLSearchParams({
          origin: `${origin.lat},${origin.lng}`,
          destination: `${dest.lat},${dest.lng}`,
        });

        const response = await fetch(`/api/traffic?${params}`);

        if (response.ok) {
          const data = await response.json();
          const estimatedMinutes = data.recommended?.estimatedMinutes || 20;
          const trafficLevel = mapTrafficLevel(data.recommended?.trafficLevel || "unknown");
          const distanceKm = data.google?.distance ? data.google.distance / 1000 : 10;
          const distanceMi = (distanceKm * 0.621371).toFixed(1);

          cumulativeMinutes += estimatedMinutes;
          const eta = new Date(now.getTime() + cumulativeMinutes * 60000);

          trafficStops.push({
            location: dest.location,
            eta: eta.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            etaMinutes: cumulativeMinutes,
            distance: `${distanceMi} mi`,
            trafficLevel,
            status: trafficStops.length < currentStopIndex ? "completed" : trafficStops.length === currentStopIndex ? "current" : "upcoming",
            incidents: trafficLevel === "heavy" || trafficLevel === "severe" ? ["Heavy traffic reported"] : undefined,
          });
        } else {
          // Fallback to estimate if API fails
          const fallbackMinutes = 20;
          cumulativeMinutes += fallbackMinutes;
          const eta = new Date(now.getTime() + cumulativeMinutes * 60000);

          trafficStops.push({
            location: dest.location,
            eta: eta.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            etaMinutes: cumulativeMinutes,
            distance: "~10 mi",
            trafficLevel: "low",
            status: trafficStops.length < currentStopIndex ? "completed" : trafficStops.length === currentStopIndex ? "current" : "upcoming",
          });
        }
      } catch {
        // Network error - use fallback
        const fallbackMinutes = 20;
        cumulativeMinutes += fallbackMinutes;
        const eta = new Date(now.getTime() + cumulativeMinutes * 60000);

        trafficStops.push({
          location: dest.location,
          eta: eta.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          etaMinutes: cumulativeMinutes,
          distance: "~10 mi",
          trafficLevel: "low",
          status: trafficStops.length < currentStopIndex ? "completed" : trafficStops.length === currentStopIndex ? "current" : "upcoming",
        });
      }
    }

    setStops(trafficStops);
    setLastUpdate(new Date());
    setLoading(false);
  }, [locations, homeBase, currentStopIndex]);

  // Map API traffic level to UI traffic level
  function mapTrafficLevel(level: string): TrafficLevel {
    const mapping: Record<string, TrafficLevel> = {
      "free flow": "low",
      "light": "low",
      "moderate": "moderate",
      "heavy": "heavy",
      "severe": "severe",
    };
    return mapping[level.toLowerCase()] || "moderate";
  }

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchTrafficData();
  }, [fetchTrafficData]);

  useEffect(() => {
    if (!autoRefresh || !routeActive) return;
    const interval = setInterval(fetchTrafficData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [autoRefresh, routeActive, fetchTrafficData]);

  const handleMarkComplete = () => {
    if (currentStopIndex < stops.length - 1) {
      setCurrentStopIndex((prev) => prev + 1);
    }
  };

  const totalTime = stops.reduce((sum, s) => sum + (s.status !== "completed" ? s.etaMinutes : 0), 0);
  const completedStops = stops.filter((s) => s.status === "completed").length;
  const currentStop = stops.find((s) => s.status === "current");

  if (locations.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center justify-center">
          <EmptyState icon={Car} message="Add locations to see live traffic" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-yellow-500" />
            Live Traffic
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "text-green-500" : "text-muted-foreground"}
            >
              {autoRefresh ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchTrafficData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            Updated {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Route Status Bar */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              variant={routeActive ? "destructive" : "default"}
              onClick={() => setRouteActive(!routeActive)}
            >
              {routeActive ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {routeActive ? "Pause" : "Start Route"}
            </Button>
            <div className="text-sm">
              <span className="font-medium">{completedStops}</span>
              <span className="text-muted-foreground">/{stops.length} stops</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{totalTime} min</div>
            <div className="text-xs text-muted-foreground">remaining</div>
          </div>
        </div>

        {/* Current Stop Highlight */}
        {currentStop && routeActive && (
          <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-primary">Current Stop</Badge>
              <Badge variant="outline" className={TRAFFIC_COLORS[currentStop.trafficLevel]}>
                {TRAFFIC_LABELS[currentStop.trafficLevel]}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg">{currentStop.location.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{currentStop.location.address}</p>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                ETA: {currentStop.eta}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Car className="h-4 w-4" />
                {currentStop.distance}
              </div>
            </div>
            {currentStop.incidents && currentStop.incidents.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-orange-500 mb-3">
                <AlertTriangle className="h-4 w-4" />
                {currentStop.incidents[0]}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onNavigate(currentStop.location)} className="flex-1">
                <Navigation className="h-4 w-4 mr-1" />
                Navigate
              </Button>
              <Button size="sm" variant="outline" onClick={handleMarkComplete} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            </div>
          </div>
        )}

        {/* Stops List */}
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {stops.map((stop) => (
              <div
                key={stop.location.id}
                className={`p-3 rounded-lg border transition-all ${
                  stop.status === "completed"
                    ? "bg-muted/30 opacity-60"
                    : stop.status === "current"
                    ? "bg-primary/5 border-primary"
                    : "bg-card hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div className="shrink-0">
                    {stop.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : stop.status === "current" ? (
                      <div className="h-5 w-5 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Stop Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{stop.location.name}</span>
                      <TrafficDot level={stop.trafficLevel} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {stop.eta}
                      </span>
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {stop.distance}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Button */}
                  {stop.status !== "completed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate(stop.location)}
                      className="shrink-0"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Incidents */}
                {stop.incidents && stop.incidents.length > 0 && stop.status !== "completed" && (
                  <div className="mt-2 ml-8 flex items-center gap-1 text-xs text-orange-500">
                    <AlertTriangle className="h-3 w-3" />
                    {stop.incidents[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Summary Footer */}
        {homeBase && returnHome && (
          <div className="pt-3 border-t text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-1">
              <Navigation className="h-4 w-4" />
              Return to {homeBase.address.split(",")[0]}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
