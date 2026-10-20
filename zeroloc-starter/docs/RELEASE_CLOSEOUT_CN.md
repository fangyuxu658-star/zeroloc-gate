# v0.1.0-beta.1 release closeout

## 已完成的真实操作

1. 重新检查 PR #1 的 13 个文件 diff、最终 head 4de289b46f695ecbc446cdef9ffd63897fd84fe9 及 [五项 PR Checks](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39350314338)，均通过；产品源码、lockfile、workflow 未改。
2. PR #1 转 Ready。首次显式 --author-email 请求被 GitHub GraphQL 拒绝：Invalid email address (mergePullRequest)。当时未合并；未传 committer 参数。此错误不能证明 noreply 拼写错误。
3. 用户确认邮箱隐私与阻止邮箱泄露均开启，官方 noreply 与原参数相同。按 GitHub 官方默认作者流程省略显式 authorEmail，锁定同一 head 使用 gh pr merge --squash 成功，不重复相同失败请求。内部邮箱校验拒绝原因未获 GitHub 服务端解释；可以确认的是显式参数被拒绝、默认隐私流程成功，不能断言账号邮箱有误。
4. [PR #1](https://github.com/fangyuxu658-star/zeroloc-gate/pull/1) 于 2026-10-20T02:01:50Z 合并为 d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a，单父提交 4a64f6d6350ed5e80c1738ffa145a8dba46da66f。作者 234267204+fangyuxu658-star@users.noreply.github.com；committer GitHub / noreply@github.com；verification=true，未暴露私人邮箱。代码树与已审核 head 相同。
5. 等待独立 [main CI 5/5](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39356683284)，commit d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a，全部成功。四个系统/Node 组合各 21/21，视觉 12 组与负例通过；报告 JSON/SARIF 全部零问题，Linux SBOM 97 / Windows 96，13 张截图下载核验。没有用 PR CI 冒充 main CI。
6. 负例 PR #2 仍关闭、未合并；没有删除分支。没有直接 push main、修改设置、创建 Tag/Release、运行付费云 API。

## 证据和复核

[版本验收 JSON](verification/release-closeout.json) 保存实际 main/run/jobs、作者和签名、安全配置、许可/audit 与待批准项。前轮 [PR 验收日志](BETA_RELEASE_ACCEPTANCE_CN.md) 保留历史，不以其旧的未授权/未合并措辞覆盖本次结果。

本地回归 21/21、示例 0 errors/0 warnings、107 项锁定依赖许可通过，npm audit 各级总计 0；main CI 再次执行同类检查并通过。公开 main 历史 Gitleaks 无发现；发布附件与文档分支将另行扫描。启发式秘密扫描不能保证发现所有未知秘密。

## 待批准的 Ruleset

仓库 public、当前账号 admin=true、allow_squash_merge=true；rulesets=[]、effective rules=[]。公开仓库支持 Rulesets；未用写设置实验来验证权限。规则 JSON：[main-ruleset.proposed.json](verification/main-ruleset.proposed.json)。仅 main；active 为拟定值；无 bypass；要求 PR、仅 Squash、讨论解决、0 个强制批准、无 CODEOWNER/最后推送者额外批准；四个 regression 加 visual 绑定 github-actions app ID 15368，strict 基于最新 main；禁止删除/强推。不启用 restrict updates、签名或合并队列等额外门槛，单维护者可完成 PR/CI 流程。

规则未应用，CI 失败的服务端合并阻断未验证。批准后创建规则、读回配置并进行非合并式拒绝验证；负例永不合并。

来源：[GitHub 邮箱隐私](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)、[Ruleset 可用性](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)、[Rules API](https://docs.github.com/en/rest/repos/rules)。

## 发布准备与批准边界

目标 v0.1.0-beta.1，标题 ZeroLoc Gate v0.1.0-beta.1，GitHub Pre-release、非 latest stable；package private=true，不发 npm。安装、功能、限制、复现见 [Release Notes](RELEASE_NOTES_v0.1.0-beta.1.md)。当前已验证代码候选是 d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a。本轮收尾文档在独立 Draft PR 供审阅，未授权合并；若批准合并文档 PR，最终 Tag 必须改为新 resulting main SHA，并等其完整 5/5 CI 后再批准，禁止打在本地未合并分支上。

已准备本地源码归档、四平台/Node 的 CI SBOM、MIT/第三方声明、脱敏摘要和 SHA-256；没有模型、运行时、私钥、node_modules 或原始机器日志。附件精确绑定目前候选 SHA，目标变动必须重建。

剩余批准：文档 PR 的合并；上述 Ruleset 应用（或明确接受当前无保护风险）；精确最终 commit 的 Tag 创建；GitHub Pre-release 发布。规则、Tag 和 Release 分开确认，本任务未执行。

工程检查 **GO**，发布执行 **NO-GO（待批准）**。残余风险：真实 Fork 未测、Windows 默认缓存、小模型漏译与结构不代表语义；均继续披露。无新功能、无 v0.2。
