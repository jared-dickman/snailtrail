import Anthropic from "@anthropic-ai/sdk";

export interface LocationConstraint {
  timeWindow?: { open: string; close: string };
  priority?: "high" | "medium" | "low";
  duration?: number;
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
    // Claude may wrap JSON in markdown code blocks
    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(jsonText);
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
