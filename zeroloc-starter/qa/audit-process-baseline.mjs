// Historical baseline only: run against 194a1dc, before ownership remediation.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {stopRepairProcess} from '../src/repair-engine.mjs';
const dir=await mkdtemp(join(tmpdir(),'zeroloc-audit-process-')),file=join(dir,'pid');
const child=spawn(process.execPath,['-e',`const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});require('node:fs').writeFileSync(${JSON.stringify(file)},String(c.pid));c.unref();`],{stdio:'ignore',detached:true});
await once(child,'close');const pid=Number(await readFile(file,'utf8'));
const stat=async p=>{const t=await readFile('/proc/'+p+'/stat','utf8');const a=t.slice(t.lastIndexOf(')')+2).split(' ');return {state:a[0],group:Number(a[2]),session:Number(a[3]),start:a[19]};};
const identity=await stat(pid);let record;
try {
  await stopRepairProcess(child);
  const after=await stat(pid).catch(()=>null);
  record={finding:'P2-03',node:process.version,platform:process.platform,parentExit:child.exitCode,descendantSurvived:Boolean(after&&!['Z','X'].includes(after.state)),identity};
}finally{
  const current=await stat(pid).catch(()=>null);
  if(current&&current.start===identity.start&&current.group===child.pid&&current.session===child.pid)process.kill(pid,'SIGKILL');
}
await mkdir(resolve('artifacts/audit-remediation/before'),{recursive:true});await writeFile(resolve('artifacts/audit-remediation/before/process-'+process.version+'.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
