import { realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { win32, posix } from 'node:path';
import { digest } from './safe-files.mjs';

/** Next/Webpack cannot make relative module entries across Windows drives.
 * Use a separate sibling, never the production project, for that topology. */
export function isolationParent({projectRoot,tempRoot,platform=process.platform}) {
  const paths=platform==='win32'?win32:posix;
  const sibling=platform==='win32'&&paths.parse(projectRoot).root.toLowerCase()!==paths.parse(tempRoot).root.toLowerCase();
  return {parent:sibling?paths.dirname(projectRoot):tempRoot,placement:sibling?'project-sibling':'os-temp'};
}
export async function repairIsolation(root) {
  const {parent,placement}=isolationParent({projectRoot:root,tempRoot:await realpath(tmpdir())});
  return {parent,plan:{placement,parentBinding:digest(parent),notice:placement==='project-sibling'?'Execution creates a unique .zeroloc-repair-* sibling in the private project parent; original project files stay unchanged.':'Execution creates a unique project copy in the canonical OS temporary directory.'}};
}
