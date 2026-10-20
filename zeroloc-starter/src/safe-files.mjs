import { lstat, realpath, readFile, open, rename, unlink } from 'node:fs/promises';
import { resolve, relative, join, dirname, basename } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const digest = data => createHash('sha256').update(data).digest('hex');
export const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
export function resourcePath(value) {
  if (typeof value !== 'string' || !value || value.length > 512 || /[\\:\x00-\x1f]/.test(value) || value.startsWith('/') || value.split('/').some(p => !p || p==='.' || p==='..' || p.toLowerCase()==='.git' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p))) throw new Error('Unsafe relative resource path');
  return value;
}
export async function guardedPath(root, value, { missing = false } = {}) {
  resourcePath(value);
  const base = await realpath(root);
  const absolute = resolve(base, value);
  if (relative(base, absolute).startsWith('..') || absolute === base) throw new Error('Path escapes project');
  const parts=value.split('/'); let current=base;
  for (let i=0;i<parts.length;i++) {
    current=join(current,parts[i]);
    let stat;
    try { stat=await lstat(current); } catch(e) { if(e.code==='ENOENT' && missing && i===parts.length-1) return absolute; throw e; }
    if(stat.isSymbolicLink() || (i<parts.length-1 ? !stat.isDirectory() : !stat.isFile() || stat.nlink!==1)) throw new Error('Symlink, hardlink or non-regular resource rejected');
  }
  return absolute;
}
export async function readResource(root, value) {
  const path=await guardedPath(root,value);
  if((await lstat(path)).size>2*1024*1024) throw new Error('Resource exceeds 2 MiB');
  const bytes=await readFile(path);
  if(bytes.length>2*1024*1024) throw new Error('Resource exceeds 2 MiB');
  return {path,bytes,sha256:digest(bytes)};
}
export function parseJson(bytes) {
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),value=JSON.parse(text);
  // JSON.parse silently keeps the last duplicate member. A hidden earlier
  // translation must never be discarded when we serialize a patched catalog.
  // Syntax has already been validated; scan only object scopes and string tokens.
  const scopes=[];
  for(let i=0;i<text.length;i++) {
    const c=text[i],scope=scopes.at(-1);
    if(c==='"') {
      const start=i;
      for(i++;i<text.length;i++){if(text[i]==='\\')i++;else if(text[i]==='"')break;}
      if(scope?.expectKey) {
        const key=JSON.parse(text.slice(start,i+1));
        if(scope.keys.has(key))throw new Error('Duplicate JSON member rejected');
        scope.keys.add(key);scope.expectKey=false;
      }
    } else if(c==='{')scopes.push({keys:new Set(),expectKey:true});
    else if(c==='[')scopes.push(null);
    else if(c==='}'||c===']')scopes.pop();
    else if(c===','&&scope)scope.expectKey=true;
  }
  return value;
}
export async function durableNew(path, bytes, metadata) {
  const file=await open(path,'wx',0o600);
  try {
    await file.writeFile(bytes);
    if(metadata && process.platform!=='win32') {
      const created=await file.stat();
      // Refuse the replacement if ownership cannot be retained. Backups and
      // journals stay private; only the replacement inherits resource access.
      if(created.uid!==metadata.uid||created.gid!==metadata.gid)await file.chown(metadata.uid,metadata.gid);
      await file.chmod(metadata.mode&0o777);
    }
    await file.sync();
  } finally {await file.close();}
}
export async function atomicReplace(root, target, bytes, expected) {
  const path=await guardedPath(root,target);
  const metadata=await lstat(path);
  if((await readResource(root,target)).sha256!==expected) throw new Error('CONFLICT: target changed');
  const temp=join(dirname(path),`.${basename(path)}.zeroloc-${randomUUID()}.tmp`);
  try {
    await durableNew(temp,bytes,metadata);
    await guardedPath(root,target);
    if((await readResource(root,target)).sha256!==expected) throw new Error('CONFLICT: target changed before rename');
    await rename(temp,path);
  } finally { await unlink(temp).catch(e=>{if(e.code!=='ENOENT') throw e;}); }
}
