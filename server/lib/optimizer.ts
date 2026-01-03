/**
 * Route Optimizer - Greedy nearest-neighbor with time window constraints
 * Based on VRPTW (Vehicle Routing Problem with Time Windows)
 */

import { fetchGoogleTraffic } from "./traffic";

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  timeWindow?: { open: string; close: string };
  duration?: number; // minutes at stop
  priority?: "high" | "medium" | "low";
}

export interface HomeBase {
  lat: number;
  lng: number;
  address: string;
}

export interface OptimizeRequest {
  stops: Stop[];
  startTime?: string; // "08:00"
  startLocation?: { lat: number; lng: number };
  homeBase?: HomeBase;
  returnHome?: boolean;
}

export interface OptimizedStop {
  id: string;
  name: string;
  order: number;
  arrivalTime: string;
  departureTime: string;
  waitTime?: number;
  travelTimeFromPrevious: number;
}

export interface OptimizeResponse {
  optimizedRoute: OptimizedStop[];
  totalDuration: number;
  totalDistance: number;
  totalDriveTime: number;
  totalServiceTime: number;
  estimatedEndTime: string;
  feasible: boolean;
  warnings?: string[];
  returnToHomeTime?: number;
}

interface TravelMatrix {
  [from: string]: { [to: string]: { duration: number; distance: number } };
}

function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function getPriorityWeight(priority?: "high" | "medium" | "low"): number {
  switch (priority) {
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 2;
  }
}

async function buildTravelMatrix(stops: Stop[]): Promise<TravelMatrix> {
  const matrix: TravelMatrix = {};
  const coords = stops.map((s) => `${s.lat},${s.lng}`);

  // Build matrix with parallel requests (batched)
  const pairs: Array<{ from: Stop; to: Stop }> = [];
  for (const from of stops) {
    matrix[from.id] = {};
    for (const to of stops) {
      if (from.id !== to.id) {
        pairs.push({ from, to });
      }
    }
  }

  // Fetch in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < pairs.length; i += batchSize) {
    const batch = pairs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async ({ from, to }) => {
        const result = await fetchGoogleTraffic(
          `${from.lat},${from.lng}`,
          `${to.lat},${to.lng}`
        );
        return { from, to, result };
      })
    );

    for (const { from, to, result } of results) {
      matrix[from.id][to.id] = {
        duration: result ? Math.round(result.durationInTraffic / 60) : estimateDistance(from, to),
        distance: result?.distance || 0,
      };
    }
  }

  return matrix;
}

// Haversine fallback when API unavailable
function estimateDistance(from: Stop, to: Stop): number {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  // Assume 50 km/h average speed
  return Math.round((km / 50) * 60);
}

function isFeasible(
  stop: Stop,
  arrivalTime: number
): { feasible: boolean; waitTime: number } {
  if (!stop.timeWindow) {
    return { feasible: true, waitTime: 0 };
  }

  const open = timeToMinutes(stop.timeWindow.open);
  const close = timeToMinutes(stop.timeWindow.close);

  // Can't arrive after close
  if (arrivalTime > close) {
    return { feasible: false, waitTime: 0 };
  }

  // If arrive before open, wait
  const waitTime = arrivalTime < open ? open - arrivalTime : 0;
  return { feasible: true, waitTime };
}

function scoreCandidate(
  stop: Stop,
  travelTime: number,
  currentTime: number,
  remainingStops: Stop[]
): number {
  const arrival = currentTime + travelTime;
  const { feasible, waitTime } = isFeasible(stop, arrival);

  if (!feasible) return -Infinity;

  // Score: lower is better
  let score = travelTime + waitTime;

  // Penalize if time window is tight
  if (stop.timeWindow) {
    const close = timeToMinutes(stop.timeWindow.close);
    const slack = close - arrival;
    if (slack < 60) score -= 50; // Urgent - prioritize
  }

  // Priority bonus (high priority = lower score = better)
  score -= getPriorityWeight(stop.priority) * 30;

  return -score; // Negate so higher is better for sorting
}

