import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { flattenMessages } from '../check.mjs';
import { I18NEXT_VERSION } from './i18next.mjs';

const { root, locales } = JSON.parse(process.argv[2]);
const pkg = JSON.parse(await readFile(new URL('../../node_modules/i18next-cli/package.json', import.meta.url), 'utf8'));
if (pkg.version !== I18NEXT_VERSION || pkg.license !== 'MIT') throw new Error('Unverified i18next-cli version/license');
const { runExtractor } = await import('i18next-cli');
const result = await runExtractor({ locales, extract: {
  input: [resolve(root, 'src/**/*.{js,jsx,ts,tsx}').replaceAll('\\', '/')],
  output: resolve(root, 'locales/{{language}}/{{namespace}}.json').replaceAll('\\', '/'),
  removeUnusedKeys: false, outputFormat: 'json'
} }, { isDryRun: true, quiet: true, logger: { info() {}, warn() {}, error() {} } });
if (result.hasErrors) throw new Error('Source parse errors; refusing partial extraction');
const files = result.results.map(r => ({
  path: r.path, locale: r.locale, namespace: r.namespace,
  catalog: flattenMessages(r.newTranslations),
  before: r.existingTranslations, after: r.newTranslations, changed: r.updated
}));
process.stdout.write(JSON.stringify({ adapter: 'i18next', version: I18NEXT_VERSION, files }));
