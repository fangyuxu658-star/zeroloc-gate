#!/usr/bin/env node
import { checkFiles } from '../src/check.mjs';
import { toSarif } from '../src/report.mjs';

const help = `ZeroLoc Gate v0.1.0-beta.1

Usage:
  node bin/zeroloc.mjs check --source <en.json> --targets <de.json,fr.json>
  node bin/zeroloc.mjs check --source <en.json> --targets <de.json,fr.json> --format json
  node bin/zeroloc.mjs extract --project <dir> --locales en,de --dry-run
  node bin/zeroloc.mjs translate --provider ollama --model <installed-local-model> --source <en.json> --target <de.json> --source-locale en --target-locale de --message-format i18next --dry-run
  node bin/zeroloc.mjs visual --url http://127.0.0.1:4173 --output artifacts/visual

Options:
  --source <file>       Required. Source JSON catalog.
  --targets <files>     Required. Comma-separated target JSON catalogs.
  --format text|json|sarif  Report format. Defaults to text.
  --strict-extra        Treat extra translation keys as failures.
  --message-format plain|i18next|icu  Explicit catalog syntax (default: legacy simple placeholders).
  --help                Show this help.
`;

function option(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${name} requires a value`);
  return args[i + 1];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) { console.log(help); return; }
  if(['pr-prepare','pr-publish'].includes(args[0])) {
    const {preparePr,publishPr}=await import('../src/pull-request.mjs');
    const root=option(args,'--root')??'.';
    const result=args[0]==='pr-prepare'?await preparePr({root,reportPath:option(args,'--report'),branch:option(args,'--branch'),prepare:args.includes('--prepare'),approve:option(args,'--approve')}):await publishPr({root,repo:option(args,'--repo'),bodyPath:option(args,'--body'),title:option(args,'--title'),publish:args.includes('--publish'),approve:option(args,'--approve'),gh:option(args,'--gh')??'gh'});
    console.log(JSON.stringify(result,null,2));return;
  }
  if(args[0]==='quality') {
    const {readResource,parseJson}=await import('../src/safe-files.mjs');
    const {checkQuality}=await import('../src/quality.mjs');
    const root=option(args,'--root')??'.',load=async p=>parseJson((await readResource(root,p)).bytes);
    const result=checkQuality({source:await load(option(args,'--source')),target:await load(option(args,'--target')),targetLocale:option(args,'--target-locale'),messageFormat:option(args,'--message-format')??'i18next',policy:option(args,'--policy')?await load(option(args,'--policy')):{}});
    console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;return;
  }
  if (args[0] === 'apply' || args[0] === 'recover') {
    const { readResource, parseJson } = await import('../src/safe-files.mjs');
    const { applyProposal, recoverApply } = await import('../src/apply.mjs');
    const root=option(args,'--root')??'.';
    let result;
    if(args[0]==='recover') result=await recoverApply({root,journal:option(args,'--journal'),approve:option(args,'--approve')});
    else {
      const proposal=parseJson((await readResource(root,option(args,'--proposal'))).bytes);
      const policy=option(args,'--policy')?parseJson((await readResource(root,option(args,'--policy'))).bytes):{};
      const validator=option(args,'--validation-config')?await (await import('../src/validation.mjs')).configuredValidator({root,configPath:option(args,'--validation-config'),approval:option(args,'--allow-validation')}):null;
      if(args.includes('--write')&&!validator)throw new Error('--validation-config is required for writes');
      if(args.includes('--write')&&validator)validator.assertApproved();
      result=await applyProposal({root,source:option(args,'--source'),target:option(args,'--target'),proposal,policy,validationBinding:validator?.binding??null,validate:validator?plan=>validator.run(plan):undefined,targetLocale:option(args,'--target-locale')??proposal.targetLocale,messageFormat:option(args,'--message-format')??proposal.messageFormat,bindLegacy:args.includes('--bind-legacy'),write:args.includes('--write'),approve:option(args,'--approve')});
    }
    console.log(JSON.stringify(result,null,2));if(result.passed===false)process.exitCode=1;return;
  }
  if (args[0] === 'visual') {
    const { visualQA } = await import('../src/checks/visual.mjs');
    const result = await visualQA({url:option(args,'--url'),outputDir:option(args,'--output') ?? 'artifacts/visual'});
    console.log(JSON.stringify(result,null,2)); if(!result.passed) process.exitCode=1; return;
  }
  if (args[0] === 'translate') {
    if (option(args, '--provider') !== 'ollama') throw new Error('Only --provider ollama is supported');
    const { OllamaProvider } = await import('../src/providers/ollama.mjs');
    const { translateFiles } = await import('../src/translate.mjs');
    const provider = new OllamaProvider({endpoint: option(args, '--endpoint'), model: option(args, '--model')});
    const report = await translateFiles({sourcePath: option(args, '--source'), targetPath: option(args, '--target'), sourceLocale: option(args, '--source-locale'), targetLocale: option(args, '--target-locale'), messageFormat: option(args, '--message-format'), provider, dryRun: args.includes('--dry-run'), concurrency: Number(option(args, '--concurrency') ?? 2)});
    console.log(JSON.stringify(report, null, 2)); return;
  }
  if (args[0] === 'extract') {
    const { extractProject } = await import('../src/adapters/i18next.mjs');
    const report = await extractProject({ root: option(args, '--project') ?? '.', locales: (option(args, '--locales') ?? 'en').split(',') });
    console.log(JSON.stringify(report, null, 2)); return;
  }
  if (args[0] !== 'check') throw new Error(`Unsupported command: ${args[0]}\n\n${help}`);
  const sourcePath = option(args, '--source');
  const rawTargets = option(args, '--targets');
  const format = option(args, '--format') ?? 'text';
  if (!sourcePath || !rawTargets) throw new Error(`--source and --targets are required\n\n${help}`);
  if (!['json','text','sarif'].includes(format)) throw new Error('Format must be text, json or sarif');
  const targetPaths = rawTargets.split(',').map(x => x.trim()).filter(Boolean);
  if (targetPaths.length === 0) throw new Error('At least one target catalog is required');
  const result = await checkFiles({ sourcePath, targetPaths, strictExtra: args.includes('--strict-extra'), messageFormat: option(args, '--message-format') ?? 'legacy' });
  if (format === 'sarif') console.log(JSON.stringify(toSarif(result),null,2));
  else if (format === 'json') console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`ZeroLoc Gate | ${result.sourceKeys} source keys | ${result.targetCount} target locales`);
    for (const issue of result.issues) {
      const mark = issue.level === 'error' ? 'FAIL' : 'WARN';
      console.log(`[${mark}] ${issue.locale} :: ${issue.key} :: ${issue.code} :: ${issue.message}`);
    }
    console.log(`${result.passed ? 'PASS' : 'FAIL'} — ${result.errors} error(s), ${result.warnings} warning(s)`);
    console.log('Note: this does NOT check translation quality or UI layout.');
  }
  if (!result.passed) process.exitCode = 1;
}

main().catch(err => {
  console.error(`ZeroLoc Gate error: ${err.message}`);
  process.exitCode = 2;
});
