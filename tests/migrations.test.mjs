import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { loadMigrations, applyMigrations } from '../scripts/migration-core.mjs';

const migrations = await loadMigrations(fileURLToPath(new URL('../database/migrations', import.meta.url)));
async function database(t) {
  const db = new PGlite({ extensions: { citext } });
  await db.waitReady;
  t.after(() => db.close());
  // PGlite's extended query accepts one statement; PostgreSQL pg.query with no
  // parameters accepts a multi-statement migration. Use exec for that case.
  const client = { query: async (sql, params) => {
    if (!params && sql.includes(';')) { const results = await db.exec(sql); return results.at(-1) || { rows: [] }; }
    return db.query(sql, params);
  } };
  return client;
}
test('clean bootstrap, replay and current API event types work in PostgreSQL WASM', async t => {
  const db = await database(t);
  assert.deepEqual(await applyMigrations(db, migrations), migrations.map(m => m.name));
  assert.deepEqual(await applyMigrations(db, migrations), []);
  await db.query("INSERT INTO pending_registrations(email,phone,password_hash,otp_hash,otp_expires_at,display_name) VALUES('test@example.test','123','fake','fake',now(),'Tester')");
  for (const event of ['search','skill_view','contact_click_whatsapp','contact_click_email','media_presign','media_confirm','profile_update']) {
    await db.query('INSERT INTO events(event_type) VALUES($1)', [event]);
  }
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM events')).rows[0].n, 7);
  await assert.rejects(db.query("INSERT INTO events(event_type) VALUES('made_up')"));
});
test('edited history is rejected without changing data', async t => {
  const db = await database(t);
  await applyMigrations(db, migrations);
  const changed = migrations.map((m, i) => i ? m : { ...m, checksum: 'changed' });
  await assert.rejects(applyMigrations(db, changed), /checksum changed/);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM schema_migrations')).rows[0].n, 2);
});
test('failed migration rolls back its table and ledger entry', async t => {
  const db = await database(t);
  await applyMigrations(db, migrations);
  const failing = { name: '003_failure.sql', checksum: 'failure', sql: 'CREATE TABLE rollback_probe(id int); SELECT * FROM deliberately_missing_table;' };
  await assert.rejects(applyMigrations(db, [...migrations, failing]));
  assert.equal((await db.query("SELECT to_regclass('rollback_probe') AS relation")).rows[0].relation, null);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM schema_migrations')).rows[0].n, 2);
});
test('missing migration history and invalid GPS coordinates fail closed', async t => {
  const db = await database(t);
  await applyMigrations(db, migrations);
  await assert.rejects(applyMigrations(db, migrations.slice(0, 1)), /missing from checkout/);
  await db.query("INSERT INTO users(email,phone,password_hash,role) VALUES('gps@example.test','123','fake','provider')");
  await assert.rejects(db.query("INSERT INTO skills(provider_id,title,category,description,country,city,lat,lng) VALUES(1,'test','test','test','cameroon','Douala',91,9)"));
});
