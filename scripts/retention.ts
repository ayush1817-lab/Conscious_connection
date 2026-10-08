/**
 * npm run retention
 *
 * Runs the daily data-retention cleanup once, straight against the database in
 * .env.local (the same thing the /api/cron/retention route does on Vercel).
 */
import { runRetention } from "../lib/events/retention";
import { serviceClient } from "./lib/env";

runRetention(serviceClient()).then(
  (removed) => {
    console.log(`Removed private data for events that ended before ${new Date(removed.cutoff).toLocaleString("en-IE")}, and email records older than 30 days:`);
    for (const [key, count] of Object.entries(removed)) if (key !== "cutoff") console.log(`  ${key.replaceAll("_", " ")}: ${count}`);
  },
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
