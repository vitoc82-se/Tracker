"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Camera,
  Sparkles,
  Trash2,
  Pencil,
  UtensilsCrossed,
  X,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber } from "@/lib/utils";
import {
  parseQuantity,
  scaleMacros,
  isScalable,
  recomputeTotals,
  coerceNumber,
} from "@/lib/meal-nutrition";

interface FormItem {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity?: string;
  unit?: string;
  // Stored base for stable proportional scaling (never mutated on edit).
  baseQuantity: number | null;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
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
  items: {
    id?: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity?: string;
    unit?: string;
  }[];
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

// Build a FormItem (with scaling base) from an AI-analysis or DB item.
function toFormItem(item: {
  id?: string;
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  calories?: unknown;
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
}): FormItem {
  const calories = coerceNumber(item.calories);
  const protein = coerceNumber(item.protein);
  const carbs = coerceNumber(item.carbs);
  const fat = coerceNumber(item.fat);
  const quantity = item.quantity != null ? String(item.quantity) : undefined;
  return {
    id: item.id,
    name: typeof item.name === "string" ? item.name : "Item",
    quantity,
    unit: item.unit != null ? String(item.unit) : undefined,
    calories,
    protein,
    carbs,
    fat,
    baseQuantity: parseQuantity(quantity),
    baseCalories: calories,
    baseProtein: protein,
    baseCarbs: carbs,
    baseFat: fat,
  };
}

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-item edit UI state.
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [correctingIndex, setCorrectingIndex] = useState<number | null>(null);
  const [correctionError, setCorrectionError] = useState("");

  const [form, setForm] = useState({
    name: "",
    mealType: "lunch",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    notes: "",
    items: [] as FormItem[],
    // Baseline for deriving fiber proportionally (items carry no fiber field).
    fiberBasis: null as { fiber: number; calories: number } | null,
  });

  const hasItems = form.items.length > 0;
  const derived = recomputeTotals(form.items);
  const derivedFiber =
    form.fiberBasis && form.fiberBasis.calories > 0
      ? form.fiberBasis.fiber * (derived.calories / form.fiberBasis.calories)
      : form.fiberBasis?.fiber ?? 0;

