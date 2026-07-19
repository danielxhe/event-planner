// Smart Potluck eval scorer.
// Reads every run in the Suggestions Log and scores it: host accept rate,
// gap-targeting rate, dietary coverage, duplicate rate, and (when the host has
// filled in Post Party Actual) brought-rate and dietary errors. Aggregates by
// mode so Phase 1 (manual_stub, the human baseline) and Phase 2 (claude_api)
// are directly comparable.
//
// Usage:  node scripts/eval-suggestions.mjs [--json out.json]
//
// Post Party Actual format (host fills per run, JSON):
//   [{ "itemName": "...", "brought": true, "dietaryOk": true, "note": "..." }]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env.local loader (no dependency).
const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}

const TOKEN = process.env.NOTION_TOKEN;
const DSID = process.env.NOTION_SUGGESTIONS_DSID;
if (!TOKEN || !DSID) {
  console.error('Missing NOTION_TOKEN or NOTION_SUGGESTIONS_DSID (checked env + .env.local)');
  process.exit(1);
}

// Restriction → potluck tag that satisfies it. Halal/Kosher/Other have no tag
// in the schema and are reported as uncheckable.
const RESTRICTION_TO_TAGS = {
  'Vegetarian': ['Vegetarian', 'Vegan'],
  'Vegan': ['Vegan'],
  'Gluten-Free': ['Gluten-Free'],
  'Nut Allergy': ['Nut-Free'],
  'Dairy-Free': ['Dairy-Free', 'Vegan'],
};

