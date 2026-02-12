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

  const existing = await db.goal.findFirst({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const goal = await db.goal.update({
      where: { id: params.id },
      data: {
        target: body.target,
        unit: body.unit,
        period: body.period,
        isActive: body.isActive,
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error("Update goal error:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
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

  const existing = await db.goal.findFirst({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  await db.goal.delete({ where: { id: params.id } });

  return NextResponse.json({ message: "Goal deleted" });
}
