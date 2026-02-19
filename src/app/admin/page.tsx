import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Activity, Utensils, Dumbbell, UserCheck } from "lucide-react";
import { UsersTable } from "./users-table";

export default async function AdminPage() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      height: true,
      weight: true,
      gender: true,
      accounts: {
        select: { provider: true },
        take: 1,
      },
      _count: {
        select: {
          meals: true,
          exercises: true,
          goals: true,
        },
      },
      meals: {
        select: { loggedAt: true },
        orderBy: { loggedAt: "desc" },
        take: 1,
      },
      exercises: {
        select: { loggedAt: true },
        orderBy: { loggedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute summary stats
  const totalMeals = users.reduce((sum, u) => sum + u._count.meals, 0);
  const totalExercises = users.reduce((sum, u) => sum + u._count.exercises, 0);
  const onboardedCount = users.filter(
    (u) => u.height && u.weight && u.gender
  ).length;

  const activeUsers = users.filter((u) => {
    const lastMeal = u.meals[0]?.loggedAt?.getTime() ?? 0;
    const lastExercise = u.exercises[0]?.loggedAt?.getTime() ?? 0;
    const lastActivity = Math.max(lastMeal, lastExercise);
    return lastActivity >= sevenDaysAgo.getTime();
  }).length;

  const newThisWeek = users.filter(
    (u) => u.createdAt >= sevenDaysAgo
  ).length;

  // Serialize for client component (convert Date → ISO string)
  const userData = users.map((u) => {
    const lastMeal = u.meals[0]?.loggedAt?.getTime() ?? 0;
    const lastExercise = u.exercises[0]?.loggedAt?.getTime() ?? 0;
    const lastActivityMs = Math.max(lastMeal, lastExercise);

    return {
      id: u.id,
      name: u.name ?? null,
      email: u.email ?? null,
      createdAt: u.createdAt.toISOString(),
      onboarded: !!(u.height && u.weight && u.gender),
      authProvider: u.accounts[0]?.provider ?? "credentials",
      mealsCount: u._count.meals,
      exercisesCount: u._count.exercises,
      goalsCount: u._count.goals,
      lastActivity: lastActivityMs > 0 ? new Date(lastActivityMs).toISOString() : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Overview
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          All users and their activity
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.length}
                </p>
                {newThisWeek > 0 && (
                  <p className="text-xs text-emerald-600">+{newThisWeek} this week</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Active (7d)
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeUsers}
                </p>
                <p className="text-xs text-gray-400">
                  {users.length > 0
                    ? Math.round((activeUsers / users.length) * 100)
                    : 0}
                  % of total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Onboarded
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {onboardedCount}
                </p>
                <p className="text-xs text-gray-400">profile complete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Utensils className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Meals Logged
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalMeals}
                </p>
                <p className="text-xs text-gray-400">all time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Dumbbell className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Workouts
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalExercises}
                </p>
                <p className="text-xs text-gray-400">all time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <UsersTable users={userData} />
    </div>
  );
}
