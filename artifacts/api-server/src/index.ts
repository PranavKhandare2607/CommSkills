import app from "./app";
import { logger } from "./lib/logger";
import { warmLlm } from "./lib/llm";
import { runMigrations } from "@workspace/db/migrate";

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Apply Drizzle migrations once at startup. Re-runs are safe: completed
// migrations are tracked in the drizzle_migrations table.
runMigrations()
  .then(() => {
    app.listen(port, "0.0.0.0", (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
      void warmLlm();
    });
  })
  .catch((err) => {
    logger.error({ err }, "Database migration failed, not starting server");
    process.exit(1);
  });