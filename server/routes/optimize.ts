import { Hono } from "hono";
import { optimizeRoute, type OptimizeRequest } from "../lib/optimizer";
import { badRequest } from "../lib/response";

const optimize = new Hono();

optimize.post("/", async (c) => {
  const body = await c.req.json<OptimizeRequest>();

  if (!body.stops || !Array.isArray(body.stops) || body.stops.length === 0) {
    return badRequest(c, "Missing or empty stops array");
  }

  for (const stop of body.stops) {
    if (!stop.id || !stop.name || typeof stop.lat !== "number" || typeof stop.lng !== "number") {
      return badRequest(c, `Invalid stop: ${JSON.stringify(stop)}`);
    }
  }

  const result = await optimizeRoute(body);
  return c.json(result);
});

export default optimize;
