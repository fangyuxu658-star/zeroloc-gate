# Coding Agent Notes for ZeroLoc Gate

Mission: Open, local-first infrastructure that reduces repetitive localization workflow without external accounts.

Current scope: Nested JSON string catalogs; deterministic checks, explicit ICU/i18next parsing, optional extraction/local translation/visual QA adapters. See docs/IMPLEMENTATION_RESULTS_CN.md for actual verification limits.

Rules:
- Keep `npm test` passing after every change.
- Preserve no-network default, zero credentials, and safe CI permissions.
- Add tests for regressions and explicitly document unsupported formats.
- Do not imply that matching placeholders proves semantic translation correctness.
- Never build automated deletion or surprise code rewrites.

ICU parsing now uses FormatJS in src/formats.mjs. Keep it separate from i18next interpolation. Stabilization has verified isolated-cache Firefox and real local Ollama inference (see STATUS.md), with semantic limitations recorded. Next release gate: real GitHub CI and remote PR evidence; do not claim remote execution from local checks. Keep scope frozen on stabilization unless the user changes it.

## Optional integration plan
Before adding third-party libraries or services, read `docs/OPEN_SOURCE_INTEGRATION_PLAN_CN.md`. Implement adapters in discrete PR-sized changes; verify upstream licenses and model/data licensing at the pinned release. Do not copy AGPL/GPL/proprietary-EE source into the MIT core by default.
