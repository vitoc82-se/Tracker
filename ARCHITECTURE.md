# SnapMeal — Architecture & How It Works

The living reference for how SnapMeal is built and wired together. Keep this current when the structure changes.

> **Name:** SnapMeal (repo is still `vitoc82-se/Tracker`; rebranded from "NutriTrack" on 2026-08-09). Domain goal: `snapmeal.dev`.
> **One-liner:** Snap a photo of your meal → AI estimates calories + macros → track toward goals that calculate themselves from your body.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript, React 18 |
| Styling | Tailwind CSS (dark mode via `prefers-color-scheme`, the OS setting) |
| Auth | NextAuth — credentials (email/password, bcrypt) + Google; **JWT** session strategy; Prisma adapter |
| Database | Prisma ORM → **Neon Postgres** (serverless) |
| AI | Anthropic Claude Sonnet 4.5 **vision** (meal photo → nutrition JSON) |
| Image upload | Vercel Blob (`/api/upload`) |
| Hosting | Vercel |
| PWA | `public/manifest.json` + `public/sw.js` (service worker) |

## 2. Deployment

- **Deploy = `git push origin main`.** Vercel auto-builds.
- Build command: `prisma generate && prisma db push --accept-data-loss && next build`.
  - **`prisma db push` applies schema changes to the LIVE database on every deploy.** Additive changes (new column with a default, new table) are safe. **Avoid** adding a `@@unique` constraint (or anything that can fail on existing data) without a dedup migration first — a failed `db push` fails the whole deploy.
- **Vercel Deployment Protection** is usually ON — it puts an SSO wall in front of the `*.vercel.app` URL. Turn it off in Vercel settings when you need the public landing page or automated QA to reach the app. The app's own NextAuth login is a separate, always-on layer.
- Prod URL: `tracker-niklas-nilssons-projects-76e5dba3.vercel.app`. Local repo: `C:\Users\freem\Tracker`.
- Env vars needed: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `GOOGLE_CLIENT_ID/SECRET` (optional), `OWNER_EMAIL` (optional, see §7).

## 3. Data model (Prisma)

- **User** — profile + body stats (`height, weight, targetWeight, age, gender, activityLevel`) used to compute goals. Auth fields from the NextAuth adapter (`Account`, `Session`, `VerificationToken`).
- **Meal** — `name, mealType, calories, protein, carbs, fat, fiber, imageUrl, notes, aiAnalysis, loggedAt` + **MealItem[]**.
- **MealItem** — a single detected food: `name, quantity, unit, calories, protein, carbs, fat`. (No fiber at item level; fiber is meal-level only.)
- **Exercise** — logged activity: `caloriesBurned, duration, ...`.
- **Goal** — `goalType` (calories | protein | carbs | fat | exercise_minutes | weight), `target, unit, period, source` (`manual` | `auto`). Live progress is computed on read, not stored (the stored `current` field is ignored).
- **Idea** — the private backlog: `title, notes, status` (new | considering | building | done | parked), `priority` (you set), and AI-filled `complexity` (S/M/L/XL effort), `impact` (low/med/high value), `scope`. See §7.

## 4. Routes

### Pages
- `/` — public landing page (SnapMeal marketing). Redirects logged-in users to `/dashboard`.
- `/auth/signin` — sign in / register toggle.
- `/onboarding` — 2 steps: profile form (requires gender, age, height, weight, activity level) → pre-filled goal targets. New users are sent here by the `(app)` layout when their profile is incomplete.
- `(app)/*` — everything behind login (shares the sidebar layout + auth guard): `dashboard`, `meals`, `exercises`, `goals`, `profile`, `ideas`.

### API (all under `/api`, all auth-gated via `getCurrentUserId()`)
- `analyze` (POST) — photo (base64) → Claude vision → `{ name, items[], totals, description }`. Response is coerced to clean numbers.
- `analyze/correct` (POST) — surgical single-item re-estimate from a text correction ("that's juice, not a mimosa"). No image.
- `meals` (GET/POST), `meals/[id]` (GET/PUT/DELETE) — PUT replaces items so amount/correction edits persist on saved meals.
- `goals` (GET/POST), `goals/[id]` (PUT/DELETE), `goals/suggest` (POST) — see §5.
- `dashboard` (GET) — aggregates today's intake, burn, macros, chart data, live goal progress, weight plan.
- `profile` (GET/PUT), `exercises` (GET/POST), `exercises/[id]`, `upload` (POST → Blob).
- `auth/register` (POST), `auth/[...nextauth]` (NextAuth).
- `ideas` (GET/POST), `ideas/[id]` (PATCH/DELETE), `ideas/[id]/estimate` (POST) — owner-gated backlog. See §7.

## 5. Key flows

