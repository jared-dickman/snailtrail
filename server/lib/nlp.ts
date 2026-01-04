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
  googlePlaceId?: string;
  contactName?: string;
  contactPhone?: string;
  priority?: "high" | "medium" | "low";
  frequency?: "weekly" | "biweekly" | "monthly";
  preferredDays?: string[];
  timeWindow?: { open: string; close: string };
  tankType?: "freshwater" | "saltwater" | "reef";
  tankGallons?: number;
  notes?: string;
  appointmentRequired?: boolean;
  estimatedDuration?: number;
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

CRITICAL - ADDRESS REQUIREMENTS:
- NEVER guess or fabricate addresses. Only return addresses explicitly provided by the user.
- If user provides an abbreviation (EWR, JFK, LAX), expand to FULL official name but set address to null.
- If user provides a business name without street address, set address to null.
- The address field MUST be a real, complete, geocodable street address or null.
- For well-known places, provide googlePlaceId if you know it (e.g., "ChIJR0lA1VBTwokR8BGfSBOyT-w" for Newark Airport).

Schema:
{
  "name": "business/client name - EXPAND abbreviations to full names" | null,
  "address": "ONLY real street addresses explicitly given, or null" | null,
  "googlePlaceId": "Google Place ID if known for landmarks/businesses" | null,
  "contactName": "person's name" | null,
  "contactPhone": "phone number" | null,
  "priority": "high" | "medium" | "low" | null,
  "frequency": "weekly" | "biweekly" | "monthly" | null,
  "preferredDays": ["Monday", "Tuesday", etc] | null (array of days),
  "timeWindow": { "open": "HH:MM", "close": "HH:MM" } | null,
  "tankType": "freshwater" | "saltwater" | "reef" | null,
  "tankGallons": number | null,
  "appointmentRequired": boolean | null,
  "estimatedDuration": number (minutes) | null,
  "notes": "any other details" | null
}

Examples:
- "ewr" → {"name":"Newark Liberty International Airport","address":null,"googlePlaceId":"ChIJR0lA1VBTwokR8BGfSBOyT-w"}
- "Dr Smith at 123 Main St Newark NJ" → {"name":"Dr Smith","address":"123 Main St, Newark, NJ"}
- "Bob's Pets, high priority, saltwater 200gal" → {"name":"Bob's Pets","address":null,"priority":"high","tankType":"saltwater","tankGallons":200}
- "weekly at Sunrise Dental 456 Oak Ave" → {"name":"Sunrise Dental","address":"456 Oak Ave","frequency":"weekly"}

NEVER invent addresses. If no real address given, address MUST be null.`;

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
    if (parsed.googlePlaceId) result.googlePlaceId = parsed.googlePlaceId;
    if (parsed.contactName) result.contactName = parsed.contactName;
    if (parsed.contactPhone) result.contactPhone = parsed.contactPhone;
    if (["high", "medium", "low"].includes(parsed.priority)) {
      result.priority = parsed.priority;
    }
    if (["weekly", "biweekly", "monthly"].includes(parsed.frequency)) {
      result.frequency = parsed.frequency;
    }
    if (Array.isArray(parsed.preferredDays)) {
      result.preferredDays = parsed.preferredDays;
    } else if (parsed.preferredDay) {
      // Backwards compat: single day → array
      result.preferredDays = [parsed.preferredDay];
    }
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
    if (typeof parsed.appointmentRequired === "boolean") {
      result.appointmentRequired = parsed.appointmentRequired;
    }
    if (typeof parsed.estimatedDuration === "number" && parsed.estimatedDuration > 0) {
      result.estimatedDuration = parsed.estimatedDuration;
    }

    return result;
  } catch {
    return {};
  }
}
