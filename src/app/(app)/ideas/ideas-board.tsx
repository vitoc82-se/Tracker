"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Lightbulb,
  Plus,
  X,
  Search,
  Star,
  ChevronRight,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Idea,
  STATUSES,
  PRIORITIES,
  STATUS_STYLES,
  PRIORITY_STYLES,
  IMPACT_STYLES,
  COMPLEXITY_STYLES,
  PRIORITY_WEIGHT,
  EFFORT_WEIGHT,
  isQuickWin,
  valueEffortScore,
} from "./ideas-shared";

type SortKey = "newest" | "priority" | "effort" | "quickwins";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "priority", label: "Priority" },
  { value: "effort", label: "Least effort" },
  { value: "quickwins", label: "Quick wins first" },
];

export function IdeasBoard() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", notes: "", priority: "none" });

  // Filter / sort / search state
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fPriority, setFPriority] = useState("all");
  const [fComplexity, setFComplexity] = useState("all");
  const [quickOnly, setQuickOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [showMatrix, setShowMatrix] = useState(false);

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
        // Kick off the AI estimate in the background; it fills in on next load
        // or when you open the idea.
        fetch(`/api/ideas/${created.id}/estimate`, { method: "POST" }).catch(
          () => {}
        );
      }
    } catch (err) {
      console.error("Failed to save idea:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const patchStatus = async (id: string, status: string) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    try {
      await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error("Failed to update idea:", err);
    }
  };

  // ---- derived: stats ----
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let quick = 0;
    for (const i of ideas) {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      if (isQuickWin(i)) quick++;
    }
    const open = ideas.filter(
      (i) => i.status !== "done" && i.status !== "parked"
    ).length;
    return { total: ideas.length, quick, open, byStatus };
  }, [ideas]);

  // ---- derived: filtered + sorted list ----
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = ideas.filter((i) => {
      if (fStatus !== "all" && i.status !== fStatus) return false;
      if (fPriority !== "all" && i.priority !== fPriority) return false;
      if (fComplexity !== "all" && i.complexity !== fComplexity) return false;
      if (quickOnly && !isQuickWin(i)) return false;
      if (q) {
        const hay = `${i.title} ${i.notes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "priority":
          return (
            (PRIORITY_WEIGHT[b.priority] ?? 0) -
              (PRIORITY_WEIGHT[a.priority] ?? 0) ||
            +new Date(b.createdAt) - +new Date(a.createdAt)
          );
        case "effort": {
          const ea = a.complexity ? EFFORT_WEIGHT[a.complexity] : 99;
          const eb = b.complexity ? EFFORT_WEIGHT[b.complexity] : 99;
          return ea - eb || +new Date(b.createdAt) - +new Date(a.createdAt);
        }
        case "quickwins":
          return (
            valueEffortScore(b) - valueEffortScore(a) ||
            +new Date(b.createdAt) - +new Date(a.createdAt)
          );
        default:
          return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
    return list;
  }, [ideas, search, fStatus, fPriority, fComplexity, quickOnly, sort]);

  const filtersActive =
    search.trim() !== "" ||
    fStatus !== "all" ||
    fPriority !== "all" ||
    fComplexity !== "all" ||
    quickOnly;

  const resetFilters = () => {
    setSearch("");
    setFStatus("all");
    setFPriority("all");
    setFComplexity("all");
    setQuickOnly(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
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
                After you save, the AI estimates complexity, value and
                implementation scope in the background.
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
        <>
          {/* Summary stat chips */}
          <div className="flex flex-wrap items-center gap-2">
            <StatChip label="Total" value={stats.total} />
            <StatChip label="Open" value={stats.open} />
            <button
              type="button"
              onClick={() => setQuickOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border transition ${
                quickOnly
                  ? "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
              title="A quick win = high value for low effort (S/M)"
            >
              <Star className="w-3.5 h-3.5" />
              {stats.quick} quick win{stats.quick === 1 ? "" : "s"}
            </button>
            {STATUSES.filter((s) => stats.byStatus[s.value]).map((s) => (
              <span
                key={s.value}
                className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[s.value]}`}
              >
                {stats.byStatus[s.value]} {s.label.toLowerCase()}
              </span>
            ))}
            <button
              type="button"
              onClick={() => setShowMatrix((v) => !v)}
              className="ml-auto inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {showMatrix ? "Hide" : "Value / effort"}
            </button>
          </div>

          {showMatrix && <ValueEffortMatrix ideas={ideas} />}

          {/* Filter / search / sort bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ideas…"
                className="pl-9"
              />
            </div>
            <Select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="w-auto text-sm"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select
              value={fPriority}
              onChange={(e) => setFPriority(e.target.value)}
              className="w-auto text-sm"
              aria-label="Filter by priority"
            >
              <option value="all">Any priority</option>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <Select
              value={fComplexity}
              onChange={(e) => setFComplexity(e.target.value)}
              className="w-auto text-sm"
              aria-label="Filter by effort"
            >
              <option value="all">Any effort</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
            </Select>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-auto text-sm"
              aria-label="Sort"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  Sort: {s.label}
                </option>
              ))}
            </Select>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear
              </Button>
            )}
          </div>

          {/* List */}
          {visible.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-500 dark:text-gray-400">
                No ideas match these filters.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visible.map((idea) => (
                <IdeaRow key={idea.id} idea={idea} onStatus={patchStatus} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
      <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
      {label}
    </span>
  );
}

function IdeaRow({
  idea,
  onStatus,
}: {
  idea: Idea;
  onStatus: (id: string, status: string) => void;
}) {
  const quick = isQuickWin(idea);
  const estimating = !idea.aiEstimatedAt && !idea.scope;
  return (
    <Card className="hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
      <CardContent className="p-3 flex items-center gap-3">
        <Link href={`/ideas/${idea.id}`} className="min-w-0 flex-1 group">
          <div className="flex items-center gap-2 flex-wrap">
            {quick && (
              <span
                className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                title="Quick win — high value, low effort"
              >
                <Star className="w-3 h-3" /> Quick win
              </span>
            )}
            <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              {idea.title}
            </h3>
            {idea.priority !== "none" && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLES[idea.priority]}`}
              >
                {idea.priority}
              </span>
            )}
            {idea.impact && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${IMPACT_STYLES[idea.impact]}`}
                title="AI value estimate"
              >
                {idea.impact} value
              </span>
            )}
            {idea.complexity && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  COMPLEXITY_STYLES[idea.complexity] || COMPLEXITY_STYLES.M
                }`}
                title="AI effort estimate"
              >
                {idea.complexity}
              </span>
            )}
            {estimating && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <Loader2 className="w-3 h-3 animate-spin" /> estimating
              </span>
            )}
          </div>
          {idea.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {idea.notes}
            </p>
          )}
        </Link>

        <Select
          value={idea.status}
          onChange={(e) => onStatus(idea.id, e.target.value)}
          className="w-32 text-sm shrink-0"
          aria-label="Status"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Link
          href={`/ideas/${idea.id}`}
          className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 shrink-0"
          aria-label="Open idea"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      </CardContent>
    </Card>
  );
}

// 2x2 value-vs-effort matrix. Only estimated ideas (impact + effort) are placed.
function ValueEffortMatrix({ ideas }: { ideas: Idea[] }) {
  const estimated = ideas.filter((i) => i.impact && i.complexity);
  const highValue = (i: Idea) => i.impact === "high";
  const lowEffort = (i: Idea) => i.complexity === "S" || i.complexity === "M";

  const cells: {
    key: string;
    title: string;
    hint: string;
    tone: string;
    items: Idea[];
  }[] = [
    {
      key: "quick",
      title: "Quick wins",
      hint: "High value · low effort",
      tone: "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10",
      items: estimated.filter((i) => highValue(i) && lowEffort(i)),
    },
    {
      key: "bets",
      title: "Big bets",
      hint: "High value · high effort",
      tone: "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10",
      items: estimated.filter((i) => highValue(i) && !lowEffort(i)),
    },
    {
      key: "fill",
      title: "Fill-ins",
      hint: "Lower value · low effort",
      tone: "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40",
      items: estimated.filter((i) => !highValue(i) && lowEffort(i)),
    },
    {
      key: "sink",
      title: "Time sinks",
      hint: "Lower value · high effort",
      tone: "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40",
      items: estimated.filter((i) => !highValue(i) && !lowEffort(i)),
    },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cells.map((c) => (
            <div key={c.key} className={`rounded-lg border p-3 ${c.tone}`}>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-1">
                  {c.key === "quick" && <Star className="w-3.5 h-3.5 text-amber-500" />}
                  {c.title}
                </span>
                <span className="text-xs text-gray-400">{c.hint}</span>
              </div>
              <div className="mt-2 space-y-1">
                {c.items.length === 0 ? (
                  <p className="text-xs text-gray-400">—</p>
                ) : (
                  c.items.map((i) => (
                    <Link
                      key={i.id}
                      href={`/ideas/${i.id}`}
                      className="block text-sm text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 truncate"
                    >
                      {i.title}{" "}
                      <span className="text-xs text-gray-400">({i.complexity})</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
        {estimated.length < ideas.length && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            {ideas.length - estimated.length} idea
            {ideas.length - estimated.length === 1 ? "" : "s"} not yet estimated —
            open one to run the estimate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
