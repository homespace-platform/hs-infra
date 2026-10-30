// Local coverage report only. No API key, HTTP client or development DB access.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {JSON_PATH,NEARBY_PATH,CORE_PROPERTIES,NEARBY_CATALOG} from './build-listings-seed.mjs';
import {nearbyConfig,selectNearbyPlaces,snapshotCoverage,distanceMeters} from './build-nearby-seed.mjs';

export const REPORT_PATH=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../postgres/seed/nearby_seed_audit.json');
export async function audit(check=false) {
  const [json,snapshotText,properties,java]=await Promise.all([readFile(JSON_PATH,'utf8'),readFile(NEARBY_PATH,'utf8'),readFile(CORE_PROPERTIES,'utf8'),readFile(NEARBY_CATALOG,'utf8')]);
  const addresses=JSON.parse(json),snapshot=JSON.parse(snapshotText),config=nearbyConfig(properties,java);
  const usage=new Map();
  const listings=addresses.map(a=>{
    const chosen=selectNearbyPlaces(a,snapshot.places,config);chosen.forEach(x=>usage.set(x.place.id,(usage.get(x.place.id)||0)+1));
    return {addressId:a.id,pointIndex:a.pointIndex,latitude:a.latitude,longitude:a.longitude,selectedCount:chosen.length,
      availableCount:snapshot.places.filter(p=>distanceMeters(a,p)<=config.radius).length,
      groups:Object.fromEntries(config.groups.map(g=>[g,chosen.filter(x=>x.place.groups.some(c=>c.code===g)).length])),
      categories:Object.fromEntries(config.categoryIds.map(id=>[id,chosen.filter(x=>Object.hasOwn(x.place.source.classifications.verifiedCategoryParents,id)).length])),
      nearestMeters:chosen.length?Math.round(chosen[0].distance*100)/100:null,
      farthestMeters:chosen.length?Math.round(chosen.at(-1).distance*100)/100:null,
      selectedPlaceIds:chosen.map(x=>x.place.id)};
  });
  const report={snapshotSha256:createHash('sha256').update(snapshotText).digest('hex'),radiusMeters:config.radius,maxPerListing:config.limit,
    selection:'DIVERSE_NEAREST_100_V1',runtimeProviderCalls:0,coverage:'PARTIAL',
    summary:{...snapshotCoverage(addresses,snapshot,config),linkedDistinctPlaces:usage.size,sharedPlaces:[...usage.values()].filter(n=>n>1).length,
      minimumGroupsPerListing:Math.min(...listings.map(l=>Object.values(l.groups).filter(n=>n>0).length)),
      groups:Object.fromEntries(config.groups.map(g=>[g,{pool:snapshot.places.filter(p=>p.groups.some(x=>x.code===g)).length,
        listingsWithData:listings.filter(l=>l.groups[g]>0).length}]))},listings};
  if(report.summary.empty!==0 || report.summary.full!==300)throw new Error('Seed POI coverage regressed: need 100 genuine points within2km for all300 existing addresses');
  const text=JSON.stringify(report,null,2)+'\n';
  if(check){if(await readFile(REPORT_PATH,'utf8')!==text)throw new Error('Nearby audit is stale; run node scripts/audit-nearby-seed.mjs');}
  else await writeFile(REPORT_PATH,text,'utf8');
  console.log(JSON.stringify(report.summary,null,2));return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))audit(process.argv.includes('--check')).catch(e=>{console.error(e.message);process.exitCode=1;});
