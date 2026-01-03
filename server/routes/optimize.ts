import { Hono } from "hono";
import { optimizeRoute, type OptimizeRequest } from "../lib/optimizer";

const optimize = new Hono();

optimize.post("/", async (c) => {
  const body = await c.req.json<OptimizeRequest>();

  if (!body.stops || !Array.isArray(body.stops) || body.stops.length === 0) {
    return c.json({ error: "Missing or empty stops array" }, 400);
  }

  // Validate stops
  for (const stop of body.stops) {
    if (!stop.id || !stop.name || typeof stop.lat !== "number" || typeof stop.lng !== "number") {
      return c.json({ error: `Invalid stop: ${JSON.stringify(stop)}` }, 400);
    }
  }

  const result = await optimizeRoute(body);
  return c.json(result);
});

export default optimize;
