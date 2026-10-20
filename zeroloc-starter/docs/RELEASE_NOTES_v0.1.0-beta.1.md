# ZeroLoc Gate v0.1.0-beta.1

**Pre-release draft.** Prepared locally; no remote repository, tag, GitHub CI run or Release has been created yet. Replace this paragraph with the approved commit and actual CI/PR links only after remote verification succeeds.

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
- Real Node 22/24 Linux/Windows CI, fork PR permissions and remote branch protection remain pending until actual remote verification.

## Try the beta

Clone the approved repository, enter `zeroloc-starter/`, then run:

```sh
npm ci --ignore-scripts
npm test
npm run check:example
```

See [README](../README.md) for extraction, translation and visual QA commands. This GitHub beta keeps `package.json` private to prevent unintended npm publication. Publish as a GitHub **pre-release**, not the latest stable release.
