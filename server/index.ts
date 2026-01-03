import { Hono } from "hono";
import { cors } from "hono/cors";
import parse from "./routes/parse";
import traffic from "./routes/traffic";
import optimize from "./routes/optimize";
import ai from "./routes/ai";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: "http://localhost:5173",
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

app.route("/api/parse", parse);
app.route("/api/traffic", traffic);
app.route("/api/optimize", optimize);
app.route("/api/ai", ai);

app.get("/", (c) => c.text("Snailtrail API"));

export default {
  port: 3000,
  fetch: app.fetch,
};
