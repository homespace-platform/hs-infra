// Explicit, one-time fixture preparation. NEVER imported/called by the SQL seed,
// build-listings-seed, Core startup or the Nearby worker.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSON_PATH, NEARBY_PATH, CORE_PROPERTIES, NEARBY_CATALOG, validateAddresses } from './build-listings-seed.mjs';
import { nearbyConfig, distanceMeters } from './build-nearby-seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_DIR = path.join(ROOT, 'postgres/seed/nearby-source/tomtom');
const hash = value => createHash('sha256').update(value).digest('hex');
const normalized = value => value.toLowerCase().replaceAll('đ', 'd').normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();
function uuid(value) { const h = hash(value).slice(0, 32); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; }

// Actual supplied listing points, spread across the seed area. No invented centers.
export function collectionCenters(addresses, count = 3) {
  const sorted = [...addresses].sort((a,b) => a.pointIndex - b.pointIndex), centers = [sorted[0]];
  while (centers.length < Math.min(count, sorted.length)) {
    const next = sorted.filter(p => !centers.includes(p)).map(p => ({ p, d: Math.min(...centers.map(c => distanceMeters(c,p))) }))
      .sort((a,b) => b.d-a.d || a.p.pointIndex-b.p.pointIndex)[0];
    centers.push(next.p);
  }
  return centers;
}

export function categoryGraph(body) {
  if (!Array.isArray(body.poiCategories) || !body.poiCategories.length) throw new Error('Invalid actual TomTom category catalog');
  const graph = new Map();
  for (const c of body.poiCategories) {
    const id = String(c.id); if (!/^\d+$/.test(id)) throw new Error('Invalid catalog category ID');
    if (!graph.has(id)) graph.set(id, new Set());
    for (const child of c.childCategoryIds ?? []) {
      const key = String(child); if (!graph.has(key)) graph.set(key, new Set()); graph.get(key).add(id);
    }
  }
  return graph;
}

export function categoryEvidence(ids, graph) {
  const proof = {}, queue = [...ids];
  while (queue.length) {
    const id = queue.pop(); if (Object.hasOwn(proof,id) || !graph.has(id)) continue;
    proof[id] = [...graph.get(id)].sort(); queue.push(...proof[id]);
    if (Object.keys(proof).length > 1000) throw new Error('Category graph exceeds bounded traversal');
  }
  return proof;
}

export function classifyCategories(ids, graph, registry) {
  const groups = new Set();
  for (const id of ids) {
    const lineage = Object.keys(categoryEvidence([id],graph));
    if (lineage.some(code => registry.excludedBranches.includes(code))) continue;
    for (const rule of registry.categories) if (lineage.includes(rule.id)) rule.groups.forEach(g => groups.add(g));
  }
  return [...groups].sort();
}

export function normalizeResult(n, envelope, evidence, graph, registry, config, previous) {
  if (n.type !== 'POI' || typeof n.id !== 'string' || !n.id.trim() || typeof n.poi?.name !== 'string' || !n.poi.name.trim()
      || !Number.isFinite(n.position?.lat) || !Number.isFinite(n.position?.lon)
      || Math.abs(n.position.lat) > 90 || Math.abs(n.position.lon) > 180) throw new Error('Malformed real POI');
  const ids = [...new Set((n.poi.categorySet ?? []).map(c => String(c.id)))].sort();
  if (!ids.length || ids.some(id => !graph.has(id))) throw new Error('Provider returned an unverified category');
  const groups = classifyCategories(ids,graph,registry);
  if (!groups.length) return null; // Excluded branches never receive invented mappings.
  const a = n.address ?? {}, street = [a.streetNumber,a.streetName].filter(v => v != null && String(v).trim()).join(' ');
  const stamp = envelope.fetchedAt;
  return {
    id: previous?.id ?? uuid('homespace:tomtom:V2:place:' + n.id), name: n.poi.name, normalizedName: normalized(n.poi.name),
    latitude: Math.round(n.position.lat*1e7)/1e7, longitude: Math.round(n.position.lon*1e7)/1e7,
    addressText: [street,a.municipality,a.countrySubdivision].filter(Boolean).join(', ') || null,
    positionRevision: previous?.positionRevision ?? 0, businessStatus: 'UNKNOWN', verificationStatus: 'UNVERIFIED', verifiedAt: null,
    active: true, createdAt: previous?.createdAt ?? stamp, updatedAt: stamp,
    source: {
      id: previous?.source.id ?? uuid('homespace:tomtom:V2:source:' + n.id), provider: 'TOMTOM', apiVersion: 'V2', externalId: n.id,
      externalInfo: n.info ?? null, categoryIds: ids,
      classifications: { providerClassifications: n.poi.classifications ?? null, verifiedCategoryParents: categoryEvidence(ids,graph) },
      categoryLabels: n.poi.categories ?? null, sourceAddress: a, licensePolicyId: config.policy, attribution: '© TomTom',
      firstSeenAt: previous?.source.firstSeenAt ?? stamp, lastSeenAt: stamp, contentExpiresAt: stamp, evidence,
    },
    groups: groups.map(code => ({ code, mappingVersion: config.mappingVersion, classifiedAt: stamp })),
  };
}

function validateEnvelope(envelope, pathname, parameters) {
  if (envelope.provider !== 'TOMTOM' || envelope.path !== pathname || JSON.stringify(envelope.parameters) !== JSON.stringify(parameters)
      || !Number.isFinite(Date.parse(envelope.fetchedAt))) throw new Error('Invalid cached collection evidence');
  if (pathname.includes('nearbySearch')) {
    const s = envelope.body.summary;
    if (!Array.isArray(envelope.body.results) || s?.offset !== 0 || s.numResults !== envelope.body.results.length
        || s.numResults > 100 || s.totalResults < s.numResults) throw new Error('Inconsistent real provider response');
  }
  return envelope;
}

