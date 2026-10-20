# ZeroLoc v0.1.0-beta.1 verification status

当前真实 main：d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a，来自 [PR #1 Squash Merge](https://github.com/fangyuxu658-star/zeroloc-gate/pull/1)；[main CI 5/5](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39356683284)，commit d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a。本文件属于 main 派生的文档收尾分支，尚未合并；未直接 push main，未创建 Tag/Release，规则未应用。旧 initial main 是 4a64f6d，不再作为最新状态。

## Fully verified

- PR #1 最终 head 4de289b 的 [PR CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39350314338) 5/5；Squash 后 main CI 独立完成 5/5，四个 Ubuntu/Windows × Node 22/24 组合各 21/21；Linux Chromium/Firefox × 3 locales × 2 viewports 共 12 组，故意溢出/无名称按钮正确检出。
- main 四份 JSON/SARIF 报告均 0 errors/results；SBOM Linux 97、Windows 96 个组件；13 张截图已下载核验。main 日志实际 Contents:read，无 secrets 引用，checkout 不保留凭证。
- main squash commit 作者是官方 noreply，committer GitHub noreply，GitHub 签名验证通过；树与已审核 PR head 完全一致。仅合并获授权 PR #1，负例 [PR #2](https://github.com/fangyuxu658-star/zeroloc-gate/pull/2) 保持 CLOSED/未合并，CLI 退出 1 的错误证据保留。
- 107 项锁定依赖许可与原始声明检查通过；本轮本地/远端 audit 为 0 漏洞。核心 MIT、第三方清单、CycloneDX 已复核；扫描无秘密发现，启发式检查不代表绝对保证。
- 格式门禁、真实 i18next 提取、本地 HTTP provider 安全负例、独立缓存 Firefox 与真实 Ollama 0.40.6/qwen2.5:0.5b CPU E2E 的既有证据保留。人工译文未覆盖，候选需人审。

## Partially verified

- main protected=false、rulesets=[]、effective rules=[]；public/admin 资格及规则草案已核查，但未应用、未动态验证阻断。CI 红灯不等于服务器强制阻止合并。
- Fork PR 静态安全审查通过；真实外部 Fork 尚未运行，同仓 PR 不能冒充该证据。
- Windows 原默认 Firefox 缓存 mozglue 问题仍披露，独立缓存与 Linux CI 可运行；小模型把 Continue 原样返回，结构成功不代表翻译语义质量。

## Not yet verified / not authorized

- 外部 Fork 实际权限/secret 行为、GPU/其他模型/真实客户应用、完整无障碍/语义/像素质量。
- 本次文档 PR 合并及其 resulting main CI；Ruleset 应用与 read-back；正式 Tag 和 GitHub Pre-release。仅 PR #1 合并获准，其他 PR 不自动合并。

判断：已验证 main 的工程检查 **GO**；对外发布执行仍 **NO-GO（待批准）**。见 [收尾研发日志](docs/RELEASE_CLOSEOUT_CN.md)、[Checklist](docs/RELEASE_CHECKLIST_CN.md)、[Release Notes](docs/RELEASE_NOTES_v0.1.0-beta.1.md)。
