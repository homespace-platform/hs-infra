import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSON_PATH, SQL_PATH, CATALOG_DIR, renderSeed, renderCatalog, resolveSeedWards, validateAddresses } from './build-listings-seed.mjs';
import path from 'node:path';

const json = await readFile(JSON_PATH, 'utf8');
const rows = JSON.parse(json);
const sql = await readFile(SQL_PATH, 'utf8');
const provinceText = await readFile(path.join(CATALOG_DIR, 'province.json'), 'utf8');
const wardText = await readFile(path.join(CATALOG_DIR, 'ward.json'), 'utf8');
const provinces = JSON.parse(provinceText), wards = JSON.parse(wardText);
const copy = () => structuredClone(rows);

test('300 supplied points remain unchanged; SQL uses the same verified ward IDs as the Next filter', () => {
  assert.equal(validateAddresses(rows).length, 300);
  const match = sql.match(/\$hs_seed_addresses\$\s*(\[[\s\S]*?\])\s*\$hs_seed_addresses\$/);
  assert.ok(match);
  assert.deepEqual(JSON.parse(match[1]), rows);
  for (const row of rows) {
    assert.equal(row.refId, null); assert.equal(row.wardId, null); assert.equal(row.resolvedAt, null);
    assert.equal(row.houseNumber, null);
  }
  assert.equal(renderSeed(sql, json), sql, 'embedded snapshot must be current');
  assert.match(sql, /INSERT INTO listing_addresses/);
  assert.doesNotMatch(sql, /INSERT INTO addresses\b|ALTER TABLE|CREATE TABLE(?!.*TEMP)/);
  assert.doesNotMatch(sql, /seed:user-map:|COALESCE\(.*resolved_at.*now/i);
  assert.equal(renderCatalog(sql, rows, provinceText, wardText), sql, 'catalog snapshot must be current');
  const mapping = resolveSeedWards(rows, provinces, wards);
  const count = new Map(mapping.map(ward => [ward.ward_id, rows.filter(row => String(row.cityId) === ward.city_id && row.ward === ward.ward).length]));
  assert.deepEqual(Object.fromEntries(count), { '24076': 49, '24332': 109, '24588': 142 });
  assert.ok(mapping.every(ward => wards[ward.ward_id].parent_code === ward.city_id));
});

test('ward resolution never guesses, crosses cities, uses old codes or accepts conflicting IDs', () => {
  const before = JSON.stringify(rows);
  let data = copy(); data[0].ward = 'Phường không có trong danh mục';
  const missing = resolveSeedWards(data, provinces, wards);
  assert.ok(!missing.some(row => row.ward === data[0].ward));
  data = copy(); data[0].wardId = '27076';
  assert.throws(() => resolveSeedWards(data, provinces, wards), /wardId\/ward\/cityId/);
  data = copy(); data[0].cityId = 79;
  assert.throws(() => resolveSeedWards(data, provinces, wards), /cityId\/city/);
  const duplicate = { ...wards, '99999': { ...wards['24588'], code: '99999' } };
  assert.throws(() => resolveSeedWards(rows, provinces, duplicate), /ambiguous/);
  const wrongCity = { ...wards, '24588': { ...wards['24588'], parent_code: '11' } };
  assert.ok(!resolveSeedWards(rows, provinces, wrongCity).some(row => row.ward_id === '24588'));
  assert.equal(JSON.stringify(rows), before, 'never modify the original JSON');
});

test('changed input updates the generated block only, including explicit NULL and an exact new coordinate', () => {
  const data = copy(); data[0].latitude = 10.1234567; delete data[0].refId;
  const changed = renderSeed(sql, JSON.stringify(data));
  assert.notEqual(changed, sql);
  assert.ok(changed.includes('"latitude":10.1234567'));
  const end = '-- END SEED ADDRESS JSON';
  assert.equal(changed.slice(changed.indexOf(end)), sql.slice(sql.indexOf(end)));
});

test('rejects missing/duplicate IDs, indices, coordinates and data that would be silently rounded', () => {
  assert.throws(() => validateAddresses(rows.slice(1)), /300/);
  let data = copy(); data[1].id = data[0].id; assert.throws(() => validateAddresses(data), /duplicate address ID/);
  data = copy(); data[1].pointIndex = data[0].pointIndex; assert.throws(() => validateAddresses(data), /pointIndex/);
  data = copy(); data[0].latitude = null; assert.throws(() => validateAddresses(data), /latitude/);
  data = copy(); data[0].longitude = 181; assert.throws(() => validateAddresses(data), /longitude/);
  data = copy(); data[0].latitude = 10.12345678; assert.throws(() => validateAddresses(data), /precision/);
  data = copy(); data[1].latitude = data[0].latitude; data[1].longitude = data[0].longitude;
  assert.throws(() => validateAddresses(data), /duplicate coordinates/);
  data = copy(); data[0].addressNote = '$hs_seed_addresses$';
  assert.throws(() => renderSeed(sql, JSON.stringify(data)), /delimiter/);
});
