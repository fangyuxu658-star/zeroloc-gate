# v0.1.0-beta.1 release checklist

Current verified main: d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a; [main CI 5/5](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39356683284)，commit d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a. Feature freeze; no npm publish/new features/v0.2.

- [x] PR #1 final diff/head/5 checks reviewed, Ready, authorized Squash Merge completed; public author/committer are noreply, signed by GitHub.
- [x] Post-merge main independently passed all 5 jobs; four regression combinations each 21/21, visual 12 cases and negative fixture passed; reports/SBOM/screenshots downloaded.
- [x] Negative PR #2 correctly failed and remains closed/unmerged.
- [x] Local regression/example/license gate and fresh audit verified; 107 locked license entries, zero audit vulnerabilities. MIT/third-party notices preserved.
- [x] Ruleset eligibility and exact API payload prepared; zero required approvals for sole maintainer; NOT applied.
- [x] Release Notes/install/features/limitations/reproduction prepared, source/evidence/SBOM/notice/checksum assets prepared locally for current verified SHA; NOT uploaded.
- [ ] Approve and merge the independent closeout documentation PR; only PR #1 was authorized to merge. Verify resulting main CI and rebuild all SHA-bound assets if target changes.
- [ ] Approve/apply Ruleset and read back/verify enforcement, or explicitly accept no-protection risk.
- [ ] External Fork dynamic test remains unrun; disclose rather than count same-repo PR as proof.
- [ ] Accept known Windows default Firefox cache and small-model Continue/semantic limits.
- [ ] Approve exact final SHA for v0.1.0-beta.1 Tag; create/push only then.
- [ ] Separately approve GitHub Pre-release (not latest stable); upload approved assets and refresh audit at publication time.
- [ ] Read back actual Tag/Release target and URLs after publication; current state is no Tag and no Release.

Engineering checks GO; publication execution NO-GO pending above approvals. [Full closeout log](RELEASE_CLOSEOUT_CN.md).
