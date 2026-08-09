# Plan: Landing page overhaul + rebrand to SnapMeal

## Goals (from user)
1. Rebrand NutriTrack → **SnapMeal** (snapmeal.dev). Play on Snapchat — you snap a photo of your food.
2. Redesign the start page around the real, shipped features with a proper call-to-action (today both buttons just go to /auth/signin).
3. Add an "explain it like I'm 5" section for how the calorie/macro calculations work — plain, confidence-building.

## Current state (what exists)
`src/app/page.tsx`: utensils-icon hero, "NutriTrack" headline, generic subhead, two buttons (both → /auth/signin), a 6-card feature grid (Photo Analysis, AI Nutrition Estimates, Visual Dashboard, Exercise Tracking, Custom Goals, BMR & TDEE), plain footer. It reads as a template — the exact "generic SaaS card grid" first impression, with no brand personality and a weak, duplicated CTA.

## Real features to sell (shipped this session)
- **Snap & analyze:** photo → AI reads the food and estimates calories + macros.
- **Fix it in a tap:** correct a misidentified item or edit an amount; macros follow.
- **Goals that set themselves:** enter your body stats once, we compute your calorie/protein/exercise targets.
- **Track progress:** dashboard with intake vs. target, macros, exercise, weight plan.

## Proposed landing page (top → bottom)
1. **Brand-first hero.** "SnapMeal" wordmark + camera mark. One-line promise: *"Snap your meal. Know your macros. Hit your goals."* One primary CTA — **"Snap your first meal — free"** → /auth/signin?mode=signup — plus a quiet "Sign in" text link. A product visual: a phone showing a photo resolving into a nutrition card (the core magic in one image), not a stock hero.
2. **How it works, in 3 steps** (replaces the flat 6-card grid): Snap → Review & tweak → Track. Each step one job, one visual, one line. This is the scannable narrative.
3. **"Explain it like I'm 5" — how your targets are calculated.** A friendly, trust-building block. Plain-language chain: *your body burns X just existing (BMR) → you burn more moving around (TDEE) → to reach your goal we set your daily target a little below that → protein kept high so you keep muscle.* Show the actual formula names quietly for credibility, but lead with the plain version. Ends with a confidence line: "the same math dietitians and the big fitness apps use — no guessing."
4. **Secondary features strip** (compact, not 6 equal cards): correction/editing, auto-goals, progress dashboard.
5. **Footer:** SnapMeal, snapmeal.dev.

## Rebrand scope (names to change)
Landing page, onboarding copy, navbar wordmark, footer, page `<title>`/metadata, README. (This review focuses on the landing page; the rest is a mechanical find-and-replace tracked separately.)

## Open design decisions (for review)
- Hero visual: real photo-to-card product shot vs. illustrated vs. abstract.
- ELI5 tone: how playful vs. how authoritative (needs both: approachable but credible).
- Keep the emerald brand color, or refresh the palette with the rename?

## Not in scope
- The in-app screens (dashboard, meals, goals) — this is the marketing/start page only.
- Actually wiring snapmeal.dev DNS/domain.
