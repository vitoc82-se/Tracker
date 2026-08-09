import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isOwnerEmail } from "@/lib/owner";

export const dynamic = "force-dynamic";

const STATUSES = ["new", "considering", "building", "done", "parked"];

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId || !isOwnerEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ideas = await db.idea.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json(ideas);
}

export async function POST(request: Request) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId || !isOwnerEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = String(body?.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "A title is required" }, { status: 400 });
    }

    const idea = await db.idea.create({
      data: {
        userId,
        title,
        notes: body?.notes ? String(body.notes) : null,
        status: STATUSES.includes(body?.status) ? body.status : "new",
      },
    });
    return NextResponse.json(idea, { status: 201 });
  } catch (error) {
    console.error("Create idea error:", error);
    return NextResponse.json({ error: "Failed to save idea" }, { status: 500 });
  }
}
