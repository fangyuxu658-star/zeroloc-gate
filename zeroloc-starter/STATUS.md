# ZeroLoc v0.3 development status

Independent audit remediation for PR #7: see [five findings, real regressions and limits](docs/V03_AUDIT_REMEDIATION_CN.md). Earlier CI numbers below describe the historical v0.3 head; current-head checks are linked from that remediation report.

Current branch: `codex/v0.3-repair-engine`, from v0.2 head `7295075`, targeting `codex/v0.2-safe-apply`. See [executable repair engine](docs/V03_REPAIR_ENGINE_CN.md) and [current evidence](docs/V03_RESULTS_CN.md). This is unreleased 0.3.0-dev.0, MIT/local-first, preview by default. No PR #6/main mutation or merge/release authorization. The remaining v0.2 text below is historical status, not a claim about v0.3 CI.

Published beta: [v0.1.0-beta.1](https://github.com/fangyuxu658-star/zeroloc-gate/releases/tag/v0.1.0-beta.1). This is an unmerged **0.2.0-dev.0** development branch, based on protected main bcb542a. No v0.2 release, no main writes, no automatic merge, no Ruleset weakening.

## Fully verified locally

- Five separate engineering stages:27/31/34/37 tests, then final41/41. Safe transactions, exact consent, source/target conflicts, prototype/path/link rejection, real rollback/recovery and human preservation.
- Actual CLI preview/approval/config SHA consent; actual Git topic branch and exact-file commits, failing hooks disabled, unrelated staging refused, offline remote preview and separately consented Draft transport.
- Real Ollama0.40.6/qwen2.5:0.5b -> real React/i18next -> structural/quality -> explicit apply -> real Node/unit UI validation -> local PR preparation. Success, unit/UI failure, timeout and conflict all verified; double-browser8-case acceptance passed.
- 112 locked license expressions and original notices; fresh audit0 vulnerabilities; current installed CycloneDX inventory. New libraries pinned/MIT, franc upstream license supplement recorded.

## Verified remote acceptance

[Draft PR #6](https://github.com/fangyuxu658-star/zeroloc-gate/pull/6): [CI run](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39383958891) passed5/5 at 031c7e9c1383765b1bbe4a84887d66c139c8b07a; four Windows/Linux Node22/24 jobs each41/41, plus old12-case and new real-app UI/workflow checks. Follow-up heads must pass their own latest checks. Main and Active Ruleset remain unchanged.

## Partially verified / required review

- Remote Windows/Linux Node22/24 verification is determined by the latest Draft PR Checks, not this local status file. Current development PR must pass all five protected checks before any separately approved merge.
- Language identification/length/terminology are risk indicators, not semantic guarantees. One small model and one React/i18next SSR application do not prove all app/model compatibility.
- Single-target atomic rename and backups; cooperating lock and conflict refusal, not multi-file transactions, hostile same-user isolation or guaranteed power-loss/ACL preservation. Approved tests/imported code need maintainer trust.

## Not performed / not authorized

- External Fork dynamic validation, other real app ecosystems/models/GPU, independent security audit, actual automated merge or v0.2 publication.
- No backup deletion policy, no customer build-script execution, no model/runtime distribution, no paid cloud services.

Development candidate ready for review; **v0.2 release NO-GO** pending review, actual latest remote checks, broader acceptance and explicit approval. See [usage/security](docs/V02_SAFE_APPLY_CN.md), [engineering log](docs/V02_ENGINEERING_CN.md), [stage evidence](docs/verification/v02-stages.json).
