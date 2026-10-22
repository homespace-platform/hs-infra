// Disposable PostgreSQL + actual Core Hibernate schema. Never reads/writes a development database.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { buildSeed, SQL_PATH } from './build-listings-seed.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = path.resolve(root, '../hs-core-api');
const target = `hs-seed-audit-${process.pid}-${Date.now()}`;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true });
let started = false;
try {
  await buildSeed(true);
  docker('image', 'inspect', 'postgres:16-alpine'); // Do not implicitly download a container image.
  docker('run', '-d', '--rm', '--name', target, '-e', 'POSTGRES_DB=hs_seed_test',
    '-e', 'POSTGRES_PASSWORD=seed-test-only', '-p', '127.0.0.1::5432', 'postgres:16-alpine');
  started = true;
  let ready = false;
  for (let n = 0; n < 100; n++) {
    try { docker('exec', target, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'hs_seed_test'); ready = true; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 200)); }
  }
  assert.ok(ready, 'Temporary PostgreSQL did not start');
  const binding = docker('port', target, '5432/tcp').trim();
  assert.match(binding, /^127\.0\.0\.1:\d+$/);
  const env = { ...process.env, HS_SEED_TEST_PG_URL: `jdbc:postgresql://${binding}/hs_seed_test` };
  const args = ['-Pisolated-build', '-pl', 'hs-listing-service', '-am', 'test',
    '-Dtest=ListingSeedPostgresTest', '-Dsurefire.failIfNoSpecifiedTests=false', `-Dhs.seed.sql=${SQL_PATH}`];
  if (process.platform === 'win32') {
    const quote = value => "'" + value.replaceAll("'", "''") + "'";
    const command = '& mvn ' + args.map(quote).join(' ') + '; exit $LASTEXITCODE';
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command],
      { cwd: core, env, stdio: 'inherit', windowsHide: true });
  } else execFileSync('mvn', args, { cwd: core, env, stdio: 'inherit' });
  console.log('PASS: real schema, 300 coordinates/NULLs and catalog ward IDs, public search filters, rerun idempotency, unrelated data and transaction rollback.');
} finally {
  if (started && /^hs-seed-audit-\d+-\d+$/.test(target)) {
    try { docker('rm', '-f', target); }
    catch (error) { if (!/No such container|already in progress/.test(String(error.stderr))) throw error; }
  }
}