  const fetchMeals = useCallback(async () => {
    try {
      const res = await fetch("/api/meals?limit=20", { cache: "no-store" });
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
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  // True when the user has typed or edited anything the AI would overwrite.
  const formHasContent = () =>
    Boolean(
      form.name ||
        form.items.length ||
        form.calories ||
        form.protein ||
        form.carbs ||
        form.fat ||
        form.fiber
    );

  const analyzeImage = async () => {
    if (!imageBase64) return;
    // Guard: full re-analysis overwrites the whole form. Confirm if dirty.
    if (
      formHasContent() &&
      !confirm(
        "Re-analyzing will replace the current name, totals, and detected items, including any edits you made. Continue?"
      )
    ) {
      return;
    }
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
        const items: FormItem[] = (analysis.items || []).map(toFormItem);
        setForm((prev) => ({
          ...prev,
          name: analysis.name || prev.name,
          calories: String(analysis.totalCalories || ""),
          protein: String(analysis.totalProtein || ""),
          carbs: String(analysis.totalCarbs || ""),
          fat: String(analysis.totalFat || ""),
          fiber: String(analysis.totalFiber || ""),
          items,
          fiberBasis: {
            fiber: coerceNumber(analysis.totalFiber),
            calories: coerceNumber(analysis.totalCalories),
          },
        }));
        setExpandedItem(null);
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

  // Live text edit of an item's amount (macros settle on blur).
  const updateItemQuantityText = (index: number, text: string) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], quantity: text };
      return { ...prev, items };
    });
  };

  // Commit an amount edit: scale macros from the stored base.
  const commitItemAmount = (index: number) => {
    setForm((prev) => {
      const items = [...prev.items];
      const it = items[index];
      if (!isScalable(it)) return prev;
      const newQty = parseQuantity(it.quantity);
      if (newQty == null || newQty <= 0) {
        // Invalid amount: revert display to the base quantity.
        items[index] = { ...it, quantity: String(it.baseQuantity) };
        return { ...prev, items };
      }
      const scaled = scaleMacros(it, newQty);
      items[index] = { ...it, ...scaled };
      return { ...prev, items };
    });
  };

  const submitCorrection = async (index: number) => {
    const text = correctionText.trim();
    if (!text) return;
    const item = form.items[index];
    setCorrectingIndex(index);
    setCorrectionError("");
    try {
      const res = await fetch("/api/analyze/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemName: item.name, correction: text, unit: item.unit }),
      });
      if (res.ok) {
        const corrected = await res.json();
        setForm((prev) => {
          const items = [...prev.items];
          items[index] = toFormItem(corrected);
          return { ...prev, items };
        });
        setCorrectionText("");
        setExpandedItem(null);
      } else {
        const data = await res.json().catch(() => null);
        setCorrectionError(data?.error || "Correction failed. Please try again.");
      }
    } catch (err) {
      console.error("Correction failed:", err);
      setCorrectionError("Could not connect to the correction service.");
    } finally {
      setCorrectingIndex(null);
    }
  };

  const startEdit = (meal: Meal) => {
    setEditingId(meal.id);
    const items = (meal.items || []).map(toFormItem);
    setForm({
      name: meal.name,
      mealType: meal.mealType,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fat: String(meal.fat),
      fiber: String(meal.fiber),
      notes: meal.notes || "",
      items,
      fiberBasis:
        items.length > 0
          ? { fiber: meal.fiber, calories: meal.calories }
          : null,
    });
    if (meal.imageUrl) {
      setPreviewImage(meal.imageUrl);
    }
    setExpandedItem(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
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

      // Totals derive from items when items exist; otherwise use the manual
      // fields.
      const totals = hasItems
        ? {
            calories: derived.calories,
            protein: derived.protein,
            carbs: derived.carbs,
            fat: derived.fat,
            fiber: derivedFiber,
          }
        : {
            calories: parseFloat(form.calories) || 0,
            protein: parseFloat(form.protein) || 0,
            carbs: parseFloat(form.carbs) || 0,
            fat: parseFloat(form.fat) || 0,
            fiber: parseFloat(form.fiber) || 0,
          };

      const payload = {
        name: form.name,
        mealType: form.mealType,
        ...totals,
        notes: form.notes || undefined,
        ...(imageUrl ? { imageUrl } : {}),
        // Items are sent on both create and edit so amount/correction edits
        // persist for saved meals too.
        items: form.items.map((it) => ({
          name: it.name,
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
          quantity: it.quantity,
          unit: it.unit,
        })),
      };

      const url = editingId ? `/api/meals/${editingId}` : "/api/meals";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setExpandedItem(null);
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
      fiberBasis: null,
    });
    setEditingId(null);
    setPreviewImage(null);
    setImageBase64(null);
    setAnalyzeError("");
    setExpandedItem(null);
    setCorrectionText("");
    setCorrectionError("");
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
        <Button onClick={() => { if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } }}>
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
            <CardTitle>{editingId ? "Edit Meal" : "Log a Meal"}</CardTitle>
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

              {hasItems && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Totals are calculated from the items below. Edit an item&apos;s
                  amount to update them.
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={hasItems ? formatNumber(derived.calories, 0) : form.calories}
                    onChange={(e) =>
                      setForm({ ...form, calories: e.target.value })
                    }
                    placeholder="kcal"
                    readOnly={hasItems}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    value={hasItems ? formatNumber(derived.protein, 0) : form.protein}
                    onChange={(e) =>
                      setForm({ ...form, protein: e.target.value })
                    }
                    placeholder="g"
                    readOnly={hasItems}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    value={hasItems ? formatNumber(derived.carbs, 0) : form.carbs}
                    onChange={(e) =>
                      setForm({ ...form, carbs: e.target.value })
                    }
                    placeholder="g"
                    readOnly={hasItems}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    value={hasItems ? formatNumber(derived.fat, 0) : form.fat}
                    onChange={(e) =>
                      setForm({ ...form, fat: e.target.value })
                    }
                    placeholder="g"
                    readOnly={hasItems}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="fiber">Fiber (g)</Label>
                  <Input
                    id="fiber"
                    type="number"
                    value={hasItems ? formatNumber(derivedFiber, 0) : form.fiber}
                    onChange={(e) =>
                      setForm({ ...form, fiber: e.target.value })
                    }
                    placeholder="g"
                    readOnly={hasItems}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Detected items — editable */}
              {hasItems && (
                <div>
                  <Label>Detected Items</Label>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Wrong amount or wrong food? Tap the sliders to fix an item.
                  </p>
                  <div className="mt-1.5 space-y-2">
                    {form.items.map((item, i) => {
                      const scalable = isScalable(item);
                      const expanded = expandedItem === i;
                      return (
                        <div
                          key={i}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300 min-w-0 truncate">
                              {item.name}
                              {item.quantity && (
                                <span className="text-gray-400 ml-1">
                                  ({item.quantity} {item.unit})
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-gray-500">
                                {formatNumber(item.calories, 0)} kcal
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedItem(expanded ? null : i);
                                  setCorrectionText("");
                                  setCorrectionError("");
                                }}
                                className={`transition-colors p-1 rounded ${
                                  expanded
                                    ? "text-emerald-600"
                                    : "text-gray-400 hover:text-emerald-600"
                                }`}
                                title="Edit amount or fix this item"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(i)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                                title="Remove item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {expanded && (
                            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-200 dark:border-gray-600">
                              {/* Amount editor */}
                              <div>
                                <Label className="text-xs">Amount</Label>
                                {scalable ? (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      value={item.quantity ?? ""}
                                      onChange={(e) =>
                                        updateItemQuantityText(i, e.target.value)
                                      }
                                      onBlur={() => commitItemAmount(i)}
                                      className="w-28"
                                    />
                                    <span className="text-gray-500">
                                      {item.unit}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      macros scale with the amount
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 mt-1">
                                    This item&apos;s amount ({item.quantity}{" "}
                                    {item.unit}) can&apos;t be auto-scaled. Fix
                                    it below, or remove it.
                                  </p>
                                )}
                              </div>

                              {/* Correction */}
                              <div>
                                <Label className="text-xs">
                                  Not right? Tell the AI what it actually is
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    value={expanded ? correctionText : ""}
                                    onChange={(e) =>
                                      setCorrectionText(e.target.value)
                                    }
                                    placeholder="e.g., this is orange juice, not a mimosa"
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                      correctingIndex === i ||
                                      !correctionText.trim()
                                    }
                                    onClick={() => submitCorrection(i)}
                                  >
                                    {correctingIndex === i ? (
                                      "Fixing..."
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5 mr-1" /> Fix
                                      </>
                                    )}
                                  </Button>
                                </div>
                                {correctionError && (
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    {correctionError}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                {submitting ? "Saving..." : editingId ? "Update Meal" : "Save Meal"}
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
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(meal)}
                      className="text-gray-400 hover:text-blue-500"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMeal(meal.id)}
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
      )}
    </div>
  );
}
