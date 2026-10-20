import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { messageSignature } from './formats.mjs';

/** Supports nested JSON dictionaries with leaf string values. */
export function flattenMessages(node, prefix = '') {
  if (node === null || Array.isArray(node) || typeof node !== 'object') {
    throw new TypeError(`Expected a JSON object at ${prefix || '(root)'}`);
  }
  const result = {};
  for (const [key, value] of Object.entries(node)) {
    if (!key || key.includes('.') || ['__proto__', 'constructor', 'prototype'].includes(key)) {
      throw new TypeError(`Invalid message key at ${prefix || '(root)'}: ${JSON.stringify(key)} (empty, dotted and prototype-related keys not supported)`);
    }
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[path] = value;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenMessages(value, path));
    } else {
      throw new TypeError(`Message at ${path} must be a string or nested object`);
    }
  }
  return result;
}

/** i18next {{variable}} or plain {variable}; NOT a full ICU parser. */
export function getPlaceholders(message) {
  const found = new Set();
  for (const match of message.matchAll(/\{\{\s*([A-Za-z_$][\w.$-]*)\s*\}\}|\{([A-Za-z_$][\w.$-]*)\}/g)) {
    found.add(match[1] ?? match[2]);
  }
  return [...found].sort();
}

export function compareCatalogs(source, target, locale, format = 'legacy') {
  const problems = [];
  const sourceKeys = Object.keys(source).sort();
  const targetKeys = Object.keys(target).sort();
  const sourceSet = new Set(sourceKeys);
  const targetSet = new Set(targetKeys);

  for (const key of sourceKeys) {
    if (!targetSet.has(key)) {
      problems.push({ level: 'error', code: 'MISSING_KEY', locale, key, message: 'Translation key is missing' });
      continue;
    }
    if (target[key].trim() === '') {
      problems.push({ level: 'error', code: 'EMPTY_TRANSLATION', locale, key, message: 'Translation is empty' });
    }
    let sourceVars, targetVars;
    try { sourceVars = messageSignature(source[key], format); }
    catch (error) { problems.push({ level: 'error', code: 'INVALID_SOURCE_FORMAT', locale, key, message: error.message }); continue; }
    try { targetVars = messageSignature(target[key], format); }
    catch (error) { problems.push({ level: 'error', code: 'INVALID_TARGET_FORMAT', locale, key, message: error.message }); continue; }
    if (sourceVars.join('|') !== targetVars.join('|')) {
      problems.push({
        level: 'error', code: 'PLACEHOLDER_MISMATCH', locale, key,
        message: `Expected [${sourceVars.join(', ')}], got [${targetVars.join(', ')}]`
      });
    }
  }
  for (const key of targetKeys) {
    if (!sourceSet.has(key)) {
      problems.push({ level: 'warning', code: 'EXTRA_KEY', locale, key, message: 'Key is absent from source catalog' });
    }
  }
  return problems;
}

export async function loadCatalog(file) {
  const raw = await readFile(resolve(file), 'utf8');
  return flattenMessages(JSON.parse(raw));
}

export async function checkFiles({ sourcePath, targetPaths, strictExtra = false, messageFormat = 'legacy' }) {
  messageSignature('', messageFormat);
  if (!Array.isArray(targetPaths) || targetPaths.length === 0) throw new Error('At least one target catalog is required');
  const source = await loadCatalog(sourcePath);
  if (Object.keys(source).length === 0) throw new Error('Source catalog is empty');
  const issues = [];
  for (const path of targetPaths) {
    const target = await loadCatalog(path);
    issues.push(...compareCatalogs(source, target, path, messageFormat));
  }
  const errors = issues.filter(x => x.level === 'error').length;
  const warnings = issues.filter(x => x.level === 'warning').length;
  return {
    tool: 'ZeroLoc Gate', version: '0.1.0-beta.1', source: sourcePath, sourceKeys: Object.keys(source).length,
    targetCount: targetPaths.length, issues, errors, warnings, passed: errors === 0 && (!strictExtra || warnings === 0),
    messageFormat, limitations: 'Structural checks only; not translation meaning, rendered HTML safety, UI layout, or cultural appropriateness. Legacy mode only supports simple placeholders. Configure ICU/i18next explicitly.'
  };
}
