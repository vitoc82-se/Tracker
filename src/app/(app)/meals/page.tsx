"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Camera,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber } from "@/lib/utils";

interface MealItem {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity?: string;
  unit?: string;
}

interface Meal {
  id: string;
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  imageUrl: string | null;
  notes: string | null;
  aiAnalysis: string | null;
  loggedAt: string;
  items: MealItem[];
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    mealType: "lunch",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    notes: "",
    items: [] as MealItem[],
  });

  const fetchMeals = useCallback(async () => {
    try {
      const res = await fetch("/api/meals?limit=20");
      if (res.ok) setMeals(await res.json());
    } catch (err) {
      console.error("Failed to fetch meals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewImage(result);
      // Extract base64 data (remove data:image/...;base64, prefix)
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    setAnalyzeError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, mimeType: imageMimeType }),
      });

      if (res.ok) {
        const analysis = await res.json();
        setForm((prev) => ({
          ...prev,
          name: analysis.name || prev.name,
          calories: String(analysis.totalCalories || ""),
          protein: String(analysis.totalProtein || ""),
          carbs: String(analysis.totalCarbs || ""),
          fat: String(analysis.totalFat || ""),
          fiber: String(analysis.totalFiber || ""),
          items: analysis.items || [],
        }));
      } else {
        const data = await res.json().catch(() => null);
        setAnalyzeError(
          data?.error || "Analysis failed. Please try again or enter values manually."
        );
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setAnalyzeError("Could not connect to the analysis service. Please enter values manually.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Upload image if present
      let imageUrl: string | undefined;
      if (previewImage && fileInputRef.current?.files?.[0]) {
        const formData = new FormData();
        formData.append("file", fileInputRef.current.files[0]);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          imageUrl = url;
        }
      }

      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          mealType: form.mealType,
          calories: parseFloat(form.calories) || 0,
          protein: parseFloat(form.protein) || 0,
          carbs: parseFloat(form.carbs) || 0,
          fat: parseFloat(form.fat) || 0,
          fiber: parseFloat(form.fiber) || 0,
          notes: form.notes || undefined,
          imageUrl,
          items: form.items,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        resetForm();
        fetchMeals();
      }
    } catch (err) {
      console.error("Failed to save meal:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMeal = async (id: string) => {
    if (!confirm("Delete this meal?")) return;
    try {
      await fetch(`/api/meals/${id}`, { method: "DELETE" });
      setMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      mealType: "lunch",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      fiber: "",
      notes: "",
      items: [],
    });
    setPreviewImage(null);
    setImageBase64(null);
    setAnalyzeError("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Meals
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Log your meals and track nutrition
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" /> Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" /> Log Meal
            </>
          )}
        </Button>
      </div>

      {/* Add meal form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Log a Meal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Photo upload and AI analysis */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                {previewImage ? (
                  <div className="space-y-3">
                    <img
                      src={previewImage}
                      alt="Food preview"
                      className="max-h-48 mx-auto rounded-lg object-cover"
                    />
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button
                        type="button"
                        onClick={analyzeImage}
                        disabled={analyzing}
                        size="sm"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {analyzing ? "Analyzing..." : "AI Analyze"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewImage(null);
                          setImageBase64(null);
                          setAnalyzeError("");
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    {analyzeError && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {analyzeError}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 w-full"
                  >
                    <Camera className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Take a photo or upload an image for AI analysis
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      Claude will estimate the nutrition content
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Meal Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g., Grilled chicken salad"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="mealType">Meal Type</Label>
                  <Select
                    id="mealType"
                    value={form.mealType}
                    onChange={(e) =>
                      setForm({ ...form, mealType: e.target.value })
                    }
                    className="mt-1.5"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={form.calories}
                    onChange={(e) =>
                      setForm({ ...form, calories: e.target.value })
                    }
                    placeholder="kcal"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    value={form.protein}
                    onChange={(e) =>
                      setForm({ ...form, protein: e.target.value })
                    }
                    placeholder="g"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    value={form.carbs}
                    onChange={(e) =>
                      setForm({ ...form, carbs: e.target.value })
                    }
                    placeholder="g"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    value={form.fat}
                    onChange={(e) =>
                      setForm({ ...form, fat: e.target.value })
                    }
                    placeholder="g"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="fiber">Fiber (g)</Label>
                  <Input
                    id="fiber"
                    type="number"
                    value={form.fiber}
                    onChange={(e) =>
                      setForm({ ...form, fiber: e.target.value })
                    }
                    placeholder="g"
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* AI detected items */}
              {form.items.length > 0 && (
                <div>
                  <Label>Detected Items</Label>
                  <div className="mt-1.5 space-y-2">
                    {form.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
                      >
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {item.name}
                          {item.quantity && (
                            <span className="text-gray-400 ml-1">
                              ({item.quantity} {item.unit})
                            </span>
                          )}
                        </span>
                        <span className="text-gray-500">
                          {formatNumber(item.calories, 0)} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="Any additional notes..."
                  className="mt-1.5"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving..." : "Save Meal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Meals list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : meals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UtensilsCrossed className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No meals logged yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Start by logging your first meal
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meals.map((meal) => (
            <Card key={meal.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-4 min-w-0">
                    {meal.imageUrl && (
                      <img
                        src={meal.imageUrl}
                        alt={meal.name}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {meal.name}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {MEAL_TYPE_LABELS[meal.mealType] || meal.mealType}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatNumber(meal.calories, 0)} kcal</span>
                        <span>P: {formatNumber(meal.protein, 0)}g</span>
                        <span>C: {formatNumber(meal.carbs, 0)}g</span>
                        <span>F: {formatNumber(meal.fat, 0)}g</span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(meal.loggedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMeal(meal.id)}
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
