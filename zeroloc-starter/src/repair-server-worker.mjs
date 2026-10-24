// Only the explicitly approved adapter is imported, never candidate code.
import { pathToFileURL } from 'node:url';
const [adapter,root,originRoot]=process.argv.slice(2);
try {
  const service=await (await import(pathToFileURL(adapter).href)).start({root,originRoot});
  process.stdout.write(JSON.stringify({zerolocServer:service.url})+'\n');
  process.on('SIGTERM',async()=>{await service.stop?.();process.exit(0);});
} catch(error) {
  // Captured only in the engine's bounded, private adapter log. Public reports
  // keep generic codes; never include application stacks in delivery metadata.
  process.stderr.write('APP_ADAPTER_FAILED\n'+String(error?.stack??error).slice(0,16384)+'\n');process.exitCode=1;
}
