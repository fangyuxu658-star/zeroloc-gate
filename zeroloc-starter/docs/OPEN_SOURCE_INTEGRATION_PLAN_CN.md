# ZeroLoc 开源组件融合方案（2026-10-19）

> 状态：原始实施蓝图，PR 1–5 已依次在本地实现并验证；实际范围与未完成的远端/环境验证见 `IMPLEMENTATION_RESULTS_CN.md`。下表包含后续候选组件，不能把全部候选描述成已集成。

## 产品原则
- Git 仓库为事实来源；默认纯本地、无登录、无遥测、无托管依赖。
- ZeroLoc 不重写通用国际化 SDK 或 TMS；通过可替换 Adapter 复用它们。
- AI 输出是未受信任输入；生成的译文、命令、补丁均需经过结构化校验和沙盒/权限边界。
- 永不默认 push、merge、deploy 或运行不受信任仓库提供的危险脚本。
- 默认保留 MIT 项目许可证；所有第三方依赖单独验证 LICENSE、NOTICE、版本及模型权利。

## 经核查的项目与建议集成方式

| 功能 | 上游项目 | 仓库 | 许可证（上游当前描述） | ZeroLoc 集成方式 |
|---|---|---|---|---|
| ICU 语法解析 | FormatJS parser | https://github.com/formatjs/formatjs | MIT（`@formatjs/icu-messageformat-parser`） | npm 依赖；取代 ICU 路径的正则解析 |
| i18next 代码提取 | i18next-cli | https://github.com/i18next/i18next-cli | MIT | CLI 适配器：仅对 i18next 项目调用它 |
| 编译型 i18n | Paraglide JS | https://github.com/opral/paraglide-js | MIT | 独立可选 adapter，**不要**与 i18next 提取器强行混用 |
| 国际化开发框架 | Lingui | https://github.com/lingui/js-lingui | MIT | 后期可选 format adapter |
| 跨浏览器 E2E | Playwright | https://github.com/microsoft/playwright | Apache-2.0 | 可选测试插件，需要客户提供可运行 app 和测试 URL |
| 无障碍规则检查 | axe-core | https://github.com/dequelabs/axe-core | MPL-2.0（检查上游额外条款） | 依赖/单独适配器；保留许可证与声明 |
| 本地通用模型 | Ollama | https://github.com/ollama/ollama | MIT（软件） | localhost HTTP API provider；模型权利独立核验 |
| 离线机器翻译 | Argos Translate | https://github.com/argosopentech/argos-translate | MIT（软件） | 可选 Python 子进程 / 本地 HTTP sidecar；模型包权利另核 |
| 机器翻译 HTTP 服务 | LibreTranslate | https://github.com/LibreTranslate/LibreTranslate | AGPL-3.0 | 对**单独部署实例**做可选 HTTP provider，不复制其源码入 MIT 核心；请复核具体分发/部署义务 |
| 本地化服务管理 | Weblate | https://github.com/WeblateOrg/weblate | GPL-3.0-or-later | 仅做可选互操作/导入导出，不合并整套 Python 服务到 MIT 核心 |
| 带上下文编辑器 | Tolgee | https://github.com/tolgee/tolgee-platform | Apache-2.0 核心；EE 目录专有 | 可以研究/适配 Apache core；不得把 EE 代码当开源复制 |

## 推荐模块边界

```
zeroloc-cli
   |-- core/catalog          JSON leaf strings / canonical diagnostics
   |-- core/icu              optional FormatJS parser; AST validation
   |-- adapters/i18next      i18next-cli project detection and extraction
   |-- adapters/paraglide    Paraglide / inlang project detection
   |-- providers/ollama      optional local-model translation
   |-- providers/argos       optional Argos sidecar
   |-- providers/libre       optional LibreTranslate HTTP
   |-- checks/visual         optional Playwright + axe
   |-- git/report            JSON + SARIF + optional patch-only report
```

## 不可犯的架构错误

