import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isOwnerEmail } from "@/lib/owner";

const STATUSES = ["new", "considering", "building", "done", "parked"];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId || !isOwnerEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.idea.findFirst({ where: { id: params.id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data: { title?: string; notes?: string | null; status?: string } = {};
    if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (body?.notes !== undefined) data.notes = body.notes ? String(body.notes) : null;
    if (STATUSES.includes(body?.status)) data.status = body.status;

    const idea = await db.idea.update({ where: { id: params.id }, data });
    return NextResponse.json(idea);
  } catch (error) {
    console.error("Update idea error:", error);
    return NextResponse.json({ error: "Failed to update idea" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId || !isOwnerEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.idea.findFirst({ where: { id: params.id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  await db.idea.delete({ where: { id: params.id } });
  return NextResponse.json({ message: "Idea deleted" });
}
