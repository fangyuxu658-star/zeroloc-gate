# v0.2 development and verification

Base: protected main bcb542a7dc672c97be34289cbaf86667cceff118. Development branch only; no main writes, automatic merges or release. Development metadata is 0.2.0-dev.0; the published beta tag is unchanged.

## Stage 1 — safe apply

Implemented using pinned fast-json-patch3.1.1 (MIT), original distribution LICENSE.txt preserved in dependency notices. 108 locked license entries verified.

Local normal-user Windows/Node25 verification: npm test **27/27**; includes exact approval, root test, source/target staleness, human preservation, destructive operations/prototype/path rejection, junction/hardlink rejection, byte-exact backup/recovery, validation failure rollback and concurrent-edit rollback conflict. Initial restricted-sandbox run failed filesystem/loopback/subprocess checks; normal-user rerun passed, not counted as a product success until then.

Transactions are deliberately single-target-file. RFC6902 test/add/replace are supported through the library; deletion/move/copy and root replacement are disallowed. Existing proposals with no source provenance require explicit review-time --bind-legacy; this binds the current source, not proof of what source originally generated that old proposal. New translate output includes raw source/target hashes.

## Stage 2 — translation quality risks

Local npm test **31/31**. Added source-copy rejection, literal terminology and brand preservation, explicit key/text/source-retention exemptions, length ratios and franc-min statistical language risk. Short messages are explicitly insufficient evidence; warnings are advisory unless blockWarnings=true. Structural FormatJS/i18next checks remain independent of exemptions. The exact normalized policy is included in planId approval.

franc-min6.2.0 plus its three transitive dependencies are MIT; total112 locked entries. Its npm tarball omitted LICENSE, so the fail-closed gate was resolved with the original license from npm gitHead 3f9f0b51a96c5df32a407dad865a3011ac0fa2d1, https://github.com/wooorm/franc/blob/3f9f0b51a96c5df32a407dad865a3011ac0fa2d1/license . Exact supplement SHA-256 f5e0c5c44706ddda7ac2f9096f848222f1e0e90f88643955041c2735be84592b. No allowlist weakening. Franc itself warns about short samples; no semantic guarantee is claimed.

Only --write plus --approve <current-planId> writes. Backups and recovery records persist next to the target; only owned temporary/lock files are cleaned. Locks coordinate ZeroLoc callers. An attacker with concurrent same-user filesystem access cannot be reliably excluded by portable Node filesystem APIs; workspace permissions remain a trust boundary. Atomic visibility is single-file, not a database or guaranteed power-loss transaction; inspect surviving lock/recovery files after process termination before manual recovery. No automatic deletion of customer data.

## Stage 3 — authorized automated validation

Local npm test **34/34**. Exact JSON config consent and declared Node test entrypoint SHA-256 are required; no shell or npm/build command fields exist. CLI writes require configured automated validation. Trusted programmatic API callers supply a validation callback; callbacks are application code, not a security sandbox. Child environment excludes inherited tokens/secrets, output is bounded and summarized by hash rather than copied into public reports. Whole-validation deadlines stop the child process group/tree. Tests prove successful real Node execution, failing tests, timeout rollback, changed-script rejection and unapproved-command rejection.

Optional Playwright uses the existing local-only visual adapter, bounded parameters and an abortable deadline. Images remain in a uniquely named OS temporary directory; public validation summaries contain image hashes and an artifact basename, never the user's absolute temp path. Real UI matrix and model/application acceptance are recorded in Stage5. Approved entrypoint hashes do not sandbox imported code; maintainers must trust their project/test dependency tree before consenting.

## Stage 4 — local preparation and explicitly approved Draft PR

Local npm test **37/37** including real temporary Git repositories, exact file staging, unchanged main, unrelated-index refusal, offline preview and a mocked GitHub transport asserting Draft creation/no merge/no force. Local Git hooks, fsmonitor and signing hooks are disabled for controlled Git operations; a failing pre-commit hook is explicitly exercised. Remote preview binds HEAD, base, branch, file list, title and full body bytes. Nothing contacts the network until --publish plus matching --approve; live origin/main must still match the reviewed base. Explicit origin identity prevents publishing to a credential-bearing or different URL. Failed publication can leave the approved topic branch pushed; inspect and retry rather than deleting/force-pushing. Remote Github auth remains user-managed, no tokens stored by ZeroLoc.

No testing callbacks or transport injection is accepted through project JSON or CLI. Library injection points are trusted caller code. Validation reports are evidence, not cryptographically signed attestations; resource/quality checks are rerun and exact report bytes are part of local approval. Public reports omit child stdout, secrets and absolute screenshot locations; source/candidate text is repository data and must be reviewed before authorizing publication.


## Stage 5 — real application and model

Final local npm test **41/41**. Added real React/i18next rendering to the normal cross-platform unit suite and actual CLI preview/approval/config consent tests, plus stale target bytes, missing-parent patch execution and surviving lock refusal.

[Sanitized real model evidence](verification/v02-real-model.json): existing local Ollama0.40.6, qwen2.5:0.5b digest a8b0c51577010a279d933d14c2a8ab4b268079d44c5c8830c0a93900f1827c67, actual returned candidate {"key":"app.newGreeting","value":"Hallo {{name}}, "}. Source update creates a missing German key, model creates a candidate, exact plan/config approval applies it, real Node tests and Chromium/Firefox8 UI cases pass, then a local topic branch is prepared with main unchanged. Unit failure, actual overflow/a11y UI failure and timeout each restore original bytes; conflict preserves the outside edit. No cloud API/model download.

CI runs the same real React app against a clearly labelled local HTTP protocol stub, not an Ollama model. The visual job retains its existing name and executes both the old12-case matrix and new8-case workflow with rollback controls. The four OS/Node regression jobs execute all41 tests. Actual remote verdicts must be read from the latest Draft PR Checks; no local result is labelled as remote. [CLI and trust boundaries](V02_SAFE_APPLY_CN.md), [stage evidence](verification/v02-stages.json).

Fresh npm audit:0 vulnerabilities;112 locked license entries; local CycloneDX:101 installed components. Dependency/platform counts differ by installation, not licence inventory scope. Dev metadata0.2.0-dev.0 is not a release or tag.

Final security regression: approved filenames beginning with -- are passed as checked absolute Node test entrypoints, never CLI flags. A path resolver/Promise callback naming collision found during validation was fixed; full41/41 and five real-model scenarios were rerun successfully.

## Remote Draft PR acceptance

[Draft PR #6](https://github.com/fangyuxu658-star/zeroloc-gate/pull/6) was created using the actual new CLI, after offline preview and exact publication approval. [First remote CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39383958891) passed5/5 on 031c7e9c1383765b1bbe4a84887d66c139c8b07a: Windows/Linux Node22/24 each41/41; visual retained12 cases and ran the five-scenario React workflow with8 success UI cases. CI uses an explicit protocol stub, not a real model. Check the latest PR head checks after follow-up changes.

Final report hardening: callback/filesystem exceptions after replacement are represented by fixed failure codes, preventing arbitrary private exception text from entering public apply reports. A synthetic private-marker regression verifies exact rollback and redaction. Main remains bcb542a, ruleset25455995 Active/no bypass, unchanged five checks. No merge or release.
