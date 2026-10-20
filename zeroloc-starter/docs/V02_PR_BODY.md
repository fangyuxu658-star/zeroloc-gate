# v0.2: safe apply, validated translation and reviewable Draft PRs

## Changes

Five separately verified development stages from protected main bcb542a: RFC6902 safe single-file apply, heuristic translation risk checks, explicitly authorized automated validation, local Git preparation / consented Draft PR publishing, and a real React/i18next acceptance application.

CLI remains compatible with v0.1. New commands default to preview: `quality`, `apply`, `recover`, `pr-prepare`, `pr-publish`. Writing binds exact plan + validation config hashes; publication requires separate exact preview consent. Existing non-empty human translations, stale resources, unsafe paths/prototype keys and unrelated staged work are rejected. Validation failures restore exact original bytes unless an outside edit requires preserving the conflict scene.

## Local evidence

- Stage tests: 27/27, 31/31, 34/34, 37/37; final Windows Node25 suite: 41/41.
- Actual local Ollama0.40.6 / qwen2.5:0.5b, actual React/i18next: success, unit failure, UI failure, timeout and stale conflict all pass their expected assertions. Success runs Chromium/Firefox, two locales and two viewports (8 cases); original human title is preserved and a local topic branch is prepared.
- 112 locked dependency licenses reviewed, MIT core unchanged, original third-party notices retained; npm audit: 0 vulnerabilities; current CycloneDX SBOM included.
- See docs/V02_ENGINEERING_CN.md, docs/V02_SAFE_APPLY_CN.md and docs/verification/v02-real-model.json. Remote results are the actual Checks on this PR, not inferred from local execution.

## CI and review

The existing four Windows/Linux Node22/24 regression jobs and visual job retain their names and read-only Actions permissions. The visual job includes the existing 12-case matrix and the new five-scenario real-app workflow. CI uses a clearly labelled local HTTP model-protocol stub; real model evidence is separately recorded.

Review priorities: filesystem transaction/recovery boundaries, approved-test trust, exact approval binding and remote mutation guardrails. Language detection/length/terminology are heuristic risks, not semantic quality guarantees. Transactions cover one JSON target, not cross-file ACID or guaranteed power-loss durability. Approved tests and imports are trusted project code, not an OS sandbox. Current acceptance covers one SSR application and one installed small local model; broader independent security/application testing remains required before a v0.2 release.

Draft for human review only. No automatic merge, main write, Ruleset weakening, tag, release, npm publication or paid API usage.

First actual remote CI: https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39383958891 (5/5 at 031c7e9c1383765b1bbe4a84887d66c139c8b07a; four matrix jobs each41/41, plus original12 UI cases and new five-scenario application workflow). Latest follow-up head must pass its own checks. Final redaction regression prevents private callback exceptions in public reports.
