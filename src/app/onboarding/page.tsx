"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, Target, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const GOAL_SUGGESTIONS = [
  { type: "calories", label: "Daily Calories", unit: "kcal", placeholder: "2000", description: "Total daily calorie intake target" },
  { type: "protein", label: "Protein", unit: "g", placeholder: "150", description: "Daily protein goal" },
  { type: "carbs", label: "Carbs", unit: "g", placeholder: "250", description: "Daily carbohydrate goal" },
  { type: "fat", label: "Fat", unit: "g", placeholder: "65", description: "Daily fat goal" },
  { type: "exercise_minutes", label: "Exercise Minutes", unit: "minutes", placeholder: "30", description: "Daily active minutes target" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    gender: "",
    age: "",
    height: "",
    weight: "",
    activityLevel: "",
  });
  const [goals, setGoals] = useState<Record<string, string>>({});

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!form.gender || !form.height || !form.weight) {
      setError("Please fill in gender, height, and weight.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStep(2);
      } else {
        setError("Failed to save profile. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleGoalsSubmit = async () => {
    setSaving(true);
    setError("");

    try {
      const activeGoals = Object.entries(goals).filter(([, value]) => value && parseFloat(value) > 0);

      for (const [goalType, target] of activeGoals) {
        const suggestion = GOAL_SUGGESTIONS.find((s) => s.type === goalType);
        await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalType,
            target: parseFloat(target),
            unit: suggestion?.unit || "units",
            period: "daily",
          }),
        });
      }

      router.push("/dashboard");
    } catch {
      setError("Failed to save goals. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const hasAnyGoal = Object.values(goals).some((v) => v && parseFloat(v) > 0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 mb-4">
            {step === 1 ? (
              <UtensilsCrossed className="w-8 h-8 text-white" />
            ) : (
              <Target className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {step === 1 ? "Welcome to NutriTrack" : "Set Your Goals"}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {step === 1
              ? "Tell us a bit about yourself so we can personalize your experience"
              : "Set daily targets to stay on track (you can change these later)"}
          </p>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`h-2 w-8 rounded-full ${step === 1 ? "bg-emerald-600" : "bg-emerald-200 dark:bg-emerald-800"}`} />
            <div className={`h-2 w-8 rounded-full ${step === 2 ? "bg-emerald-600" : "bg-emerald-200 dark:bg-emerald-800"}`} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {step === 1 ? (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    id="gender"
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                    required
                    className="mt-1.5"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={form.age}
                    onChange={(e) =>
                      setForm({ ...form, age: e.target.value })
                    }
                    placeholder="25"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={form.height}
                    onChange={(e) =>
                      setForm({ ...form, height: e.target.value })
                    }
                    placeholder="175"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={form.weight}
                    onChange={(e) =>
                      setForm({ ...form, weight: e.target.value })
                    }
                    placeholder="70"
                    required
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="activityLevel">Activity Level</Label>
                <Select
                  id="activityLevel"
                  value={form.activityLevel}
                  onChange={(e) =>
                    setForm({ ...form, activityLevel: e.target.value })
                  }
                  className="mt-1.5"
                >
                  <option value="">Select</option>
                  <option value="sedentary">
                    Sedentary (little or no exercise)
                  </option>
                  <option value="light">
                    Light (exercise 1-3 days/week)
                  </option>
                  <option value="moderate">
                    Moderate (exercise 3-5 days/week)
                  </option>
                  <option value="active">
                    Active (exercise 6-7 days/week)
                  </option>
                  <option value="very_active">
                    Very Active (hard exercise daily)
                  </option>
                </Select>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : (
                  <span className="flex items-center justify-center gap-2">
                    Next: Set Goals <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="space-y-4">
                {GOAL_SUGGESTIONS.map((suggestion) => (
                  <div key={suggestion.type} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`goal-${suggestion.type}`} className="text-sm font-medium">
                        {suggestion.label}
                      </Label>
                      <p className="text-xs text-gray-400 mt-0.5">{suggestion.description}</p>
                    </div>
                    <div className="w-32 flex-shrink-0">
                      <div className="relative">
                        <Input
                          id={`goal-${suggestion.type}`}
                          type="number"
                          value={goals[suggestion.type] || ""}
                          onChange={(e) =>
                            setGoals({ ...goals, [suggestion.type]: e.target.value })
                          }
                          placeholder={suggestion.placeholder}
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          {suggestion.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={handleGoalsSubmit}
                  className="flex-1"
                  disabled={saving}
                >
                  {saving ? "Saving..." : hasAnyGoal ? "Save Goals & Continue" : "Skip for Now"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
