# Contributing

Use Node.js 22 or later. Install the locked development dependencies with `npm ci --ignore-scripts`. Do not execute a customer repository's install hooks, configuration modules, or arbitrary scripts.

Keep adapter boundaries independent. Reuse upstream parsers/SDKs; do not replace mature libraries with home-grown extractors. Every behavior change must include a normal case and a negative regression proving the gate rejects a bad input. Run `npm test`, `npm run check:example`, and `npm run licenses:check`. For UI changes, install Playwright browsers and run `npm run test:visual -- --all-browsers`; report any environment failure explicitly.

For dependencies: pin direct versions, update package-lock.json, inspect upstream LICENSE/NOTICE at the distribution or fixed source revision, run `npm run licenses`, regenerate `npm run sbom`, and run `npm audit --audit-level=high`. The license allowlist is a reviewed inventory gate, not a general claim that any use of a license is compatible. Unknown or changed licenses fail closed. Preserve MPL files and source availability obligations for axe; preserve Apache/other notices when redistributing dependencies. Do not vendor GPL/AGPL services or proprietary EE code into the MIT core. Models and browser binaries require their own rights review before redistribution.

No default network access at runtime, accounts, telemetry, uploads, push/merge/deploy, deletion or surprise source rewrites. Translation patches are untrusted review proposals. Report JSON/SARIF findings without claiming semantic correctness. Keep fixtures synthetic and free of credentials or customer data.

PR descriptions should state the problem, final behavior, tested commands and exact results, unsupported cases, and license changes. A failed command is evidence, not a passing test. GitHub CI must actually run before publication; do not label local simulation as remote CI success.
