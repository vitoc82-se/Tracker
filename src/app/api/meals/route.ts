import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = { userId };

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.loggedAt = { gte: start, lte: end };
  }

  const meals = await db.meal.findMany({
    where,
    include: { items: true },
    orderBy: { loggedAt: "desc" },
    take: limit,
  });

  return NextResponse.json(meals);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, mealType, calories, protein, carbs, fat, fiber, imageUrl, notes, aiAnalysis, items, loggedAt } = body;

    const meal = await db.meal.create({
      data: {
        userId,
        name,
        mealType: mealType || "snack",
        calories: calories || 0,
        protein: protein || 0,
        carbs: carbs || 0,
        fat: fat || 0,
        fiber: fiber || 0,
        imageUrl,
        notes,
        aiAnalysis,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        items: items?.length
          ? {
              create: items.map((item: { name: string; calories?: number; protein?: number; carbs?: number; fat?: number; quantity?: string; unit?: string }) => ({
                name: item.name,
                calories: item.calories || 0,
                protein: item.protein || 0,
                carbs: item.carbs || 0,
                fat: item.fat || 0,
                quantity: item.quantity,
                unit: item.unit,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json(meal, { status: 201 });
  } catch (error) {
    console.error("Create meal error:", error);
    return NextResponse.json({ error: "Failed to create meal" }, { status: 500 });
  }
}
