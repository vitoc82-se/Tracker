"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Dumbbell, X } from "lucide-react";
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

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  cardio: "Cardio",
  strength: "Strength",
  flexibility: "Flexibility",
  sports: "Sports",
};

const EXERCISE_TYPE_COLORS: Record<string, string> = {
  cardio: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  strength:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  flexibility:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  sports:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    exerciseType: "cardio",
    duration: "",
    caloriesBurned: "",
    intensity: "medium",
    sets: "",
    reps: "",
    weight: "",
    distance: "",
    notes: "",
  });

  const fetchExercises = useCallback(async () => {
    try {
      const res = await fetch("/api/exercises?limit=20");
      if (res.ok) setExercises(await res.json());
    } catch (err) {
      console.error("Failed to fetch exercises:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          exerciseType: form.exerciseType,
          duration: parseInt(form.duration) || 0,
          caloriesBurned: parseFloat(form.caloriesBurned) || 0,
          intensity: form.intensity,
          sets: form.sets ? parseInt(form.sets) : undefined,
          reps: form.reps ? parseInt(form.reps) : undefined,
          weight: form.weight ? parseFloat(form.weight) : undefined,
          distance: form.distance ? parseFloat(form.distance) : undefined,
          notes: form.notes || undefined,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({
          name: "",
          exerciseType: "cardio",
          duration: "",
          caloriesBurned: "",
          intensity: "medium",
          sets: "",
          reps: "",
          weight: "",
          distance: "",
          notes: "",
        });
        fetchExercises();
      }
    } catch (err) {
      console.error("Failed to save exercise:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExercise = async (id: string) => {
    if (!confirm("Delete this exercise?")) return;
    try {
      await fetch(`/api/exercises/${id}`, { method: "DELETE" });
      setExercises((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const isStrength = form.exerciseType === "strength";
  const isCardio = form.exerciseType === "cardio";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Exercises
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track your workouts and physical activity
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" /> Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" /> Log Exercise
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Log Exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="exName">Exercise Name</Label>
                  <Input
                    id="exName"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g., Running, Bench Press"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="exType">Type</Label>
                  <Select
                    id="exType"
                    value={form.exerciseType}
                    onChange={(e) =>
                      setForm({ ...form, exerciseType: e.target.value })
                    }
                    className="mt-1.5"
                  >
                    <option value="cardio">Cardio</option>
                    <option value="strength">Strength</option>
                    <option value="flexibility">Flexibility</option>
                    <option value="sports">Sports</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="intensity">Intensity</Label>
                  <Select
                    id="intensity"
                    value={form.intensity}
                    onChange={(e) =>
                      setForm({ ...form, intensity: e.target.value })
                    }
                    className="mt-1.5"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({ ...form, duration: e.target.value })
                    }
                    placeholder="30"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="calBurned">Calories Burned</Label>
                  <Input
                    id="calBurned"
                    type="number"
                    value={form.caloriesBurned}
                    onChange={(e) =>
                      setForm({ ...form, caloriesBurned: e.target.value })
                    }
                    placeholder="200"
                    className="mt-1.5"
                  />
                </div>
                {isCardio && (
                  <div>
                    <Label htmlFor="distance">Distance (km)</Label>
                    <Input
                      id="distance"
                      type="number"
                      step="0.1"
                      value={form.distance}
                      onChange={(e) =>
                        setForm({ ...form, distance: e.target.value })
                      }
                      placeholder="5.0"
                      className="mt-1.5"
                    />
                  </div>
                )}
                {isStrength && (
                  <>
                    <div>
                      <Label htmlFor="sets">Sets</Label>
                      <Input
                        id="sets"
                        type="number"
                        value={form.sets}
                        onChange={(e) =>
                          setForm({ ...form, sets: e.target.value })
                        }
                        placeholder="3"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reps">Reps</Label>
                      <Input
                        id="reps"
                        type="number"
                        value={form.reps}
                        onChange={(e) =>
                          setForm({ ...form, reps: e.target.value })
                        }
                        placeholder="12"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="exWeight">Weight (kg)</Label>
                      <Input
                        id="exWeight"
                        type="number"
                        step="0.5"
                        value={form.weight}
                        onChange={(e) =>
                          setForm({ ...form, weight: e.target.value })
                        }
                        placeholder="60"
                        className="mt-1.5"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="exNotes">Notes (optional)</Label>
                <Textarea
                  id="exNotes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="How did it go?"
                  className="mt-1.5"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving..." : "Save Exercise"}
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
              No exercises logged
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Start by logging your first workout
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exercises.map((ex) => (
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
                          EXERCISE_TYPE_COLORS[ex.exerciseType] || ""
                        }`}
                      >
                        {EXERCISE_TYPE_LABELS[ex.exerciseType] ||
                          ex.exerciseType}
                      </span>
                      {ex.intensity && (
                        <span className="text-xs text-gray-400 capitalize">
                          {ex.intensity}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <span>{ex.duration} min</span>
                      <span>
                        {formatNumber(ex.caloriesBurned, 0)} kcal burned
                      </span>
                      {ex.distance && <span>{ex.distance} km</span>}
                      {ex.sets && ex.reps && (
                        <span>
                          {ex.sets}x{ex.reps}
                          {ex.weight ? ` @ ${ex.weight}kg` : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(ex.loggedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteExercise(ex.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
