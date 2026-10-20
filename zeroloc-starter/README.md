# ZeroLoc Gate


本地优先的嵌套 JSON 本地化质量门禁。MIT 核心通过可替换适配器复用 FormatJS、i18next-cli、Ollama HTTP、Playwright 和 axe-core；不要求账号、凭证或托管服务。结构匹配不代表语义翻译正确。

已发布 beta：[v0.1.0-beta.1](https://github.com/fangyuxu658-star/zeroloc-gate/releases/tag/v0.1.0-beta.1)。本分支为未发布的 **v0.2 Safe Apply 开发版**，参见 [新 CLI/授权/恢复说明](docs/V02_SAFE_APPLY_CN.md)、[真实验收](docs/V02_ENGINEERING_CN.md) 和 [STATUS](STATUS.md)。本地功能免费、自部署、无云端依赖；GitHub 仅为显式选择的远端适配器。

## 初始化

需要 Node.js 22+、npm。进入本目录后：

```sh
npm ci --ignore-scripts
npm test
npm run check:example
npm run licenses:check
```

安装依赖需要网络；安装后普通 `check`、`extract`、测试默认不访问网络。只安装核心可用 `npm ci --omit=dev --omit=optional --ignore-scripts`；此时提取器、演示页和浏览器测试不可用。`npm test` 是开发完整安装的测试入口。

## 格式检查

```sh
node bin/zeroloc.mjs check --source examples/locales/en.json --targets examples/locales/de.json --format json
node bin/zeroloc.mjs check --source test/fixtures/icu-source.json --targets test/fixtures/icu-good.json --message-format icu --format sarif
```

`--message-format plain|i18next|icu` 显式指定资源语法；`--format text|json|sarif` 是报告格式。省略 message-format 保留旧 CLI 的简单 `{name}` / `{{name}}` 检查路径；遇到复杂 ICU 必须明确配置，不猜测项目格式。`plain` 把花括号视为普通文本。ICU 使用 FormatJS AST 校验语法、变量类型、分支和标签；语言之间允许不同 plural 类别。i18next 支持 `{{name}}` 与 `{{- name}}`，校验转义模式不变。

退出码：0 通过；1 门禁发现问题；2 配置、输入或运行错误。`--strict-extra` 将额外键警告视为失败。

## i18next 提取预览

```sh
node bin/zeroloc.mjs extract --project examples/i18next --locales en,de --dry-run
```

只在 package.json 声明 i18next/react-i18next 时调用固定版本 i18next-cli。输出标准扁平 Catalog 及文件 before/after 差异；始终只预览，不删除键、不写资源文件。只扫描 `src/**/*.{js,jsx,ts,tsx}`，预览路径为 `locales/<locale>/<namespace>.json`。不执行项目脚本、JS/TS 配置或插件，不连接 Locize。Paraglide/inlang 会被识别并明确提示尚不支持提取；同时检测到两种生态时要求分开项目目录。

## Ollama 候选翻译

Stabilization 已用 Ollama 0.40.6 + qwen2.5:0.5b 在本机 CPU 完成真实端到端验证，3 条候选的副本结构校验通过，人工字段与原文件保持不变。其中 `Continue` 仍返回英文，属于已记录的模型质量限制。官方可移植包校验、禁云启动、模型下载、复现与停止步骤见 [环境验证指南](docs/STABILIZATION_ENVIRONMENT_CN.md)，结果见 [STATUS](STATUS.md)。模型和运行时均不进入仓库。

用户自行安装运行 Ollama，独立检查并安装所选模型的权利。将 Ollama 配置为仅本地推理、禁用云端能力。ZeroLoc 只接受 loopback HTTP origin、拒绝重定向及含 cloud 的模型名；无法审核用户自建服务内部是否转发请求。

```sh
node bin/zeroloc.mjs translate --provider ollama --model YOUR_LOCAL_MODEL --source examples/translation/en.json --target examples/translation/de.json --source-locale en --target-locale de --message-format i18next --dry-run
```

`--dry-run` 完全离线，仅列出待译消息和变量定义。去掉它才请求本地模型，将 stdout 保存为待审核报告。只为缺失/空值生成候选，保留非空人工译文；报告的 `patch` 是针对原始嵌套 JSON 的 RFC 6902 操作数组，包含整份原始目标的 test 前置条件。不会应用 patch，也不执行模型文本。用于演示的德语文件故意缺少三条消息，直接 check 会以退出码 1 报告缺失；原始完整多语示例仍可用 `npm run check:example`。

并发默认 2，`--concurrency 1..4`；每次请求默认 30 秒超时，限制响应大小，错误不输出原文或服务响应。候选必须通过格式、变量、标签及基本编码校验。HTML 属性、危险标签和编码实体不在支持范围；此过滤器不是通用 HTML sanitizer。含 HTML 的项目需独立的成熟渲染/消毒流程。

## 视觉 QA

```sh
npx --no-install playwright install chromium firefox
npm run test:visual
npm run test:visual -- --all-browsers
npm run demo
node bin/zeroloc.mjs visual --url http://127.0.0.1:4173 --output artifacts/my-app
```

详见 [演示说明](demo/README.md)。默认 Chromium × 3 locale × 2 viewport，完整矩阵另加 Firefox。截图、溢出和 axe findings 输出到 JSON。自有 App 必须先运行，支持 `?locale=` 和稳定测试数据。不会从 JSON 推断 UI，不自动修复、不作自然语言质量保证。

本机默认 Firefox 缓存存在 mozglue 并行配置 blocker；使用项目独立缓存后，完整 12 组已连续两次通过。在 PowerShell 中先设置 `$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.local-tools\playwright'`，然后在同一 shell 安装和运行浏览器。详见 [诊断与复现](docs/STABILIZATION_ENVIRONMENT_CN.md)。

## CI、许可证与发布

[实际仓库根 CI workflow](../.github/workflows/ci.yml) 配置为在 PR（含 fork PR）/main 上运行 Node 22/24、Linux/Windows 回归及 Linux 浏览器矩阵；[首次真实运行](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39347428254) 的 5 个 jobs 已全部成功。只授予 contents:read，无 secrets 引用，checkout 不保留凭证；Actions 固定提交，npm 使用 lockfile 和 ignore-scripts。SARIF 作为 artifact 保存，不申请安全事件写权限。

## GitHub remote usage 与 PR flow

Git 根在本目录上一层，源码位于 zeroloc-starter/。origin 已配置为 https://github.com/fangyuxu658-star/zeroloc-gate.git，main 首次提交为 4a64f6d6350ed5e80c1738ffa145a8dba46da66f。从最新 main 创建测试/文档分支，经本地检查后 push 并建立 Draft PR，观察 PR Checks 后由维护者决定合并；禁止直接改 main 或合并故意失败代码。main Ruleset25455995 已 Active，要求PR、五项必要CI和零强制审批；不得自动合并或绕过。

```sh
git clone https://github.com/fangyuxu658-star/zeroloc-gate.git
cd zeroloc-gate/zeroloc-starter
npm ci --ignore-scripts
npm test
npm run check:example
```

后续从 main 创建 `codex/stabilize-beta` 分支，提交小范围稳定性修改，push 后建立 Draft PR；附上实测日志、负例和环境限制。GitHub Checks 全部完成并经人工审核后再合并。Actions 页可下载报告与截图；fork PR 不需要 secrets。首次 push、分支保护、故意失败 PR 验证和完整命令见 [GitHub 准备指南](docs/GITHUB_BETA_FLOW_CN.md)。

当前能力以 [STATUS.md](STATUS.md) 的 fully/partially/not yet verified 分类为准；公开 beta 前使用 [release checklist](docs/RELEASE_CHECKLIST_CN.md)。

```sh
npm run licenses
npm run licenses:check
npm run sbom > artifacts/sbom.cdx.json
npm audit --audit-level=high
```

[许可证核查](docs/LICENSE_REVIEW_CN.md)、[依赖清单](docs/dependency-licenses.json)、[原始声明](docs/THIRD_PARTY_NOTICES.md)、[贡献指南](CONTRIBUTING.md)、[阶段验收记录](docs/IMPLEMENTATION_RESULTS_CN.md)。未合并 GPL/AGPL/专有 EE 源码，未捆绑模型。发布前仍须真实 GitHub CI 成功；本地测试不能代替远端运行。

## 明确限制

只支持 UTF-8 JSON 对象和嵌套字符串叶子；不支持数组、非字符串叶子、带点/空键及 `__proto__`/`constructor`/`prototype` 键。暂不支持 XLIFF、Lingui、Paraglide 提取、i18next 格式化器/嵌套引用、自定义分隔符、动态 JS 插件、Argos/LibreTranslate/Weblate/Tolgee 服务。截图不做基线像素比较；自动 a11y 检查不等于完整无障碍审计。模型质量和实际模型推理由使用者在自己的环境复核。

项目名称仅用于标明互操作关系，不代表上游背书。核心许可证见 [LICENSE](LICENSE)。