### Snap → analyze → edit → save
1. User photographs a meal (`meals` page). Base64 → `POST /api/analyze`.
2. Claude returns detected items + totals; the form pre-fills.
3. **Edit amounts:** each item stores a *base* quantity + macros; changing the amount scales macros from the base (`lib/meal-nutrition.ts` — `parseQuantity`, `scaleMacros`, `recomputeTotals`, `coerceNumber`). Guards: divide-by-zero, fractions, non-numeric quantities.
4. **Correct a food:** the item's "wrong food?" path calls `/api/analyze/correct` and swaps just that item.
5. Totals derive from items when items exist (the total fields go read-only). Save → `POST /api/meals` (or `PUT` for edits, which replaces items).

### Goals that calculate themselves
- `lib/utils.ts` — `calculateBMR` (Mifflin-St Jeor), `calculateTDEE` (activity multiplier), `calculateWeightPlan` (deficit, daily calorie target, protein target).
- `lib/goal-suggestions.ts` — `suggestGoals(profile)` turns the profile into calorie/protein/carbs/fat/exercise targets. **Null-guarded**: missing age/activity → that goal is *skipped with a reason*, never a wrong number.
- `POST /api/goals/suggest` — server reads the profile, computes, and upserts in a transaction. `dryRun` returns a diff; `replace[]` overwrites only the goal types the user opted into. Never silently overwrites a hand-tuned (`source: manual`) goal.
- Onboarding pre-fills step 2 from `suggestGoals`; the Goals page has a "Calculate from profile" button + a conflict-aware confirm dialog.

### Dashboard
- `GET /api/dashboard` sums today's meals (intake) and exercises (burn), builds the chart, computes live goal progress per type, and the weight plan. Net calories = intake − burn vs. target.

## 6. Conventions

- Every API route starts with `getCurrentUserId()` (from `lib/session.ts`) → 401 if absent. All queries are `userId`-scoped.
- Dark mode: Tailwind `media` strategy — follows the OS, no manual toggle.
- UI primitives in `src/components/ui/` (Button, Input, Select, Textarea, Card, Progress).
- The landing page (`src/app/page.tsx`) uses a scoped `<style>` block with `sm-` prefixed classes (ported from the approved mockup), not Tailwind, for the custom hero/animations.

## 7. The Ideas backlog (owner-only)

- **Two views:** `/ideas` is a compact **board** (one row per idea: title + badges + a quick status dropdown, links to the detail page). `/ideas/[id]` is the **detail page** — full notes, the AI implementation scope, inline edit (title/notes), all triage controls (status/priority/value/effort), re-estimate, and delete. The board deliberately does **not** show the scope text; that lives on the detail page.
- **Board tooling:** summary stat chips (total, open, quick-wins count, per-status counts); a search box; filters for status / priority / effort and a **quick-wins** toggle; sort by newest / priority / least-effort / quick-wins-first; and a collapsible **value-vs-effort matrix** (Quick wins · Big bets · Fill-ins · Time sinks). A **quick win** = high value (`impact`) + low effort (`complexity` S or M).
- **Auto AI estimate:** on submit, the client fires `POST /api/ideas/[id]/estimate`, which sends the idea + a condensed app context to Claude (Opus 5) and fills in **complexity** (S/M/L/XL effort), **impact** (low/med/high value) and an **implementation-scope** summary. If the user set no priority, the AI's suggested priority is applied. Re-estimate from the detail page reruns it; editing the idea text auto-reruns it. You can manually override value/effort on the detail page.
- **Access control (`lib/owner.ts`):** the page + API are locked to the **owner only**. If `OWNER_EMAIL` is set (Vercel env), that account is the owner; otherwise the owner is the **first-registered account** (you). Every other signed-in user is denied — they see "private to the app owner." Set `OWNER_EMAIL` if you ever want to hand ownership to a different account.
- **How Claude reads it:** ask Claude to "read my ideas" — it fetches `GET /api/ideas` (JSON) using an authenticated session, same as the QA flow, or you paste the list. Ideas that become real work get promoted into a plan/spec and, when built, documented back here.

## 8. Roadmap

- **Native Swift/SwiftUI iOS app** — the decided next big step. A snap-a-photo product wants to be native, and Apple Health (HealthKit) is only reachable from a native app. It's a *frontend rebuild* — the entire backend above is reused. MVP: Sign in with Apple + snap + dashboard + HealthKit active-energy → auto net-calories. Full CEO plan: `~/.gstack/projects/vitoc82-se-Tracker/ceo-plans/2026-08-09-snapmeal-ios.md`.
- Deferred: Samsung/Android (revisit React Native or a second native build), wearable aggregator (Terra/Vital) for Garmin/Fitbit/Oura/Whoop breadth.
