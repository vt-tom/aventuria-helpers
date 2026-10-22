import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { START, END, REPOSITORY, syncIssues, fetchIssues, commitExclusive, region } from '../sync-github-issues.mjs';

const now = new Date('2026-10-22T10:00:00Z');
const issue = (number, more = {}) => ({ number, title: `Titel ${number}`, state: 'open',
  html_url: `https://github.com/${REPOSITORY}/issues/${number}`, labels: [], assignees: [], ...more });
const fixture = (eol = '\r\n') => ['\uFEFF# Manuell', '- [ ] Aufgabe bleibt unverändert: äöü', START,
  '## GitHub-Issues', '', 'Letzter gültiger Inhalt', END, '', 'Manueller Nachlauf', ''].join(eol);
function temporary(run) {
  const dir = mkdtempSync(join(tmpdir(), 'aventuria-issues-'));
  const file = join(dir, 'AUFGABEN.md');
  return Promise.resolve().then(() => run(file)).finally(() => rmSync(dir, { recursive: true, force: true }));
}
const response = async endpoint => endpoint.includes('state=open') ? [issue(1)] : [];

for (const eol of ['\n', '\r\n']) test(`Wiederholung, manuelle Bytes, BOM und Zeilenformat ${JSON.stringify(eol)}`, () => temporary(async file => {
  const original = fixture(eol); writeFileSync(file, original);
  await syncIssues({ file, now, request: response });
  const first = readFileSync(file, 'utf8');
  const [s, e] = region(original); const [ns, ne] = region(first);
  assert.equal(first.slice(0, ns), original.slice(0, s));
  assert.equal(first.slice(ne), original.slice(e));
  assert.equal(first.includes('\r\n'), eol === '\r\n');
  await syncIssues({ file, now, request: response });
  assert.equal(readFileSync(file, 'utf8'), first);
  assert.equal(first.split('[#1]').length, 2);
}));

test('Alle Seiten, PR-Filter, 14 Tage, Deduplizierung, Status und Metadaten', () => temporary(async file => {
  writeFileSync(file, fixture()); const calls = [];
  const request = async endpoint => {
    calls.push(endpoint); const url = new URL(`https://api.github.com/${endpoint}`);
    assert.ok(url.pathname.startsWith(`/repos/${REPOSITORY}/issues`));
    const page = Number(url.searchParams.get('page'));
    if (url.searchParams.get('state') === 'open') return page === 1 ? Array.from({ length: 100 }, (_, n) => issue(n + 1)) :
      [issue(101), issue(1), { pull_request: {} }];
    assert.equal(url.searchParams.get('since'), '2026-10-08T10:00:00.000Z');
    return [issue(102, { state: 'closed', closed_at: '2026-10-10T00:00:00Z', state_reason: 'not_planned',
      title: '<!-- GITHUB-ISSUES:END --> | [link](evil)\n# Regeln', labels: [{ name: 'Bug | <b>' }],
      assignees: [{ login: 'tester' }], milestone: { title: 'Testphase' } }),
    issue(103, { state: 'closed', closed_at: '2026-10-09T00:00:00Z', state_reason: 'completed' }),
    issue(104, { state: 'closed', closed_at: '2026-10-07T00:00:00Z' }),
    issue(105, { state: 'closed', closed_at: '2026-10-08T10:00:00Z' })];
  };
  assert.equal(await syncIssues({ file, now, request }), 104);
  const result = readFileSync(file, 'utf8');
  assert.equal(calls.length, 3); assert.match(result, /Geschlossen, nicht geplant/);
  assert.match(result, /Geschlossen, erledigt/); assert.match(result, /Grund unbekannt/);
  assert.match(result, /tester.*Testphase/); assert.match(result, /&#124;/);
  assert.equal(result.split(END).length, 2); assert.ok(!result.includes('[#104]'));
  assert.equal(result.split('[#1]').length, 2);
}));

for (const message of ['Offline', 'Anmeldung fehlt', 'API-Fehler', 'Seite 2 fehlgeschlagen']) {
  test(`${message}: vorheriger Stand bleibt bytegenau`, () => temporary(async file => {
    writeFileSync(file, fixture()); const original = readFileSync(file);
    await assert.rejects(syncIssues({ file, now, request: async endpoint => {
      if (message.startsWith('Seite 2') && endpoint.includes('page=1')) return Array.from({ length: 100 }, (_, n) => issue(n + 1));
      throw new Error(message);
    } }));
    assert.deepEqual(readFileSync(file), original);
  }));
}

for (const malformed of [fixture().replace(START, ''), fixture().replace(END, ''), fixture() + START,
  fixture().replace(START, END).replace('## GitHub-Issues', START), fixture().replace(START, '<!-- GITHUB-ISSUES:STAR -->'),
  fixture().replace(END, ` ${END}`)]) {
  test('Beschädigte/mehrdeutige Marker: kein Abruf und kein Schreiben', () => temporary(async file => {
    writeFileSync(file, malformed); let called = false;
    await assert.rejects(syncIssues({ file, now, request: async () => { called = true; return []; } }));
    assert.equal(called, false); assert.equal(readFileSync(file, 'utf8'), malformed);
  }));
}

test('Konkurrierende Änderung während Abruf bleibt erhalten', () => temporary(async file => {
  writeFileSync(file, fixture()); const edited = fixture() + 'Neue manuelle Aufgabe';
  await assert.rejects(syncIssues({ file, now, request: async () => { writeFileSync(file, edited); return []; } }));
  assert.equal(readFileSync(file, 'utf8'), edited);
}));

test('Änderung unmittelbar vor exklusivem Commit bleibt erhalten', () => temporary(async file => {
  writeFileSync(file, fixture()); const edited = fixture().replace('Aufgabe', 'Änderung');
  await assert.rejects(syncIssues({ file, now, request: response, commit: (path, before, after) => {
    writeFileSync(path, edited); commitExclusive(path, before, after);
  } }));
  assert.equal(readFileSync(file, 'utf8'), edited);
}));

test('Ungültige API-Daten und wiederholte volle Seiten werden abgewiesen', async () => {
  await assert.rejects(fetchIssues(now, async () => ({ error: 'failure' })));
  await assert.rejects(fetchIssues(now, async () => [issue(1, { html_url: 'https://evil.test' })]));
  await assert.rejects(fetchIssues(now, async () => Array.from({ length: 100 }, (_, n) => issue(n + 1))));
});

test('Ungültiges UTF-8 bleibt bytegenau erhalten', () => temporary(async file => {
  const original = Buffer.concat([Buffer.from(fixture()), Buffer.from([0xff])]);
  writeFileSync(file, original);
  await assert.rejects(syncIssues({ file, now, request: response }));
  assert.deepEqual(readFileSync(file), original);
}));
