import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'postman/location/hochiminh.txt');
const sqlPath = resolve(root, 'postgres/listings_seed_hcm.sql');
const source = readFileSync(sourcePath, 'utf8');
const match = source.match(/^\s*(\{[\s\S]*?\})\s*,\s*(\[[\s\S]*\])\s*$/);
if (!match) throw new Error('hochiminh.txt must contain a province object and a ward array');

const province = JSON.parse(match[1]);
const wards = JSON.parse(match[2]);
if (province.code !== '79' || wards.length !== 168) {
  throw new Error(`Unexpected Ho Chi Minh location data: ${province.code}, ${wards.length} wards`);
}
const codes = new Set();
for (const ward of wards) {
  if (ward.province_code !== province.code || codes.has(ward.code)) {
    throw new Error(`Invalid or repeated ward code: ${ward.code}`);
  }
  codes.add(ward.code);
}

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const rows = wards.map((ward, index) =>
  `    (${index + 1}, ${quote(ward.code)}, ${quote(ward.full_name)}, ${quote(ward.type)})`
).join(',\n');
const block = `-- BEGIN HCM LOCATION DATA: generated from postman/location/hochiminh.txt
-- The source has wards/communes/special zones, not district-level objects.
CREATE TEMP TABLE hs_seed_places ON COMMIT DROP AS
SELECT p.place_id, ${quote(province.code)}::text AS province_code,
       ${quote(province.full_name)}::text AS province_name,
       p.ward_code, p.ward_name, p.place_type,
       p.ward_name AS location_label
FROM (VALUES
${rows}
) AS p(place_id, ward_code, ward_name, place_type);
-- END HCM LOCATION DATA

`;

let sql = readFileSync(sqlPath, 'utf8');
const startMarker = sql.includes('-- BEGIN HCM LOCATION DATA:')
  ? '-- BEGIN HCM LOCATION DATA:'
  : '-- Featured locations are embedded';
const endMarker = sql.includes('-- END HCM LOCATION DATA')
  ? '-- END HCM LOCATION DATA'
  : 'CREATE TEMP TABLE hs_seed_rows';
const start = sql.indexOf(startMarker);
const end = sql.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('Cannot find location block in SQL');
const suffixStart = endMarker === 'CREATE TEMP TABLE hs_seed_rows'
  ? end
  : sql.indexOf('\n', end) + 1;
const suffix = sql.slice(suffixStart).replace(/^(?:\r?\n)*/, '');
const updated = sql.slice(0, start) + block + suffix;
if (process.argv.includes('--check')) {
  if (updated.replaceAll('\r\n', '\n') !== sql.replaceAll('\r\n', '\n')) throw new Error('SQL ward data is out of sync with hochiminh.txt');
  const distribution = new Map(wards.map((ward) => [ward.code, 0]));
  const categories = { HOUSE: 0, APARTMENT: 0, ROOM: 0 };
  for (let number = 1; number <= 2520; number += 1) {
    const ward = wards[Math.floor((number - 1) / 15)];
    distribution.set(ward.code, distribution.get(ward.code) + 1);
    const slot = (number - 1) % 15;
    categories[slot < 5 ? 'HOUSE' : slot < 10 ? 'APARTMENT' : 'ROOM'] += 1;
  }
  if ([...distribution.values()].some((count) => count !== 15)) {
    throw new Error('2,520 posts must cover all 168 locations with exactly 15 each');
  }
  if (!sql.includes('generate_series(1,15)') || sql.includes("'-SEED-'")) {
    throw new Error('Unexpected listing count or synthetic ward codes in SQL');
  }
  if (Object.values(categories).some((count) => count !== 840)) {
    throw new Error('One of the three listing categories is underrepresented');
  }
  console.log(`Validated: 2,520 posts cover all 168 location codes (15 each); ${JSON.stringify(categories)}.`);
} else {
  writeFileSync(sqlPath, updated, 'utf8');
  console.log(`Embedded ${wards.length} unique Ho Chi Minh locations into ${sqlPath}`);
}
