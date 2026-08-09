// Shared constants + helpers for the Ideas board and detail pages.

export interface Idea {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  priority: string;
  complexity: string | null; // effort: S, M, L, XL
  impact: string | null; // value: low, medium, high
  scope: string | null;
  aiEstimatedAt: string | null;
  createdAt: string;
}

export const STATUSES = [
  { value: "new", label: "New" },
  { value: "considering", label: "Considering" },
  { value: "building", label: "Building" },
  { value: "done", label: "Done" },
  { value: "parked", label: "Parked" },
];

export const PRIORITIES = [
  { value: "none", label: "No priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const IMPACTS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const COMPLEXITIES = [
  { value: "S", label: "S — a few hours" },
  { value: "M", label: "M — about a day" },
  { value: "L", label: "L — multi-day" },
  { value: "XL", label: "XL — major effort" },
];

export const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  considering: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  building: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  done: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  parked: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export const IMPACT_STYLES: Record<string, string> = {
  high: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  medium: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  low: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export const COMPLEXITY_STYLES: Record<string, string> = {
  S: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  M: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  L: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  XL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const statusLabel = (v: string) =>
  STATUSES.find((s) => s.value === v)?.label || v;

// Numeric weights for sorting.
export const IMPACT_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };
export const PRIORITY_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};
export const EFFORT_WEIGHT: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4 };

// A "quick win" is high value for low effort: high impact + small build (S or M).
export function isQuickWin(idea: Idea): boolean {
  return idea.impact === "high" && (idea.complexity === "S" || idea.complexity === "M");
}

// Higher = better bang-for-buck (used for the "quick wins first" sort). Ideas
// missing an estimate sort to the bottom.
export function valueEffortScore(idea: Idea): number {
  const impact = idea.impact ? IMPACT_WEIGHT[idea.impact] : 0;
  const effort = idea.complexity ? EFFORT_WEIGHT[idea.complexity] : 0;
  if (!impact || !effort) return -1;
  return impact / effort;
}
