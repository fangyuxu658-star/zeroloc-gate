# ZeroLoc Gate v0.1.0-beta.1

**Pre-release draft — not published.** Repository: [fangyuxu658-star/zeroloc-gate](https://github.com/fangyuxu658-star/zeroloc-gate). Initial main commit: 4a64f6d6350ed5e80c1738ffa145a8dba46da66f; [first main CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39347428254) passed all five jobs. The validation PR must be reviewed/merged and its resulting main revalidated before choosing the final release commit. No tag or Release has been created.

ZeroLoc Gate is a local-first localization quality gate for nested JSON string catalogs. This beta provides deterministic checks and reviewable adapter output. It does not guarantee translation meaning or apply translation patches automatically.

## Included

- Missing/empty/extra key checks and explicit plain, i18next or ICU syntax; ICU parsing uses FormatJS AST, with a separate i18next interpolation path.
- Text, JSON and SARIF reports; exit codes 0 (pass), 1 (gate failure), 2 (input/config/runtime error).
- Pinned optional i18next-cli extraction preview, including before/after catalogs; no customer scripts or project plugins run, no deletion or automatic writeback.
- Opt-in loopback-only Ollama provider, offline dry-run, bounded concurrency/timeouts and candidate patches with target preconditions; existing non-empty human translations preserved.
- React demo and Playwright/axe visual checks for overflow and basic accessibility; screenshots and structured findings, no automatic CSS repair.
- MIT core, dependency license inventory, original notices and CycloneDX SBOM. No model weights or runtime/browser binaries bundled.

## Local verification

Current publication-candidate results are recorded in [PUBLICATION_READINESS_CN.md](PUBLICATION_READINESS_CN.md) and [STATUS.md](../STATUS.md). Historical stabilization verified 21 regression tests, a 12-case Chromium/Firefox matrix twice using an isolated browser cache, and real Ollama 0.40.6 + qwen2.5:0.5b CPU translation of synthetic fixtures. These local results do not substitute for GitHub Actions on the release commit.

## Known limitations

- The original Windows Firefox cache fails to activate mozglue; the documented project-local Playwright cache works. The default cache issue remains disclosed.
- The tested small model left `Continue` untranslated although structural checks passed. All candidates need human review; complete language quality is not a release claim.
- Only nested UTF-8 JSON objects with string leaves are supported. No XLIFF, arrays, dotted/reserved keys, Paraglide extraction, Lingui or TMS integration.
- ICU/i18next structure checks are not a general HTML sanitizer. Visual checks do not establish complete accessibility, pixel-baseline equality or semantic correctness.
- Model rights must be reviewed independently. Runtime `check` is offline; dependency/browser/model installation requires network, and translation is an explicit local HTTP action.
- Real Node 22/24 Linux/Windows and Linux browser CI passed on the initial main. An external fork event is still untested. Main has no branch protection/ruleset enforcement; a failing check alone is not proof that GitHub blocks merging.

## Pull request acceptance

正常 Draft PR 正在准备；未将尚未运行的 PR CI 计为通过。

负例 PR 尚未创建/验证，保持未验证。

See [acceptance log](BETA_RELEASE_ACCEPTANCE_CN.md) for exact run/head evidence, limitations and pending approvals. Use the latest normal PR Checks after documentation updates.

## Try the beta

Clone https://github.com/fangyuxu658-star/zeroloc-gate.git, enter `zeroloc-starter/`, then run:

```sh
npm ci --ignore-scripts
npm test
npm run check:example
```

See [README](../README.md) for extraction, translation and visual QA commands. This GitHub beta keeps `package.json` private to prevent unintended npm publication. Publish as a GitHub **pre-release**, not the latest stable release.
