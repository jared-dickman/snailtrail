import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownJson } from "./response";

export interface LocationConstraint {
  timeWindow?: { open: string; close: string };
  priority?: "high" | "medium" | "low";
  duration?: number;
  notes?: string;
}

export interface ParsedLocation {
  name?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  priority?: "high" | "medium" | "low";
  frequency?: "weekly" | "biweekly" | "monthly";
  preferredDay?: string;
  timeWindow?: { open: string; close: string };
  tankType?: "freshwater" | "saltwater" | "reef";
  tankGallons?: number;
  notes?: string;
}

const client = new Anthropic();

const SYSTEM_PROMPT = `You parse location constraints from natural language. Return ONLY valid JSON matching this schema:
{
  "timeWindow": { "open": "HH:MM", "close": "HH:MM" } | null,
  "priority": "high" | "medium" | "low" | null,
  "duration": number (minutes) | null,
  "notes": string | null
}

Examples:
- "open 9-5" → {"timeWindow":{"open":"09:00","close":"17:00"}}
- "urgent" → {"priority":"high"}
- "takes 30 mins" → {"duration":30}
- "before noon" → {"timeWindow":{"open":"00:00","close":"12:00"}}
- "high priority, open 10am-2pm" → {"timeWindow":{"open":"10:00","close":"14:00"},"priority":"high"}

Only include fields with extracted values. Return {} if nothing parseable.`;

const FULL_LOCATION_PROMPT = `You parse aquarium service location info from natural language. Return ONLY valid JSON.

Schema:
{
  "name": "business/client name" | null,
  "address": "full street address" | null,
  "contactName": "person's name" | null,
  "contactPhone": "phone number" | null,
  "priority": "high" | "medium" | "low" | null,
  "frequency": "weekly" | "biweekly" | "monthly" | null,
  "preferredDay": "Monday" | "Tuesday" | etc | null,
  "timeWindow": { "open": "HH:MM", "close": "HH:MM" } | null,
  "tankType": "freshwater" | "saltwater" | "reef" | null,
  "tankGallons": number | null,
  "notes": "any other details" | null
}

Examples:
- "Dr Smith's office at 123 Main St, 75 gallon reef, service every 2 weeks on Thursdays 9-12" → {"name":"Dr Smith's office","address":"123 Main St","frequency":"biweekly","preferredDay":"Thursday","timeWindow":{"open":"09:00","close":"12:00"},"tankType":"reef","tankGallons":75}
- "Bob's Pets 456 Oak Ave, high priority, saltwater 200gal, call Bob at 555-1234" → {"name":"Bob's Pets","address":"456 Oak Ave","priority":"high","contactName":"Bob","contactPhone":"555-1234","tankType":"saltwater","tankGallons":200}
- "weekly Monday mornings at Sunrise Dental" → {"name":"Sunrise Dental","frequency":"weekly","preferredDay":"Monday","timeWindow":{"open":"08:00","close":"12:00"}}

Only include fields you can extract. Return {} if nothing parseable.`;

export async function parseLocationConstraint(
  text: string
): Promise<LocationConstraint> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: `Parse: "${text}"` }],
    system: SYSTEM_PROMPT,
  });

  const content = message.content[0];
  if (content.type !== "text") return {};

  try {
    const parsed = JSON.parse(stripMarkdownJson(content.text));
    const result: LocationConstraint = {};

    if (parsed.timeWindow?.open && parsed.timeWindow?.close) {
      result.timeWindow = parsed.timeWindow;
    }
    if (["high", "medium", "low"].includes(parsed.priority)) {
      result.priority = parsed.priority;
    }
    if (typeof parsed.duration === "number" && parsed.duration > 0) {
      result.duration = parsed.duration;
    }
    if (parsed.notes) {
      result.notes = parsed.notes;
    }

    return result;
  } catch {
    return {};
  }
}

export async function parseFullLocation(text: string): Promise<ParsedLocation> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: `Parse this location info: "${text}"` }],
    system: FULL_LOCATION_PROMPT,
  });

  const content = message.content[0];
  if (content.type !== "text") return {};

  try {
    const parsed = JSON.parse(stripMarkdownJson(content.text));
    const result: ParsedLocation = {};

    if (parsed.name) result.name = parsed.name;
    if (parsed.address) result.address = parsed.address;
    if (parsed.contactName) result.contactName = parsed.contactName;
    if (parsed.contactPhone) result.contactPhone = parsed.contactPhone;
    if (["high", "medium", "low"].includes(parsed.priority)) {
      result.priority = parsed.priority;
    }
    if (["weekly", "biweekly", "monthly"].includes(parsed.frequency)) {
      result.frequency = parsed.frequency;
    }
    if (parsed.preferredDay) result.preferredDay = parsed.preferredDay;
    if (parsed.timeWindow?.open && parsed.timeWindow?.close) {
      result.timeWindow = parsed.timeWindow;
    }
    if (["freshwater", "saltwater", "reef"].includes(parsed.tankType)) {
      result.tankType = parsed.tankType;
    }
    if (typeof parsed.tankGallons === "number" && parsed.tankGallons > 0) {
      result.tankGallons = parsed.tankGallons;
    }
    if (parsed.notes) result.notes = parsed.notes;

    return result;
  } catch {
    return {};
  }
}
