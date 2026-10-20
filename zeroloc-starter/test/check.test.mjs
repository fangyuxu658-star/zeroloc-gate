import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenMessages, getPlaceholders, compareCatalogs, checkFiles } from '../src/check.mjs';

test('nested JSON keys are flattened', () => {
  assert.deepEqual(flattenMessages({menu: {start: 'Start'}, exit: 'Exit'}), {'menu.start': 'Start', exit: 'Exit'});
});

test('i18next and simple ICU placeholders are detected', () => {
  assert.deepEqual(getPlaceholders('Hello {{ user }}; {count} more {count}'), ['count', 'user']);
});

test('detects missing, empty, placeholder mismatch and extra keys', () => {
  const issues = compareCatalogs(
    {a: 'Hello {{name}}', b: 'World', c: 'New'},
    {a: 'Hallo {{username}}', b: '   ', d: 'Extra'},
    'de'
  );
  assert.deepEqual(issues.map(x => x.code).sort(),
    ['MISSING_KEY', 'EMPTY_TRANSLATION', 'PLACEHOLDER_MISMATCH', 'EXTRA_KEY'].sort());
});

test('rejects unsupported JSON shapes instead of ignoring them', () => {
  assert.throws(() => flattenMessages({foo: ['a']}), /must be a string/);
  assert.throws(() => flattenMessages({'a.b': 'test'}), /Invalid message key/);
});

test('passes good example catalogs', async () => {
  const result = await checkFiles({
    sourcePath: 'examples/locales/en.json',
    targetPaths: ['examples/locales/de.json', 'examples/locales/fr.json', 'examples/locales/ja.json']
  });
  assert.equal(result.passed, true);
  assert.equal(result.errors, 0);
});

test('strict-extra turns extra-key warning into gate failure', async () => {
  const result = await checkFiles({
    sourcePath: 'examples/locales/en.json',
    targetPaths: ['test/fixtures/extra.json'], strictExtra: true
  });
  assert.equal(result.passed, false);
  assert.equal(result.errors, 0);
  assert.equal(result.warnings, 1);
});
