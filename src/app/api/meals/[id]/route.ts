import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meal = await db.meal.findFirst({
    where: { id: params.id, userId },
    include: { items: true },
  });

  if (!meal) {
    return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  }

  return NextResponse.json(meal);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await db.meal.findFirst({
      where: { id: params.id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    const body = await request.json();
    const meal = await db.meal.update({
      where: { id: params.id },
      data: {
        name: body.name,
        mealType: body.mealType,
        calories: body.calories,
        protein: body.protein,
        carbs: body.carbs,
        fat: body.fat,
        fiber: body.fiber,
        notes: body.notes,
        loggedAt: body.loggedAt ? new Date(body.loggedAt) : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json(meal);
  } catch (error) {
    console.error("Update meal error:", error);
    return NextResponse.json({ error: "Failed to update meal" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.meal.findFirst({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  }

  await db.meal.delete({ where: { id: params.id } });

  return NextResponse.json({ message: "Meal deleted" });
}
