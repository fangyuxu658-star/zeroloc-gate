// Explicit network/setup step, separate from offline default commands.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, cp, copyFile, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { digest, jsonBytes } from '../src/safe-files.mjs';
const exec=promisify(execFile),output=resolve('artifacts/repair-upstream');
await mkdir(output,{recursive:true});
const workspace=await mkdtemp(join(output,'sources-'));
const apps=[{id:'react',repo:'react-i18next',commit:'2aab7f1d18a27da859ce218a6945415b651b00cc',path:'example/react'},{id:'next',repo:'next-i18next',commit:'7a9995093bb795ee0dac564869d1be95e4c7982d',path:'examples/pages-router-simple'}];
const manifest=[];
for(const app of apps) {
  const clone=join(workspace,app.repo),target=join(output,app.id);
  await exec('git',['-c','core.hooksPath=/dev/null','clone','--no-checkout',`https://github.com/i18next/${app.repo}.git`,clone],{windowsHide:true,timeout:180000});
  await exec('git',['-c','core.hooksPath=/dev/null','-C',clone,'checkout','--detach',app.commit],{windowsHide:true,timeout:180000});
  await mkdir(target);await cp(join(clone,app.path),target,{recursive:true});await copyFile(join(clone,'LICENSE'),join(target,'LICENSE'));
  // Upstream Next example has no standalone lock. Reuse the reviewed, exact independent-acceptance lock.
  if(app.id==='next')await copyFile('docs/verification/independent/next-package-lock.json',join(target,'package-lock.json'));
  const command=process.platform==='win32'?'npm.cmd':'npm';
  // npm.cmd needs the platform command launcher. No application scripts are run.
  const npm=process.platform==='win32'?join(process.env.SystemRoot,'System32','cmd.exe'):command;
  const params=process.platform==='win32'?['/d','/c','npm.cmd ci --ignore-scripts --no-audit --no-fund']:['ci','--ignore-scripts','--no-audit','--no-fund'];
  const installed=await exec(npm,params,{cwd:target,windowsHide:true,timeout:240000,maxBuffer:2097152});
  await writeFile(join(output,`${app.id}-install.private.log`),installed.stdout+installed.stderr);
  manifest.push({...app,license:'MIT',licenseSha256:digest(await readFile(join(target,'LICENSE'))),lockSha256:digest(await readFile(join(target,'package-lock.json')))});
}
await writeFile(join(output,'provenance.json'),jsonBytes(manifest));
console.log('Installed pinned MIT upstream examples. Run test:repair with --react-root artifacts/repair-upstream/react --next-root artifacts/repair-upstream/next');
