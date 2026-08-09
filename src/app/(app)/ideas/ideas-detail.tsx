"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Trash2,
  Sparkles,
  Loader2,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Idea,
  STATUSES,
  PRIORITIES,
  IMPACTS,
  COMPLEXITIES,
  STATUS_STYLES,
  PRIORITY_STYLES,
  IMPACT_STYLES,
  COMPLEXITY_STYLES,
  isQuickWin,
} from "./ideas-shared";

export function IdeaDetail({ initial }: { initial: Idea }) {
  const router = useRouter();
  const [idea, setIdea] = useState<Idea>(initial);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: initial.title,
    notes: initial.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const patch = useCallback(async (data: Partial<Idea>) => {
    setIdea((prev) => ({ ...prev, ...data }));
    try {
      await fetch(`/api/ideas/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error("Failed to update idea:", err);
    }
  }, [initial.id]);

  const runEstimate = useCallback(async () => {
    setEstimating(true);
    try {
      const res = await fetch(`/api/ideas/${initial.id}/estimate`, {
        method: "POST",
      });
      if (res.ok) {
        const updated: Idea = await res.json();
        setIdea(updated);
      }
    } catch (err) {
      console.error("Estimate failed:", err);
    } finally {
      setEstimating(false);
    }
  }, [initial.id]);

  const startEdit = () => {
    setEditForm({ title: idea.title, notes: idea.notes || "" });
    setEditing(true);
  };

  const saveEdit = async () => {
    const title = editForm.title.trim();
    if (!title) return;
    const notes = editForm.notes.trim() || null;
    const changed = title !== idea.title || notes !== (idea.notes || null);
    setSaving(true);
    setIdea((prev) => ({ ...prev, title, notes }));
    try {
      await fetch(`/api/ideas/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes }),
      });
      setEditing(false);
      // The idea text drives the AI estimate, so refresh it when it changed.
      if (changed) runEstimate();
    } catch (err) {
      console.error("Failed to save idea:", err);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!confirm("Delete this idea? This can't be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/ideas/${initial.id}`, { method: "DELETE" });
      router.push("/ideas");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete idea:", err);
      setDeleting(false);
    }
  };

  const quick = isQuickWin(idea);

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/ideas"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" /> Back to ideas
      </Link>

      <Card>
        <CardContent className="p-5 space-y-5">
          {/* Header: title + edit */}
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEdit();
              }}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="edit-title">Idea</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  required
                  autoFocus
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  placeholder="Any detail, context, or why it matters..."
                  className="mt-1.5 min-h-[120px]"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  <Check className="w-4 h-4 mr-1" />
                  {saving ? "Saving..." : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Editing the idea re-runs the AI estimate.
              </p>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {quick && (
                    <span
                      className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      title="Quick win — high value, low effort"
                    >
                      <Star className="w-3 h-3" /> Quick win
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      STATUS_STYLES[idea.status] || STATUS_STYLES.new
                    }`}
                  >
                    {STATUSES.find((s) => s.value === idea.status)?.label ||
                      idea.status}
                  </span>
                  {idea.priority !== "none" && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLES[idea.priority]}`}
                    >
                      {idea.priority} priority
                    </span>
                  )}
                  {idea.impact && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${IMPACT_STYLES[idea.impact]}`}
                    >
                      {idea.impact} value
                    </span>
                  )}
                  {idea.complexity && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        COMPLEXITY_STYLES[idea.complexity] || COMPLEXITY_STYLES.M
                      }`}
                    >
                      {idea.complexity} effort
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {idea.title}
                </h1>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Added {new Date(idea.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={startEdit}
                className="shrink-0"
              >
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
            </div>
          )}

          {/* Notes */}
          {!editing && (
            <div>
              <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Notes
              </h2>
              {idea.notes ? (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {idea.notes}
                </p>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic">
                  No notes yet.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Triage controls */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Triage
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={idea.status}
                onChange={(e) => patch({ status: e.target.value })}
                className="mt-1 w-full text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select
                value={idea.priority}
                onChange={(e) => patch({ priority: e.target.value })}
                className="mt-1 w-full text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Value</Label>
              <Select
                value={idea.impact || ""}
                onChange={(e) => patch({ impact: e.target.value })}
                className="mt-1 w-full text-sm"
              >
                {!idea.impact && <option value="">— not set —</option>}
                {IMPACTS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Effort</Label>
              <Select
                value={idea.complexity || ""}
                onChange={(e) => patch({ complexity: e.target.value })}
                className="mt-1 w-full text-sm"
              >
                {!idea.complexity && <option value="">— not set —</option>}
                {COMPLEXITIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation scope */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Implementation scope
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={runEstimate}
              disabled={estimating}
            >
              {estimating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Estimating…
                </>
              ) : idea.scope ? (
                "Re-estimate"
              ) : (
                "Estimate the build"
              )}
            </Button>
          </div>
          {estimating ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Asking the AI to size this up…
            </p>
          ) : idea.scope ? (
            <>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {idea.scope}
              </p>
              {idea.aiEstimatedAt && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Estimated {new Date(idea.aiEstimatedAt).toLocaleDateString()}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No estimate yet. Run one to get complexity, value and a build
              breakdown.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={del}
          disabled={deleting}
          className="text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {deleting ? "Deleting…" : "Delete idea"}
        </Button>
      </div>
    </div>
  );
}
