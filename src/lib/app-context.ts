import { ARCHITECTURE_MD } from "./architecture-context";

// The context handed to Claude when it estimates an idea's scope or writes a
// build prompt. Sourced from the repo's own ARCHITECTURE.md (regenerated on
// every build), so scope and plans reflect what is actually built rather than a
// hand-written summary that drifts out of date.
export function ideaAppContext(): string {
  const doc = ARCHITECTURE_MD.trim();
  if (doc) {
    return `Below is SnapMeal's current architecture doc — the source of truth for how the app is actually built right now. Ground everything you write in it: reuse the routes, Prisma models, libs and UI patterns it describes; do not invent files or endpoints that aren't in it; and never propose building something that already exists (check the routes and features sections first).

<architecture>
${doc}
</architecture>`;
  }
  // Fallback if the generated doc is somehow empty at build time.
  return `SnapMeal is a Next.js 14 (App Router) + TypeScript + Tailwind app; Prisma + Neon Postgres; NextAuth (JWT); Anthropic Claude vision for meal-photo analysis; deployed on Vercel via "git push origin main" (build runs prisma db push — additive schema changes only).`;
}
