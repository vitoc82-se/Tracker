"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Target, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";

interface Goal {
  id: string;
  goalType: string;
  target: number;
  current: number;
  unit: string;
  period: string;
  isActive: boolean;
}

const GOAL_TYPE_OPTIONS = [
  { value: "calories", label: "Daily Calories", unit: "kcal" },
  { value: "protein", label: "Protein", unit: "g" },
  { value: "carbs", label: "Carbs", unit: "g" },
  { value: "fat", label: "Fat", unit: "g" },
  { value: "exercise_minutes", label: "Exercise Minutes", unit: "minutes" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    goalType: "calories",
    target: "",
    period: "daily",
  });

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      if (res.ok) setGoals(await res.json());
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const goalOption = GOAL_TYPE_OPTIONS.find(
      (o) => o.value === form.goalType
    );

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType: form.goalType,
          target: parseFloat(form.target),
          unit: goalOption?.unit || "units",
          period: form.period,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({ goalType: "calories", target: "", period: "daily" });
        fetchGoals();
      }
    } catch (err) {
      console.error("Failed to create goal:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    try {
      await fetch(`/api/goals/${id}`, { method: "DELETE" });
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error("Failed to delete goal:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Goals
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Set and track your nutrition and fitness goals
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" /> Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" /> New Goal
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create a Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="goalType">Goal Type</Label>
                  <Select
                    id="goalType"
                    value={form.goalType}
                    onChange={(e) =>
                      setForm({ ...form, goalType: e.target.value })
                    }
                    className="mt-1.5"
                  >
                    {GOAL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="target">
                    Target (
                    {GOAL_TYPE_OPTIONS.find((o) => o.value === form.goalType)
                      ?.unit || "units"}
                    )
                  </Label>
                  <Input
                    id="target"
                    type="number"
                    value={form.target}
                    onChange={(e) =>
                      setForm({ ...form, target: e.target.value })
                    }
                    placeholder="e.g., 2000"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="period">Period</Label>
                  <Select
                    id="period"
                    value={form.period}
                    onChange={(e) =>
                      setForm({ ...form, period: e.target.value })
                    }
                    className="mt-1.5"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Creating..." : "Create Goal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No goals set
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Create your first nutrition or fitness goal
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const percentage = goal.target
              ? Math.min((goal.current / goal.target) * 100, 100)
              : 0;
            const isComplete = goal.current >= goal.target;
            const goalLabel =
              GOAL_TYPE_OPTIONS.find((o) => o.value === goal.goalType)?.label ||
              goal.goalType;

            return (
              <Card key={goal.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {goalLabel}
                      </h3>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">
                        {goal.period} target
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteGoal(goal.id)}
                      className="text-gray-400 hover:text-red-500 -mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatNumber(goal.current, 0)} {goal.unit}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatNumber(goal.target, 0)} {goal.unit}
                      </span>
                    </div>
                    <Progress
                      value={goal.current}
                      max={goal.target}
                      indicatorClassName={
                        isComplete ? "bg-emerald-500" : "bg-blue-500"
                      }
                    />
                  </div>
                  <p className="text-xs text-right">
                    {isComplete ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Goal reached!
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        {formatNumber(percentage, 0)}% complete
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
