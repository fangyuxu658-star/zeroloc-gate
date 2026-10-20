// Explicit pre-publication inventory, not a product command or secret-scanner replacement.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, basename, dirname, sep } from 'node:path';

const root=resolve(execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim());
const output=resolve(root,'zeroloc-starter/artifacts/release-v0.1.0-beta.1');
const tree=resolve(output,'public-tree');
await mkdir(tree,{recursive:true});
const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean))].sort();
const findings=[],reviewedFixtures=[],manifest=[];
const checks=[
  ['LOCAL_USER_PATH',/(?:[a-z]:[\\/](?:Users|Documents and Settings)[\\/](?!Public(?:[\\/]|\b))[^\s"<>]+|\/(?:Users|home)\/(?!example\b)[a-z0-9_.-]+\/(?!example))/ig],
  ['PRIVATE_KEY',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['TOKEN_URL',/https?:\/\/[^:\s/"'<>]+:[^@\s/"'<>]+@/g]
];
const identifiers=[process.env.COMPUTERNAME,process.env.USERPROFILE?basename(process.env.USERPROFILE):undefined].filter(v=>v&&v.length>=4);
if(identifiers.length) checks.push(['PERSONAL_MACHINE_ID',new RegExp('\\b(?:'+identifiers.map(v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\b','ig')]);
for(const file of files){
  const absolute=resolve(root,file);
  if(!absolute.startsWith(root+sep) || /(?:^|\/)(?:\.git|node_modules|artifacts|\.local-tools|\.local-models)(?:\/|$)/.test(file)) throw new Error(`Excluded path reached publish set: ${file}`);
  const stat=await lstat(absolute);
  if(!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Non-regular publication file: ${file}`);
  if(stat.size>5*1024*1024) throw new Error(`Unexpected large publication file: ${file}`);
  const bytes=await readFile(absolute),text=bytes.toString('utf8');
  for(const [code,pattern] of checks){
    pattern.lastIndex=0;
    for(const match of text.matchAll(pattern)) {
      const finding={file,code,line:text.slice(0,match.index).split('\n').length};
      const fakeUrl='http://'+['user','secret'].join(':')+'@';
      if(code==='TOKEN_URL' && file==='zeroloc-starter/test/translate.test.mjs' && match[0]===fakeUrl && text.slice(match.index+match[0].length).startsWith('localhost')) {
        reviewedFixtures.push({...finding,reason:'Synthetic invalid loopback credential URL used only by an endpoint-rejection test; no live credential.'});
      } else findings.push(finding);
    }
  }
  manifest.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  const target=resolve(tree,file);
  await mkdir(dirname(target),{recursive:true});
  await copyFile(absolute,target);
}
const history=execFileSync('git',['rev-list','--all'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const summary={target:'v0.1.0-beta.1',fileCount:manifest.length,totalBytes:manifest.reduce((sum,f)=>sum+f.bytes,0),reachableCommits:history.length,privacyFindings:findings,reviewedFixtures,limitations:'Exact Git candidate files; heuristic privacy/path checks plus separate Gitleaks scan. Not an absolute guarantee against every undiscovered secret. Git identity/config and ignored local files are not exported.'};
await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(resolve(output,'privacy-audit.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
if(findings.length) process.exitCode=1;
