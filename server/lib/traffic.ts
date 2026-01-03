/**
 * Traffic API integrations - Google Routes API + TomTom Traffic Flow
 */

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

export interface TrafficResponse {
  google?: GoogleTrafficResult;
  tomtom?: TomTomTrafficResult;
  recommended: {
    provider: "google" | "tomtom";
    estimatedMinutes: number;
    trafficLevel: string;
  };
}

function getTrafficCondition(
  duration: number,
  durationInTraffic: number
): "light" | "moderate" | "heavy" {
  const ratio = durationInTraffic / duration;
  if (ratio < 1.2) return "light";
  if (ratio < 1.5) return "moderate";
  return "heavy";
}

function getTrafficLevel(ratio: number): string {
  if (ratio < 1.15) return "free flow";
  if (ratio < 1.3) return "light";
  if (ratio < 1.5) return "moderate";
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

  const [originLat, originLng] = origin.split(",").map(Number);
  const [destLat, destLng] = destination.split(",").map(Number);

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

  const [lat, lng] = origin.split(",").map(Number);

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

export async function getTrafficData(
  origin: string,
  destination: string,
  waypoints?: string
): Promise<TrafficResponse> {
  const [google, tomtom] = await Promise.all([
    fetchGoogleTraffic(origin, destination, waypoints),
    fetchTomTomTraffic(origin),
  ]);

  // Determine recommended provider
  let provider: "google" | "tomtom" = "google";
  let estimatedMinutes = 0;
  let trafficLevel = "unknown";

  if (google) {
    estimatedMinutes = Math.round(google.durationInTraffic / 60);
    trafficLevel = google.trafficCondition;
  } else if (tomtom) {
    provider = "tomtom";
    estimatedMinutes = Math.round(tomtom.currentTravelTime / 60);
    const ratio = tomtom.currentTravelTime / (tomtom.freeFlowTravelTime || 1);
    trafficLevel = getTrafficLevel(ratio);
  }

  return {
    google: google || undefined,
    tomtom: tomtom || undefined,
    recommended: {
      provider,
      estimatedMinutes,
      trafficLevel,
    },
  };
}