async function queryAll() {
  const pages = [];
  let cursor = undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${DSID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    if (!res.ok) throw new Error(`Notion query failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

const text = (p, name) => {
  const prop = p.properties[name];
  if (prop?.type === 'rich_text') return prop.rich_text.map(t => t.plain_text).join('');
  if (prop?.type === 'title') return prop.title.map(t => t.plain_text).join('');
  return '';
};
const parseJson = s => {
  if (!s.trim()) return null;
  try { return JSON.parse(s); } catch { return 'UNPARSEABLE'; }
};

function normalizeName(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function isDuplicate(suggestionName, existingNames) {
  const a = normalizeName(suggestionName);
  return existingNames.some(b => {
    if (!a || !b) return false;
    if (a.includes(b) || b.includes(a)) return true;
    const ta = new Set(a.split(' ')), tb = new Set(b.split(' '));
    const overlap = [...ta].filter(w => w.length > 3 && tb.has(w)).length;
    return overlap >= 2;
  });
}

function scoreRun(page) {
  const run = {
    label: text(page, 'Run Label'),
    mode: page.properties['Mode']?.select?.name ?? 'unknown',
    runAt: page.properties['Run At']?.date?.start ?? null,
    flags: [],
  };
  const inputs = parseJson(text(page, 'Inputs'));
  const suggestions = parseJson(text(page, 'Suggestions'));
  const accepted = parseJson(text(page, 'Host Accepted'));
  const rejected = parseJson(text(page, 'Host Rejected'));
  const actual = parseJson(text(page, 'Post Party Actual'));

  for (const [k, v] of Object.entries({ inputs, suggestions, accepted, rejected, actual })) {
    if (v === 'UNPARSEABLE') run.flags.push(`${k}: truncated/unparseable JSON`);
  }
  if (!Array.isArray(suggestions)) {
    run.flags.push('no suggestions array; skipping scores');
    return run;
  }
  run.nSuggestions = suggestions.length;

  // Accept rate — only when the host actually reviewed (Phase 2 or a logged verdict).
  if (Array.isArray(accepted) || Array.isArray(rejected)) {
    const nAcc = Array.isArray(accepted) ? accepted.length : 0;
    const nRej = Array.isArray(rejected) ? rejected.length : 0;
    run.acceptRate = nAcc + nRej > 0 ? nAcc / (nAcc + nRej) : null;
  }

  // Context-dependent scores need the new SuggestionContext shape.
  const isContext = inputs && typeof inputs === 'object' && Array.isArray(inputs.categories);
  if (isContext) {
    const gapByCategory = Object.fromEntries(inputs.categories.map(c => [c.name, c.gap]));
    const anyGap = inputs.categories.some(c => c.gap > 0);
    if (anyGap) {
      const onGap = suggestions.filter(s => (gapByCategory[s.category] ?? 0) > 0).length;
      run.gapTargetingRate = onGap / suggestions.length;
    }

    const existingNames = inputs.categories.flatMap(c => c.items.map(i => normalizeName(i.name)));
    const dups = suggestions.filter(s => isDuplicate(s.itemName, existingNames)).length;
    run.duplicateRate = dups / suggestions.length;

    const counts = inputs.dietary?.counts ?? {};
    const checkable = Object.keys(counts).filter(r => counts[r] > 0 && RESTRICTION_TO_TAGS[r]);
    const uncheckable = Object.keys(counts).filter(r => counts[r] > 0 && !RESTRICTION_TO_TAGS[r]);
    if (uncheckable.length) run.flags.push(`uncheckable restrictions: ${uncheckable.join(', ')}`);
    if (checkable.length) {
      const covered = checkable.filter(r =>
        suggestions.some(s => (s.dietaryTags ?? []).some(t => RESTRICTION_TO_TAGS[r].includes(t)))
      );
      run.dietaryCoverage = covered.length / checkable.length;
      run.dietaryUncovered = checkable.filter(r => !covered.includes(r));
    }
  } else {
    run.flags.push('legacy inputs shape; gap/dup/dietary scores unavailable');
  }

  // Ground truth, when the host has audited post-party.
  if (Array.isArray(actual)) {
    const byName = new Map(actual.map(a => [normalizeName(a.itemName ?? ''), a]));
    const acc = Array.isArray(accepted) ? accepted : suggestions;
    const matched = acc.map(s => byName.get(normalizeName(s.itemName ?? ''))).filter(Boolean);
    if (matched.length) {
      run.broughtRate = matched.filter(a => a.brought).length / matched.length;
      run.dietaryErrors = matched.filter(a => a.dietaryOk === false).length;
    }
  }

  return run;
}

function fmt(x) {
  return x == null ? '—' : typeof x === 'number' ? (x * 100).toFixed(0) + '%' : String(x);
}

const pages = await queryAll();
const runs = pages.map(scoreRun).sort((a, b) => (a.runAt ?? '').localeCompare(b.runAt ?? ''));

console.log(`\nSmart Potluck eval — ${runs.length} runs\n`);
for (const r of runs) {
  console.log(`• [${r.mode}] ${r.label}  (${r.runAt ?? 'no date'})`);
  console.log(
    `    n=${r.nSuggestions ?? '—'}  accept=${fmt(r.acceptRate)}  gapTarget=${fmt(r.gapTargetingRate)}  dupes=${fmt(r.duplicateRate)}  dietCoverage=${fmt(r.dietaryCoverage)}  brought=${fmt(r.broughtRate)}  dietErrors=${r.dietaryErrors ?? '—'}`
  );
  if (r.dietaryUncovered?.length) console.log(`    uncovered: ${r.dietaryUncovered.join(', ')}`);
  for (const f of r.flags) console.log(`    ⚠ ${f}`);
}

// Aggregate by mode: the Phase 1 vs Phase 2 comparison.
const byMode = {};
for (const r of runs) (byMode[r.mode] ??= []).push(r);
console.log('\nAggregate by mode');
for (const [mode, rs] of Object.entries(byMode)) {
  const avg = key => {
    const vals = rs.map(r => r[key]).filter(v => typeof v === 'number');
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  console.log(
    `  ${mode} (${rs.length} runs): accept=${fmt(avg('acceptRate'))}  gapTarget=${fmt(avg('gapTargetingRate'))}  dupes=${fmt(avg('duplicateRate'))}  dietCoverage=${fmt(avg('dietaryCoverage'))}  brought=${fmt(avg('broughtRate'))}`
  );
}

const jsonFlag = process.argv.indexOf('--json');
if (jsonFlag !== -1 && process.argv[jsonFlag + 1]) {
  writeFileSync(process.argv[jsonFlag + 1], JSON.stringify({ runs, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`\nWrote ${process.argv[jsonFlag + 1]}`);
}
