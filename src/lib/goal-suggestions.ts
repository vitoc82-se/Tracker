// Turn a user's profile into suggested daily goals. Pure and null-safe: the
// BMR/TDEE formulas silently coerce null->0 (giving nonsense like BMR≈5 or a
// 0g protein target), so every required field is guarded here before any
// calculation runs. Goals that can't be computed are returned as `skipped`
// with a user-facing reason instead of a wrong number.
import { calculateBMR, calculateTDEE, calculateWeightPlan } from "./utils";

export interface ProfileInput {
  weight?: number | null;
  targetWeight?: number | null;
  height?: number | null;
  age?: number | null;
  gender?: string | null;
  activityLevel?: string | null;
}

export interface SuggestedGoal {
  goalType: string;
  target: number;
  unit: string;
  period: string;
  source: "auto";
}

export interface SkippedGoal {
  goalType: string;
  reason: string;
}

const EXERCISE_MINUTES: Record<string, number> = {
  sedentary: 30,
  light: 30,
  moderate: 40,
  active: 45,
  very_active: 45,
};

function isPositive(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

export function suggestGoals(p: ProfileInput): {
  goals: SuggestedGoal[];
  skipped: SkippedGoal[];
} {
  const goals: SuggestedGoal[] = [];
  const skipped: SkippedGoal[] = [];

  // Calorie/protein math needs a full body profile. Without it the formulas
  // return official-looking garbage, so gate on every input.
  const canComputeEnergy =
    isPositive(p.weight) &&
    isPositive(p.height) &&
    isPositive(p.age) &&
    !!p.gender &&
    !!p.activityLevel;

  if (canComputeEnergy) {
    const bmr = calculateBMR(p.weight!, p.height!, p.age!, p.gender!);
    const tdee = calculateTDEE(bmr, p.activityLevel!);

    let calories: number;
    let protein: number;
    if (isPositive(p.targetWeight)) {
      const plan = calculateWeightPlan(p.weight!, p.targetWeight!, tdee);
      calories = plan.dailyCalorieTarget;
      protein = plan.proteinTarget;
    } else {
      // No target weight → maintenance.
      calories = Math.round(tdee);
      protein = Math.round(1.6 * p.weight!);
    }

    if (isPositive(calories)) {
      goals.push({ goalType: "calories", target: calories, unit: "kcal", period: "daily", source: "auto" });

      if (isPositive(protein)) {
        goals.push({ goalType: "protein", target: protein, unit: "g", period: "daily", source: "auto" });
      }

      // Carbs/fat from a standard split so onboarding shows a consistent set:
      // fat ~30% of calories, protein as computed, carbs the remainder.
      const proteinCal = (isPositive(protein) ? protein : 0) * 4;
      const fatCal = calories * 0.3;
      const fatG = Math.round(fatCal / 9);
      const carbsG = Math.round(Math.max(calories - proteinCal - fatCal, 0) / 4);
      if (isPositive(carbsG)) {
        goals.push({ goalType: "carbs", target: carbsG, unit: "g", period: "daily", source: "auto" });
      }
      if (isPositive(fatG)) {
        goals.push({ goalType: "fat", target: fatG, unit: "g", period: "daily", source: "auto" });
      }
    }
  } else {
    const reason = "Add your age and activity level to calculate calorie and macro targets.";
    skipped.push({ goalType: "calories", reason });
    skipped.push({ goalType: "protein", reason });
  }

  // Exercise is a labeled starter default, not derived from the energy math.
  if (p.activityLevel && EXERCISE_MINUTES[p.activityLevel] != null) {
    goals.push({
      goalType: "exercise_minutes",
      target: EXERCISE_MINUTES[p.activityLevel],
      unit: "minutes",
      period: "daily",
      source: "auto",
    });
  } else {
    skipped.push({
      goalType: "exercise_minutes",
      reason: "Add your activity level to get an exercise target.",
    });
  }

  return { goals, skipped };
}
