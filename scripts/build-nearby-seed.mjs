// Offline replay only: never imports an HTTP client or reads database credentials.
import { createHash } from 'node:crypto';

export const NEARBY_START = '-- BEGIN SEED NEARBY SNAPSHOT (generated; do not edit)';
export const NEARBY_END = '-- END SEED NEARBY SNAPSHOT';
const GROUPS = ['EDUCATION', 'HEALTHCARE', 'SHOPPING', 'FOOD_DRINK', 'FINANCE', 'TRANSPORT', 'RECREATION'];
const CATEGORY_SCOPE = ['7372', '7377', '7321', '7326', '7332005', '9361009', '7315', '7328', '9942002', '9362'];
const UUID = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const hash = value => createHash('sha256').update(value).digest('hex');
const literal = value => "'" + value.replaceAll("'", "''") + "'";
const normalized = value => value.toLowerCase().replaceAll('đ', 'd').normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();

export function nearbyConfig(properties, catalogJava) {
  const property = name => {
    const lines = properties.split(/\r?\n/).filter(line => line.startsWith(name + '='));
    if (lines.length !== 1 || !lines[0].slice(name.length + 1).trim()) throw new Error(`Missing/duplicate ${name}`);
    return lines[0].slice(name.length + 1).trim();
  };
  const categoryIds = property('nearby.tomtom.category-set').split(',');
  if (categoryIds.some(id => !/^\d+$/.test(id)) || new Set(categoryIds).size !== categoryIds.length) throw new Error('Invalid category-set');
  if ([...categoryIds].sort().join(',') !== [...CATEGORY_SCOPE].sort().join(',')) throw new Error('Offline seed supports the agreed ten-category scope only; provide a matching real snapshot before changing it');
  const mappingVersion = catalogJava.match(/\bVERSION\s*=\s*"([^"\r\n]+)"/)?.[1];
  if (!mappingVersion) throw new Error('Missing NearbyCatalog.VERSION');
  const radius = Number(property('nearby.scan-radius-m')), limit = Number(property('nearby.tomtom.result-limit'));
  if (radius !== 2000 || limit !== 100 || property('nearby.retention-hours') !== '0') throw new Error('Offline seed requires current 2km / limit100 / retention0 policy');
  const policy = property('nearby.tomtom.license-policy-id');
  const fingerprint = `${mappingVersion}-${hash([...categoryIds].sort().join(',') + '|limit=' + limit).slice(0, 16)}`;
  return { radius, limit, categoryIds, mappingVersion, fingerprint, policy, groups: GROUPS };
}

export function validateNearbySnapshot(snapshot, config) {
  if (snapshot.schemaVersion !== 1 || snapshot.provenance?.kind !== 'EXISTING_TOMTOM_CACHE'
      || !Number.isFinite(Date.parse(snapshot.provenance.exportedAt)) || !Array.isArray(snapshot.places) || !snapshot.places.length) throw new Error('Missing real nearby cache provenance');
  const identities = new Set(), ids = new Set(), sourceIds = new Set();
  for (const p of snapshot.places) {
    const s = p.source;
    if (!UUID.test(p.id) || ids.has(p.id) || !s || !UUID.test(s.id) || sourceIds.has(s.id)) throw new Error('Invalid/duplicate nearby/source ID');
    ids.add(p.id); sourceIds.add(s.id);
    if (s.provider !== 'TOMTOM' || s.apiVersion !== 'V2' || typeof s.externalId !== 'string' || !s.externalId.trim() || identities.has(s.externalId)) throw new Error('Invalid/duplicate real TomTom source identity');
    identities.add(s.externalId);
    if (!p.active || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 500 || p.normalizedName !== normalized(p.name)) throw new Error('Invalid nearby name/normalization');
    for (const [field, max] of [['latitude', 90], ['longitude', 180]]) {
      const n = p[field];
      if (typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > max || Math.round(n * 1e7) / 1e7 !== n) throw new Error('Invalid/over-precision POI coordinate');
    }
    if (!Number.isInteger(p.positionRevision) || p.positionRevision < 0 || s.licensePolicyId !== config.policy || !s.attribution
        || !Array.isArray(s.categoryIds) || !s.categoryIds.length || s.categoryIds.some(code => !/^\d+$/.test(code))) throw new Error('Invalid POI revision/category/license');
    for (const timestamp of [p.createdAt, p.updatedAt, s.firstSeenAt, s.lastSeenAt, s.contentExpiresAt]) if (!Number.isFinite(Date.parse(timestamp))) throw new Error('Missing actual source timestamp');
    if (!Array.isArray(p.groups) || !p.groups.length || new Set(p.groups.map(g => g.code)).size !== p.groups.length) throw new Error('Missing/duplicate classified groups');
    for (const group of p.groups) if (!GROUPS.includes(group.code) || group.mappingVersion !== config.mappingVersion || !Number.isFinite(Date.parse(group.classifiedAt))) throw new Error('Unverified/obsolete group mapping: re-export a current real cache');
  }
  return snapshot;
}

