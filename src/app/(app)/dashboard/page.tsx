"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Flame, Dumbbell, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";

interface DashboardData {
  todayTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    exerciseMinutes: number;
    caloriesBurned: number;
  };
  chartData: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    caloriesBurned: number;
    exerciseMinutes: number;
  }>;
  goals: Array<{
    id: string;
    goalType: string;
    target: number;
    current: number;
    unit: string;
  }>;
}

const MACRO_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard?days=7");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const totals = data?.todayTotals || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    exerciseMinutes: 0,
    caloriesBurned: 0,
  };

  const macroData = [
    { name: "Protein", value: totals.protein, color: "#10b981" },
    { name: "Carbs", value: totals.carbs, color: "#3b82f6" },
    { name: "Fat", value: totals.fat, color: "#f59e0b" },
    { name: "Fiber", value: totals.fiber, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const chartData = (data?.chartData || []).map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Your nutrition and fitness overview for today
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Calories
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(totals.calories, 0)}
                </p>
                <p className="text-xs text-gray-400">kcal consumed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Protein
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(totals.protein, 0)}g
                </p>
                <p className="text-xs text-gray-400">of daily target</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Exercise
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totals.exerciseMinutes}
                </p>
                <p className="text-xs text-gray-400">minutes today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Target className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Burned
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(totals.caloriesBurned, 0)}
                </p>
                <p className="text-xs text-gray-400">kcal from exercise</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calorie chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calories - Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="calories"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Consumed"
                  />
                  <Bar
                    dataKey="caloriesBurned"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    name="Burned"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                No data yet. Start logging meals!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Macro breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Macros</CardTitle>
          </CardHeader>
          <CardContent>
            {macroData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {macroData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={MACRO_COLORS[index % MACRO_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  {macroData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.name}: {formatNumber(item.value, 0)}g
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-400">
                No macros logged today
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals progress */}
      {data?.goals && data.goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goal Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.goals.map((goal) => (
                <div key={goal.id}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {goal.goalType.replace("_", " ")}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatNumber(goal.current, 0)} / {formatNumber(goal.target, 0)}{" "}
                      {goal.unit}
                    </span>
                  </div>
                  <Progress
                    value={goal.current}
                    max={goal.target}
                    indicatorClassName={
                      goal.current >= goal.target
                        ? "bg-emerald-500"
                        : "bg-blue-500"
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
