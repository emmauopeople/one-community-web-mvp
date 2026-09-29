import pg from 'pg';
import bcrypt from '../services/skill-visibility/node_modules/bcrypt/bcrypt.js';
if (process.env.LOCAL_DEVELOPMENT !== 'true') throw new Error('Synthetic seed requires LOCAL_DEVELOPMENT=true');
if (!process.env.DATABASE_URL || !process.env.LOCAL_ADMIN_PASSWORD || !process.env.LOCAL_PROVIDER_PASSWORD) throw new Error('Local database/admin/provider settings required');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(`INSERT INTO admin_users(full_name,email,password_hash,role) VALUES('Local Test Admin',$1,$2,'root_admin') ON CONFLICT(email) DO NOTHING`, [process.env.LOCAL_ADMIN_EMAIL || 'admin@example.test', await bcrypt.hash(process.env.LOCAL_ADMIN_PASSWORD, 12)]);
  await client.query(`INSERT INTO users(email,phone,password_hash,role,status,email_verified,display_name,city) VALUES('provider@example.test','+237600000000',$1,'provider','active',true,'SYNTHETIC Test Provider','Douala') ON CONFLICT(email) DO NOTHING`, [await bcrypt.hash(process.env.LOCAL_PROVIDER_PASSWORD, 12)]);
  const { rows: [provider] } = await client.query("SELECT id FROM users WHERE email='provider@example.test'");
  await client.query(`INSERT INTO skills(provider_id,title,category,description,country,region,city,area,lat,lng)
    SELECT $1,'SYNTHETIC Plumbing Demo','plumbing','Synthetic data for local testing only. Not a real service.','cameroon','littoral','Douala','Bonaberi',4.09,9.65
    WHERE NOT EXISTS (SELECT 1 FROM skills WHERE provider_id=$1 AND title='SYNTHETIC Plumbing Demo')`, [provider.id]);
  await client.query('COMMIT');
  console.log('Synthetic admin/provider/listing ready. Existing records and passwords preserved. Credentials are in your local .env.');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { await client.end(); }
