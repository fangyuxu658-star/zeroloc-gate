# v0.1.0-beta.1 release closeout

## 当前真实状态

- PR #1 的最终 head 为 `4de289b46f695ecbc446cdef9ffd63897fd84fe9`；[最终 PR CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39350314338) 5/5 成功。最终 diff 13 文件，仅文档/证据与 npm test 发现范围修复；产品源码、lockfile、workflow 无变更。
- 用户已单独授权 PR #1 转 Ready、Squash Merge。Ready 成功；合并 API 以 `Invalid email address` 拒绝指定 noreply 作者地址，**未合并**。没有尝试可能暴露私人邮箱的默认作者地址。
- gh 已认证 fangyuxu658-star；当前 token 没有读取账户邮箱所需 scope。需要维护者在 GitHub Settings → Emails 确认 Keep my email addresses private 和实际 noreply 地址；不索取或发布私人邮箱。
- main 仍为 `4a64f6d6350ed5e80c1738ffa145a8dba46da66f`；合并后的 main CI 尚不存在，不能将 PR CI 或首次 main CI 冒充该结果。负例 PR #2 CLOSED、mergedAt=null。
- 本分支仅为本地收尾草案，未合并入 main。规则、Tag、Release 均未创建。

## 本轮复核与限制

本地 npm test 21/21；check:example 0 errors/0 warnings；licenses:check 核对 107 项锁定依赖，无未审许可表达式；npm audit 所有级别共 0 vulnerabilities；CycloneDX 重新生成。公开 main/正常分支三项提交 Gitleaks 无发现；正常分支作者均为 GitHub noreply。发布目标确定后必须对实际 main SHA 和公开附件再扫一遍。

原始 Firefox 缓存限制、独立缓存替代方案、小模型未译 Continue、结构不代表语义质量、真实外部 Fork 尚未动态验证，继续保留在 STATUS/Release Notes。没有开发新功能或启动 v0.2。

## 待批准 Ruleset（未应用）

仓库只读 API 确认 public、当前账号 admin=true、allow_squash_merge=true；rulesets=[]、effective rules=[]。GitHub 官方文档说明公开仓库可用 Rulesets，包括 Free。读接口成功不替代实际设置后的 read-back 和拒绝测试。

规则 JSON：[main-ruleset.proposed.json](verification/main-ruleset.proposed.json)。仅 refs/heads/main；启用 active；无 bypass；要求 PR、仅 Squash、讨论解决、0 个强制批准、无 CODEOWNER/最后推送者额外批准。必要检查为 Ubuntu/Windows × Node 22/24 四项 regression 加 visual，绑定 github-actions app ID 15368，strict 要求基于最新 main；禁止删除和强推。不启用 restrict updates、签名或合并队列等可能增加单人维护门槛的额外规则。

批准后才调用规则创建 API；随后读回配置，并验证失败检查不可合并。JSON 中 active 是拟定值，不表示已生效。

来源：[Ruleset 可用性与创建](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)、[Rules API 字段](https://docs.github.com/en/rest/repos/rules)、[提交邮箱隐私](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)。

## 发布候选与后续门禁

目标 Tag：v0.1.0-beta.1（尚未创建）；Release 标题：ZeroLoc Gate v0.1.0-beta.1；类型：GitHub Pre-release，非 latest stable；npm package 保持 private=true。发布正文见 [Release Notes](RELEASE_NOTES_v0.1.0-beta.1.md)，包含安装命令、能力、限制和历史 CI；最终正文必须回填合并后的真实 main SHA/CI。

1. 有效 noreply 配置确认后，重新锁定 PR #1 head 和五项检查，完成已授权 Squash Merge。
2. 等待合并后的 main CI 完整 5/5；任何失败即停止发布并报告。
3. 在 main 派生的文档分支更新 STATUS、验收记录和 Release Notes。其他 PR 合并没有授权；如需文档 PR 合并必须单独批准，不直接 push main。
4. 规则方案单独批准后才应用，或者由维护者明确接受未启用风险。
5. 对最终候选 commit 复核敏感信息、MIT/第三方声明、audit、SBOM 和全部 CI，准备源码、SBOM、许可、脱敏摘要与 SHA-256，排除模型/工具/本机原始日志。
6. 明确批准精确 commit 的 Tag 与 GitHub Pre-release 后才创建；当前没有执行 git tag、push tag 或 gh release create。

当前 **NO-GO**：Squash Merge 尚未完成，合并后 main CI 未验证，规则和发布动作未获批准。不能据此草稿声称正式发布已就绪。
