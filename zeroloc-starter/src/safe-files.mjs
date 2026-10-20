import { lstat, realpath, readFile, open, rename, unlink } from 'node:fs/promises';
import { resolve, relative, join, dirname, basename } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const digest = data => createHash('sha256').update(data).digest('hex');
export const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
export function resourcePath(value) {
  if (typeof value !== 'string' || !value || value.length > 512 || /[\\:\x00-\x1f]/.test(value) || value.startsWith('/') || value.split('/').some(p => !p || p==='.' || p==='..' || p==='.git' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p))) throw new Error('Unsafe relative resource path');
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
  const bytes=await readFile(path);
  if(bytes.length>2*1024*1024) throw new Error('Resource exceeds 2 MiB');
  return {path,bytes,sha256:digest(bytes)};
}
export function parseJson(bytes) { return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); }
export async function durableNew(path, bytes) {
  const file=await open(path,'wx',0o600);
  try {await file.writeFile(bytes);await file.sync();} finally {await file.close();}
}
export async function atomicReplace(root, target, bytes, expected) {
  const path=await guardedPath(root,target);
  if((await readResource(root,target)).sha256!==expected) throw new Error('CONFLICT: target changed');
  const temp=join(dirname(path),`.${basename(path)}.zeroloc-${randomUUID()}.tmp`);
  try {
    await durableNew(temp,bytes);
    await guardedPath(root,target);
    if((await readResource(root,target)).sha256!==expected) throw new Error('CONFLICT: target changed before rename');
    await rename(temp,path);
  } finally { await unlink(temp).catch(e=>{if(e.code!=='ENOENT') throw e;}); }
}
