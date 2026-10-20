# Public beta release checklist

目标：可公开展示、声明范围准确的 beta；保持功能冻结。发布负责人逐项填写结果、commit SHA 和远端运行 URL；没有运行的项目保持未勾选。`private:true` 保持不变，不需要发布 npm 包。

## 本地稳定性

- [x] 建立 STATUS.md，区分 fully verified / partially verified / not yet verified。
- [x] 最终稳定化版本 `npm test` 21/21 全通过，日志与环境已保存。
- [x] `npm run check:example` 通过；回归中的真实坏输入退出码 1，配置错误退出码 2。
- [x] 独立缓存下固定版本 Firefox 与 Chromium 完整 12 组矩阵连续两次通过；两个浏览器的负例可检出问题；保存修复/隔离步骤与截图。原默认缓存 blocker 仍披露。
- [x] 真实 Ollama 0.40.6 / qwen2.5:0.5b 推理 → 3 条 CLI 候选 → 副本 check 通过，原始人工译文不变；模型 digest、许可和版本已保存。已披露 Continue 未翻译，不能外推语义质量。
- [x] README/命令与本机验证一致；66 个本地文档链接、9 个结构化证据文件通过检查，已记录 blocker 和替代方案。

## GitHub remote 与 CI（仍需远端操作）

- [ ] 选定实际 OWNER/REPOSITORY，确认公开范围与仓库所有权。
- [ ] 设置并验证 origin；初始提交包含根 `.github/workflows/ci.yml` 和子项目，未包含运行时、模型、凭证或客户数据。
- [ ] main 首次 CI 在 Ubuntu/Windows × Node 22/24 全通过，记录 URL：________。
- [ ] Linux Chromium/Firefox 完整矩阵通过，下载并检查 artifacts，URL：________。
- [ ] 正常 Draft PR 的 checks 通过，人工审核后合并，URL：________。
- [ ] 测试用破坏占位符 PR 正确失败，关闭/恢复且不合并，URL：________。
- [ ] fork PR 验证无 secrets、只读 token、checkout 不留凭证，URL：________。
- [ ] main 配置 PR 审核和必要状态检查；禁止绕过失败门禁。

## 许可证、安全与展示材料

- [x] `npm run licenses:check` 107 项通过，LICENSE/NOTICE 副本和补充来源可追踪。
- [x] 已于 2026-10-19 刷新 `npm audit --json`（0 已知漏洞）和 CycloneDX SBOM（96 本机组件）；发布当天再次检查时效性。
- [x] 当前源码候选只含合成资源；已脱敏日志，本次 Gitleaks 无泄露命中，路径/隐私扫描无未解决项。实际首次提交及 push 前再次核对文件和 noreply 作者。
- [x] 模型只供本地验证，不捆绑权重；名称、digest、实际许可与人工复核要求已记录。
- [ ] 演示录制：good catalog PASS → bad placeholder FAIL → 提取预览 → 本地翻译 patch → 双浏览器报告；不宣传自动保证语义质量。
- [x] v0.1.0-beta.1 Release Notes 草稿列出支持格式、退出码、已验证范围和限制；实际 CI/PR 链接与最终 commit 待远端验证后填入。

## 发布动作（不自动执行）

- [ ] 在通过全部要求的 commit 上，由维护者确认目标 beta tag `v0.1.0-beta.1`；尚未创建。
- [ ] GitHub Release 标记 pre-release，附源码、SBOM、校验和、许可与已脱敏验证报告；排除 node_modules、模型、Ollama 和浏览器二进制。
- [ ] Release 链接、CI 运行 URL、tag/commit、已知问题更新到 STATUS。

若 Windows 默认 Firefox 缓存仍无法启动，允许展示已通过的项目隔离缓存方案，并明确其环境前提；若没有任何 Firefox 结果，则 beta 只能宣传 Chromium 演示。若真实 Ollama 未通过，则只宣传格式检查/提取/视觉 QA，不演示“真实模型翻译已验证”。远端 CI 尚未运行时，不宣称 beta 已达到完整发布门槛。
