// Only the explicitly approved adapter is imported, never candidate code.
import { pathToFileURL } from 'node:url';
const [adapter,root,originRoot]=process.argv.slice(2);
try {
  const service=await (await import(pathToFileURL(adapter).href)).start({root,originRoot});
  process.stdout.write(JSON.stringify({zerolocServer:service.url})+'\n');
  process.on('SIGTERM',async()=>{await service.stop?.();process.exit(0);});
} catch {process.stderr.write('APP_ADAPTER_FAILED\n');process.exitCode=1;}