export async function collect(fetchEnabled = false) {
  const [json, oldText, properties, java, registryText] = await Promise.all([
    readFile(JSON_PATH,'utf8'),readFile(NEARBY_PATH,'utf8'),readFile(CORE_PROPERTIES,'utf8'),readFile(NEARBY_CATALOG,'utf8'),
    readFile(path.resolve(ROOT,'../hs-core-api/hs-listing-service/src/main/resources/nearby/tomtom-v2-category-mapping.json'),'utf8'),
  ]);
  const addresses = validateAddresses(JSON.parse(json)), old = JSON.parse(oldText), config = nearbyConfig(properties,java);
  const registry = JSON.parse(registryText), centers = collectionCenters(addresses), captures = [];
  const oldById = new Map(old.places.map(p => [p.source.externalId,p]));
  // The only secret read is in this explicit preparation command. It is never logged/saved.
  let key, calls = 0, lastStarted = 0;
  if (fetchEnabled) {
    const env = await readFile(path.resolve(ROOT,'../hs-core-api/.env'),'utf8');
    key = process.env.TOMTOM_API_KEY || env.match(/^TOMTOM_API_KEY\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^(['"])(.*)\1$/,'$2');
    if (!key) throw new Error('Configure the backend TOMTOM_API_KEY first');
  }
  await mkdir(SOURCE_DIR,{recursive:true});
  async function capture(file, pathname, parameters) {
    const target = path.join(SOURCE_DIR,file); let text;
    try { text = await readFile(target,'utf8'); } catch (e) { if(e.code !== 'ENOENT') throw e; }
    if (!text) {
      if (!fetchEnabled) throw new Error(`Missing real capture ${file}; collection requires explicit --fetch (seed/build never fetches)`);
      if (calls >= 31) throw new Error('One-time collection cap reached (31 HTTP requests); no automatic continuation');
      const wait = Math.max(0,2100-(Date.now()-lastStarted)); if (wait) await new Promise(r=>setTimeout(r,wait));
      const url = new URL(pathname,'https://api.tomtom.com');
      Object.entries(parameters).forEach(([k,v])=>url.searchParams.set(k,String(v))); url.searchParams.set('key',key);
      lastStarted=Date.now(); calls++;
      let response;
      try { response = await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000),redirect:'error'}); }
      catch { throw new Error(`TomTom request failed for ${file}; no URL/key logged, no automatic retry`); }
      if (!response.ok) throw new Error(`TomTom HTTP ${response.status} for ${file}; stopped without retry`);
      const body = await response.json();
      text = JSON.stringify(validateEnvelope({provider:'TOMTOM',path:pathname,parameters,fetchedAt:new Date().toISOString(),body},pathname,parameters),null,2)+'\n';
      await writeFile(target,text,'utf8');
    }
    const envelope = validateEnvelope(JSON.parse(text),pathname,parameters);
    captures.push({file:`nearby-source/tomtom/${file}`,sha256:hash(text),path:pathname,parameters,fetchedAt:envelope.fetchedAt,
      ...(envelope.body.summary ? {summary:envelope.body.summary} : {})});
    console.log(`${file}: ${envelope.body.results?.length ?? envelope.body.poiCategories?.length} records (new HTTP calls this run: ${calls})`);
    return { envelope,evidence:{file:`nearby-source/tomtom/${file}`,sha256:hash(text)} };
  }
  const categoryCapture = await capture('categories.json','/search/2/poiCategories.json',{language:'en-US'});
  const graph = categoryGraph(categoryCapture.envelope.body), pool = new Map();
  for (const [index,c] of centers.entries()) for (const category of config.categoryIds) {
    const {envelope,evidence} = await capture(`center-${index+1}-category-${category}.json`,'/search/2/nearbySearch/.json',{
      lat:c.latitude,lon:c.longitude,radius:2000,limit:100,ofs:0,countrySet:'VN',categorySet:category,
    });
    for (const n of envelope.body.results) {
      const place = normalizeResult(n,envelope,evidence,graph,registry,config,oldById.get(n.id));
      if (place && addresses.some(a => distanceMeters(a,place)<=2000)) pool.set(place.source.externalId,place);
    }
  }
  // Replace the narrow old fixture with only auditable captured points in the seed area.
  const snapshot = {schemaVersion:1,provenance:{kind:'TOMTOM_SEED_COLLECTION',exportedAt:captures.map(c=>c.fetchedAt).sort().at(-1),
    description:'Frozen real TomTom V2 captures across three actual listing centers and ten categories. One-time preparation only; SQL/build/restart make zero provider requests.',
    centers:centers.map(c=>({addressId:c.id,pointIndex:c.pointIndex,latitude:c.latitude,longitude:c.longitude})),
    captures,collectionRequestCount:captures.length,selection:'DIVERSE_NEAREST_100_V1',
    note:'Actual provider names, coordinates, IDs and category parent graph retained. Offline per-listing selection is a diverse sample within 2 km, not an exhaustive or exact fresh provider response. Missing groups never prove absence.'},
    places:[...pool.values()].sort((a,b)=>a.source.externalId.localeCompare(b.source.externalId,'en'))};
  await writeFile(NEARBY_PATH,JSON.stringify(snapshot,null,2)+'\n','utf8');
  console.log(`Saved ${pool.size} real shared POIs, ${calls} new HTTP calls, ${captures.length} frozen captures. SQL has not been executed.`);
  return snapshot;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  collect(process.argv.includes('--fetch')).catch(e=>{console.error(e.message);process.exitCode=1;});
}
