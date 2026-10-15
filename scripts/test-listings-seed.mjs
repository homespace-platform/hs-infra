// Integration test against the real PostgreSQL schema in a disposable, unexposed container.
// Source database is READ ONLY: schema + reference catalogs only, never user/listing data.
// Usage: node scripts/test-listings-seed.mjs [source-container=hs-postgres]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const source = process.argv[2] || 'hs-postgres';
assert.match(source, /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/);
const target = `hs-seed-audit-${process.pid}-${Date.now()}`;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const dump = (args) => docker('exec', source, 'sh', '-c',
  `exec pg_dump -U "$POSTGRES_USER" -d homespace_core --no-owner --no-privileges ${args}`);
const schema = dump('--schema-only');
const catalogTables = ['amenities', 'amenity_categories', 'furnishing_items', 'furnishing_item_categories',
  'listing_policy_definitions', 'listing_policy_definition_categories'];
assert.ok([...catalogTables, 'roles', 'users'].every(table => schema.includes(`CREATE TABLE public.${table} (`)),
  'Source schema/catalog is not ready. Start Core to create the dev tables/catalog before running this audit. No database writes were performed.');
const catalogs = dump(`--data-only --inserts ${catalogTables.map(t => `--table=public.${t}`).join(' ')}`);
const sql = readFileSync(resolve(import.meta.dirname, '../postgres/listings_seed_hcm.sql'), 'utf8');
const psql = input => {
  try {
    return execFileSync('docker', ['exec', '-i', target, 'psql', '-U', 'postgres', '-d', 'postgres',
      '-X', '-v', 'ON_ERROR_STOP=1', '-At'], { input, encoding: 'utf8', stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    const failure = new Error(String(error.stderr || error.message));
    failure.stderr = String(error.stderr || error.message);
    throw failure;
  }
};
const counts = () => psql(`SELECT category,count(*) FROM listings GROUP BY category ORDER BY category;
  SELECT count(*) FROM listing_furnishing_assets;
  SELECT count(*) FROM listing_amenities;
  SELECT count(*) FROM listing_viewing_days;
  SELECT count(*) FROM listing_viewing_slots;`).trim();
let started = false;
try {
  docker('run', '-d', '--rm', '--name', target, '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:16-alpine');
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { docker('exec', target, 'pg_isready', '-U', 'postgres'); ready = true; break; }
    catch { await new Promise(r => setTimeout(r, 200)); }
  }
  assert.ok(ready, 'Isolated PostgreSQL did not start');
  psql(schema + '\n' + catalogs + `
    SET search_path=public;
    INSERT INTO roles(id,active,name) VALUES ('seed-test-role',true,'ADMIN');
    INSERT INTO users(id,active,email,on_boarded,username,role_id)
      VALUES ('seed-test-owner',true,'seed@example.invalid',true,'homespace','seed-test-role');`);
  // In this disposable database only, simulate bootstrap without the optional columns
  // and with the old enum CHECK. The single main seed file must cover both cases.
  psql(`ALTER TABLE monthly_invoices DROP COLUMN IF EXISTS rent_period_start;
    ALTER TABLE monthly_invoices DROP COLUMN IF EXISTS rent_period_end_exclusive;
    ALTER TABLE deposit_records DROP COLUMN IF EXISTS retained_amount;
    ALTER TABLE payment_requests DROP CONSTRAINT IF EXISTS payment_requests_type_check;
    ALTER TABLE payment_requests ADD CONSTRAINT payment_requests_type_check CHECK
      (type IN ('INITIAL','MONTHLY_RENT','UTILITY','OTHER_CHARGE','DEPOSIT_REFUND','INITIAL_PAYMENT_REFUND'));`);
  const output = psql(sql);
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND (table_name='monthly_invoices' AND column_name IN ('rent_period_start','rent_period_end_exclusive') OR table_name='deposit_records' AND column_name='retained_amount');").trim(), '3');
  assert.match(psql("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='payment_requests_type_check' AND conrelid='public.payment_requests'::regclass;"), /DEPOSIT_ADJUSTMENT/);
  console.log('PASS: main seed file includes amendment schema and payment enum; no separate SQL required.');
  assert.match(output, /HOUSE\|PUBLISHED\|840/);
  assert.match(output, /APARTMENT\|PUBLISHED\|840/);
  assert.match(output, /ROOM\|PUBLISHED\|840/);
  console.log(output.slice(output.indexOf('APARTMENT|PUBLISHED')));
  const initial = counts();
  psql(sql);
  assert.match(psql("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='payment_requests_type_check' AND conrelid='public.payment_requests'::regclass;"), /DEPOSIT_ADJUSTMENT/);
  assert.equal(counts(), initial, 'Seed rerun changed relation counts / duplicated inventory');
  console.log('PASS: 2,520 complete listings; 3 categories; all SQL integrity checks; rerun idempotency.');

  // Simulate catalog additions: the SQL must discover a new item without editing a code array.
  psql(`INSERT INTO furnishing_items(id,active,code,name,sort_order)
    VALUES ('seed-audit-item',true,'SEED_AUDIT_ITEM','Nội thất bổ sung kiểm thử',999);
    INSERT INTO furnishing_item_categories(furnishing_item_id,category)
      VALUES ('seed-audit-item','HOUSE'),('seed-audit-item','APARTMENT'),('seed-audit-item','ROOM');`);
  psql(sql);
  assert.equal(psql("SELECT count(DISTINCT l.category) FROM listing_furnishing_assets f JOIN listings l ON l.id=f.listing_id WHERE f.item_code='SEED_AUDIT_ITEM';").trim(), '3');
  console.log('PASS: new live furnishing catalog item appears in all 3 categories.');

  // Disabled entries must disappear on rerun instead of remaining as stale associations.
  psql("UPDATE furnishing_items SET active=false WHERE id='seed-audit-item';");
  psql(sql);
  assert.equal(psql("SELECT count(*) FROM listing_furnishing_assets WHERE item_code='SEED_AUDIT_ITEM';").trim(), '0');
  assert.equal(counts(), initial);
  console.log('PASS: disabled furnishing removed; original fixture counts restored.');

  // An invalid catalog must cause rollback, not silently create furnished listings without assets.
  psql("DELETE FROM furnishing_item_categories WHERE category='ROOM';");
  let failure;
  try { psql(sql); } catch (error) { failure = String(error.stderr); }
  assert.match(failure || '', /nội thất/);
  assert.equal(counts(), initial, 'Failed seed did not roll back');
  console.log('PASS: missing category furnishing catalog fails and rolls back entire seed.');
} catch (error) {
  console.error(`Seed audit failed: ${error.message}`);
  throw error;
} finally {
  if (started && /^hs-seed-audit-\d+-\d+$/.test(target)) {
    try { docker('rm', '-f', target); }
    catch (error) {
      // --rm may win the race with explicit cleanup after the server is stopped.
      if (!/No such container|removal .* already in progress/.test(String(error.stderr))) throw error;
    }
  }
}
