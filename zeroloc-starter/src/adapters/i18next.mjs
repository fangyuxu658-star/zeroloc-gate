import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

export const I18NEXT_VERSION = '1.77.0';
export async function detectProject(root) {
  let pkg = {};
  try { pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  let inlang = false;
  try { await access(resolve(root, 'project.inlang/settings.json')); inlang = true; } catch {}
  const i18next = Boolean(deps.i18next || deps['react-i18next']);
  const paraglide = inlang || Boolean(deps['@inlang/paraglide-js']);
  if (i18next && paraglide) throw new Error('Ambiguous project: configure separate i18next and Paraglide project roots');
  if (paraglide) return 'paraglide';
  return i18next ? 'i18next' : 'unknown';
}

export async function extractProject({ root = '.', locales = ['en'], dryRun = true }) {
  const ecosystem = await detectProject(root);
  if (ecosystem === 'paraglide') throw new Error('Paraglide/inlang detected; extraction is not supported yet. Use its independent toolchain.');
  if (ecosystem !== 'i18next') throw new Error('No i18next project detected in package.json');
  if (!locales.length || locales.some(l => !/^[A-Za-z][A-Za-z0-9-]*$/.test(l))) throw new Error('Invalid locales');
  const { stdout } = await promisify(execFile)(process.execPath, [fileURLToPath(new URL('./i18next-worker.mjs', import.meta.url)), JSON.stringify({ root: resolve(root), locales })], {
    cwd: resolve(root), timeout: 60_000, maxBuffer: 8 * 1024 * 1024,
    // No customer scripts, config modules, plugins, account credentials, or shell execution.
    env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, TEMP: process.env.TEMP, TMP: process.env.TMP, NO_COLOR: '1' }
  }).catch(() => { throw new Error('i18next extraction failed (check source syntax and optional i18next-cli installation)'); });
  return { ...JSON.parse(stdout), dryRun, applied: false };
}
