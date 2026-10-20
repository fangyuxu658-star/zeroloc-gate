import { parse, TYPE } from '@formatjs/icu-messageformat-parser';

/** ICU parsing is delegated to FormatJS. A signature preserves argument roles and tags. */
export function messageSignature(message, format) {
  if (!['plain', 'i18next', 'icu', 'legacy'].includes(format)) throw new Error('Configure message format: plain|i18next|icu');
  if (format === 'plain') return [];
  if (format === 'legacy') {
    if (/\{[^{}]*,\s*(plural|select|selectordinal|number|date|time)\b/.test(message)) {
      throw new Error('ICU syntax requires explicit --message-format icu');
    }
    return [...new Set([...message.matchAll(/\{\{\s*([A-Za-z_$][\w.$-]*)\s*\}\}|\{([A-Za-z_$][\w.$-]*)\}/g)].map(m => m[1] ?? m[2]))].sort();
  }
  if (format === 'i18next') {
    const vars = [];
    const rest = message.replace(/\{\{\s*(-)?\s*([A-Za-z_$][\w.$-]*)\s*\}\}/g, (_, raw, name) => {
      vars.push(`${raw ? 'raw' : 'escaped'}:${name}`); return '';
    });
    if (/[{}]/.test(rest)) throw new Error('Unsupported or mixed i18next interpolation');
    return [...new Set(vars)].sort();
  }
  const signature = new Set();
  function visit(nodes) {
    for (const node of nodes) {
      if ([TYPE.argument, TYPE.number, TYPE.date, TYPE.time].includes(node.type)) signature.add(`${node.type}:${node.value}`);
      if (node.type === TYPE.tag) { signature.add(`tag:${node.value}`); visit(node.children); }
      if ([TYPE.select, TYPE.plural].includes(node.type)) {
        signature.add(`${node.type}:${node.value}:${node.pluralType ?? ''}:${node.offset ?? 0}`);
        // Locale plural categories may legitimately differ; explicit numeric/select branches may not.
        for (const [key, option] of Object.entries(node.options)) {
          if (node.type === TYPE.select || key.startsWith('=')) signature.add(`branch:${node.value}:${key}`);
          visit(option.value);
        }
      }
    }
  }
  visit(parse(message, { requiresOtherClause: true }));
  return [...signature].sort();
}
