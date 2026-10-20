import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectProject, extractProject } from '../src/adapters/i18next.mjs';

test('real pinned i18next extraction returns catalog and diff without writing', async () => {
  const path = 'examples/i18next/locales/en/translation.json';
  const before = await readFile(path, 'utf8');
  const report = await extractProject({root: 'examples/i18next'});
  assert.equal(report.applied, false);
  assert.equal(report.files[0].catalog['menu.save'], 'Save');
  assert.equal(report.files[0].catalog.human, 'Keep this human translation');
  assert.equal(report.files[0].changed, true);
  assert.equal(await readFile(path, 'utf8'), before);
});
test('unknown, ambiguous and Paraglide projects fail explicitly', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zeroloc-extract-'));
  try {
    assert.equal(await detectProject(root), 'unknown');
    await assert.rejects(extractProject({root}), /No i18next/);
    await mkdir(join(root, 'project.inlang'));
    await writeFile(join(root, 'project.inlang/settings.json'), '{}');
    await assert.rejects(extractProject({root}), /not supported/);
    await writeFile(join(root, 'package.json'), '{"dependencies":{"i18next":"26.5.0"}}');
    await assert.rejects(extractProject({root}), /Ambiguous/);
  } finally { await rm(root, {recursive: true}); }
});
test('invalid source produces a failure, never a partial successful extraction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zeroloc-broken-'));
  try {
    await writeFile(join(root, 'package.json'), '{"dependencies":{"i18next":"26.5.0"}}');
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/broken.js'), 'const = ;');
    await assert.rejects(extractProject({root}), /extraction failed/);
  } finally { await rm(root, {recursive: true}); }
});
