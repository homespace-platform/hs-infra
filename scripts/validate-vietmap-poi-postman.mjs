// Offline only: no HTTP requests and no environment/API-key file access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const url = new URL('../postman/vietmap/HomeSpace_VIETMAP_Postman_Collection.json', import.meta.url);
const collection = JSON.parse(fs.readFileSync(url, 'utf8'));
const folder = collection.item.find(item => item.name.startsWith('04. POI'));
assert.ok(folder, 'Missing POI folder');
assert.equal(folder.item.length, 7);
assert.equal(collection.item.slice(0, 3).flatMap(item => item.item).length, 11);

function validateScripts(item) {
  for (const event of item.event || []) new vm.Script(event.script.exec.join('\n'));
  for (const child of item.item || []) validateScripts(child);
}
validateScripts(collection);
for (const item of folder.item) {
  const { query, raw, path } = item.request.url;
  const expected = '{{base_url}}/' + path.join('/') + '?' + query.filter(q => !q.disabled).map(q => `${q.key}=${q.value}`).join('&');
  assert.equal(raw, expected, `${item.name}: raw URL differs from enabled params`);
  assert.ok(!JSON.stringify(item.event).match(/pm\.sendRequest|setNextRequest/), 'Automatic API calls are not allowed');
}

let assertions = 0;
function harness(overrides = {}) {
  const vars = new Map(collection.variable.map(v => [v.key, v.value]));
  for (const [key, value] of Object.entries(overrides)) vars.set(key, value);
  const local = new Map();
  const failures = [];
  let skipped = false;
  const get = key => local.has(key) ? local.get(key) : key === 'apikey' ? 'offline-mock-only' : vars.get(key);
  const pm = {
    variables: {
      get, set: (key, value) => local.set(key, value),
      replaceIn: value => value.replace(/\{\{([^}]+)\}\}/g, (_, key) => String(get(key) ?? ''))
    },
    collectionVariables: { get: key => vars.get(key), set: (key, value) => vars.set(key, value), unset: key => vars.delete(key) },
    execution: { skipRequest: () => { skipped = true; } },
    test: (name, fn) => { assertions++; try { fn(); } catch (error) { failures.push({ name, error: error.message }); } },
    expect: actual => ({ to: { eql: expected => assert.deepEqual(actual, expected) } })
  };
  const context = () => vm.createContext({ pm, console: { log() {}, warn() {}, table() {} } });
  function scripts(item, listen) {
    for (const event of item.event || []) {
      if (event.listen === listen) vm.runInContext(event.script.exec.join('\n'), context(), { timeout: 1000 });
    }
  }
  function pre(item) {
    skipped = false;
    local.clear();
    pm.request = { url: { query: { get: key => item.request.url.query.find(q => q.key === key && !q.disabled)?.value } } };
    scripts(folder, 'prerequest');
    scripts(item, 'prerequest');
  }
  function response(item, body, code = 200, invalidJson = false) {
    pm.response = { code, json: () => { if (invalidJson) throw new Error('Invalid JSON'); return body; }, to: { have: { status: expected => assert.equal(code, expected) } } };
    scripts(item, 'test');
  }
  return { vars, failures, pre, response, get, skipped: () => skipped };
}

const search = folder.item[0];
const place = folder.item.at(-1);
const poi = ref_id => ({ ref_id, name: 'Offline POI', distance: 0, categories: [] });
const ready = (overrides = {}) => {
  const h = harness(overrides);
  h.pre(search);
  h.response(search, [poi('auto:test-0'), poi('geocode:test-1')]);
  return h;
};

// All keyword presets send POI-only radius searches; category codes are not guessed.
for (const item of folder.item.slice(0, -1)) {
  const params = Object.fromEntries(item.request.url.query.filter(q => !q.disabled).map(q => [q.key, q.value]));
  assert.equal(params.layers, 'POI');
  assert.equal(params.display_type, '1');
  assert.equal(params.circle_center, '{{poi_center_lat}},{{poi_center_lng}}');
  assert.equal(params.circle_radius, '{{poi_radius_m}}');
  assert.ok(item.request.url.query.find(q => q.key === 'cats').disabled);
}
const h = ready({ poi_result_index: '1' });
h.pre(place);
assert.equal(h.get('poi_selected_ref_id'), 'geocode:test-1', 'Keep opaque ref_id prefix');
h.response(place, { lat: Number(h.vars.get('poi_center_lat')), lng: Number(h.vars.get('poi_center_lng')) });
assert.equal(h.vars.get('poi_distance_m'), '0');
assert.equal(h.vars.get('poi_within_radius'), 'true');
assert.equal(h.failures.length, 0);
assert.equal(h.vars.get('lat'), undefined, 'Do not overwrite original address workflow');

const far = ready();
far.pre(place);
far.response(place, { lat: 0, lng: 0 });
assert.equal(far.vars.get('poi_within_radius'), 'false');
assert.ok(far.failures.some(f => f.name.includes('bán kính')));
assert.equal(far.vars.get('poi_lat'), '0', 'Zero coordinate is valid, not missing');

// New empty/error/malformed searches cannot reuse a previously selected POI.
for (const [body, status, malformed] of [[[], 200, false], [{}, 423, false], [null, 200, true], [[{}], 200, false]]) {
  const stale = ready();
  stale.pre(place);
  stale.response(place, { lat: 10.759222947, lng: 106.675902691 });
  stale.pre(search);
  stale.response(search, body, status, malformed);
  assert.equal(stale.vars.get('poi_lat'), undefined);
  assert.throws(() => stale.pre(place));
  assert.ok(stale.skipped());
}
for (const value of ['', '-1', '1.5', '2', 'not-an-index']) {
  const invalid = ready({ poi_result_index: value });
  assert.throws(() => invalid.pre(place));
  assert.ok(invalid.skipped());
}
for (const [key, value] of [['poi_center_lat', '91'], ['poi_center_lng', '181'], ['poi_radius_m', '0'], ['poi_radius_m', '-1'], ['poi_center_lat', ''], ['poi_text', 'x']]) {
  const invalid = harness({ [key]: value });
  assert.throws(() => invalid.pre(search));
  assert.ok(invalid.skipped());
}
for (const [key, value] of [['poi_center_lat', '11'], ['poi_center_lng', '107'], ['poi_radius_m', '2000']]) {
  const changed = ready();
  changed.vars.set(key, value);
  assert.throws(() => changed.pre(place), /đã đổi/);
}
for (const body of [{ lat: null, lng: 106 }, { lat: 10, lng: '106' }, { lat: 100, lng: 106 }]) {
  const invalid = ready();
  invalid.pre(place);
  invalid.response(place, body);
  assert.equal(invalid.vars.get('poi_lat'), undefined);
  assert.ok(invalid.failures.length > 0);
}
const outage = ready();
outage.pre(place);
outage.response(place, {}, 423);
assert.equal(outage.vars.get('poi_detail'), undefined);
assert.ok(outage.failures.length > 0);
console.log(`PASS: JSON, 18 requests, POI parameters and ${assertions} Postman assertions tested offline. No network/API-key file access.`);
