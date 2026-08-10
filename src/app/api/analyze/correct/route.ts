import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUserId } from "@/lib/session";
import { coerceNumber, normalizeAlternatives } from "@/lib/meal-nutrition";

// Re-identify a single meal item the photo analysis got wrong. The user tells
// us what the food actually is (a typed name, or free-text like "this is orange
// juice, not a mimosa"); we re-estimate nutrition for THAT food at the item's
// portion. If the meal's photo is available (base64 for an unsaved meal, or a
// stored URL for a saved one), we send it so the model can do a constrained
// second vision pass rather than a blind text guess.
type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const ALLOWED_MEDIA: MediaType[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { itemName, correction, name, unit, quantity, image, mimeType, imageUrl } =
      body ?? {};

    // The user's intended identity: an explicit typed name wins; otherwise fall
    // back to the free-text correction (back-compat with the old contract).
    const typedName = String(name ?? "").trim();
    const userText = String(correction ?? "").trim();
    const identity = typedName || userText;
    if (!identity) {
      return NextResponse.json(
        { error: "Tell us what this food actually is" },
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

    const portion =
      quantity != null && String(quantity).trim()
        ? `about ${String(quantity).trim()} ${unit ? String(unit) : ""}`.trim()
        : "a typical single serving";

    const promptText = `A user is correcting one item in a logged meal. Treat their identification as ground truth for what the food is — do not second-guess it.

Original (wrong) item name: ${itemName ? String(itemName) : "(unknown)"}
The user says this item is actually: "${identity}"
Portion to estimate for: ${portion}
${image || imageUrl ? "The meal photo is attached; use it to judge the portion, but the food's identity is fixed to what the user said." : ""}

Estimate the nutrition for that food at that portion. Return ONLY valid JSON in this exact format, no other text:
{
  "name": "Corrected food item name",
  "quantity": "estimated amount as a number",
  "unit": "${unit ? String(unit) : "g/ml/piece/cup/etc"}",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "alternatives": ["up to 3 other plausible identifications, most-likely-first, excluding the name above; empty array if confident"]
}

All nutritional values must be numbers (calories in kcal, macros in grams).`;

    // Build the message content: optional image block first, then the prompt.
    const content: Anthropic.Messages.ContentBlockParam[] = [];
    if (image) {
      const media = ALLOWED_MEDIA.includes(mimeType as MediaType)
        ? (mimeType as MediaType)
        : "image/jpeg";
      content.push({
        type: "image",
        source: { type: "base64", media_type: media, data: String(image) },
      });
    } else if (imageUrl) {
      content.push({ type: "image", source: { type: "url", url: String(imageUrl) } });
    }
    content.push({ type: "text", text: promptText });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 700,
      messages: [{ role: "user", content }],
    });

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "Could not estimate nutrition for that food", canOverride: true },
        { status: 400 }
      );
    }

    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(jsonStr);
    } catch {
      // Invalid JSON: never mutate the item, offer the manual override path.
      return NextResponse.json(
        { error: "Could not estimate nutrition for that food", canOverride: true },
        { status: 400 }
      );
    }
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        { error: "Could not estimate nutrition for that food", canOverride: true },
        { status: 400 }
      );
    }

    const calories = coerceNumber(raw.calories, NaN);
    const protein = coerceNumber(raw.protein, NaN);
    const carbs = coerceNumber(raw.carbs, NaN);
    const fat = coerceNumber(raw.fat, NaN);

    // Sanity-check the macros. Anything missing, non-finite, negative, or an
    // implausible calorie count means we don't trust it — leave the item alone.
    const macros = [calories, protein, carbs, fat];
    const valid =
      macros.every((n) => Number.isFinite(n) && n >= 0) && calories <= 5000;
    if (!valid) {
      return NextResponse.json(
        { error: "Could not estimate nutrition for that food", canOverride: true },
        { status: 400 }
      );
    }

    // Use the user's typed name over the model's rewrite (unless they only gave
    // free-text, in which case trust the model's cleaned name).
    const finalName =
      typedName ||
      (typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : identity);

    const item = {
      name: finalName,
      quantity: raw.quantity != null ? String(raw.quantity) : quantity != null ? String(quantity) : undefined,
      unit: typeof raw.unit === "string" ? raw.unit : unit ? String(unit) : undefined,
      calories,
      protein,
      carbs,
      fat,
      alternatives: normalizeAlternatives(raw.alternatives, finalName),
      corrected: true,
    };

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error("AI correction error:", error);
    let message = "Failed to correct item";
    let status = 500;
    if (error instanceof Anthropic.APIError) {
      message = `Anthropic API error: ${error.message}`;
      status = error.status || 500;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ error: message, canOverride: true }, { status });
  }
}
