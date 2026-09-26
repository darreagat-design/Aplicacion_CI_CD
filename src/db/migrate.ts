import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../../migrations");

export async function runMigrations(targetPool: Pool): Promise<void> {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await targetPool.query(sql);
    console.log(`Applied migration: ${file}`);
  }
}

if (process.argv[1] === __filename) {
  const { pool } = await import("./pool.js");

  runMigrations(pool)
    .then(async () => {
      await pool.end();
    })
    .catch(async (error: unknown) => {
      console.error("Migration failed:", error);
      await pool.end();
      process.exitCode = 1;
    });
}
