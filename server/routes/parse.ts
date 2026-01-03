import { Hono } from "hono";
import { parseLocationConstraint, parseFullLocation } from "../lib/nlp";
import { badRequest } from "../lib/response";

const parse = new Hono();

const requireText = (body: { text?: string }) =>
  !body.text || typeof body.text !== "string" ? "Missing 'text' field" : null;

parse.post("/", async (c) => {
  const body = await c.req.json<{ text?: string }>();
  const err = requireText(body);
  if (err) return badRequest(c, err);

  const constraint = await parseLocationConstraint(body.text!);
  return c.json(constraint);
});

parse.post("/location", async (c) => {
  const body = await c.req.json<{ text?: string }>();
  const err = requireText(body);
  if (err) return badRequest(c, err);

  const parsed = await parseFullLocation(body.text!);
  return c.json(parsed);
});

export default parse;
