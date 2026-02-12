import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  UtensilsCrossed,
  Camera,
  BarChart3,
  Dumbbell,
  Target,
  Sparkles,
} from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 mb-6">
            <UtensilsCrossed className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            NutriTrack
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            AI-powered nutrition and fitness tracking. Snap a photo of your meal
            and let Claude analyze the nutrition instantly.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Photo Analysis
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Take a photo of your meal and our AI will identify the food items
              and estimate nutritional content automatically.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              AI Nutrition Estimates
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Powered by Claude, get accurate calorie, protein, carb, and fat
              estimates for every meal you log.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Visual Dashboard
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Track your progress with beautiful charts showing calories,
              macros, and exercise trends over time.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
              <Dumbbell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Exercise Tracking
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Log cardio, strength training, and more. Track sets, reps,
              distance, and calories burned.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Target className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Custom Goals
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Set daily, weekly, or monthly targets for calories, protein, and
              exercise. Track your progress visually.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              BMR & TDEE Calculator
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Get your estimated daily calorie needs based on your body metrics
              and activity level.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-400">
        <p>NutriTrack — AI-powered nutrition tracking</p>
      </footer>
    </div>
  );
}
