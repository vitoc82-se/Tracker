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
  alternatives: string[]; // AI "did you mean?" suggestions
  corrected: boolean; // user re-identified this item
  originalName: string; // the name as loaded, to detect a rename
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
    alternatives?: string[];
    corrected?: boolean;
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
  alternatives?: unknown;
  corrected?: unknown;
}): FormItem {
  const calories = coerceNumber(item.calories);
  const protein = coerceNumber(item.protein);
  const carbs = coerceNumber(item.carbs);
  const fat = coerceNumber(item.fat);
  const quantity = item.quantity != null ? String(item.quantity) : undefined;
  const name = typeof item.name === "string" ? item.name : "Item";
  return {
    id: item.id,
    name,
    originalName: name,
    quantity,
    unit: item.unit != null ? String(item.unit) : undefined,
    calories,
    protein,
    carbs,
    fat,
    alternatives: Array.isArray(item.alternatives)
      ? item.alternatives.filter((a): a is string => typeof a === "string")
      : [],
    corrected: Boolean(item.corrected),
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
  // Stored photo URL of the meal being edited (used for the re-identify vision
  // pass when the image only exists as a Blob URL, not base64).
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-item edit UI state.
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [reidentifyingIndex, setReidentifyingIndex] = useState<number | null>(null);
  const [reidentifyError, setReidentifyError] = useState("");
  const [showManualMacros, setShowManualMacros] = useState(false);

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

  // Commit a plain rename (no AI): mark corrected when the name actually
  // changed, so a rename persists on save even without a nutrition re-estimate.
  const commitName = (index: number) => {
    const newName = nameDraft.trim();
    setForm((prev) => {
      const items = [...prev.items];
      const it = items[index];
      if (!newName || newName === it.name) return prev;
      items[index] = {
        ...it,
        name: newName,
        corrected: newName !== it.originalName ? true : it.corrected,
      };
      return { ...prev, items };
    });
  };

  // Pick one of the AI's "did you mean?" suggestions into the name field.
  const pickAlternative = (alt: string) => {
    setNameDraft(alt);
    setReidentifyError("");
  };

  // Re-identify: ask the AI for fresh macros for the item's new name, using the
  // meal photo when we have it. Falls back to a manual override on failure.
  const reidentify = async (index: number) => {
    const newName = nameDraft.trim();
    const item = form.items[index];
    if (!newName || newName === item.name) {
      // Nothing to re-estimate; just persist a rename if any.
      commitName(index);
      return;
    }
    setReidentifyingIndex(index);
    setReidentifyError("");
    try {
      const payload: Record<string, unknown> = {
        itemName: item.name,
        name: newName,
        unit: item.unit,
        quantity: item.quantity,
      };
      // Prefer freshly-selected base64 (new meal); otherwise the saved photo URL.
      if (imageBase64) {
        payload.image = imageBase64;
        payload.mimeType = imageMimeType;
      } else if (editImageUrl) {
        payload.imageUrl = editImageUrl;
      }

      const res = await fetch("/api/analyze/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const corrected = await res.json();
        setForm((prev) => {
          const items = [...prev.items];
          const prevItem = items[index];
          const next = toFormItem({ ...corrected, id: prevItem.id });
          // Keep the item's identity as corrected and remember the original name
          // so a later revert is still flagged sensibly.
          items[index] = { ...next, originalName: prevItem.originalName, corrected: true };
          return { ...prev, items };
        });
        setShowManualMacros(false);
      } else {
        const data = await res.json().catch(() => null);
        // Persist the rename even though the estimate failed, then reveal the
        // manual macro fallback.
        commitName(index);
        setShowManualMacros(true);
        setReidentifyError(
          data?.error || "Couldn't estimate that automatically — enter the macros manually below."
        );
      }
    } catch (err) {
      console.error("Re-identify failed:", err);
      commitName(index);
      setShowManualMacros(true);
      setReidentifyError("Couldn't reach the AI — enter the macros manually below.");
    } finally {
      setReidentifyingIndex(null);
    }
  };

  // Manual macro override (fallback path): edit a single macro directly and
  // rebase it so amount scaling keeps working from the new value.
  const updateItemMacro = (
    index: number,
    field: "calories" | "protein" | "carbs" | "fat",
    value: string
  ) => {
    const n = coerceNumber(value);
    setForm((prev) => {
      const items = [...prev.items];
      const it = items[index];
      const baseField = (
        { calories: "baseCalories", protein: "baseProtein", carbs: "baseCarbs", fat: "baseFat" } as const
      )[field];
      items[index] = {
        ...it,
        [field]: n,
        [baseField]: n,
        corrected: true,
      };
      return { ...prev, items };
    });
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
      setEditImageUrl(meal.imageUrl);
    } else {
      setEditImageUrl(null);
    }
    setExpandedItem(null);
    setNameDraft("");
    setReidentifyError("");
    setShowManualMacros(false);
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
          corrected: it.corrected,
          alternatives: it.alternatives,
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
    setEditImageUrl(null);
    setAnalyzeError("");
    setExpandedItem(null);
    setNameDraft("");
    setReidentifyError("");
    setShowManualMacros(false);
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
                    Tap the sliders to change an amount (macros adjust
                    automatically) or re-identify a wrong item.
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
                            <span className="font-medium text-gray-700 dark:text-gray-300 min-w-0 truncate flex items-center gap-1.5">
                              <span className="truncate">{item.name}</span>
                              {item.corrected && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shrink-0"
                                  title="You re-identified this item"
                                >
                                  corrected
                                </span>
                              )}
                              {item.quantity && (
                                <span className="text-gray-400 shrink-0">
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
                                  const willExpand = !expanded;
                                  setExpandedItem(willExpand ? i : null);
                                  setNameDraft(willExpand ? item.name : "");
                                  setReidentifyError("");
                                  setShowManualMacros(false);
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
                              {/* Food name — rename + re-identify */}
                              <div>
                                <Label className="text-xs">Food</Label>
                                <Input
                                  value={nameDraft}
                                  onChange={(e) => setNameDraft(e.target.value)}
                                  onBlur={() => commitName(i)}
                                  maxLength={80}
                                  placeholder="What is this food?"
                                  className="mt-1"
                                />
                                {item.alternatives.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    <span className="text-xs text-gray-400">
                                      Did you mean?
                                    </span>
                                    {item.alternatives.map((alt) => (
                                      <button
                                        key={alt}
                                        type="button"
                                        onClick={() => pickAlternative(alt)}
                                        className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-600"
                                      >
                                        {alt}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                      reidentifyingIndex === i ||
                                      !nameDraft.trim() ||
                                      nameDraft.trim() === item.name
                                    }
                                    onClick={() => reidentify(i)}
                                  >
                                    {reidentifyingIndex === i ? (
                                      "Re-identifying…"
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5 mr-1" /> Re-identify &amp;
                                        update nutrition
                                      </>
                                    )}
                                  </Button>
                                </div>
                                {reidentifyError && (
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
                                    {reidentifyError}
                                  </p>
                                )}
                              </div>

                              {/* Amount editor — scales macros proportionally */}
                              {scalable && (
                                <div className="pt-1 border-t border-gray-200 dark:border-gray-600">
                                  <Label className="text-xs">Amount</Label>
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
                                    <span className="text-gray-500">{item.unit}</span>
                                    <span className="text-xs text-gray-400">
                                      = {formatNumber(item.calories, 0)} kcal
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Change the number — the macros update automatically.
                                  </p>
                                </div>
                              )}

                              {/* Manual macro override — fallback when the AI can't estimate */}
                              {showManualMacros ? (
                                <div className="pt-1 border-t border-gray-200 dark:border-gray-600">
                                  <Label className="text-xs">Macros (manual)</Label>
                                  <div className="grid grid-cols-4 gap-2 mt-1">
                                    {(
                                      [
                                        ["calories", "kcal"],
                                        ["protein", "P (g)"],
                                        ["carbs", "C (g)"],
                                        ["fat", "F (g)"],
                                      ] as const
                                    ).map(([field, label]) => (
                                      <div key={field}>
                                        <span className="text-[10px] text-gray-400">
                                          {label}
                                        </span>
                                        <Input
                                          type="number"
                                          inputMode="decimal"
                                          value={item[field]}
                                          onChange={(e) =>
                                            updateItemMacro(i, field, e.target.value)
                                          }
                                          className="mt-0.5"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setShowManualMacros(true)}
                                  className="text-xs text-gray-400 hover:text-emerald-600 hover:underline"
                                >
                                  Enter macros manually instead
                                </button>
                              )}
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
