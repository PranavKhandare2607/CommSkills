import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";

import { pool } from "./index";

/**
 * Applies checked-in SQL migrations (lib/db/drizzle) in a safe, one-shot
 * sequence. Drizzle records each applied migration in the `drizzle_migrations`
 * table so a restart never re-runs completed migrations.
 *
 * The migrations folder is resolved from MIGRATIONS_DIR when set (Docker
 * copies it to /app/drizzle), otherwise from the current working directory.
 * This avoids relying on import.meta.url, which points at the bundled
 * dist/index.mjs rather than the source tree after esbuild.
 */
export async function runMigrations(): Promise<void> {
  const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.resolve(process.cwd(), "drizzle");

  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
}