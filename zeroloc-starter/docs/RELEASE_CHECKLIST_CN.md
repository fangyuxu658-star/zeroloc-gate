# v0.1.0-beta.1 release checklist

功能冻结；无合并、main 写入、远端规则修改或发布授权。项目 package 保持 private=true，发布目标为 GitHub pre-release，不是 npm 或 v0.2。

## 已有基础

- [x] 公开 MIT 仓库与 origin：[仓库](https://github.com/fangyuxu658-star/zeroloc-gate)；初始无父提交 4a64f6d6350ed5e80c1738ffa145a8dba46da66f，GitHub noreply 作者。
- [x] [首次 main CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39347428254) 5/5；四个系统/Node 组合各 21/21，双浏览器 12 组与结构化 artifacts 已核验。
- [x] 本地真实 Ollama、独立 Firefox 缓存及正负结构校验已记录，人工译文保留。
- [x] 许可证/NOTICE/SBOM 和历史公开文件扫描已完成；此轮复核见验收日志。模型、工具、凭证、本机缓存不提交。

## 本次 PR 验收

- [x] [正常 Draft PR #1](https://github.com/fangyuxu658-star/zeroloc-gate/pull/1)；[真实 PR CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39349812116)：success，5/5 jobs 通过，4 个系统/Node 组合各 21/21，视觉 12 组通过。记录运行的 head=8817f1b2f4ea4beecd01f6122783dca098f3468f。
- [x] [负例 Draft PR #2](https://github.com/fangyuxu658-star/zeroloc-gate/pull/2)；[故意失败 CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39349987984)：failure。移除合成德语 greeting 的 name 后，直接 CLI 退出 1 并定位 app.greeting / PLACEHOLDER_MISMATCH；远端检查失败。PR 已关闭且未合并，合成错误未进入 main。
- [ ] 外部 fork PR：需要不同贡献者/真实 fork 场景，目前未运行，不能勾选。
- [ ] main 的必要检查/PR 保护：目前未启用；配置方案已准备，待独立批准。
- [ ] 批准并合并正常 PR（本任务禁止合并）；负例永不合并。
- [ ] 合并后重新核对 main 的 commit、完整 CI、公开内容和附件摘要。

## 发布前人工批准

- [ ] 维护者接受已知限制：小模型未译 Continue、默认 Windows 缓存、未测真实 fork；不得作语义/全面安全保证。
- [ ] 启用拟定保护或明确接受未启用的合并风险；实际 read-back 证实前不标为 enabled。
- [ ] 在最终经验证 main commit 上批准 v0.1.0-beta.1 tag 和 GitHub pre-release，非 latest stable。
- [ ] 发布附件只有源码、SBOM、许可、脱敏验证摘要与 SHA-256；发布当天刷新 audit。无模型、运行时、私钥或原始本机日志。
- [ ] 发布说明填最终 commit 与 Release URL；当前 Release Notes 仅为草稿。

当前正式发布 **NO-GO**；测试通过不等于已获合并或发布授权。[完整验收日志](BETA_RELEASE_ACCEPTANCE_CN.md)。
