import { readFile, readdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const allowed = new Set(['MIT','Apache-2.0','Apache-2.0 AND MIT','MPL-2.0','ISC','BlueOak-1.0.0']);
export function verifyLicense(license, name) {
  if (!allowed.has(license)) throw new Error(`Unreviewed license ${license ?? '(missing)'}: ${name}`);
}
export async function inventory({check = false} = {}) {
  const lock=JSON.parse(await readFile('package-lock.json','utf8'));
  const components=[]; const notices=['# Third-party license and notice texts\n\nGenerated from installed npm distributions. Original files are unmodified.\n'];
  for (const [path,p] of Object.entries(lock.packages)) {
    if (!path) continue;
    const name=path.split('node_modules/').at(-1);
    verifyLicense(p.license,name);
    if (!p.integrity || !p.resolved?.startsWith('https://registry.npmjs.org/')) throw new Error(`Unverified distribution: ${name}`);
    components.push({name,version:p.version,license:p.license,integrity:p.integrity,source:p.resolved,optional:Boolean(p.optional),dev:Boolean(p.dev)});
    let files;
    try {files=await readdir(path);} catch(error) {if(error.code==='ENOENT' && p.optional) continue;throw error;}
    const legal=files.filter(f=>/^(licen[cs]e|copying|notice|thirdpartynotices)(\.|$)/i.test(f)).sort();
    const supplements = {
      '@croct/json5-parser@0.2.2':'docs/vendor-licenses/croct-json5-parser-0.2.2-LICENSE',
      '@swc/counter@0.1.3':'docs/vendor-licenses/swc-counter-0.1.3-LICENSE.txt',
      'franc-min@6.2.0':'docs/vendor-licenses/franc-min-6.2.0-LICENSE'
    };
    if (!legal.length) {
      const supplement = supplements[`${name}@${p.version}`];
      if (!supplement) throw new Error(`No upstream license/notice file in ${path}`);
      const text=await readFile(supplement,'utf8');
      notices.push(`\n## ${name}@${p.version} — supplemental upstream license\n\n${text}\n`);
      components.at(-1).supplementalLicense={path:supplement,sha256:createHash('sha256').update(text).digest('hex')};
    }
    for (const file of legal) {
      const text=await readFile(`${path}/${file}`,'utf8');
      notices.push(`\n## ${name}@${p.version} — ${file}\n\n<pre>\n${text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}\n</pre>\n`);
    }
  }
  components.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  const manifest=JSON.stringify({scope:'All locked npm packages, including optional platform distributions; model weights and browser binaries are not bundled.',components},null,2)+'\n';
  if (check) {
    if(await readFile('docs/dependency-licenses.json','utf8')!==manifest) throw new Error('License inventory is stale; run npm run licenses');
  } else {
    await writeFile('docs/dependency-licenses.json',manifest);
    await writeFile('docs/THIRD_PARTY_NOTICES.md',notices.join(''));
  }
  console.log(`Verified ${components.length} locked third-party packages; no unreviewed license expressions.`);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await inventory({check:process.argv.includes('--check')});
