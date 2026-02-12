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

  const exercises = await db.exercise.findMany({
    where,
    orderBy: { loggedAt: "desc" },
    take: limit,
  });

  return NextResponse.json(exercises);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const exercise = await db.exercise.create({
      data: {
        userId,
        name: body.name,
        exerciseType: body.exerciseType || "cardio",
        duration: body.duration || 0,
        caloriesBurned: body.caloriesBurned || 0,
        intensity: body.intensity,
        sets: body.sets,
        reps: body.reps,
        weight: body.weight,
        distance: body.distance,
        notes: body.notes,
        loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    console.error("Create exercise error:", error);
    return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 });
  }
}
