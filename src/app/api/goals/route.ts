import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await db.goal.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  // The stored `current` field is never mutated when meals/exercises are
  // logged, so it always reads 0. Compute progress live from logged data,
  // scoped to each goal's period, matching the dashboard's calculation.
  const now = new Date();
  const periodStart = (period: string) => {
    const start = new Date();
    if (period === "weekly") {
      start.setDate(start.getDate() - 6);
    } else if (period === "monthly") {
      start.setDate(start.getDate() - 29);
    }
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const goalsWithProgress = await Promise.all(
    goals.map(async (goal) => {
      const start = periodStart(goal.period);

      if (goal.goalType === "exercise_minutes") {
        const exercises = await db.exercise.findMany({
          where: { userId, loggedAt: { gte: start, lte: now } },
          select: { duration: true },
        });
        const current = exercises.reduce((sum, e) => sum + e.duration, 0);
        return { ...goal, current };
      }

      const meals = await db.meal.findMany({
        where: { userId, loggedAt: { gte: start, lte: now } },
        select: { calories: true, protein: true, carbs: true, fat: true },
      });
      let current = 0;
      switch (goal.goalType) {
        case "calories":
          current = meals.reduce((sum, m) => sum + m.calories, 0);
          break;
        case "protein":
          current = meals.reduce((sum, m) => sum + m.protein, 0);
          break;
        case "carbs":
          current = meals.reduce((sum, m) => sum + m.carbs, 0);
          break;
        case "fat":
          current = meals.reduce((sum, m) => sum + m.fat, 0);
          break;
      }
      return { ...goal, current };
    })
  );

  return NextResponse.json(goalsWithProgress);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const goal = await db.goal.create({
      data: {
        userId,
        goalType: body.goalType,
        target: body.target,
        unit: body.unit,
        period: body.period || "daily",
        source: body.source === "auto" ? "auto" : "manual",
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("Create goal error:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
