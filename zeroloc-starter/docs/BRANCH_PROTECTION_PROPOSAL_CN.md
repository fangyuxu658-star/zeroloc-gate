# main protection proposal — NOT APPLIED

Latest read-only eligibility check confirms public repository, admin permission, rulesets=[] and effective rules=[]. This repository type supports Rulesets under [GitHub's documented availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository). Proposed API body: [main-ruleset.proposed.json](verification/main-ruleset.proposed.json); detailed approval boundary: [closeout record](RELEASE_CLOSEOUT_CN.md). The active field is proposed only; nothing has been applied. Zero mandatory approvals and no last-push/CODEOWNER requirement allow a sole maintainer to use the PR/CI process.

Public repository: https://github.com/fangyuxu658-star/zeroloc-gate . Current read-only API results: `main.protected=false`, rulesets `[]`. Successful/failed CI has been exercised; server-enforced merge blocking has **not** been enabled or verified.

The public repository exposes protection/ruleset read endpoints. This account can inspect them, but no write experiment was performed. Availability in the GitHub settings UI and successful read-back must be checked when the owner approves applying protection.

Proposed settings for `main` (owner approval required):

- Require a pull request before merging; initially zero approving reviews for a solo maintainer. Raise to one when a second reviewer is available.
- Require branches to be up to date and all five checks below; pin their expected source to GitHub Actions, app ID `15368` (observed from actual check-runs).
- Apply rules to administrators, with no routine bypass; disallow force pushes and branch deletion.
- Require conversations to be resolved. Leave auto-merge disabled until these settings are read back and validated.

| Required check | Observed source |
| --- | --- |
| `regression (ubuntu-latest, 22)` | github-actions / 15368 |
| `regression (ubuntu-latest, 24)` | github-actions / 15368 |
| `regression (windows-latest, 22)` | github-actions / 15368 |
| `regression (windows-latest, 24)` | github-actions / 15368 |
| `visual` | github-actions / 15368 |

After approval, open repository **Settings → Rules → Rulesets** (or **Branches → Branch protection rules**), select `main`, and apply the above requirements. Do not create overlapping legacy rules and rulesets without reviewing their combined effects. Read back the resulting configuration and verify a ready-for-review synthetic failure cannot merge; a Draft PR alone cannot prove required-check enforcement. Never merge the negative fixture. If GitHub denies the setting because of plan/permissions, record the exact limitation and require explicit acceptance of the remaining merge risk.

Only PR #1 was authorized and squash-merged. No protection/settings/tag/Release was changed.
