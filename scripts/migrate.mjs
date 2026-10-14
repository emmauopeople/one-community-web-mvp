import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { loadMigrations, applyMigrations } from './migration-core.mjs';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
await client.connect();
try {
  await client.query("SET lock_timeout = '30s'");
  await client.query('SELECT pg_advisory_lock(1873101)');
  try {
    console.log({ applied: await applyMigrations(client, await loadMigrations(fileURLToPath(new URL('../database/migrations/', import.meta.url)))) });
  } finally { await client.query('SELECT pg_advisory_unlock(1873101)'); }
} finally { await client.end(); }
