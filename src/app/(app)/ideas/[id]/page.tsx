import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isOwner } from "@/lib/owner";
import { db } from "@/lib/db";
import { IdeaDetail } from "../ideas-detail";
import type { Idea } from "../ideas-shared";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!(await isOwner(userId, session?.user?.email))) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ideas</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          This backlog is private to the app owner.
        </p>
      </div>
    );
  }

  const record = await db.idea.findFirst({
    where: { id: params.id, userId },
  });

  if (!record) {
    return (
      <div className="max-w-md space-y-3">
        <Link
          href="/ideas"
          className="text-sm text-emerald-600 hover:underline"
        >
          ← Back to ideas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Idea not found
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          It may have been deleted.
        </p>
      </div>
    );
  }

  // Serialize dates for the client component.
  const idea: Idea = {
    id: record.id,
    title: record.title,
    notes: record.notes,
    status: record.status,
    priority: record.priority,
    complexity: record.complexity,
    impact: record.impact,
    scope: record.scope,
    aiEstimatedAt: record.aiEstimatedAt ? record.aiEstimatedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  };

  return <IdeaDetail initial={idea} />;
}
