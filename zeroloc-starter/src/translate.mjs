import { readFile } from 'node:fs/promises';
import { flattenMessages, compareCatalogs } from './check.mjs';
import { messageSignature } from './formats.mjs';

const pointer = parts => '/' + parts.map(p => p.replaceAll('~', '~0').replaceAll('/', '~1')).join('/');
export async function translateFiles({ sourcePath, targetPath, sourceLocale, targetLocale, messageFormat, provider, dryRun = true, concurrency = 2 }) {
  if (!['plain', 'i18next', 'icu'].includes(messageFormat)) throw new Error('Configure --message-format plain|i18next|icu');
  if (!sourceLocale || !targetLocale) throw new Error('Source and target locales are required');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error('Concurrency must be 1–4');
  const source = flattenMessages(JSON.parse(await readFile(sourcePath, 'utf8')));
  if (!Object.keys(source).length) throw new Error('Source catalog is empty');
  const signatures = new Map(Object.entries(source).map(([key,text]) => [key,messageSignature(text,messageFormat)]));
  const original = JSON.parse(await readFile(targetPath, 'utf8'));
  const target = flattenMessages(original);
  const entries = Object.entries(source).filter(([key]) => !Object.hasOwn(target, key) || !target[key].trim());
  const candidates = new Array(entries.length);
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(concurrency, entries.length)}, async () => {
    while (cursor < entries.length) {
      const index = cursor++, [key, text] = entries[index];
      const signature = signatures.get(key);
      // Markup with attributes/scripts is deliberately unsupported, even in the source.
      const unsafe = value => /[\u0000-\u0008\u000b\u000c\u000e-\u001f]|[\uD800-\uDFFF]/u.test(value) || /<[^>]*[\s=]|<\/?(?:script|iframe|style|object)\b|&(?:#|lt;|gt;)/i.test(value) || /<[^>]*$/.test(value);
      if (unsafe(text)) throw new Error(`Unsupported markup or encoding at ${key}`);
      // dry-run is an offline request preview, never contacts the provider.
      if (dryRun) { candidates[index] = { key, sourceLocale, targetLocale, format: messageFormat, signature }; continue; }
      const value = await provider.translate({text, sourceLocale, targetLocale, format: messageFormat, signature});
      if (typeof value !== 'string' || value.length > 100_000 || unsafe(value)) throw new Error(`Unsafe candidate rejected at ${key}`);
      if (messageFormat !== 'icu' && /[<>]/.test(value)) throw new Error(`Markup candidate rejected at ${key}`);
      if (compareCatalogs({[key]:text}, {[key]:value}, targetLocale, messageFormat).length) throw new Error(`Candidate structure rejected at ${key}`);
      candidates[index] = { key, value };
    }
  }));
  // RFC 6902 root precondition also protects absent keys/parents from overwriting
  // human edits made after this proposal was generated. Never applied here.
  const patch = !dryRun && candidates.length ? [{op:'test',path:'',value:original}] : [];
  const working = structuredClone(original);
  if (!dryRun) for (const { key, value } of candidates) {
    const parts = key.split('.'); let node = working;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (Object.hasOwn(node, part) && (typeof node[part] !== 'object' || node[part] === null)) throw new Error(`Catalog path conflict at ${key}`);
      if (!Object.hasOwn(node, part)) { patch.push({op:'add', path:pointer(parts.slice(0, i+1)), value:{}}); Object.defineProperty(node, part, {value:{}, enumerable:true, configurable:true}); }
      node = node[part];
    }
    const leaf = parts.at(-1);
    if (Object.hasOwn(node, leaf)) patch.push({op:'test', path:pointer(parts), value:node[leaf]});
    patch.push({op:Object.hasOwn(node, leaf) ? 'replace' : 'add', path:pointer(parts), value});
    Object.defineProperty(node, leaf, {value, enumerable:true, configurable:true});
  }
  return { provider:'ollama', target:targetPath, dryRun, applied:false, candidates, patch, requiresHumanReview:true };
}
