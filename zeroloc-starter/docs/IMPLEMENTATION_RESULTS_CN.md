# PR 1–5 本地验收记录

> 以下保留首次实现时的历史结果。后续 stabilization 已补齐独立缓存下 Firefox 与真实 Ollama 推理验证；最新结论见 [STATUS](../STATUS.md) 与 [stabilization 结果](STABILIZATION_RESULTS_CN.md)，不要将下面当时的“未验证”误读为当前状态。

执行顺序：先阅读 AGENTS.md 和融合方案，再完成 PR 1 → 2 → 3 → 4 → 5。各阶段完成后实际执行测试，再进入下一阶段。环境：Windows，Node v25.2.0，npm 11.6.2；CI 配置面向 Node 22/24，但本地没有冒称运行过这两个版本。

| 阶段 | 实现与实际命令 | 结果 / 证据 |
| --- | --- | --- |
| 基线 | 原始 `npm test` | 6/6 通过 |
| PR 1 格式解析 | FormatJS 3.5.21；plain/i18next/icu 显式路径；`npm test`、`npm run check:example` | 10/10 通过，旧 CLI PASS；见 [日志](verification/pr1-tests.txt) |
| PR 2 代码提取 | i18next-cli 1.77.0 真正执行提取；`npm test`、`node bin/zeroloc.mjs extract --project examples/i18next --dry-run` | 13/13 通过；得到 `menu.save=Save`，保留人工 human 键，原文件字节未改；见 [日志](verification/pr2-tests.txt) 与本地 `artifacts/pr2-extract.json` |
| PR 3 本地翻译 | Ollama generate HTTP adapter、离线 dry-run、候选 RFC 6902 patch；`npm test` | 16/16 通过；真实 loopback HTTP 测试服务验证请求、响应、限流和文件不变；见 [阶段日志](verification/pr3-tests.txt)；[最终 CLI dry-run](verification/pr3-dry-run.json) 列出 3 条待译消息、0 条已应用变更 |
| PR 4 视觉 QA | React SSR app、Playwright、axe；`npm test`、`npm run test:visual` | 16/16 回归通过；Chromium × en/de/ja × 375×812/1280×800 共 6 组通过；负例正确发现 PAGE_OVERFLOW 和 button-name；见 [回归](verification/pr4-tests.txt)、[视觉日志](verification/pr4-visual.txt) |
| PR 5 可靠性 | `npm ci --ignore-scripts`、`npm test`、`npm run licenses:check`、`npm audit --json`、`npm sbom --sbom-format cyclonedx`；CLI JSON/SARIF 正负例 | 重新安装成功；最终 21/21 通过；107 个锁定依赖许可核查通过；audit 0 已知漏洞；SBOM 包含本机安装的 96 个第三方组件；见 [测试](verification/pr5-tests.txt)、[audit](verification/npm-audit.json)、[策略检查](verification/pr5-policy-check.txt) |

PR 5 还在重新安装后再次执行视觉测试，6 组通过并检测到负例，见 [日志](verification/pr5-visual.txt)。截图及结构化报告保存在本地 `artifacts/visual/` 和 `artifacts/visual-negative/`。已目视检查德语窄屏截图，未见截断。

每阶段均包含正常与故意失败输入：

- PR 1：嵌套 plural/select、标签、引号正常；缺少 other、非法 ICU、变量错漏、混合 i18next 格式失败。发现并修复了将 `{{` 一律视为 i18next、误拒合法嵌套 ICU 的问题，最终由 FormatJS 判定。
- PR 2：真实源码正常提取；未知/双生态/Paraglide 项目和非法源码失败。配置模块与项目代码不执行，始终只给文件预览，不删除资源。
- PR 3：本地 HTTP 返回正确候选；外部 origin、重定向、cloud 模型名、危险 HTML、变量不匹配、挂起请求、过大及畸形响应均拒绝。后两类测试在 PR 5 中进一步拆分，避免将超时误当成重定向验证。没有安装或运行真实 Ollama 模型，HTTP 测试服务不被描述成模型推理。
- PR 4：正常页面通过；故意超宽元素和无名称按钮被检测。无自动修复和截图语义质量评分。
- PR 5：真实 CLI 对正确 ICU 返回 0；错误 ICU 返回 1 且产出可解析 SARIF，见 [负例报告](verification/final-negative.sarif)。配置错误返回 2。GPL/AGPL/专有/未知许可证被门禁拒绝。拒绝原型相关键；patch 带整份目标的 test 前置条件，防止旧提案误覆盖新人工编辑。CLI 演示还暴露了原始 legacy 示例混合两种占位符：保留它用于兼容性，另加纯 i18next 翻译示例，并确保已有人工译文也不能绕过源格式校验。

## 环境限制与尚未完成的发布验证

1. npm 在受限沙盒内无法解析域名，安装与扫描使用受审查的网络执行。i18next 的 SWC 安全缓存校验也拒绝沙盒 DACL；真实提取测试在正常用户环境运行，未关闭 SWC 自身检查。
2. `npm run test:visual -- --all-browsers` 曾运行失败：Firefox 启动报 `spawn UNKNOWN`，直接启动得到系统“应用程序的并行配置不正确”。见 [原始失败日志](verification/pr4-firefox-startup-failure.txt)。Chromium 的 6 组已实际通过；不能将 Firefox 的另 6 组算作通过。未修改系统运行时，完整矩阵留给具备运行环境的机器/CI。
3. 工作区 Git 仓库没有提交和 remote。因此没有创建远端 PR、push、发布或真实 GitHub Actions 运行。已提供固定 Actions SHA、最小权限、无 secrets 的真实 workflow，并解析 YAML、检查所有 uses 固定 40 位 SHA。远端运行是发布前仍需满足的门槛。
4. 未下载模型，未测试用户实际模型的语义输出，也未对模型权重/数据许可作默认授权。Ollama 软件接口不证明模型权利；用户自建 localhost 服务内部可能转发，需由服务拥有者禁用云端能力。

## 许可证产物

[核查说明](LICENSE_REVIEW_CN.md)、[完整锁定清单](dependency-licenses.json)、[原始许可与声明](THIRD_PARTY_NOTICES.md)、[CycloneDX SBOM](sbom.cdx.json)。补齐两个上游 npm 包遗漏的 LICENSE，保存固定来源和 SHA-256。没有合并 AGPL/GPL 服务或 Tolgee EE 源码。清单含未安装的平台可选依赖，SBOM 是当前安装树，两者范围明确不同；浏览器二进制和模型未捆绑。

限制、初始化、CLI 参数见 [README](../README.md)；本记录是本地实现验收，不是全部发布门槛已满足的声明。
