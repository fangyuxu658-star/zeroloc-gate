# Stabilization 验收结果

日期：2026-10-19。产品核心实现、依赖版本、格式范围和安全边界未改动。新增内容限于状态/发布文档、实际 Git 根的 CI 入口与 PR 模板，以及显式运行的真实模型验收脚本。没有新 provider、自动应用 patch、重写解析器、push 或发布动作。

## 结果与证据

| 检查 | 实际结果 | 已保存证据 |
| --- | --- | --- |
| 现有回归 | **21/21，通过，退出 0** | [日志](verification/stabilization-tests.txt) |
| 完整多语 CLI 示例 | PASS，0 errors / 0 warnings | [日志](verification/stabilization-example.txt) |
| 依赖许可证门禁 | 107 个锁定包通过 | [日志](verification/stabilization-licenses.txt) |
| 当次 npm audit | 0 已知漏洞 | [JSON](verification/stabilization-audit.json) |
| SBOM | 已刷新，96 个本机第三方组件 | [CycloneDX](sbom.cdx.json) |
| 实际仓库根 workflow | 语法、子目录 cwd/artifact 路径、最小权限、固定 SHA 均通过本地检查 | [日志](verification/stabilization-github-layout.txt) |
| 默认 Firefox 缓存 | **仍失败**，spawn UNKNOWN / mozglue SxS | [保留的失败](verification/stabilization-visual-default.txt) |
| 隔离 Firefox | 157.0 可启动，6 组 locale/viewport 与专属负例通过 | [启动](verification/stabilization-firefox-launch.txt)、[QA](verification/stabilization-firefox-qa.txt) |
| 隔离双浏览器矩阵 | Chromium/Firefox × 3 locale × 2 viewport，**12 组连续两次通过**，负例均检出 | [第 1 次](verification/stabilization-visual-isolated-1.txt)、[第 2 次](verification/stabilization-visual-isolated-2.txt) |
| 真实 Ollama E2E | **3 条候选 → 副本 check 0 错误**；原文件未变、人工 title 保留 | [摘要](verification/stabilization-ollama-summary.json)、[候选与 patch](verification/stabilization-ollama-proposal.json)、[副本](verification/stabilization-ollama-candidate.json)、[check](verification/stabilization-ollama-check.json) |
| 文档与证据 | 66 个本地链接、9 个 JSON/SARIF 文件可解析；运行时/模型/原始 artifacts 被 Git 忽略，公开证据无本机用户名 | [日志](verification/stabilization-docs-check.txt) |

## Firefox 结论

Windows SideBySide 日志明确指出找不到 mozglue 私有程序集。固定版本重新安装到项目 `.local-tools/playwright` 后通过；旧/新 firefox.exe 与 mozglue.dll 的 SHA-256 相同，**不认定根因是二进制损坏或 VC++ 缺失**。未改 DLL、系统运行库、ACL 或安全策略。默认缓存位置仍有 blocker；独立缓存是已重复验证的稳定替代方案，不是跳过 Firefox。

安装和运行必须在同一 shell 指定 `PLAYWRIGHT_BROWSERS_PATH`。已目视检查 Firefox 德语 375×812 截图，未见截断。原始截图/findings 留在 `artifacts/visual/`，Firefox 专属负例在 `artifacts/stabilization-firefox-negative/`。复现见 [环境指南](STABILIZATION_ENVIRONMENT_CN.md)。

## 真实本地模型与质量限制

官方可移植包版本 **Ollama 0.40.6**，官方 SHA-256 完全匹配：`e359637575302f288d76c0007c408a4be9c7376d59c4f28684d63b232a44b427`，见 [分发校验](verification/stabilization-ollama-distribution.json)。本次服务只监听 `127.0.0.1:11435`，日志显示 `Ollama cloud disabled: true`，使用 CPU；没有更新系统显卡驱动。临时服务保留供本机复验，没有自启；安全停止步骤见环境指南。

模型 **qwen2.5:0.5b**，实际大小 397,821,319 字节，digest `a8b0c51577010a279d933d14c2a8ab4b268079d44c5c8830c0a93900f1827c67`。实际 `/api/show` 返回的 [Apache-2.0 许可全文](verification/stabilization-model-LICENSE.txt) 已保存。模型仅用于本地测试，未作为源码包/发布附件分发；npm SBOM 的范围不包括模型、Ollama 或浏览器二进制。

真实命令：

```sh
node qa/ollama-e2e.mjs qwen2.5:0.5b http://127.0.0.1:11435
```

验收脚本先记录服务/模型信息并预热，然后调用原有 CLI 的 translate（**没有 dry-run**），保存候选和待审 patch，再将三个已知合成字段放入单独副本，调用原有 check。脚本断言目标原文件字节未变、人工 `title` 未动、候选字段数和占位符正确。它不是通用 patch 应用功能，也没有加入默认 `npm test` 或 CI 的网络流程。

目视检查的实际输出：

| 源文 | 模型候选 | 结论 |
| --- | --- | --- |
| Hello {{name}} | Hallo {{name}} | 已翻译，占位符保留 |
| You have {{count}} items | Sie haben {{count}} Einträge. | 已翻译，占位符保留；措辞需人工选择 |
| Continue | Continue | **未翻译，已知模型质量限制** |

结构 check 为 PASS 是预期行为，不证明所有内容翻译完成。这个小模型的单次结果不足以支持“完整自动翻译”或生产语义质量承诺；未通过反复重试/修改验证器来掩盖结果。

## GitHub 与发布边界

发现原有 `.github/workflows/ci.yml` 位于 Git 根的下一层，直接发布外层仓库时 GitHub 不会发现。已增加根 workflow，明确 npm 工作目录和 artifact 路径，补根 MIT LICENSE、README、PR 模板、remote/PR/Actions 文档，未移动源码或改变架构。指南见 [GitHub flow](GITHUB_BETA_FLOW_CN.md)。

尚无 OWNER/REPOSITORY，未设置虚构 origin、访问账户、建远端仓库、提交、push 或触发 GitHub CI。远端 Node 22/24、Linux、fork PR 权限、分支保护及真正失败 PR 的证明仍未验证。这些是公开 beta 发布前的人工执行项，见 [checklist](RELEASE_CHECKLIST_CN.md)。

公开证据副本只包含合成示例；本机用户目录前缀已替换为 `<USERPROFILE>`，原始本地输出保留在被忽略的 artifacts 中。发布前仍由维护者核对最终 tag/commit、权限、附件和披露范围。
