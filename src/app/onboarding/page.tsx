"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function OnboardingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    gender: "",
    age: "",
    height: "",
    weight: "",
    activityLevel: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
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
        router.push("/dashboard");
      } else {
        setError("Failed to save profile. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 mb-4">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to NutriTrack
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Tell us a bit about yourself so we can personalize your experience
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
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
              {saving ? "Saving..." : "Continue to Dashboard"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