1. 现在的 `getPlaceholders()` 是简单正则，支持 `{name}` 和 `{{name}}` 的基础检查，但不是真正的 ICU 解析器。对 ICU 格式必须走 AST；对 i18next `{{...}}` 必须走独立解析/规则路径，不能用 ICU parser 误解析。
2. i18next、Paraglide、Lingui 是**不同生态/格式**，应识别项目类型再加载 adapter，而不是在所有用户项目默认安装全部框架。
3. Playwright 需要网站可启动、具有测试页面和稳定数据；不能仅靠 JSON 文件检查 UI 溢出。
4. 翻译前复制每个消息的语义和变量定义，翻译后再验证 ICU、标记、变量、HTML 安全与编码。AI 文本不得作为 shell 命令或未经审查的补丁直接执行。
5. 绝不能将上游开源服务的 **API 可访问**误等同于其源码可无条件复制；许可证、静态/动态链接、衍生作品、模型权重和再分发都要分别核查。
6. 不要连接客户账户、第三方付费 API、远端仓库 push 或 CI secrets，除非明确授权。

## Codex 逐阶段开发任务

### PR 1：格式解析与测试（优先）
- 添加 `@formatjs/icu-messageformat-parser`，为 ICU 目录构建 AST 校验，并保留针对 i18next 插值格式的独立路径。
- 定义 `format: plain|i18next|icu`；如无法推断，要求用户配置而不是猜测。
- 用测试覆盖嵌套 plural/select、`other` 缺失、标签/引号、变量错漏、非法语法、嵌套 JSON、空字符串、混合占位符。
- 保持原有 CLI 兼容；所有旧测试通过。

### PR 2：代码提取适配器
- 仅检测到 i18next 项目时通过稳定、版本固定的 `i18next-cli` 执行/调用提取；不要自动连接 Locize 或其他服务。
- 将提取结果映射为 ZeroLoc 标准 Catalog；提供 dry-run 和预览文件差异。
- 加入 Paraglide（inlang）项目检测入口，但首次可先给明确的不支持提示；后续作为独立 PR 实现。

### PR 3：本地翻译 Provider
- 提供 `TranslationProvider` 接口；第一版实现 Ollama 本地 HTTP adapter。Argos 可后续增加 sidecar。
- 提供 `zeroloc translate --provider ollama --dry-run`；明确由使用者安装运行本地模型。
- 限制并发、设置超时、日志脱敏；原始字符串永不默认传输到外部云端。
- 将翻译候选输出为 patch，不自动覆盖已有人工译文。

### PR 4：可复现的视觉 QA
- 给出 React 演示 App，并用 Playwright 在多个 locale/viewport 中做 screenshot、overflow 与基础 a11y 检查。
- 将 findings 写入结构化 JSON，不承诺仅凭截图能判定自然语言质量。
- 自动修复仅允许受限、可重放且已测试的改动；默认 PR 审核。

### PR 5：CI 与项目可靠性
- GitHub Action 使用最小 permissions、锁定依赖版本、禁止 fork PR 读取 secrets。
- 生成 JSON、必要时 SARIF；提供清楚的项目初始化文档与贡献者指引。
- 引入依赖许可证清单（SBOM）和回归测试数据，不滥用其他项目的名称或商标。

## 发布门槛
- 每个 PR 既要有正常示例，也要有**故意失败**的测试，证明检测能够阻止危险变更。
- 列出处理不正确/不支持的内容；不允许声称 100% 翻译质量或无需人工复核。
- 对外发布前完成许可证清单、安全扫描、`npm test`、CLI 真实演示、GitHub CI 真实示例。

## 重要来源
- FormatJS parser: https://github.com/formatjs/formatjs/blob/main/packages/icu-messageformat-parser/package.json
- i18next CLI: https://github.com/i18next/i18next-cli
- Paraglide: https://github.com/opral/paraglide-js
- Lingui: https://github.com/lingui/js-lingui
- Playwright: https://github.com/microsoft/playwright
- Ollama: https://github.com/ollama/ollama
- Argos: https://github.com/argosopentech/argos-translate
- Weblate: https://github.com/WeblateOrg/weblate
- LibreTranslate: https://github.com/LibreTranslate/LibreTranslate
- Tolgee: https://tolgee.io/licencing
