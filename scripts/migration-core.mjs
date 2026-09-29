import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function loadMigrations(directory) {
  const names = (await readdir(directory)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  if (!names.length) throw new Error('No migrations found');
  const versions = names.map(name => name.slice(0, 3));
  if (new Set(versions).size !== versions.length) throw new Error('Duplicate migration version');
  return Promise.all(names.map(async name => {
    const sql = await readFile(path.join(directory, name), 'utf8');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

// The caller holds the migration advisory lock on the same database connection.
export async function applyMigrations(client, migrations) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const applied = new Map((await client.query('SELECT name, checksum FROM schema_migrations')).rows.map(row => [row.name, row.checksum]));
  const known = new Set(migrations.map(m => m.name));
  for (const name of applied.keys()) if (!known.has(name)) throw new Error(`Applied migration missing from checkout: ${name}`);
  const completed = [];
  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      if (applied.get(migration.name) !== migration.checksum) throw new Error(`Migration checksum changed: ${migration.name}`);
      continue;
    }
    if ([...applied.keys()].some(name => name > migration.name)) throw new Error(`Out-of-order migration: ${migration.name}`);
    await client.query('BEGIN');
    try {
      await client.query(migration.sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [migration.name, migration.checksum]);
      await client.query('COMMIT');
      applied.set(migration.name, migration.checksum);
      completed.push(migration.name);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  return completed;
}
