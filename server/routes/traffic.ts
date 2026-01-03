import { Hono } from "hono";
import { getTrafficData } from "../lib/traffic";

const traffic = new Hono();

traffic.get("/", async (c) => {
  const origin = c.req.query("origin");
  const destination = c.req.query("destination");
  const waypoints = c.req.query("waypoints");

  if (!origin || !destination) {
    return c.json(
      { error: "Missing required params: origin and destination (lat,lng)" },
      400
    );
  }

  // Validate coordinate format
  const coordRegex = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
  if (!coordRegex.test(origin) || !coordRegex.test(destination)) {
    return c.json(
      { error: "Invalid coordinate format. Use: lat,lng (e.g., 40.3573,-74.6672)" },
      400
    );
  }

  const data = await getTrafficData(origin, destination, waypoints);

  if (!data.google && !data.tomtom) {
    return c.json(
      { error: "No traffic data available. Check API keys in .env.local" },
      503
    );
  }

  return c.json(data);
});

export default traffic;
