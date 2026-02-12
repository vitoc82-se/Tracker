"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, Dumbbell, X, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber } from "@/lib/utils";

interface Exercise {
  id: string;
  name: string;
  exerciseType: string;
  duration: number;
  caloriesBurned: number;
  intensity: string | null;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  distance: number | null;
  notes: string | null;
  loggedAt: string;
}

const EXERCISE_TYPE_COLORS: Record<string, string> = {
  cardio: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  strength: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  flexibility: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  sports: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  mixed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  cardio: "Cardio",
  strength: "Strength",
  flexibility: "Flexibility",
  sports: "Sports",
  mixed: "Mixed",
};

const QUICK_ACTIVITIES = [
  { label: "Walking", type: "cardio" },
  { label: "Running", type: "cardio" },
  { label: "Cycling", type: "cardio" },
  { label: "Swimming", type: "cardio" },
  { label: "Gym / Weights", type: "strength" },
  { label: "Yoga / Stretching", type: "flexibility" },
  { label: "Sports", type: "sports" },
  { label: "Other", type: "mixed" },
];

// MET values by activity and intensity (low/medium/high)
const MET_VALUES: Record<string, Record<string, number>> = {
  Walking:            { low: 2.5, medium: 3.5, high: 4.5 },
  Running:            { low: 7.0, medium: 9.0, high: 12.0 },
  Cycling:            { low: 4.0, medium: 6.0, high: 10.0 },
  Swimming:           { low: 5.0, medium: 7.0, high: 10.0 },
  "Gym / Weights":    { low: 3.0, medium: 5.0, high: 6.0 },
  "Yoga / Stretching":{ low: 2.0, medium: 3.0, high: 4.0 },
  Sports:             { low: 4.0, medium: 6.0, high: 8.0 },
  Other:              { low: 3.0, medium: 4.0, high: 6.0 },
};

const DEFAULT_WEIGHT_KG = 70;

function estimateCalories(activity: string, durationMin: number, intensity: string, weightKg: number): number {
  const mets = MET_VALUES[activity] || MET_VALUES["Other"];
  const met = mets[intensity] || mets.medium;
  return Math.round(met * weightKg * (durationMin / 60));
}

