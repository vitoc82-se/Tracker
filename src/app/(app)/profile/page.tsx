"use client";

import { useEffect, useState, useCallback } from "react";
import { Save, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { calculateBMR, calculateTDEE, calculateWeightPlan, formatNumber } from "@/lib/utils";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  height: number | null;
  weight: number | null;
  targetWeight: number | null;
  age: number | null;
  gender: string | null;
  activityLevel: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: "",
    height: "",
    weight: "",
    targetWeight: "",
    age: "",
    gender: "",
    activityLevel: "",
  });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          name: data.name || "",
          height: data.height ? String(data.height) : "",
          weight: data.weight ? String(data.weight) : "",
          targetWeight: data.targetWeight ? String(data.targetWeight) : "",
          age: data.age ? String(data.age) : "",
          gender: data.gender || "",
          activityLevel: data.activityLevel || "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  };

  // Calculate BMR and TDEE if we have enough data
  const bmr =
    form.weight && form.height && form.age && form.gender
      ? calculateBMR(
          parseFloat(form.weight),
          parseFloat(form.height),
          parseInt(form.age),
          form.gender
        )
      : null;

  const tdee =
    bmr && form.activityLevel
      ? calculateTDEE(bmr, form.activityLevel)
      : null;

  const weightPlan =
    tdee && form.weight && form.targetWeight
      ? calculateWeightPlan(
          parseFloat(form.weight),
          parseFloat(form.targetWeight),
          tdee
        )
      : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Profile
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your personal information and body metrics
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Your name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={profile?.email || ""}
                  disabled
                  className="mt-1.5 opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  id="gender"
                  value={form.gender}
                  onChange={(e) =>
                    setForm({ ...form, gender: e.target.value })
                  }
                  className="mt-1.5"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
              </div>
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
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="weight">Current Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) =>
                    setForm({ ...form, weight: e.target.value })
                  }
                  placeholder="70"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="targetWeight">Target Weight (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                step="0.1"
                value={form.targetWeight}
                onChange={(e) =>
                  setForm({ ...form, targetWeight: e.target.value })
                }
                placeholder="e.g., 65 — we'll create a plan for you"
                className="mt-1.5"
              />
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

            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* BMR / TDEE Calculator */}
      {bmr && (
        <Card>
          <CardHeader>
            <CardTitle>Estimated Daily Energy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Basal Metabolic Rate (BMR)
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(bmr, 0)} kcal
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Calories burned at rest
                </p>
              </div>
              {tdee && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    Total Daily Energy Expenditure (TDEE)
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatNumber(tdee, 0)} kcal
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Estimated daily calorie needs
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weight Plan */}
      {weightPlan && weightPlan.direction !== "maintain" && (
        <Card>
          <CardHeader>
            <CardTitle>
              Your Weight Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Current</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {weightPlan.currentWeight} kg
                  </p>
                </div>
                <div className="flex-1 flex items-center justify-center px-4">
                  <div className="h-0.5 flex-1 bg-gray-300 dark:bg-gray-600" />
                  <span className="px-2 text-xs text-gray-400">
                    {weightPlan.direction === "lose" ? `-${formatNumber(weightPlan.weightDiff, 1)} kg` : `+${formatNumber(weightPlan.weightDiff, 1)} kg`}
                  </span>
                  <div className="h-0.5 flex-1 bg-gray-300 dark:bg-gray-600" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Target</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {weightPlan.targetWeight} kg
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Daily Calories</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    {formatNumber(weightPlan.dailyCalorieTarget, 0)}
                  </p>
                  <p className="text-xs text-gray-400">kcal/day</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {weightPlan.direction === "lose" ? "Daily Deficit" : "Daily Surplus"}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    {formatNumber(weightPlan.dailyDeficit, 0)}
                  </p>
                  <p className="text-xs text-gray-400">kcal/day</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Protein Target</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    {weightPlan.proteinTarget}g
                  </p>
                  <p className="text-xs text-gray-400">per day</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                  <p className="text-xs text-orange-600 dark:text-orange-400">Est. Timeline</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    {weightPlan.estimatedWeeks}w
                  </p>
                  <p className="text-xs text-gray-400">~{weightPlan.estimatedDate}</p>
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Based on a safe rate of {weightPlan.weeklyRateKg} kg/week.
                {weightPlan.direction === "lose"
                  ? " Eat below your TDEE while keeping protein high to preserve muscle."
                  : " Eat above your TDEE with adequate protein for lean gains."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {profile?.createdAt && (
        <p className="text-xs text-gray-400 text-center">
          Member since{" "}
          {new Date(profile.createdAt).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
