import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isOwner } from "@/lib/owner";

// Shared app context so the plan is grounded in how SnapMeal is actually built.
const APP_CONTEXT = `SnapMeal is a Next.js 14 (App Router) + TypeScript + Tailwind web app.
Backend: Prisma + Neon Postgres; NextAuth (JWT, email/password + Google). AI: Anthropic Claude vision for meal-photo analysis. Hosted on Vercel — deploy is "git push origin main" and the build runs "prisma db push" (additive schema changes are safe; unique constraints on existing data are risky).
Data models: User (profile + body stats), Meal + MealItem, Exercise, Goal (auto-calculated from profile via BMR/TDEE/Mifflin-St Jeor), Idea. Frontend pages live under app/(app)/ behind auth; UI primitives in components/ui; API routes under app/api, each gated by getCurrentUserId(). Next planned platform step: a native Swift iOS app reusing this backend.`;

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId || !(await isOwner(userId, session?.user?.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idea = await db.idea.findFirst({ where: { id: params.id, userId } });
  if (!idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured (ANTHROPIC_API_KEY missing)." },
      { status: 503 }
    );
  }

  // Resolve any dependency titles so the plan can reference them.
  let blockedByTitles: string[] = [];
  if (idea.blockedBy.length) {
    const deps = await db.idea.findMany({
      where: { userId, id: { in: idea.blockedBy } },
      select: { title: true, status: true },
    });
    blockedByTitles = deps
      .filter((d) => d.status !== "done")
      .map((d) => d.title);
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // Turning an idea into a concrete build plan is a reasoning task run rarely
    // and on demand, so it uses Claude Opus 5 with room for adaptive thinking.
    const message = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `${APP_CONTEXT}

Turn this backlog idea into a concrete implementation plan a developer could pick up.

Idea: ${idea.title}
Notes: ${idea.notes || "(none)"}
AI scope estimate: ${idea.scope || "(not estimated)"}
Effort: ${idea.complexity || "?"} · Value: ${idea.impact || "?"}
${blockedByTitles.length ? `Depends on (ship first): ${blockedByTitles.join(", ")}` : ""}

Write the plan in Markdown with these sections:
## Goal
One or two sentences on the user-facing outcome.
## Approach
The technical approach in prose — how it fits SnapMeal's existing architecture.
## Data model changes
Any Prisma schema changes (note if none). Flag anything risky for "prisma db push".
## API
New or changed routes under app/api.
## UI
Pages/components under app/(app) and components/ui.
## Steps
A numbered, ordered checklist of implementation steps.
## Risks & open questions
Bullet points.

Be concrete and specific to this codebase. Output only the Markdown, no preamble.`,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "No plan generated" }, { status: 500 });
    }
    const plan = textContent.text.trim();

    const updated = await db.idea.update({
      where: { id: params.id },
      data: { plan, plannedAt: new Date() },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Idea plan error:", error);
    let messageText = "Failed to generate plan";
    if (error instanceof Anthropic.APIError) messageText = `AI error: ${error.message}`;
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
