# v0.2 development and verification

Base: protected main bcb542a7dc672c97be34289cbaf86667cceff118. Development branch only; no main writes, automatic merges or release. Version metadata remains the released beta until a separately authorized release decision.

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
