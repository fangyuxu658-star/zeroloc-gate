# Stabilization status

更新：2026-10-19，stabilization 已完成本地验收。范围冻结：稳定、验证、文档化；不增加产品功能。`fully verified` 仅指列明的环境/输入，不能外推为翻译质量或全部平台通过。

当前目标 **v0.1.0-beta.1**：版本元数据/Release Notes 已准备，候选版重新通过 21/21 回归、12 组浏览器 QA 和真实 Ollama E2E。Gitleaks 与公开候选路径/隐私扫描已执行，最新证据见 [发布审查](docs/PUBLICATION_READINESS_CN.md)。gh 已认证并核实为 `fangyuxu658-star`；拟建 public `fangyuxu658-star/zeroloc-gate`，等待最后明确批准。没有创建远端、push、PR、tag 或 Release。

## Fully verified

- Windows / Node 25.2.0 / npm 11.6.2：锁文件重新安装；21/21 单元、CLI 与适配器回归通过。
- plain / i18next / ICU 的结构校验，旧 CLI 兼容，JSON/SARIF 和退出码正负例。
- 固定 i18next-cli 真实提取及 before/after 预览；不写资源，不删除键。
- 翻译适配器的本地 HTTP 测试、离线 dry-run、候选结构拒绝、限流、超时、重定向拒绝、响应大小限制及人工译文保护。这里使用测试服务，不是真实模型。
- Chromium × en/de/ja × 两种视口共 6 组；负例检出溢出与无名称按钮。
- **独立缓存**下 Chromium/Firefox × 3 locale × 2 viewport 完整 12 组，连续两次通过；Firefox 自身额外 6 组及负例通过。未修改系统库、安全策略或产品代码。
- **真实 Ollama**：官方 SHA-256 校验的 0.40.6，可移植进程只监听 `127.0.0.1:11435`、禁用云端；CPU 执行 qwen2.5:0.5b（约 398 MB）。真实 CLI 生成 3 条候选 → 独立副本 check 0 错误；原目标字节未改、人工 title 保留。模型 digest `a8b0c51577010a279d933d14c2a8ab4b268079d44c5c8830c0a93900f1827c67` 与实际 Apache-2.0 许可已存证。
- 107 个锁定 npm 包许可门禁；当前机器 96 个已安装组件的 CycloneDX SBOM；当次 npm audit 为 0 已知漏洞（有时效性）。
- 实际 Git 根 workflow 已补齐，工作目录/上传路径/固定 SHA/只读权限/无 secrets 已本地解析验证；根 MIT LICENSE、remote/PR 文档与 PR 模板已准备。

证据：[stabilization 结果](docs/STABILIZATION_RESULTS_CN.md)、[PR 1–5 历史验收](docs/IMPLEMENTATION_RESULTS_CN.md)、[保存的日志](docs/verification/)。

## Partially verified

- 视觉 QA 环境：原 `%LOCALAPPDATA%` 默认 Firefox 缓存仍报 mozglue 并行配置错误，根因未完全确定。项目独立缓存方案已可重复通过；需在同一 shell 设置 PLAYWRIGHT_BROWSERS_PATH，见 [复现步骤](docs/STABILIZATION_ENVIRONMENT_CN.md)。
- 模型输出质量：真实推理已验证，但本次 `Continue` 仍返回英文，结构门禁正常通过。不能宣传完整自动翻译或无人审核；其他两个字符串已译为德语，人工语义复核仍必要。
- GitHub CI：workflow 已写、YAML/固定 SHA/权限检查通过；尚未在 GitHub 执行。
- 许可证：已核查当前 npm 依赖并保存声明；未包含模型权重和浏览器二进制的再分发许可核查。

## Not yet verified

- Node 22/24、Linux 和 GitHub Actions 的真实运行；fork PR 的远端权限行为与故意失败 PR 示例。
- GitHub remote、远端 PR、分支保护与 beta Release：当前外层仓库无提交和 remote。
- 更大/其他模型、GPU 推理与跨机器稳定性；已验证模型之外的模型/数据权利和模型再分发。
- 语义翻译质量、完整无障碍合规、截图像素基线、真实客户应用适配。

本地可展示范围已具备；**尚未完成完整公开 beta 发布门槛**，主要剩余项是真实 GitHub CI、远端 PR/分支保护与发布审核。执行 [release checklist](docs/RELEASE_CHECKLIST_CN.md)。没有配置虚构 remote，没有 push、创建远端 PR 或发布。
