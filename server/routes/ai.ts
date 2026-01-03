import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";

const ai = new Hono();
const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are FishTank AI, a helpful assistant for aquarium service professionals.
You help with:
- Customer management and scheduling
- Route optimization advice
- Tank care recommendations
- Business insights

Keep responses concise (2-3 sentences max). Be friendly and professional.
If given customer context, reference specific details to personalize responses.`;

ai.post("/chat", async (c) => {
  const { message, context } = await c.req.json();

  const contextStr = context
    ? `Current context:
- Total locations: ${context.totalLocations}
- Overdue: ${context.overdueCount}
${context.selectedLocation ? `- Viewing: ${context.selectedLocation.name} (${context.selectedLocation.tankType}, ${context.selectedLocation.tankSize}gal)` : ""}`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${contextStr}\n\nUser question: ${message}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return c.json({ response: text });
});

export default ai;
