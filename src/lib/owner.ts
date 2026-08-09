// Access control for owner-only surfaces (e.g. the Ideas backlog).
//
// Set OWNER_EMAIL in the environment (Vercel → Project → Settings → Environment
// Variables) to lock a feature to a single account. If OWNER_EMAIL is unset,
// any signed-in user may use the feature with their own private, per-account
// data (nothing leaks between accounts because every query is userId-scoped).
export function isOwnerEmail(email: string | null | undefined): boolean {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!owner) return true; // not locked down — allow any signed-in user
  return !!email && email.trim().toLowerCase() === owner;
}
