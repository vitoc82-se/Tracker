"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  onboarded: boolean;
  authProvider: string;
  mealsCount: number;
  exercisesCount: number;
  goalsCount: number;
  lastActivity: string | null;
}

type SortKey = "createdAt" | "lastActivity" | "mealsCount" | "exercisesCount" | "goalsCount";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc" }) {
  if (sortKey !== col) {
    return <ChevronsUpDown className="inline w-3 h-3 ml-1 text-gray-300" />;
  }
  return sortDir === "asc"
    ? <ChevronUp className="inline w-3 h-3 ml-1 text-gray-700 dark:text-gray-300" />
    : <ChevronDown className="inline w-3 h-3 ml-1 text-gray-700 dark:text-gray-300" />;
}

export function UsersTable({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users
      .filter((u) => {
        if (!q) return true;
        return (
          u.email?.toLowerCase().includes(q) ||
          u.name?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let aVal = 0;
        let bVal = 0;

        switch (sortKey) {
          case "createdAt":
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
            break;
          case "lastActivity":
            aVal = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
            bVal = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
            break;
          case "mealsCount":
            aVal = a.mealsCount;
            bVal = b.mealsCount;
            break;
          case "exercisesCount":
            aVal = a.exercisesCount;
            bVal = b.exercisesCount;
            break;
          case "goalsCount":
            aVal = a.goalsCount;
            bVal = b.goalsCount;
            break;
        }

        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [users, search, sortKey, sortDir]);

  const SortHeader = ({
    col,
    label,
  }: {
    col: SortKey;
    label: string;
  }) => (
    <th
      className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white select-none whitespace-nowrap transition-colors"
      onClick={() => toggleSort(col)}
    >
      {label}
      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base">
            Users
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({filtered.length}
              {search ? ` of ${users.length}` : ""})
            </span>
          </CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  User
                </th>
                <SortHeader col="createdAt" label="Joined" />
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Auth
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Profile
                </th>
                <SortHeader col="mealsCount" label="Meals" />
                <SortHeader col="exercisesCount" label="Exercises" />
                <SortHeader col="goalsCount" label="Goals" />
                <SortHeader col="lastActivity" label="Last Active" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 min-w-[160px]">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                          {user.name || (
                            <span className="text-gray-400 font-normal">No name</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">
                          {user.email || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          user.authProvider === "google"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400"
                        }`}
                      >
                        {user.authProvider === "google" ? "Google" : "Email"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {user.onboarded ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      )}
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {user.mealsCount > 0 ? (
                        user.mealsCount
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 font-normal">0</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {user.exercisesCount > 0 ? (
                        user.exercisesCount
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 font-normal">0</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {user.goalsCount > 0 ? (
                        user.goalsCount
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 font-normal">0</span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {user.lastActivity ? (
                        <span title={new Date(user.lastActivity).toLocaleString()}>
                          {formatDistanceToNow(new Date(user.lastActivity), {
                            addSuffix: true,
                          })}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">never</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