const INITIAL_FORM = {
  name: "",
  exerciseType: "cardio",
  duration: "",
  caloriesBurned: "",
  intensity: "medium",
  notes: "",
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userWeight, setUserWeight] = useState<number>(DEFAULT_WEIGHT_KG);
  const [caloriesManuallySet, setCaloriesManuallySet] = useState(false);

  const [form, setForm] = useState(INITIAL_FORM);

  const fetchExercises = useCallback(async () => {
    try {
      const res = await fetch("/api/exercises?limit=30", { cache: "no-store" });
      if (res.ok) setExercises(await res.json());
    } catch (err) {
      console.error("Failed to fetch exercises:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user weight for calorie estimation
  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((user) => {
        if (user?.weight) setUserWeight(user.weight);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // Auto-estimate calories when activity, duration, or intensity changes
  useEffect(() => {
    if (caloriesManuallySet) return;
    const duration = parseInt(form.duration);
    if (!form.name || !duration || duration <= 0) return;
    const estimated = estimateCalories(form.name, duration, form.intensity, userWeight);
    setForm((prev) => ({ ...prev, caloriesBurned: String(estimated) }));
  }, [form.name, form.duration, form.intensity, userWeight, caloriesManuallySet]);

  const handleQuickSelect = (activity: { label: string; type: string }) => {
    setCaloriesManuallySet(false);
    setForm((prev) => ({ ...prev, name: activity.label, exerciseType: activity.type }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setCaloriesManuallySet(false);
  };

  const openForm = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setCaloriesManuallySet(true); // keep their existing value
    setForm({
      name: ex.name,
      exerciseType: ex.exerciseType,
      duration: String(ex.duration),
      caloriesBurned: String(ex.caloriesBurned),
      intensity: ex.intensity || "medium",
      notes: ex.notes || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: form.name,
        exerciseType: form.exerciseType,
        duration: parseInt(form.duration) || 0,
        caloriesBurned: parseFloat(form.caloriesBurned) || 0,
        intensity: form.intensity,
        notes: form.notes || undefined,
      };

      const url = editingId ? `/api/exercises/${editingId}` : "/api/exercises";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        resetForm();
        fetchExercises();
      }
    } catch (err) {
      console.error("Failed to save exercise:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExercise = async (id: string) => {
    if (!confirm("Delete this exercise entry?")) return;
    try {
      await fetch(`/api/exercises/${id}`, { method: "DELETE" });
      setExercises((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // Group exercises by date
  const groupedExercises = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const date = new Date(ex.loggedAt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(ex);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Exercise
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Log your daily activity summary
          </p>
        </div>
        <Button onClick={() => showForm ? (setShowForm(false), resetForm()) : openForm()}>
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" /> Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" /> Log Activity
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Activity" : "Log Today\u0027s Activity"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Quick activity select */}
              <div>
                <Label className="mb-2 block">What did you do?</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIVITIES.map((activity) => (
                    <button
                      key={activity.label}
                      type="button"
                      onClick={() => handleQuickSelect(activity)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        form.name === activity.label
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-400"
                      }`}
                    >
                      {activity.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom name if "Other" or no quick select */}
              {(form.name === "Other" || !QUICK_ACTIVITIES.some(a => a.label === form.name)) && (
                <div>
                  <Label htmlFor="exName">Activity Name</Label>
                  <Input
                    id="exName"
                    value={form.name === "Other" ? "" : form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g., Hiking, Dance class"
                    required
                    className="mt-1.5"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duration">Total Minutes</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={form.duration}
                    onChange={(e) => {
                      setCaloriesManuallySet(false);
                      setForm((prev) => ({ ...prev, duration: e.target.value }));
                    }}
                    placeholder="45"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="calBurned">
                    Calories Burned
                    {!caloriesManuallySet && form.caloriesBurned && (
                      <span className="text-xs text-emerald-600 ml-1">(est.)</span>
                    )}
                  </Label>
                  <Input
                    id="calBurned"
                    type="number"
                    value={form.caloriesBurned}
                    onChange={(e) => {
                      setCaloriesManuallySet(true);
                      setForm((prev) => ({ ...prev, caloriesBurned: e.target.value }));
                    }}
                    placeholder="300"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="intensity">Effort Level</Label>
                  <Select
                    id="intensity"
                    value={form.intensity}
                    onChange={(e) => {
                      setCaloriesManuallySet(false);
                      setForm((prev) => ({ ...prev, intensity: e.target.value }));
                    }}
                    className="mt-1.5"
                  >
                    <option value="low">Light</option>
                    <option value="medium">Moderate</option>
                    <option value="high">Intense</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="exNotes">Notes (optional)</Label>
                <Textarea
                  id="exNotes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="e.g., Morning jog + evening stretching, felt good today"
                  rows={2}
                  className="mt-1.5"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving..." : editingId ? "Update Activity" : "Save Activity"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : exercises.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Dumbbell className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No activity logged yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Log your daily exercise at the end of the day
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExercises).map(([date, dayExercises]) => {
            const totalMinutes = dayExercises.reduce((s, e) => s + e.duration, 0);
            const totalCalories = dayExercises.reduce((s, e) => s + e.caloriesBurned, 0);

            return (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">{date}</h3>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-gray-400">
                    {totalMinutes} min &middot; {formatNumber(totalCalories, 0)} kcal
                  </span>
                </div>
                <div className="space-y-2">
                  {dayExercises.map((ex) => (
                    <Card key={ex.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {ex.name}
                              </h3>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  EXERCISE_TYPE_COLORS[ex.exerciseType] || EXERCISE_TYPE_COLORS.mixed
                                }`}
                              >
                                {EXERCISE_TYPE_LABELS[ex.exerciseType] || ex.exerciseType}
                              </span>
                              {ex.intensity && (
                                <span className="text-xs text-gray-400 capitalize">
                                  {ex.intensity === "low" ? "Light" : ex.intensity === "high" ? "Intense" : "Moderate"}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                              <span>{ex.duration} min</span>
                              {ex.caloriesBurned > 0 && (
                                <span>{formatNumber(ex.caloriesBurned, 0)} kcal</span>
                              )}
                            </div>
                            {ex.notes && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 italic">
                                {ex.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(ex)}
                              className="text-gray-400 hover:text-blue-500"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteExercise(ex.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
