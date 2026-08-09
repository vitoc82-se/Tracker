<!-- /autoplan restore point: ~/.gstack/projects/vitoc82-se-Tracker/main-autoplan-restore-20260809-161237.md -->
# Plan: Correct & edit AI meal analysis (REVIEWED)

Status: reviewed via /autoplan (CEO + Design + Eng). Codex unavailable — independent voice via Claude subagent. Decisions D1=surgical, D2=include-saved-meals confirmed by user.

## Problem
The photo AI (`/api/analyze`, Claude Sonnet 4.5 vision) misidentifies food and misjudges amounts. Users need to (1) correct a misidentified item and get a re-estimate for just that item, and (2) edit detected amounts (250g→150g) with macros following.

## Locked decisions
- **D1 = Surgical correction.** Correcting an item re-estimates only that item; other items and any manual edits are preserved. Deterministic.
- **D2 = New + saved meals.** Editing amounts and correcting items works both while logging and on already-saved meals.

## Architecture (ASCII)
```
                       meals/page.tsx (client)
                        |            |            |
        edit amount     | correct    | save/edit  |
        (proportional)  | (surgical) |            |
        [local, no net] |            |            |
                        v            v            v
              scaleItem()   POST /api/analyze/correct   PUT/POST /api/meals
              (base*factor) {item, correction}          (now sends items on PUT too)
                   |             |                             |
            recomputeTotals()    v                             v
            (shared helper)  Claude text estimate       db.meal + items (replace)
                             -> one corrected item
```

## Changes

### 1. `lib/meal-nutrition.ts` (NEW shared helper) — correctness core
- `parseQuantity(quantity: string): number | null` — leading decimal or simple fraction ("1/2"→0.5); returns null for "a handful"/empty/non-numeric.
- `scaleItem(base, newQty): item` — `factor = newQty / base.baseQuantity`; each macro = `base.baseX * factor`. Caller only invokes when `baseQuantity` is a finite number > 0.
- `recomputeTotals(items): {calories, protein, carbs, fat}` — single source of truth. Fixes the existing `removeItem` staleness (empty list → zeros, not stale strings). Fiber handled at meal level (see #4).

### 2. `POST /api/analyze/correct` (NEW route) — surgical re-estimate
- Body: `{ itemName, correction, unit? }`. No image — identity is now known, this is a text nutrition estimate.
- Prompt: "The user corrected an item to: <correction>. Give a nutrition estimate for a typical serving. Return ONLY this JSON: {name, quantity, unit, calories, protein, carbs, fat}." Correction clearly delimited as user data.
- Response validated + number-coerced before return (see #3).
- Reuses the auth + APIError handling pattern from `/api/analyze`.

### 3. `POST /api/analyze` — harden response parsing (auto-decided, correctness)
- After `JSON.parse`, validate shape: `items` is array, macro fields coerced to finite numbers (default 0), strings like `"12g"` stripped to numbers. Prevents `NaN`/string values from poisoning scaling. Same coercion helper used by the correct route.

### 4. `meals/page.tsx` — editable items + correction UI + saved-meal load
- On analyze/correct, store per item: `baseQuantity` (from `parseQuantity`), `baseCalories/baseProtein/baseCarbs/baseFat`.
- Item row gains an **edit mode** (expanded, not crammed into the 375px row): number input for amount + unit, a "not right?" text field that calls `/api/analyze/correct` and replaces that one item. Amount scales on **blur/commit**, not per keystroke (avoids "1"→"15"→"150" flicker and empty→NaN).
- Non-scalable items (`parseQuantity` null or ≤0): amount field disabled with a hint; user can edit macros directly or remove.
- **Precedence resolved:** when items exist, meal totals are **derived** from items (recomputed on every item change) and the total inputs go read-only; with no items, totals stay hand-editable (today's behavior).
- **Re-analyze guard:** if the form has manual edits, confirm before the full photo re-analyze overwrites them. (Surgical correction never touches other fields, so this only guards the top-level "AI Analyze" button.)
- Meal-level fiber scales proportionally with total calorie change so it stays consistent with the macros shown next to it.
- `startEdit` loads `meal.items` into the form (today it sets `items: []`).

### 5. `PUT /api/meals/[id]` — accept items on edit (enables D2)
- Accept `items`; replace the meal's items (delete existing + create new) inside the update. GET already includes items.

## Not in scope (deferred to TODOS.md)
- A multi-turn "chat about this meal" thread. Single correction round-trip per item only.
- A real food-macro table (the strategic end state; base-macro storage is chosen now so it can slot in later without a rewrite).
- Editing exercise entries' detail the same way (unrelated surface).

## Failure modes registry
| Mode | Handling |
|---|---|
| AI returns `quantity: "0"` / empty | `parseQuantity` → null/≤0 → scaling disabled for that item |
| AI returns `"12g"` string macros | coercion in #3 strips to number |
| Correction produces off-shape JSON | response validation → 500 "AI returned invalid data" |
| Repeated amount edits | scale from stored base, never compound |
| Re-analyze over manual edits | confirm-before-overwrite guard |
| Remove last item | `recomputeTotals` returns zeros, not stale totals |
| Correct-item network fail | per-item error shown inline, item unchanged |

## Test plan
- `parseQuantity`: "250"→250, "1/2 cup"→0.5, "a handful"→null, ""→null, "0"→0 (disabled).
- `scaleItem`: 250→150 scales macros ×0.6; repeated edits stay exact (base-anchored); never NaN.
- `recomputeTotals`: sums items; empty → zeros; matches after edit and after remove.
- `/api/analyze/correct`: valid correction → coerced numeric item; malformed AI JSON → handled; unauth → 401.
- `/api/analyze` hardening: string/NaN macros coerced; non-array items rejected.
- `PUT /api/meals/[id]` with items: replaces items, totals persist; unauth → 401.
- UI: edit amount recomputes totals + fiber; totals read-only when items exist; correction replaces one item only; re-analyze guard fires when dirty.
