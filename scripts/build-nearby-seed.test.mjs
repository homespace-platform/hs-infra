import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { JSON_PATH, SQL_PATH, NEARBY_PATH, CORE_PROPERTIES, NEARBY_CATALOG, NEARBY_REGISTRY } from './build-listings-seed.mjs';
import { nearbyConfig, validateNearbySnapshot, validateNearbyEvidence, renderNearbySeed, snapshotCoverage, distanceMeters, selectNearbyPlaces } from './build-nearby-seed.mjs';
import { categoryGraph, classifyCategories, normalizeResult, collectionCenters } from './collect-nearby-seed.mjs';
import { audit } from './audit-nearby-seed.mjs';

const [json, sql, snapshotText, properties, catalog] = await Promise.all([
  readFile(JSON_PATH, 'utf8'), readFile(SQL_PATH, 'utf8'), readFile(NEARBY_PATH, 'utf8'),
  readFile(CORE_PROPERTIES, 'utf8'), readFile(NEARBY_CATALOG, 'utf8'),
]);
const snapshot = JSON.parse(snapshotText), addresses = JSON.parse(json), config = nearbyConfig(properties, catalog);

test('self-contained SQL retains exactly the real cache JSON, source identity and coordinates', () => {
  assert.equal(validateNearbySnapshot(snapshot, config), snapshot);
  const embedded = sql.match(/\$hs_seed_nearby\$([\s\S]*?)\$hs_seed_nearby\$/);
  assert.ok(embedded);
  assert.deepEqual(JSON.parse(embedded[1]), snapshot);
  assert.equal(renderNearbySeed(sql, snapshotText, config), sql);
  assert.equal(new Set(snapshot.places.map(p => p.source.externalId)).size, snapshot.places.length);
  assert.ok(snapshot.places.every(p => p.source.provider === 'TOMTOM' && p.source.apiVersion === 'V2'));
});

test('all300 listings have100 real2km links; sparse/remote inputs are never padded', () => {
  assert.deepEqual(snapshotCoverage(addresses, snapshot, config), { places: 1328, full: 300, partial: 0, empty: 0, links: 30000 });
  // Every listing uses the same place identities; a shared place is not cloned 300 times.
  assert.ok(snapshot.places.some(p => addresses.filter(a => distanceMeters(a, p) <= 2000).length > 1));
  const remote = [{ latitude: 21.0285, longitude: 105.8542 }];
  assert.deepEqual(snapshotCoverage(remote, snapshot, config), { places: 1328, full: 0, partial: 0, empty: 1, links: 0 });
  const near=snapshot.places[0], sparse={...snapshot,places:[near]};
  assert.deepEqual(snapshotCoverage([near],sparse,config),{places:1,full:0,partial:1,empty:0,links:1});
  assert.equal(distanceMeters(snapshot.places[0], snapshot.places[0]), 0);
});

test('every POI retains exact real response coordinates, source ID, category parent evidence and address', async () => {
  const registry=JSON.parse(await readFile(NEARBY_REGISTRY,'utf8'));
  const load=file=>readFile(path.join(path.dirname(NEARBY_PATH),file),'utf8');
  await validateNearbyEvidence(snapshot,load,registry);
  const altered=structuredClone(snapshot);altered.places[0].latitude+=0.00001;
  await assert.rejects(()=>validateNearbyEvidence(altered,load,registry),/differs from real provider/);
  const wrongGroup=structuredClone(snapshot);wrongGroup.places[0].groups=[{code:'SPORTS'}];
  await assert.rejects(()=>validateNearbyEvidence(wrongGroup,load,registry),/Fabricated category/);
  await assert.rejects(()=>validateNearbyEvidence(snapshot,async file=>(await load(file))+' ',registry),/SHA256/);
});

test('selection preserves diverse available groups AND subtypes without fabricating absence', async () => {
  for (const a of addresses) {
    const chosen=selectNearbyPlaces(a,snapshot.places,config), ids=new Set(chosen.map(x=>x.place.id));
    assert.equal(ids.size,100);assert.ok(chosen.every(x=>x.distance<=2000));
    const candidates=snapshot.places.filter(p=>distanceMeters(a,p)<=2000);
    for(const group of config.groups)assert.ok(chosen.filter(x=>x.place.groups.some(g=>g.code===group)).length>=
      Math.min(5,candidates.filter(p=>p.groups.some(g=>g.code===group)).length));
    for(const kind of config.categoryIds)assert.ok(chosen.filter(x=>Object.hasOwn(x.place.source.classifications.verifiedCategoryParents,kind)).length>=
      Math.min(3,candidates.filter(p=>Object.hasOwn(p.source.classifications.verifiedCategoryParents,kind)).length));
  }
  const report=await audit(true);
  assert.equal(report.summary.minimumGroupsPerListing,6);
  assert.equal(report.summary.groups.TRANSPORT.listingsWithData,79,'Do not invent bus stops for221 listings');
  assert.equal(report.summary.links,30000);assert.ok(report.summary.sharedPlaces>700);
});

