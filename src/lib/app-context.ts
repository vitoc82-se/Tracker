import { ARCHITECTURE_MD } from "./architecture-context";
import { APP_INVENTORY } from "./app-inventory";

// The context handed to Claude when it estimates an idea's scope or writes a
// build prompt. Two layers, both regenerated on every build:
//   1. ARCHITECTURE.md — the prose (conventions, flows, gotchas, roadmap).
//   2. app-inventory — a factual map derived straight from the source (every
//      route + methods, page, Prisma model, lib), so it is ALWAYS accurate even
//      if the prose lags. The model is told to trust the inventory over the doc
//      on any conflict.
export function ideaAppContext(): string {
  const doc = ARCHITECTURE_MD.trim();
  const inventory = APP_INVENTORY.trim();

  if (!doc && !inventory) {
    // Fallback if both generated files are somehow empty at build time.
    return `SnapMeal is a Next.js 14 (App Router) + TypeScript + Tailwind app; Prisma + Neon Postgres; NextAuth (JWT); Anthropic Claude vision for meal-photo analysis; deployed on Vercel via "git push origin main" (build runs prisma db push — additive schema changes only).`;
  }

  return `Below is SnapMeal's current architecture — the source of truth for how the app is actually built right now. Ground everything you write in it: reuse the routes, Prisma models, libs and UI patterns shown; do not invent files or endpoints that aren't here; and never propose building something that already exists. The architecture doc is prose and can lag; the live inventory is generated from the source and is authoritative — if they ever disagree, trust the inventory.

<architecture-doc>
${doc || "(architecture doc unavailable)"}
</architecture-doc>

<live-inventory>
${inventory || "(inventory unavailable)"}
</live-inventory>`;
}
