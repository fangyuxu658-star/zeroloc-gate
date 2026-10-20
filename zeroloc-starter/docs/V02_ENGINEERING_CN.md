# v0.2 development and verification

Base: protected main bcb542a7dc672c97be34289cbaf86667cceff118. Development branch only; no main writes, automatic merges or release. Version metadata remains the released beta until a separately authorized release decision.

## Stage 1 — safe apply

Implemented using pinned fast-json-patch3.1.1 (MIT), original distribution LICENSE.txt preserved in dependency notices. 108 locked license entries verified.

Local normal-user Windows/Node25 verification: npm test **27/27**; includes exact approval, root test, source/target staleness, human preservation, destructive operations/prototype/path rejection, junction/hardlink rejection, byte-exact backup/recovery, validation failure rollback and concurrent-edit rollback conflict. Initial restricted-sandbox run failed filesystem/loopback/subprocess checks; normal-user rerun passed, not counted as a product success until then.

Transactions are deliberately single-target-file. RFC6902 test/add/replace are supported through the library; deletion/move/copy and root replacement are disallowed. Existing proposals with no source provenance require explicit review-time --bind-legacy; this binds the current source, not proof of what source originally generated that old proposal. New translate output includes raw source/target hashes.

Only --write plus --approve <current-planId> writes. Backups and recovery records persist next to the target; only owned temporary/lock files are cleaned. Locks coordinate ZeroLoc callers. An attacker with concurrent same-user filesystem access cannot be reliably excluded by portable Node filesystem APIs; workspace permissions remain a trust boundary. Atomic visibility is single-file, not a database or guaranteed power-loss transaction; inspect surviving lock/recovery files after process termination before manual recovery. No automatic deletion of customer data.
