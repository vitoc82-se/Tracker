import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUserId } from "@/lib/session";
import { coerceNumber, normalizeAlternatives } from "@/lib/meal-nutrition";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { image, mimeType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI analysis is not configured. Please set the ANTHROPIC_API_KEY environment variable." },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType || "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: `You are an expert nutrition estimator. Analyze the food photo and return ONLY valid JSON (no prose, no markdown) matching the shape at the end.

Before answering, work through this silently and do NOT output your reasoning:
1. SCAN the entire image systematically — center, edges, background, and anything under or behind other items. Catch EVERY distinct food and drink, including small or easy-to-miss ones: sides, garnishes, sauces, dips, dressings, spreads, toppings, bread, condiments, and any beverage.
2. IDENTIFY each item as specifically as you can from visual cues (color, texture, char/sear, sheen, cut, plating) and cuisine context. If you are unsure, pick the single most likely identity and list other plausible ones in "alternatives" — never drop an item just because you are unsure.
3. ACCOUNT FOR HOW IT WAS COOKED. Infer the preparation (fried, sautéed, roasted, grilled, dressed, buttered, breaded) and ADD the cooking fats and add-ons it implies even when they are not directly visible — cooking oil for sautéed/pan-fried food, butter on toast/vegetables/pancakes, oil and dressing on salad, added sugar in sweet drinks or baked goods. Add each as its own item (e.g. "Cooking oil (absorbed)", "Butter", "Salad dressing") with a realistic, moderate amount. Do NOT double-count: if a food's typical nutrition already assumes the fat (e.g. "french fries" or "fried chicken" already include frying oil), do not add extra oil on top.
4. ESTIMATE each portion in grams or ml using visual scale cues (dinner plate ≈ 26 cm, fork ≈ 18 cm, cup ≈ 240 ml, a palm or deck-of-cards of meat ≈ 85 g). Give a numeric amount and a unit for every item.
5. COMPUTE calories and macros for each item from its estimated portion, then sum the totals.

Rules:
- Separate distinct foods into separate items; never lump a mixed plate into one.
- Prefer specific names ("grilled chicken thigh", "basmati rice") over generic ("meat", "carbs").
- All nutrition values are plain numbers: calories in kcal; protein, carbs, fat, and fiber in grams.

Return ONLY this JSON:
{
  "name": "short name of the overall meal/dish",
  "items": [
    {
      "name": "specific food item",
      "quantity": "estimated amount as a number",
      "unit": "g | ml | piece | slice | cup | tbsp | tsp",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "alternatives": ["up to 3 other plausible identifications, most-likely-first, excluding the name above; [] if confident"]
    }
  ],
  "totalCalories": 0,
  "totalProtein": 0,
  "totalCarbs": 0,
  "totalFat": 0,
  "totalFiber": 0,
  "description": "one sentence on what you see and how it appears to be cooked"
}`,
            },
          ],
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No analysis generated" },
        { status: 500 }
      );
    }

    // Extract JSON from the response (handle markdown code blocks and any stray
    // prose the model may add before/after the object).
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    if (!jsonStr.startsWith("{")) {
      const first = jsonStr.indexOf("{");
      const last = jsonStr.lastIndexOf("}");
      if (first !== -1 && last > first) jsonStr = jsonStr.slice(first, last + 1);
    }

    const raw = JSON.parse(jsonStr);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        { error: "AI returned invalid data. Please try again." },
        { status: 500 }
      );
    }

    // Coerce the AI's response into a clean numeric shape so downstream
    // scaling never receives strings ("12g") or NaN.
    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const items = rawItems.map((item: Record<string, unknown>) => ({
      name: typeof item?.name === "string" ? item.name : "Item",
      quantity: item?.quantity != null ? String(item.quantity) : undefined,
      unit: typeof item?.unit === "string" ? item.unit : undefined,
      calories: coerceNumber(item?.calories),
      protein: coerceNumber(item?.protein),
      carbs: coerceNumber(item?.carbs),
      fat: coerceNumber(item?.fat),
      // Never fail analysis over a missing/malformed alternatives field.
      alternatives: normalizeAlternatives(item?.alternatives, item?.name),
    }));

    const analysis = {
      name: typeof raw.name === "string" ? raw.name : "",
      items,
      totalCalories: coerceNumber(raw.totalCalories),
      totalProtein: coerceNumber(raw.totalProtein),
      totalCarbs: coerceNumber(raw.totalCarbs),
      totalFat: coerceNumber(raw.totalFat),
      totalFiber: coerceNumber(raw.totalFiber),
      description: typeof raw.description === "string" ? raw.description : "",
    };

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("AI analysis error:", error);

    // Surface the actual error message for debugging
    let message = "Failed to analyze image";
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
