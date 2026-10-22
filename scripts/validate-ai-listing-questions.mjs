// Read-only validation/export of needs-based room consultation scenarios.
// This validates test documents, not the AI's actual recommendation quality.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
assert.ok(args.every(arg => arg === '--json') && args.length <= 1,
  'Usage: node scripts/validate-ai-listing-questions.mjs [--json]');

const [markdown, renterCopy, seedSql, seedJson] = await Promise.all([
  readFile(path.join(root, 'prompts/ask/AI_LISTING_TOOL_TEST_QUESTIONS.md'), 'utf8'),
  readFile(path.join(root, 'prompts/ask/AI_RENTER_QUESTIONS.md'), 'utf8'),
  readFile(path.join(root, 'postgres/seed/listings_seed_hcm.sql')),
  readFile(path.join(root, 'postgres/seed/homespace_seed_300_duong_govap.json')),
]);
for (const [label, buffer] of [['sql', seedSql], ['json', seedJson]]) {
  const marker = markdown.match(new RegExp('<!-- seed-' + label + '-sha256: ([a-f0-9]{64}) -->'));
  assert.ok(marker, 'Missing seed ' + label + ' hash marker');
  assert.equal(createHash('sha256').update(buffer).digest('hex'), marker[1],
    'Seed ' + label + ' changed: review consultation constraints and evidence before updating the documented hash');
}

const rows = JSON.parse(seedJson.toString('utf8'));
assert.equal(rows.length, 300, 'The question set targets the current 300-address seed');
assert.equal(new Set(rows.map(row => row.id)).size, 300, 'Source address IDs must remain unique');
assert.deepEqual([...new Set(rows.map(row => row.ward))].sort(),
  ['Phường An Nhơn', 'Phường Gò Vấp', 'Phường Hạnh Thông'].sort());
assert.ok(rows.every(row => String(row.cityId) === '12'), 'Unexpected source city');

const headings = [...markdown.matchAll(/^### L(\d{3}) — (.+)$/gm)];
assert.equal(headings.length, 100, 'Expected 100 scored scenarios');
const seenPrompts = new Set();
const producedStages = new Set();
const cases = headings.map((heading, index) => {
  const number = Number(heading[1]);
  assert.equal(number, index + 1, 'Scenarios must be ordered L001..L100');
  const end = headings[index + 1]?.index ?? markdown.indexOf('\n## Cách chấm và lưu', heading.index);
  assert.ok(end > heading.index, 'Case boundary missing');
  const section = markdown.slice(heading.index + heading[0].length, end);
  const prompts = [...section.matchAll(/^- Câu hỏi: `([^`\r\n]+)`\s*$/gm)];
  assert.equal(prompts.length, 1, 'Each case needs one customer message');
  const prompt = prompts[0][1];
  const expected = section.match(/^- Kỳ vọng: (.+)$/m)?.[1]?.trim();
  assert.ok(expected, 'Missing grading expectation');
  assert.ok(!seenPrompts.has(prompt), 'Duplicate customer prompt');
  seenPrompts.add(prompt);

  // Customers start with needs, not fixture links, UUIDs or developer commands.
  assert.ok(!/https?:\/\/|\/rent\/|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}|\b(?:NULL|UUID|field|SELECT|listingContext|user_addresses|ref_id|ward_id|city_id)\b/i.test(prompt),
    'Remove implementation details or preselected listings from customer prompts');
  assert.ok(!/^- Chuẩn bị chat:/m.test(section), 'No preselected-listing setup in consultation scenarios');

  const isMemory = number > 60;
  assert.equal(/^M\d{2}:/.test(heading[2]), isMemory, 'Only the continuous journey uses M01..M40');
  if (isMemory) assert.ok(heading[2].startsWith('M' + String(number - 60).padStart(2, '0') + ':'));

  const requiresStages = (section.match(/^- Ngữ cảnh cần có: (.+)$/m)?.[1] ?? '')
    .split(',').map(value => value.trim()).filter(Boolean);
  const captureStage = section.match(/^- Ghi nhận: (\w+)$/m)?.[1] ?? null;
  if (!isMemory) assert.ok(requiresStages.length === 0 && captureStage === null, 'Standalone cases start without a chosen room');
  for (const stage of requiresStages) assert.ok(producedStages.has(stage), 'Dependency must precede its use: ' + stage);
  if (captureStage) {
    assert.ok(!producedStages.has(captureStage), 'Duplicate capture stage');
    producedStages.add(captureStage);
  }
  return {
    caseId: 'L' + heading[1],
    title: heading[2],
    goal: 'advise_and_select_suitable_room',
    conversationGroup: isMemory ? 'linh-room-journey-40' : 'independent-L' + heading[1],
    turn: isMemory ? number - 60 : 1,
    requiresStages,
    captureStage,
    prompt,
    expected,
  };
});
assert.equal(cases.filter(item => item.conversationGroup === 'linh-room-journey-40').length, 40);
assert.equal(new Set(cases.map(item => item.conversationGroup)).size, 61);
assert.deepEqual([...producedStages], ['S1', 'S2', 'S3', 'R', 'A', 'S4', 'S5', 'S6']);

const copyQuestions = [...renterCopy.matchAll(/^- Hỏi: `([^`\r\n]+)`\s*$/gm)].map(match => match[1]);
const copyIds = [...renterCopy.matchAll(/^### (?:Câu (\d{3})|Lượt \d{2} · L(\d{3}))\s*$/gm)]
  .map(match => 'L' + (match[1] ?? match[2]));
assert.deepEqual(copyIds, cases.map(item => item.caseId), 'Copy-only sheet has different case IDs/order');
assert.deepEqual(copyQuestions, cases.map(item => item.prompt), 'Customer wording differs between the two files');
assert.ok(!/^- Kỳ vọng:|^- Gửi trước:|^- Ngữ cảnh cần có:|^- Ghi nhận:/m.test(renterCopy),
  'Keep grader evidence and setup out of the copy-only sheet');

if (args.includes('--json')) {
  process.stdout.write(JSON.stringify({
    schemaVersion: 3,
    mode: 'needs_based_room_consultation',
    total: cases.length,
    defaultMaxResults: 20,
    source: 'prompts/ask/AI_LISTING_TOOL_TEST_QUESTIONS.md',
    instructions: 'New chat for each independent case. Keep all 40 Linh turns sequentially in one conversationId. Send only prompt, never expected/ledger/fake history. Record actual ordered listing IDs and recommendation aliases in an external ledger at captureStage. If a requiresStages dependency was not created, mark that dependent case BLOCKED rather than fabricate a selection. Clarification is correct when important needs are genuinely missing. No preselected listings, setup messages or paid calls are performed by this exporter.',
    cases,
  }, null, 2) + '\n');
} else {
  console.log('PASS (documents only): 60 independent needs-based scenarios + one consistent 40-turn renter journey; customer wording, grading expectations, context dependencies and seed hashes validated.');
  console.log('No preselected-listing setup, network/model calls or database writes. AI consultation quality has NOT been tested by this check.');
}
