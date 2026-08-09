"use client";

import { useEffect, useState, useCallback } from "react";
import { Lightbulb, Plus, Trash2, X, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Idea {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  priority: string;
  complexity: string | null;
  scope: string | null;
  aiEstimatedAt: string | null;
  createdAt: string;
}

const STATUSES = [
  { value: "new", label: "New" },
  { value: "considering", label: "Considering" },
  { value: "building", label: "Building" },
  { value: "done", label: "Done" },
  { value: "parked", label: "Parked" },
];

const PRIORITIES = [
  { value: "none", label: "No priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  considering: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  building: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  done: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  parked: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const COMPLEXITY_STYLES: Record<string, string> = {
  S: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  M: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  L: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  XL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function IdeasBoard() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [estimating, setEstimating] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ title: "", notes: "", priority: "none" });

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch("/api/ideas", { cache: "no-store" });
      if (res.ok) setIdeas(await res.json());
    } catch (err) {
      console.error("Failed to fetch ideas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const markEstimating = (id: string, on: boolean) =>
    setEstimating((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  // Run the AI estimate for an idea and merge the result in place.
  const runEstimate = useCallback(async (id: string) => {
    markEstimating(id, true);
    try {
      const res = await fetch(`/api/ideas/${id}/estimate`, { method: "POST" });
      if (res.ok) {
        const updated: Idea = await res.json();
        setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
      }
    } catch (err) {
      console.error("Estimate failed:", err);
    } finally {
      markEstimating(id, false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          notes: form.notes || undefined,
          priority: form.priority,
        }),
      });
      if (res.ok) {
        const created: Idea = await res.json();
        setForm({ title: "", notes: "", priority: "none" });
        setShowForm(false);
        setIdeas((prev) => [created, ...prev]);
        // Auto-estimate in the background — the card fills in when it returns.
        runEstimate(created.id);
      }
    } catch (err) {
      console.error("Failed to save idea:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const patchIdea = async (id: string, patch: Partial<Idea>) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    try {
      await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch (err) {
      console.error("Failed to update idea:", err);
    }
  };

  const deleteIdea = async (id: string) => {
    if (!confirm("Delete this idea?")) return;
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete idea:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ideas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Your private backlog — capture it, and we&apos;ll estimate the build
            automatically
          </p>
        </div>
        <Button
          onClick={() => {
            if (showForm) setForm({ title: "", notes: "", priority: "none" });
            setShowForm(!showForm);
          }}
        >
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" /> Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" /> New Idea
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Capture an idea</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Idea</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Weekly email summary of my macros"
                  required
                  autoFocus
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any detail, context, or why it matters..."
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="mt-1.5 w-full sm:w-48"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving..." : "Save idea"}
              </Button>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                After you save, the AI estimates complexity and implementation
                scope in the background.
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : ideas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lightbulb className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No ideas yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Jot down the first thing you&apos;d love SnapMeal to do
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => {
            const isEstimating = estimating.has(idea.id);
            return (
              <Card key={idea.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {idea.title}
                        </h3>
                        {idea.priority !== "none" && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              PRIORITY_STYLES[idea.priority]
                            }`}
                          >
                            {idea.priority} priority
                          </span>
                        )}
                        {idea.complexity && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              COMPLEXITY_STYLES[idea.complexity] || COMPLEXITY_STYLES.M
                            }`}
                            title="AI complexity estimate"
                          >
                            {idea.complexity}
                          </span>
                        )}
                      </div>
                      {idea.notes && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                          {idea.notes}
                        </p>
                      )}

                      {/* AI estimate */}
                      {isEstimating ? (
                        <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Estimating complexity &amp; scope…
                        </p>
                      ) : idea.scope ? (
                        <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 text-sm">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            Implementation scope
                          </div>
                          <p className="text-gray-600 dark:text-gray-300">{idea.scope}</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => runEstimate(idea.id)}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Estimate the build
                        </button>
                      )}

                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {new Date(idea.createdAt).toLocaleDateString()}
                        {idea.scope && !isEstimating && (
                          <>
                            {" · "}
                            <button
                              type="button"
                              onClick={() => runEstimate(idea.id)}
                              className="hover:underline"
                            >
                              re-estimate
                            </button>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          STATUS_STYLES[idea.status] || STATUS_STYLES.new
                        }`}
                      >
                        {STATUSES.find((s) => s.value === idea.status)?.label ||
                          idea.status}
                      </span>
                      <Select
                        value={idea.priority}
                        onChange={(e) => patchIdea(idea.id, { priority: e.target.value })}
                        className="w-36 text-sm"
                        aria-label="Priority"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </Select>
                      <Select
                        value={idea.status}
                        onChange={(e) => patchIdea(idea.id, { status: e.target.value })}
                        className="w-36 text-sm"
                        aria-label="Status"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteIdea(idea.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
