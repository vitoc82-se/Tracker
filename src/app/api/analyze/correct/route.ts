import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUserId } from "@/lib/session";
import { coerceNumber } from "@/lib/meal-nutrition";

// Surgical correction: the user has told us what an item actually is
// ("this is orange juice, not a mimosa"). Identity is now known, so this is a
// text nutrition estimate for a single item — no image, no re-rolling the
// rest of the meal.
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { itemName, correction, unit } = await request.json();

    const userText = String(correction || "").trim();
    if (!userText) {
      return NextResponse.json(
        { error: "A correction is required" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI analysis is not configured. Please set the ANTHROPIC_API_KEY environment variable." },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `A user is correcting one item in a logged meal. Treat their correction as ground truth for what the food is.

Original item name (may be wrong): ${itemName ? String(itemName) : "(unknown)"}
User correction: "${userText}"

Estimate the nutrition for a typical single serving of the corrected food. Return ONLY valid JSON in this exact format, no other text:
{
  "name": "Corrected food item name",
  "quantity": "estimated amount as a number",
  "unit": "${unit ? String(unit) : "g/ml/piece/cup/etc"}",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0
}

All nutritional values must be numbers (calories in kcal, macros in grams).`,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "No analysis generated" }, { status: 500 });
    }

    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const raw = JSON.parse(jsonStr);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "AI returned invalid data. Please try again." }, { status: 500 });
    }

    // Coerce to a clean, numeric item shape.
    const item = {
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : userText,
      quantity: raw.quantity != null ? String(raw.quantity) : undefined,
      unit: typeof raw.unit === "string" ? raw.unit : unit ? String(unit) : undefined,
      calories: coerceNumber(raw.calories),
      protein: coerceNumber(raw.protein),
      carbs: coerceNumber(raw.carbs),
      fat: coerceNumber(raw.fat),
    };

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error("AI correction error:", error);
    let message = "Failed to correct item";
    let status = 500;
    if (error instanceof Anthropic.APIError) {
      message = `Anthropic API error: ${error.message}`;
      status = error.status || 500;
    } else if (error instanceof SyntaxError) {
      message = "AI returned invalid data. Please try again.";
    } else if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
