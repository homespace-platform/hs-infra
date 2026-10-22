import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const JSON_PATH = path.join(ROOT, 'postgres/seed/homespace_seed_300_duong_govap.json');
export const SQL_PATH = path.join(ROOT, 'postgres/seed/listings_seed_hcm.sql');
// Use exactly the same admin_new snapshot as the Next.js filter, never the old province/ward codes.
export const CATALOG_DIR = path.resolve(ROOT, '../hs-web-app/data/vietmap');
const START = '-- BEGIN SEED ADDRESS JSON (generated; do not edit)';
const END = '-- END SEED ADDRESS JSON';
const CATALOG_START = '-- BEGIN SEED ADMINISTRATIVE CATALOG (generated; do not edit)';
const CATALOG_END = '-- END SEED ADMINISTRATIVE CATALOG';
const FIELDS = {
  refId: 4096, display: 1000, name: 255, houseNumber: 100, street: 255,
  address: 500, city: 100, district: 100, ward: 100, addressNote: 255,
};

export function validateAddresses(rows) {
  if (!Array.isArray(rows) || rows.length !== 300) throw new Error('Expected exactly 300 JSON addresses');
  const ids = new Set(), indices = new Set(), coordinates = new Set();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.id ?? '') || ids.has(row.id)) throw new Error('Invalid/duplicate address ID');
    ids.add(row.id);
    if (!Number.isInteger(row.pointIndex) || row.pointIndex < 1 || row.pointIndex > 300 || indices.has(row.pointIndex)) throw new Error('Invalid/duplicate pointIndex');
    indices.add(row.pointIndex);
    for (const [field, limit] of Object.entries(FIELDS)) {
      if (row[field] != null && (typeof row[field] !== 'string' || row[field].length > limit)) throw new Error(`${row.id}: invalid ${field}`);
    }
    for (const field of ['display', 'street', 'address', 'city']) {
      if (typeof row[field] !== 'string' || !row[field].trim()) throw new Error(`${row.id}: missing required ${field}`);
    }
    for (const field of ['cityId', 'wardId', 'districtId']) {
      if (row[field] != null && !/^\d{1,20}$/.test(String(row[field]))) throw new Error(`${row.id}: invalid ${field}`);
    }
    if (row.cityId == null) throw new Error(`${row.id}: missing cityId`);
    for (const [field, max] of [['latitude', 90], ['longitude', 180]]) {
      const value = row[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > max || Math.round(value * 1e7) / 1e7 !== value) throw new Error(`${row.id}: invalid/over-precision ${field}`);
    }
    const key = `${row.latitude},${row.longitude}`;
    if (coordinates.has(key)) throw new Error(`${row.id}: duplicate coordinates`);
    coordinates.add(key);
    if (row.resolvedAt != null && !Number.isFinite(Date.parse(row.resolvedAt))) throw new Error(`${row.id}: invalid resolvedAt`);
  }
  return rows;
}

export function renderSeed(sql, jsonText) {
  const rows = validateAddresses(JSON.parse(jsonText));
  const data = rows.map(row => JSON.stringify(row)).join(',\n');
  if (data.includes('$hs_seed_addresses$')) throw new Error('Unsafe SQL dollar delimiter in source JSON');
  const digest = createHash('sha256').update(jsonText).digest('hex');
  const block = `${START}\n-- source-sha256: ${digest}\nCREATE TEMP TABLE hs_seed_address_json ON COMMIT DROP AS\nSELECT value AS data FROM jsonb_array_elements($hs_seed_addresses$\n[\n${data}\n]\n$hs_seed_addresses$::jsonb);\n${END}`;
  const begin = sql.indexOf(START), end = sql.indexOf(END);
  if (begin < 0 || end < begin || sql.indexOf(START, begin + START.length) >= 0) throw new Error('Missing/duplicate generated JSON markers');
  return sql.slice(0, begin) + block + sql.slice(end + END.length);
}

// Exact typed names, within the supplied city ID. No fuzzy/unaccented matches or coordinate inference.
export function resolveSeedWards(rows, provinces, wards) {
  const matched = new Map();
  for (const row of validateAddresses(rows)) {
    const cityId = String(row.cityId), city = provinces[cityId];
    if (!city || city.code !== cityId || city.name_with_type !== row.city) {
      throw new Error(`${row.id}: cityId/city do not match the Vietmap admin_new catalog`);
    }
    const candidates = Object.values(wards).filter(ward => ward.parent_code === cityId && ward.name_with_type === row.ward);
    if (candidates.length > 1) throw new Error(`${row.id}: ambiguous ward in city ${cityId}`);
    const ward = candidates[0];
    if (row.wardId != null && (!ward || String(row.wardId) !== ward.code)) {
      throw new Error(`${row.id}: wardId/ward/cityId do not match the Vietmap admin_new catalog`);
    }
    if (!ward) continue; // Truly unknown names stay NULL; do not invent an identifier.
    if (!/^\d{1,20}$/.test(ward.code) || wards[ward.code] !== ward) throw new Error('Invalid Vietmap ward code');
    matched.set(ward.code, { city_id: cityId, city: city.name_with_type, ward_id: ward.code, ward: ward.name_with_type });
  }
  return [...matched.values()].sort((a, b) => a.ward_id.localeCompare(b.ward_id));
}

export function renderCatalog(sql, rows, provinceText, wardText) {
  const mapping = resolveSeedWards(rows, JSON.parse(provinceText), JSON.parse(wardText));
  const data = JSON.stringify(mapping);
  if (data.includes('$hs_seed_wards$')) throw new Error('Unsafe SQL dollar delimiter in catalog');
  const hash = text => createHash('sha256').update(text).digest('hex');
  const block = `${CATALOG_START}\n-- Vietmap admin_new: same snapshot as hs-web-app/data/vietmap.\n-- province-sha256: ${hash(provinceText)}\n-- ward-sha256: ${hash(wardText)}\nCREATE TEMP TABLE hs_seed_ward_catalog ON COMMIT DROP AS\nSELECT * FROM jsonb_to_recordset($hs_seed_wards$${data}$hs_seed_wards$::jsonb)\n    AS w(city_id text, city text, ward_id text, ward text);\n${CATALOG_END}`;
  const begin = sql.indexOf(CATALOG_START), end = sql.indexOf(CATALOG_END);
  if (begin < 0 || end < begin || sql.indexOf(CATALOG_START, begin + CATALOG_START.length) >= 0) throw new Error('Missing/duplicate generated catalog markers');
  return sql.slice(0, begin) + block + sql.slice(end + CATALOG_END.length);
}

export async function buildSeed(check = false) {
  const [sql, json, provinces, wards] = await Promise.all([
    readFile(SQL_PATH, 'utf8'), readFile(JSON_PATH, 'utf8'),
    readFile(path.join(CATALOG_DIR, 'province.json'), 'utf8'), readFile(path.join(CATALOG_DIR, 'ward.json'), 'utf8'),
  ]);
  const result = renderCatalog(renderSeed(sql, json), JSON.parse(json), provinces, wards);
  if (check && result !== sql) throw new Error('SQL snapshot is stale. Run node scripts/build-listings-seed.mjs');
  if (!check && result !== sql) await writeFile(SQL_PATH, result, 'utf8');
  console.log(`OK: 300 demo addresses; exact coordinates preserved, ward IDs matched to the frontend Vietmap catalog; unknown values stay NULL. ${check ? 'Snapshots checked.' : 'SQL ready.'}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSeed(process.argv.includes('--check')).catch(error => { console.error(error.message); process.exitCode = 1; });
}