export function distanceMeters(a, b) {
  const rad = x => x * Math.PI / 180;
  const v = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(Math.max(0, 1 - v)));
}

export function snapshotCoverage(addresses, snapshot, config) {
  const counts = addresses.map(a => Math.min(config.limit, snapshot.places.filter(p => distanceMeters(a, p) <= config.radius).length));
  return { places: snapshot.places.length, full: counts.filter(n => n === config.limit).length,
    partial: counts.filter(n => n > 0 && n < config.limit).length, empty: counts.filter(n => n === 0).length,
    links: counts.reduce((a, b) => a + b, 0) };
}

export function renderNearbySeed(sql, snapshotText, config) {
  const snapshot = validateNearbySnapshot(JSON.parse(snapshotText), config);
  const payload = JSON.stringify(snapshot);
  if (payload.includes('$hs_seed_nearby$')) throw new Error('Unsafe nearby JSON SQL delimiter');
  const block = `${NEARBY_START}
-- Real cached POIs; no provider calls, random coordinates, fabricated categories or full-coverage claims.
-- snapshot-sha256: ${hash(snapshotText)}
CREATE TEMP TABLE hs_seed_nearby_config ON COMMIT DROP AS
SELECT ${literal(config.fingerprint)}::text AS scan_version, ${literal(config.mappingVersion)}::text AS mapping_version,
       ${literal(config.policy)}::text AS policy, ${config.radius}::integer AS radius_m, ${config.limit}::integer AS result_limit,
       ${literal(JSON.stringify(config.categoryIds))}::jsonb AS category_ids,
       ${literal(JSON.stringify(config.groups))}::jsonb AS requested_groups;
CREATE TEMP TABLE hs_seed_nearby_snapshot ON COMMIT DROP AS
SELECT $hs_seed_nearby$${payload}$hs_seed_nearby$::jsonb AS data;
CREATE TEMP TABLE hs_seed_nearby_input ON COMMIT DROP AS
SELECT p AS data FROM hs_seed_nearby_snapshot j CROSS JOIN LATERAL jsonb_array_elements(j.data->'places') p;

-- Reference groups only; do not manufacture POIs for absent categories.
INSERT INTO nearby_categories(code,display_name_vi,display_order,enabled) VALUES
 ('EDUCATION','Giáo dục',1,true),('HEALTHCARE','Y tế',2,true),('SHOPPING','Mua sắm',3,true),
 ('FOOD_DRINK','Ăn uống',4,true),('FINANCE','Ngân hàng / ATM',5,true),('TRANSPORT','Đi lại',6,true),
 ('RECREATION','Giải trí',7,true),('SPORTS','Thể thao',8,true) ON CONFLICT(code) DO NOTHING;

-- A real provider identity wins over the exported UUID. Never duplicate shared places,
-- and never move/update a newer live POI with an older offline snapshot on rerun.
CREATE TEMP TABLE hs_seed_nearby_identity ON COMMIT DROP AS
SELECT j.data,coalesce(s.place_id,j.data->>'id') AS place_id,s.id IS NOT NULL AS source_existed
FROM hs_seed_nearby_input j LEFT JOIN nearby_place_sources s ON s.provider=j.data#>>'{source,provider}'
 AND s.api_version=j.data#>>'{source,apiVersion}' AND s.external_id=j.data#>>'{source,externalId}';
INSERT INTO nearby_places(id,name,normalized_name,latitude,longitude,address_text,position_revision,
 business_status,verification_status,verified_at,active,created_at,updated_at)
SELECT place_id,data->>'name',data->>'normalizedName',(data->>'latitude')::numeric,(data->>'longitude')::numeric,
 data->>'addressText',(data->>'positionRevision')::bigint,data->>'businessStatus',data->>'verificationStatus',
 (data->>'verifiedAt')::timestamptz,true,(data->>'createdAt')::timestamptz,(data->>'updatedAt')::timestamptz
FROM hs_seed_nearby_identity ON CONFLICT(id) DO NOTHING;
INSERT INTO nearby_place_sources(id,place_id,provider,api_version,external_id,external_info,category_ids,
 classifications,category_labels,source_address,license_policy_id,attribution,first_seen_at,last_seen_at,content_expires_at)
SELECT data#>>'{source,id}',place_id,data#>>'{source,provider}',data#>>'{source,apiVersion}',
 data#>>'{source,externalId}',data#>>'{source,externalInfo}',data#>'{source,categoryIds}',
 nullif(data#>'{source,classifications}','null'::jsonb),nullif(data#>'{source,categoryLabels}','null'::jsonb),
 nullif(data#>'{source,sourceAddress}','null'::jsonb),data#>>'{source,licensePolicyId}',data#>>'{source,attribution}',
 (data#>>'{source,firstSeenAt}')::timestamptz,(data#>>'{source,lastSeenAt}')::timestamptz,
 (data#>>'{source,contentExpiresAt}')::timestamptz
FROM hs_seed_nearby_identity ON CONFLICT(provider,api_version,external_id) DO NOTHING;
INSERT INTO nearby_place_categories(place_id,category_code,mapping_version,classified_at)
SELECT i.place_id,g->>'code',g->>'mappingVersion',(g->>'classifiedAt')::timestamptz
FROM hs_seed_nearby_identity i CROSS JOIN LATERAL jsonb_array_elements(i.data->'groups') g
WHERE NOT i.source_existed ON CONFLICT(place_id,category_code) DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM hs_seed_nearby_identity i JOIN nearby_place_sources s ON s.place_id=i.place_id
  AND s.provider=i.data#>>'{source,provider}' AND s.api_version=i.data#>>'{source,apiVersion}'
  AND s.external_id=i.data#>>'{source,externalId}' CROSS JOIN hs_seed_nearby_config c
  WHERE s.license_policy_id<>c.policy) THEN
  RAISE EXCEPTION 'Source Nearby hiện có không khớp license policy. Không ghi đè source thật; hãy kiểm tra snapshot/cấu hình.';
 END IF;
END $$;

-- Calculate hashes from persisted numeric(10,7), exactly as NearbyRepository.HASH does.
CREATE TEMP TABLE hs_seed_nearby_locations ON COMMIT DROP AS
SELECT a.listing_id,a.latitude,a.longitude,md5(a.id||':'||a.latitude::text||':'||a.longitude::text) AS location_hash
FROM listing_addresses a JOIN hs_seed_rows s ON s.listing_id::text=a.listing_id WHERE a.active IS TRUE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM nearby_scan_jobs j JOIN hs_seed_nearby_locations l ON l.listing_id=j.listing_id
           WHERE j.status='RUNNING' AND j.lease_until>now()) THEN
  RAISE EXCEPTION 'Nearby đang chạy cho tin seed. Dừng Core trước khi chạy lại seed để không tranh chấp worker.';
 END IF;
END $$;
-- Only the 300 demo listings are replaced. Other listings' links/shared POIs survive.
DELETE FROM listing_nearby_places p USING hs_seed_nearby_locations l WHERE p.listing_id=l.listing_id;
UPDATE nearby_scan_jobs j SET status='SUPERSEDED',lease_token=NULL,lease_until=NULL,updated_at=now(),last_error_code='SEED_LOCATION_REPLACED'
FROM hs_seed_nearby_locations l CROSS JOIN hs_seed_nearby_config c
WHERE j.listing_id=l.listing_id AND (j.location_hash<>l.location_hash OR j.radius_m<>c.radius_m OR j.mapping_version<>c.scan_version);
INSERT INTO nearby_scan_jobs(id,listing_id,location_hash,radius_m,mapping_version,status,attempts,next_attempt_at)
SELECT md5('homespace-nearby-seed-job:'||l.listing_id||':'||l.location_hash||':'||c.scan_version)::uuid::text,
 l.listing_id,l.location_hash,c.radius_m,c.scan_version,'PARTIAL',0,now()
FROM hs_seed_nearby_locations l CROSS JOIN hs_seed_nearby_config c
ON CONFLICT(listing_id,location_hash,radius_m,mapping_version) DO UPDATE
SET status='PARTIAL',attempts=0,lease_token=NULL,lease_until=NULL,last_error_code=NULL,next_attempt_at=now(),updated_at=now();
CREATE TEMP TABLE hs_seed_nearby_jobs ON COMMIT DROP AS
SELECT l.*,j.id AS job_id,md5('homespace-nearby-offline-run:'||j.id)::uuid::text AS run_id
FROM hs_seed_nearby_locations l CROSS JOIN hs_seed_nearby_config c
JOIN nearby_scan_jobs j ON j.radius_m=c.radius_m AND j.mapping_version=c.scan_version
WHERE j.listing_id=l.listing_id AND j.location_hash=l.location_hash;
-- Earlier runs remain in history, but must not claim COMPLETE coverage after their
-- listing links were replaced by this partial replay. Public coverage ranks run dates.
UPDATE nearby_scan_runs r SET coverage_status='PARTIAL',stopped_reason='REPLACED_BY_OFFLINE_CACHE_REPLAY'
FROM hs_seed_nearby_jobs j WHERE r.job_id=j.job_id AND r.id<>j.run_id;
INSERT INTO nearby_scan_runs(id,job_id,provider,api_version,requested_groups,center_lat,center_lon,radius_m,
 requested_category_ids,page_size,next_offset,pages_fetched,returned_count,unique_count,response_consistent,
 total_results_reported,page_summaries,coverage_status,stopped_reason,started_at,finished_at,expires_at,license_policy_id)
SELECT l.run_id,l.job_id,'OFFLINE_SEED','CACHE_V1',c.requested_groups,l.latitude,l.longitude,c.radius_m,
 c.category_ids,c.result_limit,0,0,0,0,false,NULL,
 jsonb_build_array(jsonb_build_object('kind','OFFLINE_CACHE_REPLAY','snapshotSha256',${literal(hash(snapshotText))},
 'importedAt',now(),'providerRequests',0,'sourceDataAsOf',t.data_as_of)),
 'PARTIAL','OFFLINE_CACHE_REPLAY',t.data_as_of,t.data_as_of,t.data_as_of,c.policy
FROM hs_seed_nearby_jobs l CROSS JOIN hs_seed_nearby_config c CROSS JOIN
 (SELECT max((data#>>'{source,lastSeenAt}')::timestamptz) AS data_as_of FROM hs_seed_nearby_input) t
ON CONFLICT(id) DO UPDATE SET center_lat=excluded.center_lat,center_lon=excluded.center_lon,
 requested_groups=excluded.requested_groups,requested_category_ids=excluded.requested_category_ids,
 next_offset=0,pages_fetched=0,returned_count=0,unique_count=0,response_consistent=false,total_results_reported=NULL,
 page_summaries=excluded.page_summaries,coverage_status='PARTIAL',stopped_reason='OFFLINE_CACHE_REPLAY',
 started_at=excluded.started_at,finished_at=excluded.finished_at,expires_at=excluded.expires_at,license_policy_id=excluded.license_policy_id;

-- Derive links from real coordinates. Filter radius BEFORE nearest-100, deduplicate by place_id.
WITH pool AS (
 SELECT DISTINCT p.id,p.latitude,p.longitude,p.position_revision FROM hs_seed_nearby_identity i
 JOIN nearby_places p ON p.id=i.place_id AND p.active IS TRUE
 WHERE EXISTS(SELECT 1 FROM nearby_place_sources s CROSS JOIN hs_seed_nearby_config c
  WHERE s.place_id=p.id AND s.provider='TOMTOM' AND s.api_version='V2' AND s.license_policy_id=c.policy)
 AND EXISTS(SELECT 1 FROM nearby_place_categories g WHERE g.place_id=p.id AND g.category_code IN
  (SELECT jsonb_array_elements_text(requested_groups) FROM hs_seed_nearby_config))
), distances AS (
 SELECT l.listing_id,l.location_hash,l.run_id,p.id AS place_id,p.position_revision,
  6371008.8*2*asin(sqrt(least(1.0,greatest(0.0,
   power(sin(radians((p.latitude-l.latitude)::double precision)/2),2)
   +cos(radians(l.latitude::double precision))*cos(radians(p.latitude::double precision))
    *power(sin(radians((p.longitude-l.longitude)::double precision)/2),2))))) AS meters
 FROM hs_seed_nearby_jobs l CROSS JOIN pool p
), ranked AS (
 SELECT d.*,row_number() OVER(PARTITION BY listing_id ORDER BY meters,place_id) AS n
 FROM distances d CROSS JOIN hs_seed_nearby_config c WHERE meters<=c.radius_m
)
INSERT INTO listing_nearby_places(listing_id,place_id,straight_distance_m,listing_location_hash,place_position_revision,evidence_run_id)
SELECT r.listing_id,r.place_id,r.meters,r.location_hash,r.position_revision,r.run_id
FROM ranked r CROSS JOIN hs_seed_nearby_config c WHERE r.n<=c.result_limit;
UPDATE nearby_scan_runs r SET unique_count=(SELECT count(*) FROM listing_nearby_places p WHERE p.evidence_run_id=r.id AND p.listing_id=j.listing_id)
FROM hs_seed_nearby_jobs j WHERE j.run_id=r.id;
DO $$ BEGIN
 IF (SELECT count(*) FROM hs_seed_nearby_jobs)<>300 OR EXISTS(
  SELECT 1 FROM hs_seed_nearby_jobs l JOIN nearby_scan_jobs j ON j.id=l.job_id
  JOIN nearby_scan_runs r ON r.id=l.run_id WHERE j.status<>'PARTIAL' OR r.finished_at IS NULL OR r.pages_fetched<>0)
 OR EXISTS(SELECT 1 FROM listing_nearby_places p JOIN hs_seed_nearby_jobs l ON l.listing_id=p.listing_id
           WHERE p.straight_distance_m>2000 OR p.listing_location_hash<>l.location_hash OR p.evidence_run_id<>l.run_id)
 OR EXISTS(SELECT 1 FROM listing_nearby_places p JOIN hs_seed_nearby_jobs l ON l.listing_id=p.listing_id
           GROUP BY p.listing_id HAVING count(*)>100) THEN
  RAISE EXCEPTION 'Nearby seed không đúng snapshot/location/radius/giới hạn; rollback toàn bộ.';
 END IF;
END $$;
SELECT count(*) AS offline_listings,count(*) FILTER(WHERE n=100) AS with_100_places,
 count(*) FILTER(WHERE n BETWEEN 1 AND 99) AS with_fewer_places,count(*) FILTER(WHERE n=0) AS without_known_places,
 sum(n) AS shared_place_links,(SELECT count(DISTINCT place_id) FROM hs_seed_nearby_identity) AS distinct_real_places
FROM (SELECT l.listing_id,count(p.place_id) AS n FROM hs_seed_nearby_jobs l
 LEFT JOIN listing_nearby_places p ON p.listing_id=l.listing_id GROUP BY l.listing_id) totals;
${NEARBY_END}`;
  const start = sql.indexOf(NEARBY_START), end = sql.indexOf(NEARBY_END);
  if (start < 0 || end < start || sql.indexOf(NEARBY_START, start + NEARBY_START.length) >= 0) throw new Error('Missing/duplicate Nearby seed markers');
  return sql.slice(0, start) + block + sql.slice(end + NEARBY_END.length);
}
