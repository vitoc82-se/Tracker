# Plan: Auto-calculate goals from profile (REVIEWED)

Status: reviewed via /autoplan (CEO + Design + Eng). Codex unavailable — independent voice via Claude subagent. User confirmed D1=prefill+confirm, D2=require age+activity level.

## Problem
The profile computes a full weight plan (`dailyCalorieTarget`, `proteinTarget` via `calculateWeightPlan`), but those numbers never become goals. Users hand-type goals on the Goals page, and onboarding step 2 makes them type numbers the app already knows.

## Locked decisions
- **D1 = Prefill + one-click, never silent.** Onboarding pre-fills computed numbers (editable); Goals page gets a "Calculate from my profile" button; profile save nudges "targets changed, recalculate?" when they drift. Nothing is written to the account without the user seeing it.
- **D2 = Require age + activity level** in onboarding step 1 so the calorie/protein goals always compute from real inputs.

## Auto-decided (correctness, from review)
- **Server-authoritative:** new `POST /api/goals/suggest` reads the profile, runs `suggestGoals`, upserts the set in one transaction. `POST /api/goals` stays insert-only (manual "New Goal" unaffected).
- **`source` field** on `Goal` (`@default("manual")`): auto goals are `"auto"`. Recalculate only overwrites `source:"auto"` rows; hand-tuned (`manual`) goals are shown as a before→after diff and never silently replaced.
- **`@@unique([userId, goalType, period])`** with a **dedup data-migration first** (keep newest active per key, delete rest) so the constraint can't fail on existing duplicate rows.
- **`suggestGoals` null-guards each field**; omits any goal it can't compute and returns a reason (no more BMR≈5 / 0g-protein artifacts). Uses `calculateWeightPlan` only when targetWeight present; single maintenance path otherwise.
- Compute all 5 (calories, protein, carbs, fat, exercise) so onboarding's 5 inputs are consistent; carbs/fat from a calorie split; exercise is a labeled starter default (skipped if activity level absent).

## Changes

### 1. Schema + migration
- `Goal.source String @default("manual")`.
- Dedup migration, then `@@unique([userId, goalType, period])`.

### 2. `lib/goal-suggestions.ts` (NEW, pure)
- `suggestGoals(profile) -> { goals: {goalType,target,unit,period,source:"auto"}[], skipped: {goalType, reason}[] }`.
- calories: `calculateWeightPlan(...).dailyCalorieTarget` when targetWeight+full profile; else maintenance `round(TDEE)`. Requires height/weight/age/gender/activityLevel — else skipped with reason.
- protein: `weightPlan.proteinTarget` or `round(1.6*weight)`.
- carbs/fat: from remaining calories after protein (≈40/30/30 split).
- exercise_minutes: activity-level starter default; skipped if activityLevel absent.

### 3. `POST /api/goals/suggest` (NEW)
- Reads profile, computes, upserts each `source:"auto"` goal in a transaction. Returns the created/updated set + skipped reasons + any `manual` conflicts (for the diff UI). 401 unauth.

### 4. Onboarding
- Step 1: age + activityLevel now required (D2).
- Step 2: on entry, compute via `suggestGoals` and pre-fill inputs (editable); copy "We calculated these from your profile — adjust anything, then save." Only show inputs for computed goals; skipped ones show "add X to compute." Create via `/api/goals/suggest`.

### 5. Goals page
- "Calculate from my profile" button (header + empty-state CTA). Opens a confirm that **diffs old→new per goal type**, flags manual goals it won't touch, lets the user deselect. Loading/error/empty ("profile missing X") states driven by the endpoint's skipped-reasons.

### 6. Profile save nudge
- `PUT /api/profile` returns `staleGoals: true` when auto goals exist and computed targets drifted materially; profile page shows a "Your targets changed — recalculate?" banner. No silent write.

## Not in scope (deferred to TODOS.md)
- Auto-recomputing goals on a schedule / weight change without user action (the "frozen snapshot" strategic gap — nudge only for now).
- Weight-goal time series.
- Changing the BMR/TDEE formulas.

## Failure modes registry
| Mode | Handling |
|---|---|
| age / activityLevel missing | required in onboarding (D2); on Goals page, calorie/protein skipped with reason |
| targetWeight missing | maintenance calories via TDEE, protein 1.6g/kg |
| null profile fields reaching math | `suggestGoals` guards before calling; never routes 0s into formulas |
| duplicate existing goals | dedup migration before unique constraint |
| double-click Calculate | transactional upsert on unique key — no duplicates |
| user hand-tuned a goal | `source:"manual"` never overwritten; shown in diff |
| recompute after weight change | profile-save nudge, user confirms |

## Test plan
- `suggestGoals`: full profile → 5 goals; no targetWeight → maintenance + 1.6g/kg; **age absent → calories/protein skipped with reason** (most common real path); activity-level → exercise mapping; null fields → skipped, never 0-target.
- `/api/goals/suggest`: creates on first run; second run updates same rows (no dupes); leaves `manual` goals untouched; unauth 401; transaction rolls back on partial failure.
- Migration: dedups pre-existing duplicates; unique constraint holds; GET live-progress still correct after upsert.
- Onboarding: age+activity required; step 2 prefilled matches profile; skipped goals show reason.
- Goals page: diff dialog shows old→new; manual conflict flagged; empty-state CTA present.
