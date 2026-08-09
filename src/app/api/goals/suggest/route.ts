import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { suggestGoals } from "@/lib/goal-suggestions";

// Computes goals from the user's profile and (optionally) writes them.
// - dryRun: return the plan without writing, so the UI can show a diff.
// - replace: goalTypes the user explicitly chose to overwrite (their existing
//   goal of that type is replaced). Types not in replace with an existing goal
//   are reported as conflicts and left untouched — a hand-tuned goal is never
//   silently overwritten.
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);
    const replace: string[] = Array.isArray(body?.replace)
      ? body.replace.filter((t: unknown) => typeof t === "string")
      : [];

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        weight: true,
        targetWeight: true,
        height: true,
        age: true,
        gender: true,
        activityLevel: true,
      },
    });

    const { goals, skipped } = suggestGoals(user ?? {});

    const existing = await db.goal.findMany({
      where: { userId, isActive: true },
      select: { id: true, goalType: true, target: true, unit: true, period: true, source: true },
    });
    const existingByType = new Map(existing.map((g) => [`${g.goalType}:${g.period}`, g]));

    // Partition suggestions against what already exists.
    const toCreate: typeof goals = [];
    const conflicts: {
      goalType: string;
      current: number;
      suggested: number;
      unit: string;
      source: string;
    }[] = [];
    for (const g of goals) {
      const cur = existingByType.get(`${g.goalType}:${g.period}`);
      if (!cur) {
        toCreate.push(g);
      } else {
        conflicts.push({
          goalType: g.goalType,
          current: cur.target,
          suggested: g.target,
          unit: g.unit,
          source: cur.source,
        });
      }
    }

    if (dryRun) {
      return NextResponse.json({ toCreate, conflicts, skipped });
    }

    // Write: create the non-conflicting goals, and replace only the types the
    // user opted into. One transaction so a partial failure rolls back.
    const created = await db.$transaction(async (tx) => {
      const out = [];
      for (const g of toCreate) {
        out.push(
          await tx.goal.create({
            data: {
              userId,
              goalType: g.goalType,
              target: g.target,
              unit: g.unit,
              period: g.period,
              source: "auto",
            },
          })
        );
      }
      for (const g of goals) {
        if (!replace.includes(g.goalType)) continue;
        const cur = existingByType.get(`${g.goalType}:${g.period}`);
        if (!cur) continue; // already handled by toCreate
        // deleteMany (not update) collapses any duplicate rows of this type
        // into a single fresh auto goal.
        await tx.goal.deleteMany({
          where: { userId, goalType: g.goalType, period: g.period },
        });
        out.push(
          await tx.goal.create({
            data: {
              userId,
              goalType: g.goalType,
              target: g.target,
              unit: g.unit,
              period: g.period,
              source: "auto",
            },
          })
        );
      }
      return out;
    });

    return NextResponse.json({ created, skipped });
  } catch (error) {
    console.error("Suggest goals error:", error);
    return NextResponse.json({ error: "Failed to calculate goals" }, { status: 500 });
  }
}
