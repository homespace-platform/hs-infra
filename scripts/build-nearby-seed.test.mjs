import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSON_PATH, SQL_PATH, NEARBY_PATH, CORE_PROPERTIES, NEARBY_CATALOG } from './build-listings-seed.mjs';
import { nearbyConfig, validateNearbySnapshot, renderNearbySeed, snapshotCoverage, distanceMeters } from './build-nearby-seed.mjs';

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

test('actual real pool is shared within2km and sparse areas are never filled with fake points', () => {
  assert.deepEqual(snapshotCoverage(addresses, snapshot, config), { places: 100, full: 229, partial: 41, empty: 30, links: 24853 });
  // Every listing uses the same place identities; a shared place is not cloned 300 times.
  assert.ok(snapshot.places.some(p => addresses.filter(a => distanceMeters(a, p) <= 2000).length > 1));
  const remote = [{ latitude: 21.0285, longitude: 105.8542 }];
  assert.deepEqual(snapshotCoverage(remote, snapshot, config), { places: 100, full: 0, partial: 0, empty: 1, links: 0 });
  assert.equal(distanceMeters(snapshot.places[0], snapshot.places[0]), 0);
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
