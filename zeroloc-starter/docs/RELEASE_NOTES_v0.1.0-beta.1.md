# ZeroLoc Gate v0.1.0-beta.1

> Closeout update (local draft, not on main): PR #1 is Ready. Its final head 4de289b46f695ecbc446cdef9ffd63897fd84fe9 passed [all five checks](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39350314338). The authorized squash merge was rejected by GitHub with Invalid email address. Main is still the initial baseline; no post-merge main CI, tag or Release exists. Final release target SHA remains unset. See [closeout record](RELEASE_CLOSEOUT_CN.md). Do not publish until this blocker is resolved and the resulting main passes CI.

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

[正常 Draft PR #1](https://github.com/fangyuxu658-star/zeroloc-gate/pull/1)；[真实 PR CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39349812116)：success，5/5 jobs 通过，4 个系统/Node 组合各 21/21，视觉 12 组通过。记录运行的 head=8817f1b2f4ea4beecd01f6122783dca098f3468f。

[负例 Draft PR #2](https://github.com/fangyuxu658-star/zeroloc-gate/pull/2)；[故意失败 CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39349987984)：failure。移除合成德语 greeting 的 name 后，直接 CLI 退出 1 并定位 app.greeting / PLACEHOLDER_MISMATCH；远端检查失败。PR 已关闭且未合并，合成错误未进入 main。

See [acceptance log](BETA_RELEASE_ACCEPTANCE_CN.md) for exact run/head evidence, limitations and pending approvals. Use the latest normal PR Checks after documentation updates.

## Try the beta

Clone https://github.com/fangyuxu658-star/zeroloc-gate.git, enter `zeroloc-starter/`, then run:

```sh
npm ci --ignore-scripts
npm test
npm run check:example
```

See [README](../README.md) for extraction, translation and visual QA commands. This GitHub beta keeps `package.json` private to prevent unintended npm publication. Publish as a GitHub **pre-release**, not the latest stable release.
