import "server-only";

// The public pages read columns, views and functions that arrive with the
// database updates (supabase/migrations). If the code is deployed before those
// updates are applied, Postgres or PostgREST reports the missing piece. These
// helpers spot that case so a page can fall back to the older shape instead of
// showing "Something went wrong".

type DbError = { code?: string; message?: string } | null | undefined;

const MISSING_CODES = new Set([
  "42P01", // table or view doesn't exist
  "42703", // column doesn't exist
  "42883", // function doesn't exist
  "PGRST200", // relationship not found
  "PGRST202", // function not in the schema cache
  "PGRST204", // column not in the schema cache
  "PGRST205", // table or view not in the schema cache
]);

export function isMissingSchema(error: DbError): boolean {
  return !!error?.code && MISSING_CODES.has(error.code);
}

const warned = new Set<string>();

// Logged once per server instance, so the Vercel logs say plainly what to do.
export function warnMissingSchema(where: string, error: DbError) {
  if (warned.has(where)) return;
  warned.add(where);
  console.error(
    JSON.stringify({
      event: "database_update_missing",
      where,
      code: error?.code,
      error: error?.message,
      fix: "Run the latest apply-database-updates.sql in Supabase > SQL Editor (or npm run db:push).",
    }),
  );
}
