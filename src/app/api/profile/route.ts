import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      height: true,
      weight: true,
      age: true,
      gender: true,
      activityLevel: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const user = await db.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        height: body.height ? parseFloat(body.height) : null,
        weight: body.weight ? parseFloat(body.weight) : null,
        age: body.age ? parseInt(body.age) : null,
        gender: body.gender,
        activityLevel: body.activityLevel,
      },
      select: {
        id: true,
        name: true,
        email: true,
        height: true,
        weight: true,
        age: true,
        gender: true,
        activityLevel: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
