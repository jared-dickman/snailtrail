import { Hono } from "hono";
import { getTrafficData } from "../lib/traffic";
import { badRequest, serviceUnavailable } from "../lib/response";

const traffic = new Hono();

const COORD_REGEX = /^-?\d+\.?\d*,-?\d+\.?\d*$/;

traffic.get("/", async (c) => {
  const origin = c.req.query("origin");
  const destination = c.req.query("destination");
  const waypoints = c.req.query("waypoints");

  if (!origin || !destination) {
    return badRequest(c, "Missing required params: origin and destination (lat,lng)");
  }

  if (!COORD_REGEX.test(origin) || !COORD_REGEX.test(destination)) {
    return badRequest(c, "Invalid coordinate format. Use: lat,lng (e.g., 40.3573,-74.6672)");
  }

  const data = await getTrafficData(origin, destination, waypoints);

  if (!data.google && !data.tomtom) {
    return serviceUnavailable(c, "No traffic data available. Check API keys in .env.local");
  }

  return c.json(data);
});

export default traffic;
