import { Pool } from "pg";
import "dotenv/config";

const useUrl = !!process.env.DATABASE_URL;

const pool = new Pool(
  useUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.PGSSLMODE === "require" ||
          process.env.PGSSLMODE === "no-verify"
            ? { rejectUnauthorized: process.env.PGSSLMODE !== "no-verify" }
            : undefined,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl:
          process.env.PGSSLMODE === "require" ||
          process.env.PGSSLMODE === "no-verify"
            ? { rejectUnauthorized: process.env.PGSSLMODE !== "no-verify" }
            : undefined,
      },
);

export function query(text, params) {
  return pool.query(text, params);
}

export function close() {
  return pool.end();
}
