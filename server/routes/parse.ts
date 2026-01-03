import { Hono } from "hono";
import { parseLocationConstraint } from "../lib/nlp";

const parse = new Hono();

parse.post("/", async (c) => {
  const body = await c.req.json<{ text?: string }>();

  if (!body.text || typeof body.text !== "string") {
    return c.json({ error: "Missing 'text' field" }, 400);
  }

  const constraint = await parseLocationConstraint(body.text);
  return c.json(constraint);
});

export default parse;
