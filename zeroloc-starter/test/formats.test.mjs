import test from 'node:test';
import assert from 'node:assert/strict';
import { messageSignature } from '../src/formats.mjs';
import { compareCatalogs, flattenMessages } from '../src/check.mjs';

test('ICU nested plural/select, quoting, tags and locale plural categories', () => {
  const a = "'{literal}' <b>{n, plural, one {{gender, select, male {His {name}} other {Their {name}}}} other {# {name}}}</b>";
  assert.ok(messageSignature(a, 'icu').includes('tag:b'));
  assert.deepEqual(compareCatalogs({a}, {a}, 'de', 'icu'), []);
  assert.equal(compareCatalogs({a: '{n, plural, one {one} other {many}}'}, {a: '{n, plural, few {few} other {many}}'}, 'pl', 'icu').length, 0);
});
test('ICU rejects missing other, broken syntax, mixed placeholders and tags', () => {
  for (const value of ['{n, plural, one {one}}', '{bad', '{{name}}', '<b>oops</i>']) {
    assert.throws(() => messageSignature(value, 'icu'));
    assert.equal(compareCatalogs({a: 'ok'}, {a: value}, 'x', 'icu')[0].code, 'INVALID_TARGET_FORMAT');
  }
});
test('ICU detects missing variables, changed argument roles and missing tags', () => {
  for (const [a, b] of [['{name}', 'hello'], ['{n, number}', '{n}'], ['<b>{name}</b>', '{name}']]) {
    assert.equal(compareCatalogs({a}, {a: b}, 'x', 'icu')[0].code, 'PLACEHOLDER_MISMATCH');
  }
});
test('explicit syntax, nested catalogs, empty values and invalid source', () => {
  assert.throws(() => messageSignature('{n, select, other {ok}}', 'legacy'), /explicit/);
  assert.throws(() => messageSignature('{{name}} {other}', 'i18next'), /mixed/);
  assert.throws(() => messageSignature('', 'unknown'), /Configure/);
  assert.deepEqual(messageSignature('{literal}', 'plain'), []);
  assert.equal(compareCatalogs(flattenMessages({menu:{a:'{{name}}'}}), {'menu.a': ''}, 'de', 'i18next')[0].code, 'EMPTY_TRANSLATION');
  assert.equal(compareCatalogs({a:'{broken'}, {a:'ok'}, 'de', 'icu')[0].code, 'INVALID_SOURCE_FORMAT');
  assert.notDeepEqual(messageSignature('{{- name}}', 'i18next'), messageSignature('{{name}}', 'i18next'));
});
