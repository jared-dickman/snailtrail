/**
 * Shared HTTP response helpers - DRY error handling
 */
import type { Context } from "hono";

export const httpError = (c: Context, message: string, status: 400 | 401 | 403 | 404 | 422 | 500 | 503 = 400) =>
  c.json({ error: message }, status);

export const badRequest = (c: Context, message: string) => httpError(c, message, 400);
export const notFound = (c: Context, message: string) => httpError(c, message, 404);
export const serviceUnavailable = (c: Context, message: string) => httpError(c, message, 503);

/** Strip markdown code fences from LLM JSON output */
export function stripMarkdownJson(text: string): string {
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return clean;
}

/** Safely parse JSON with fallback */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(stripMarkdownJson(text));
  } catch {
    return fallback;
  }
}

/** Validate required fields exist */
export function validateRequired<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): string | null {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
      return `Missing required field: ${String(field)}`;
    }
  }
  return null;
}
