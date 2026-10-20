# ZeroLoc Gate v0.1.0-beta.1

**Pre-release draft — not published.** [Repository](https://github.com/fangyuxu658-star/zeroloc-gate). PR #1 was squash-merged into main at d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a; [post-merge main CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39356683284) passed all five jobs. No tag or Release exists. This closeout documentation branch is not merged. If it is merged, refresh the final target SHA, require its new main CI and obtain explicit tag/release approval.

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
- Real Node 22/24 Linux/Windows and Linux browser CI passed on the post-merge main. An external fork event is still untested. Main has no branch protection/ruleset enforcement; a failing check alone is not proof that GitHub blocks merging.

## Release evidence

- [PR #1](https://github.com/fangyuxu658-star/zeroloc-gate/pull/1): final head 4de289b, [PR CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39350314338) 5/5; merged via squash.
- [Main CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39356683284): Ubuntu/Windows x Node 22/24, each 21/21; visual Chromium/Firefox x 3 locales x 2 viewports, 12 passed; negative overflow/accessibility fixture caught. Four JSON/SARIF pairs have zero errors/results; Linux SBOM 97 / Windows 96 components; 13 screenshots reviewed.
- [Negative PR #2](https://github.com/fangyuxu658-star/zeroloc-gate/pull/2): [CI failed as intended](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39349987984), closed without merge. Direct CLI exit 1 identifies app.greeting / missing name.
- 107 locked package license expressions reviewed; main audit found zero vulnerabilities. Public commit scan found no secrets; scans are heuristic. See [closeout evidence](RELEASE_CLOSEOUT_CN.md).

## Try the beta

With Node.js 22 or later and npm, clone the repository. For this verified candidate (the future tag has not been created):

```sh
git clone https://github.com/fangyuxu658-star/zeroloc-gate.git
cd zeroloc-gate
git checkout d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a
cd zeroloc-starter
```

Then run:

```sh
npm ci --ignore-scripts
npm test
npm run check:example
```

See [README](../README.md) for extraction, translation and visual QA commands. This GitHub beta keeps `package.json` private to prevent unintended npm publication. Publish as a GitHub **pre-release**, not the latest stable release.

## Reproduce extended verification

```sh
npm run licenses:check
npm audit --audit-level=high
npm sbom --sbom-format cyclonedx
npx --no-install playwright install --with-deps chromium firefox
npm run test:visual -- --all-browsers
```

Windows isolated-cache and opt-in Ollama setup: [environment instructions](STABILIZATION_ENVIRONMENT_CN.md). The release archive, if approved, contains source and notices only; install dependencies separately. Four CI SBOMs describe their exact OS/Node installations.