test('collection uses actual centers, category graph branches and bounded explicit capture commands', async () => {
  const centers=collectionCenters(addresses);assert.equal(centers.length,3);
  assert.ok(centers.every(c=>addresses.includes(c)));
  const registry=JSON.parse(await readFile(NEARBY_REGISTRY,'utf8'));
  const body={poiCategories:[{id:7372,childCategoryIds:[7372004]},{id:7372004},{id:7377},{id:9362,childCategoryIds:[9362003]},{id:9362003}]};
  const graph=categoryGraph(body);
  assert.deepEqual(classifyCategories(['7372004'],graph,registry),['EDUCATION']);
  assert.deepEqual(classifyCategories(['9362003'],graph,registry),[]);
  assert.deepEqual(classifyCategories(['7372999'],graph,registry),[],'Never infer by numeric prefix');
  assert.equal(snapshot.provenance.collectionRequestCount,31);
  assert.equal(snapshot.provenance.captures.filter(c=>c.path.includes('nearbySearch')).length,30);
  assert.ok(snapshot.provenance.captures.every(c=>!Object.hasOwn(c.parameters,'key')));
  assert.ok(snapshot.provenance.captures.filter(c=>c.path.includes('nearbySearch')).every(c=>c.parameters.limit===100&&c.parameters.radius===2000&&c.parameters.ofs===0));
  const source=await readFile(new URL('./collect-nearby-seed.mjs',import.meta.url),'utf8');
  assert.match(source,/calls >= 31/);assert.match(source,/2100-/);assert.match(source,/collect\(process.argv.includes\('--fetch'\)\)/);
  const build=await readFile(new URL('./build-listings-seed.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(build,/collect-nearby-seed|fetch\(|TOMTOM_API_KEY/);
});

test('fingerprint matches lexical Java scope and changes when configuration changes', () => {
  assert.equal(config.fingerprint, '2026-10-29-v3-68151b632b60a528');
  const reversed = properties.replace(config.categoryIds.join(','), [...config.categoryIds].reverse().join(','));
  assert.equal(nearbyConfig(reversed, catalog).fingerprint, config.fingerprint);
  assert.notEqual(nearbyConfig(properties, catalog.replace('2026-10-29-v3', '2026-10-30-v4')).fingerprint, config.fingerprint);
  assert.throws(() => nearbyConfig(properties.replace('nearby.scan-radius-m=2000', 'nearby.scan-radius-m=3000'), catalog), /2km/);
  assert.throws(() => nearbyConfig(properties.replace('nearby.retention-hours=0', 'nearby.retention-hours=24'), catalog), /retention0/);
});

test('rejects missing source evidence, duplicate identities, wrong provider, corrupt coordinates and unsafe SQL payload', () => {
  const change = mutate => { const copy = structuredClone(snapshot); mutate(copy); return copy; };
  assert.throws(() => validateNearbySnapshot(change(s => delete s.provenance), config), /provenance/);
  assert.throws(() => validateNearbySnapshot(change(s => s.places.push(s.places[0])), config), /duplicate/);
  assert.throws(() => validateNearbySnapshot(change(s => s.places[1].source.externalId = s.places[0].source.externalId), config), /identity/);
  assert.throws(() => validateNearbySnapshot(change(s => s.places[0].source.provider = 'OSM'), config), /identity/);
  assert.throws(() => validateNearbySnapshot(change(s => s.places[0].latitude = 91), config), /coordinate/);
  assert.throws(() => validateNearbySnapshot(change(s => s.places[0].longitude = null), config), /coordinate/);
  assert.throws(() => validateNearbySnapshot(change(s => s.places[0].groups[0].mappingVersion = 'old'), config), /mapping/);
  assert.throws(() => validateNearbySnapshot(change(s => s.places[0].source.lastSeenAt = null), config), /timestamp/);
  const unsafe = change(s => s.provenance.description = '$hs_seed_nearby$');
  assert.throws(() => renderNearbySeed(sql, JSON.stringify(unsafe), config), /delimiter/);
});

test('replay has terminal jobs without fabricated request count and does not remove shared POIs', () => {
  assert.match(sql, /'PARTIAL',0,now\(\)/);
  assert.match(sql, /'OFFLINE_SEED','CACHE_V1'/);
  assert.match(sql, /'providerRequests',0/);
  assert.match(sql, /'PARTIAL','OFFLINE_CACHE_REPLAY'/);
  assert.doesNotMatch(sql, /DELETE FROM nearby_places\b|DELETE FROM nearby_place_sources\b|TRUNCATE nearby/i);
});
