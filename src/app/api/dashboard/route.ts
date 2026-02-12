import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch data in parallel
  const [meals, exercises, goals, todayMeals, todayExercises] =
    await Promise.all([
      db.meal.findMany({
        where: {
          userId,
          loggedAt: { gte: startDate },
        },
        orderBy: { loggedAt: "asc" },
        select: {
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
          loggedAt: true,
        },
      }),
      db.exercise.findMany({
        where: {
          userId,
          loggedAt: { gte: startDate },
        },
        orderBy: { loggedAt: "asc" },
        select: {
          caloriesBurned: true,
          duration: true,
          loggedAt: true,
        },
      }),
      db.goal.findMany({
        where: { userId, isActive: true },
      }),
      db.meal.findMany({
        where: {
          userId,
          loggedAt: { gte: today, lte: todayEnd },
        },
        select: {
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
          fiber: true,
        },
      }),
      db.exercise.findMany({
        where: {
          userId,
          loggedAt: { gte: today, lte: todayEnd },
        },
        select: {
          caloriesBurned: true,
          duration: true,
        },
      }),
    ]);

  // Aggregate today's totals
  const todayTotals = {
    calories: todayMeals.reduce((sum, m) => sum + m.calories, 0),
    protein: todayMeals.reduce((sum, m) => sum + m.protein, 0),
    carbs: todayMeals.reduce((sum, m) => sum + m.carbs, 0),
    fat: todayMeals.reduce((sum, m) => sum + m.fat, 0),
    fiber: todayMeals.reduce((sum, m) => sum + m.fiber, 0),
    exerciseMinutes: todayExercises.reduce((sum, e) => sum + e.duration, 0),
    caloriesBurned: todayExercises.reduce(
      (sum, e) => sum + e.caloriesBurned,
      0
    ),
  };

  // Build daily chart data
  const dailyData: Record<
    string,
    {
      date: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      caloriesBurned: number;
      exerciseMinutes: number;
    }
  > = {};

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split("T")[0];
    dailyData[key] = {
      date: key,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      caloriesBurned: 0,
      exerciseMinutes: 0,
    };
  }

  meals.forEach((m) => {
    const key = m.loggedAt.toISOString().split("T")[0];
    if (dailyData[key]) {
      dailyData[key].calories += m.calories;
      dailyData[key].protein += m.protein;
      dailyData[key].carbs += m.carbs;
      dailyData[key].fat += m.fat;
    }
  });

  exercises.forEach((e) => {
    const key = e.loggedAt.toISOString().split("T")[0];
    if (dailyData[key]) {
      dailyData[key].caloriesBurned += e.caloriesBurned;
      dailyData[key].exerciseMinutes += e.duration;
    }
  });

  // Goals with today's progress
  const goalsWithProgress = goals.map((goal) => {
    let current = 0;
    switch (goal.goalType) {
      case "calories":
        current = todayTotals.calories;
        break;
      case "protein":
        current = todayTotals.protein;
        break;
      case "carbs":
        current = todayTotals.carbs;
        break;
      case "fat":
        current = todayTotals.fat;
        break;
      case "exercise_minutes":
        current = todayTotals.exerciseMinutes;
        break;
      default:
        current = 0;
    }
    return { ...goal, current };
  });

  return NextResponse.json({
    todayTotals,
    chartData: Object.values(dailyData),
    goals: goalsWithProgress,
  });
}
