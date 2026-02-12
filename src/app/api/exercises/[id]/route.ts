import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await db.exercise.findFirst({
      where: { id: params.id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const body = await request.json();
    const exercise = await db.exercise.update({
      where: { id: params.id },
      data: {
        name: body.name,
        exerciseType: body.exerciseType,
        duration: body.duration,
        caloriesBurned: body.caloriesBurned,
        intensity: body.intensity,
        notes: body.notes,
        loggedAt: body.loggedAt ? new Date(body.loggedAt) : undefined,
      },
    });

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Update exercise error:", error);
    return NextResponse.json({ error: "Failed to update exercise" }, { status: 500 });
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

  const existing = await db.exercise.findFirst({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  await db.exercise.delete({ where: { id: params.id } });

  return NextResponse.json({ message: "Exercise deleted" });
}
