import { spawn, execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const owned=new WeakMap(),operations=new WeakMap();
/** Linux retains an owning subreaper even after the adapter parent exits. */
export function spawnRepairProcess(executable,args,options={}) {
  if(process.platform==='win32'){const child=spawn(executable,args,options);owned.set(child,{kind:'windows',cleaned:false});return child;}
  if(process.platform!=='linux')throw new Error('Repair process ownership requires Linux or Windows');
  const token=randomUUID();
  const child=spawn('python3',[fileURLToPath(new URL('./process-supervisor.py',import.meta.url)),token,executable,JSON.stringify(args)],{...options,detached:true,stdio:['pipe','pipe','pipe','pipe']});
  const record={kind:'linux',token,cleaned:false,ready:false,error:null};owned.set(child,record);
  let buffer='';
  child.stdio[3].on('data',chunk=>{buffer+=chunk;const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){let value;try{value=JSON.parse(line);}catch{continue;}if(value.token!==token)continue;
    if(value.type==='ready')record.ready=true;
    if(value.type==='cleaned')record.cleaned=true;
    if(['failed','cleanup-failed'].includes(value.type)){record.error=value;child.emit('ownershipFailure',value);}
    if(value.type==='worker-exit')child.emit('workerExit',value.code);
  }});
  // A launch error is handled by the caller; stdin failure must not crash Node.
  child.stdin.on('error',()=>{});
  return child;
}

export function stopRepairProcess(child) {
  if(operations.has(child))return operations.get(child);
  const record=owned.get(child);
  const failure=()=>Object.assign(new Error('Owned process cleanup could not be verified'),{code:'PROCESS_CLEANUP_FAILED',pid:child.pid});
  if(record?.cleaned)return Promise.resolve();
  if(!record||!child.pid||child.exitCode!==null||child.signalCode!==null)return Promise.reject(failure());
  const operation=new Promise((resolve,reject)=>{
    let timer;
    const finish=()=>{clearTimeout(timer);child.removeListener('close',closed);child.removeListener('ownershipFailure',failed);};
    const failed=()=>{finish();reject(failure());};
    const closed=()=>{finish();if(record.kind==='linux'&&!record.cleaned)reject(failure());else{record.cleaned=true;resolve();}};
    child.once('close',closed);child.once('ownershipFailure',failed);
    timer=setTimeout(failed,7000);
    if(record.kind==='linux'){child.stdin.end(record.token+'\n');if(child.exitCode!==null||child.signalCode!==null)closed();}
    else if(process.platform==='win32')execFile(join(process.env.SystemRoot??'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true},error=>{if(error&&child.exitCode===null&&child.signalCode===null)failed();});
    else {
      // Unregistered Linux processes have no retained ownership after exit.
      // Do not signal a numeric process group that might have been reused.
      failed();
    }
  });
  operations.set(child,operation);return operation;
}