export async function optimizeRoute(
  request: OptimizeRequest
): Promise<OptimizeResponse> {
  const { stops, startTime = "08:00", startLocation, homeBase, returnHome = false } = request;
  const warnings: string[] = [];
  let totalDriveTime = 0;
  let totalServiceTime = 0;

  if (stops.length === 0) {
    return {
      optimizedRoute: [],
      totalDuration: 0,
      totalDistance: 0,
      totalDriveTime: 0,
      totalServiceTime: 0,
      estimatedEndTime: startTime,
      feasible: true,
    };
  }

  // Add homeBase as virtual start/end if provided
  const allStops = homeBase
    ? [{ id: "__home__", name: "Home Base", lat: homeBase.lat, lng: homeBase.lng }, ...stops]
    : stops;

  // Build travel time matrix (include home if needed)
  const matrixStops = homeBase
    ? [...stops, { id: "__home__", name: "Home Base", lat: homeBase.lat, lng: homeBase.lng } as Stop]
    : stops;
  const matrix = await buildTravelMatrix(matrixStops);

  // Greedy nearest-neighbor with time window priority
  const unvisited = new Set(stops.map((s) => s.id));
  const stopMap = new Map(stops.map((s) => [s.id, s]));
  const route: OptimizedStop[] = [];

  let currentTime = timeToMinutes(startTime);
  let currentId: string | null = null;
  let totalDistance = 0;
  let feasible = true;

  // Find starting stop (prioritize high priority with early close)
  const sortedByUrgency = [...stops].sort((a, b) => {
    // High priority with early close time goes first
    const aClose = a.timeWindow ? timeToMinutes(a.timeWindow.close) : 1440;
    const bClose = b.timeWindow ? timeToMinutes(b.timeWindow.close) : 1440;
    const aPrio = getPriorityWeight(a.priority);
    const bPrio = getPriorityWeight(b.priority);

    // High priority with tight window first
    if (aPrio !== bPrio) return bPrio - aPrio;
    return aClose - bClose;
  });

  // Start with most urgent if it's truly urgent
  const firstCandidate = sortedByUrgency[0];
  if (
    firstCandidate.priority === "high" ||
    (firstCandidate.timeWindow &&
      timeToMinutes(firstCandidate.timeWindow.close) < currentTime + 240)
  ) {
    currentId = firstCandidate.id;
  }

  while (unvisited.size > 0) {
    let bestId: string | null = null;
    let bestScore = -Infinity;
    let bestTravel = 0;

    // If no current location, find best starting point
    if (!currentId) {
      for (const id of unvisited) {
        const stop = stopMap.get(id)!;
        const score = scoreCandidate(stop, 0, currentTime, [...unvisited].map(i => stopMap.get(i)!));
        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      }
    } else {
      // Find best next stop
      for (const id of unvisited) {
        const travel = matrix[currentId]?.[id]?.duration || 30;
        const stop = stopMap.get(id)!;
        const score = scoreCandidate(stop, travel, currentTime, [...unvisited].map(i => stopMap.get(i)!));
        if (score > bestScore) {
          bestScore = score;
          bestId = id;
          bestTravel = travel;
        }
      }
    }

    if (!bestId) {
      // No feasible next stop - take any remaining
      bestId = [...unvisited][0];
      bestTravel = currentId ? (matrix[currentId]?.[bestId]?.duration || 30) : 0;
      warnings.push(`Stop ${bestId} may not be reachable within time window`);
      feasible = false;
    }

    const stop = stopMap.get(bestId)!;
    const travelTime = currentId ? bestTravel : 0;
    const arrival = currentTime + travelTime;
    const { feasible: stopFeasible, waitTime } = isFeasible(stop, arrival);

    if (!stopFeasible) {
      warnings.push(`Cannot reach ${stop.name} before close time`);
      feasible = false;
    }

    const actualArrival = arrival + (waitTime || 0);
    const duration = stop.duration || 30;
    const departure = actualArrival + duration;

    route.push({
      id: stop.id,
      name: stop.name,
      order: route.length + 1,
      arrivalTime: minutesToTime(actualArrival),
      departureTime: minutesToTime(departure),
      waitTime: waitTime > 0 ? waitTime : undefined,
      travelTimeFromPrevious: travelTime,
    });

    totalDistance += currentId ? (matrix[currentId]?.[bestId]?.distance || 0) : 0;
    totalDriveTime += travelTime;
    totalServiceTime += duration;
    currentTime = departure;
    currentId = bestId;
    unvisited.delete(bestId);
  }

  // Calculate return to home if requested
  let returnToHomeTime: number | undefined;
  if (returnHome && homeBase && currentId) {
    const lastStop = stopMap.get(currentId);
    if (lastStop) {
      const homeReturn = matrix[currentId]?.["__home__"]?.duration ||
        estimateDistance(lastStop, { id: "__home__", name: "Home", lat: homeBase.lat, lng: homeBase.lng });
      returnToHomeTime = homeReturn;
      totalDriveTime += homeReturn;
      currentTime += homeReturn;
      totalDistance += matrix[currentId]?.["__home__"]?.distance || 0;
    }
  }

  const totalDuration = currentTime - timeToMinutes(startTime);

  return {
    optimizedRoute: route,
    totalDuration,
    totalDistance,
    totalDriveTime,
    totalServiceTime,
    estimatedEndTime: minutesToTime(currentTime),
    feasible,
    warnings: warnings.length > 0 ? warnings : undefined,
    returnToHomeTime,
  };
}
