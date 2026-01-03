/**
 * Traffic API integrations - Google Routes API + TomTom + HERE
 */

// Traffic thresholds (ratio of actual vs free-flow time)
const LIGHT_THRESHOLD = 1.2;
const MODERATE_THRESHOLD = 1.5;
const FLOW_LIGHT_THRESHOLD = 1.15;
const FLOW_MODERATE_THRESHOLD = 1.3;
const SECONDS_PER_MINUTE = 60;

function parseCoords(coord: string): [number, number] {
  const [lat, lng] = coord.split(",").map(Number);
  return [lat, lng];
}

export interface GoogleTrafficResult {
  duration: number;
  durationInTraffic: number;
  distance: number;
  trafficCondition: "light" | "moderate" | "heavy";
}

export interface TomTomTrafficResult {
  freeFlowTravelTime: number;
  currentTravelTime: number;
  confidence: number;
}

export interface HereTrafficResult {
  duration: number;
  durationInTraffic: number;
  distance: number;
  trafficCondition: "light" | "moderate" | "heavy";
}

export interface TrafficResponse {
  google?: GoogleTrafficResult;
  tomtom?: TomTomTrafficResult;
  here?: HereTrafficResult;
  recommended: {
    provider: "google" | "tomtom" | "here";
    estimatedMinutes: number;
    trafficLevel: string;
  };
}

function getTrafficCondition(duration: number, durationInTraffic: number): "light" | "moderate" | "heavy" {
  const ratio = durationInTraffic / duration;
  if (ratio < LIGHT_THRESHOLD) return "light";
  if (ratio < MODERATE_THRESHOLD) return "moderate";
  return "heavy";
}

function getTrafficLevel(ratio: number): string {
  if (ratio < FLOW_LIGHT_THRESHOLD) return "free flow";
  if (ratio < FLOW_MODERATE_THRESHOLD) return "light";
  if (ratio < MODERATE_THRESHOLD) return "moderate";
  return "heavy";
}

export async function fetchGoogleTraffic(
  origin: string,
  destination: string,
  waypoints?: string
): Promise<GoogleTrafficResult | null> {
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return null;
  }

  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
  const [originLat, originLng] = parseCoords(origin);
  const [destLat, destLng] = parseCoords(destination);

  const body = {
    origin: {
      location: {
        latLng: { latitude: originLat, longitude: originLng },
      },
    },
    destination: {
      location: {
        latLng: { latitude: destLat, longitude: destLng },
      },
    },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    extraComputations: ["TRAFFIC_ON_POLYLINE"],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.duration,routes.staticDuration,routes.distanceMeters,routes.travelAdvisory",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error("Google Routes API error:", await response.text());
    return null;
  }

  const data = await response.json();
  const route = data.routes?.[0];

  if (!route) return null;

  const duration = parseInt(route.staticDuration?.replace("s", "") || "0");
  const durationInTraffic = parseInt(route.duration?.replace("s", "") || "0");

  return {
    duration,
    durationInTraffic,
    distance: route.distanceMeters || 0,
    trafficCondition: getTrafficCondition(duration, durationInTraffic),
  };
}

export async function fetchTomTomTraffic(
  origin: string
): Promise<TomTomTrafficResult | null> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    return null;
  }

  const [lat, lng] = parseCoords(origin);

  // Flow Segment Data API - gets traffic for road segment at location
  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    console.error("TomTom API error:", await response.text());
    return null;
  }

  const data = await response.json();
  const flow = data.flowSegmentData;

  if (!flow) return null;

  return {
    freeFlowTravelTime: flow.freeFlowTravelTime || 0,
    currentTravelTime: flow.currentTravelTime || 0,
    confidence: flow.confidence || 0,
  };
}

export async function fetchHereTraffic(
  origin: string,
  destination: string
): Promise<HereTrafficResult | null> {
  const apiKey = process.env.HERE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const [originLat, originLng] = parseCoords(origin);
  const [destLat, destLng] = parseCoords(destination);

  // HERE Routing API v8 with traffic
  const url = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${originLat},${originLng}&destination=${destLat},${destLng}&return=summary&apiKey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    console.error("HERE API error:", await response.text());
    return null;
  }

  const data = await response.json();
  const route = data.routes?.[0]?.sections?.[0];

  if (!route?.summary) return null;

  const duration = route.summary.baseDuration || 0;
  const durationInTraffic = route.summary.duration || 0;

  return {
    duration,
    durationInTraffic,
    distance: route.summary.length || 0,
    trafficCondition: getTrafficCondition(duration, durationInTraffic),
  };
}

export async function getTrafficData(
  origin: string,
  destination: string,
  waypoints?: string
): Promise<TrafficResponse> {
  const [google, tomtom, here] = await Promise.all([
    fetchGoogleTraffic(origin, destination, waypoints),
    fetchTomTomTraffic(origin),
    fetchHereTraffic(origin, destination),
  ]);

  // Determine recommended provider - prefer Google, then HERE, then TomTom
  let provider: "google" | "tomtom" | "here" = "google";
  let estimatedMinutes = 0;
  let trafficLevel = "unknown";

  if (google) {
    estimatedMinutes = Math.round(google.durationInTraffic / SECONDS_PER_MINUTE);
    trafficLevel = google.trafficCondition;
  } else if (here) {
    provider = "here";
    estimatedMinutes = Math.round(here.durationInTraffic / SECONDS_PER_MINUTE);
    trafficLevel = here.trafficCondition;
  } else if (tomtom) {
    provider = "tomtom";
    estimatedMinutes = Math.round(tomtom.currentTravelTime / SECONDS_PER_MINUTE);
    const ratio = tomtom.currentTravelTime / (tomtom.freeFlowTravelTime || 1);
    trafficLevel = getTrafficLevel(ratio);
  }

  return {
    google: google || undefined,
    tomtom: tomtom || undefined,
    here: here || undefined,
    recommended: {
      provider,
      estimatedMinutes,
      trafficLevel,
    },
  };
}
