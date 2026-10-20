## Problem and final behavior

Explain the concrete change and its limits. During stabilization, avoid unrelated features or architecture changes.

## Actual validation

- [ ] `npm ci --ignore-scripts` from `zeroloc-starter/`
- [ ] `npm test` (include exact pass/fail count and environment)
- [ ] `npm run check:example`
- [ ] `npm run licenses:check`; audit/SBOM refreshed if dependencies changed
- [ ] Relevant positive and deliberate negative cases
- [ ] `STATUS.md` updated without treating skipped/blocked checks as passed

Commands, exit codes, logs, and any environment blockers:

## Review

- [ ] No credentials, local runtimes, model weights or customer data committed
- [ ] No default network calls, source rewrites, automatic patch application or deployment
- [ ] License/NOTICE changes and model rights documented when applicable
- [ ] GitHub Actions completed on this PR; failures are explained, not relabeled as success
