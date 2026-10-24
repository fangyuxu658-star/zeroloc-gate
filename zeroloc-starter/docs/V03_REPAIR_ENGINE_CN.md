# ZeroLoc v0.3 自主修复引擎（未发布开发版）

本分支从 PR #6 的 `7295075d8a20a23eec9f6b332ea57af88ca6ffdd` 建立，目标基础分支为 `codex/v0.2-safe-apply`。MIT、local-first、无账号默认、无遥测、无付费服务。v0.2 审查与真人验收结论仍然有效；本次开发不授权合并 PR #6、写 main 或发布版本。

## 实际能力

`Detect → Diagnose → Repair → Verify → Review → Deliver` 是可执行的本地状态链。默认 `repair` 只读取 JSON 配置、输入清单和摘要，不启动应用/浏览器/测试。只有精确计划批准和独立执行批准同时有效才创建新的临时项目副本。运行报告、逐次截图、备份和恢复日志保留在返回的临时路径。修复规则、引擎实现、全部清单文件、配置、测试入口及原始 root 指纹均参与授权绑定。

- **Visual Defect Detection**：使用真实文本 Range 和控件矩形检测非祖先内容重叠；检测页面/元素/文本溢出、裁切、中心命中遮挡及固定容器内容逃出。保存 DOM 位置和几何布局变化，继续执行原有 axe WCAG 检查。源语言和目标语言使用维护者提供的真实路由，并分别断言实际渲染文本；浏览器语言强制为 en-US，不能靠 navigator 恰好选择德语来冒充路由验证。
- **归因**：同浏览器、同视口对照源/目标页面。相同缺陷标为 `pre-existing`；仅目标出现且源无环境问题标为 `localization-introduced`；资源阻断标为 `environment`；源受限制时新缺陷标为 `undetermined`。这是观测归因，不是严格因果证明。任何上述 error 都阻止交付，原有缺陷不豁免。
- **Visual Repair Agent**：根据 `CONTENT_ESCAPE` 的祖先/子项几何和 CSS 类定位根因。当前只生成一种受限候选：唯一简单类规则中 `height: Npx` 改为 `min-height: Npx; height: auto`。只操作显式列出的 CSS，保留其他声明，不生成 shell、JS、隐藏/删除内容或放宽网络策略。尚不自动改 JSX/TSX，也不提供任意 CSS 重写。
- **事务与重试**：复用 v0.2 `guardedPath/readResource/durableNew/atomicReplace`、摘要批准、独占锁、私有备份和条件回滚机制。候选在新副本中应用，单测及完整视觉矩阵都成功才保留。部分改善也撤回；重复候选不重试，总尝试次数 1–3，整体时间 1–300 秒。回滚冲突或清锁异常立即停止并保留现场。
- 自有进程清理共享同一次关闭等待，避免超时/验证收尾重复清理死进程。清理另有 5 秒安全截止；不能确认退出时报告 `PROCESS_CLEANUP_FAILED` 和自有 PID，阻止交付并要求处理现场。
- **Semantic Review Agent**：保留结构、未翻译、术语/品牌、语言/长度检查；新增尾部空白、悬空标点、重复标点、替代字符及制表/回车异常风险。`Hallo {{name}}, ` 会失败并生成 `Hallo {{name}}` 的可审核候选。候选必须保留格式签名；不以模型分数证明语义正确。
- **语义修正衔接 Safe Apply**：`semantic-proposal` 审核尚未应用的来源绑定 proposal，输出独立修订 envelope 和新 Safe Apply 预览。实际写入继续使用 v0.2 的精确 plan/config 批准、备份与回滚，拒绝已有非空人工译文覆盖。对资源中已有人工文本只建议修正并阻断，不能以“自主”名义偷偷覆盖。
- **Review / Deliver**：成功运行仍停在 Review，需独立的当前 `reviewId`。交付再次检查源文件、隔离结果、完整浏览器矩阵、单测、截图摘要及受限修复规则；修改后授权失效。`repair-prepare` 还需新的本地准备批准，在全新的 Git checkout 中仅提交 CSS 和公开审核摘要。原项目的文件、HEAD、分支和 index 不变。没有有效 patch、失败、缺证据或语义待处理时拒绝准备。
- **远端**：复用 `pr-publish` 的单独远端预览批准与同仓 Draft 限制。新增 `--base codex/...`，绑定实际基础分支及其 SHA，远端不支持或变化时停止；不回退到 main。保留有效 push 地址、历史路径、固定提交 SHA、禁 hooks/filter 和 staged 字节核对。没有自动 merge、Release 或生产部署入口。

## 配置与执行

需要 Node 22/24、Git、完整开发依赖和已安装的 Playwright Chromium/Firefox。应用运行适配器与测试必须由维护者审阅；引擎不会根据模型输出执行项目安装/build 脚本。

在可信项目中创建 `repair-server.mjs`，导出：

```js
export async function start({root, originRoot}) {
  // root 是新隔离副本；在这里启动已经审阅的本机应用。
  // originRoot 只供可信依赖解析使用，不能从这里读生产资源提供测试页面。
  return {url: 'http://127.0.0.1:4173', stop: async () => {/* stop owned server */}};
}
```

可参考 [真实 Vite/Next 适配器](../qa/repair-app-adapter.mjs)。它通过 Node API 启动真实框架，使用隔离项目的路由/组件/资源。为避免复制整个依赖安装，显式链接可信原安装的 node_modules；这不是只读挂载，也不是 OS 沙箱，维护者必须审阅它及全部导入依赖。应用缓存也可能写入依赖缓存。不要使用不可信客户脚本，不能声称模型/Node 进程被安全沙箱化。

`repair.json` 示例（将文件清单补齐、摘要替换为实际 SHA-256）：

```json
{
  "schemaVersion": 1,
  "files": ["package.json", "index.html", "vite.config.js", "src/App.jsx", "src/App.css", "repair-server.mjs", "repair.test.mjs", "validation.json", "en.json", "de.json"],
  "cssFiles": ["src/App.css"],
  "server": {"path": "repair-server.mjs", "sha256": "SHA256_OF_REVIEWED_ADAPTER"},
  "validation": "validation.json",
  "maxAttempts": 2,
  "timeoutMs": 180000,
  "visual": {
    "sourcePath": "/?lng=en",
    "targetPath": "/?lng=de",
    "sourceText": "Hello Ada",
    "targetText": "Hallo Ada",
    "browsers": ["chromium", "firefox"],
    "viewports": [{"width": 375, "height": 812}, {"width": 1280, "height": 800}]
  },
  "semantic": {"source": "en.json", "target": "de.json", "targetLocale": "de", "messageFormat": "i18next"}
}
```

`validation.json` 使用原 v0.2 格式，必须包含至少一个经过 SHA-256 绑定的 `.test.mjs`，只设置 unitTests；视觉由 repair 独立强制运行。所有测试入口、应用源码/资源、配置和 adapter 都列入 files。拒绝目录穿越、链接/硬链接、私密路径、重复清单项，限制最多 512 个文件、单文件 2 MiB、总计 16 MiB。大应用需要维护者提供覆盖目标页面的可信清单/适配器；超限显式失败，不作部分成功。

源/目标语言必须使用不同 URL，浏览器和视口都必须互不重复；重复填写不能算多语言/多视口覆盖。

```sh
# 以下命令从 ZeroLoc 安装目录执行，PROJECT 为可信项目；默认预览不执行代码。
node bin/zeroloc.mjs repair --root PROJECT --config repair.json
node bin/zeroloc.mjs repair --root PROJECT --config repair.json --run --approve PLAN_ID --allow-execution EXECUTION_ID
node bin/zeroloc.mjs repair-review --root PROJECT --report ABSOLUTE_REPORT_PATH --approve REVIEW_ID

# 本地 Git 准备：所有清单文件必须与原项目 HEAD 中提交的字节一致。
node bin/zeroloc.mjs repair-prepare --root PROJECT --report ABSOLUTE_REPORT_PATH --review-approve REVIEW_ID --base codex/v0.2-safe-apply
node bin/zeroloc.mjs repair-prepare --root PROJECT --report ABSOLUTE_REPORT_PATH --review-approve REVIEW_ID --base codex/v0.2-safe-apply --prepare --approve PREVIEW_ID

# CHECKOUT 是上一步返回的新副本，不是 PROJECT。审阅并保存 PR 正文后单独远端批准。
node bin/zeroloc.mjs pr-publish --root CHECKOUT --repo OWNER/REPO --base codex/v0.2-safe-apply --body pr-body.md
node bin/zeroloc.mjs pr-publish --root CHECKOUT --repo OWNER/REPO --base codex/v0.2-safe-apply --body pr-body.md --publish --approve REMOTE_PREVIEW_ID
```

读取/建议语义修正：

```sh
node bin/zeroloc.mjs semantic --root PROJECT --source en.json --target de.json --target-locale de
node bin/zeroloc.mjs semantic-proposal --root PROJECT --source en.json --target de.json --proposal proposal.json
```

后一个命令的 `proposal` 字段可审阅后保存为新候选，再走原 `apply` 预览/精确批准/验证流程。它自己不写文件。

恢复 CSS 时先确认进程结束、审查唯一残留锁和日志，不自动清理锁：

```sh
node bin/zeroloc.mjs repair-recover --root ISOLATED_COPY --journal PATH.repair-recovery.json --approve CURRENT_SHA256
```

必须同时匹配当前应用字节、备份及记录；`--dry-run` 明确拒绝。备份/恢复记录不自动删除。

## 可复现验证

```sh
npm ci --ignore-scripts
npm test
npx --no-install playwright install --with-deps chromium firefox
npm run test:visual -- --all-browsers
npm run test:workflow
npm run test:network
npm run test:repair:geometry

# 唯一明确联网的上游安装步骤；Git 固定提交、npm ci --ignore-scripts。
npm run test:repair:setup
npm run test:repair -- --react-root artifacts/repair-upstream/react --next-root artifacts/repair-upstream/next
npm run test:repair -- --only react --scenario unit-failure --react-root artifacts/repair-upstream/react
npm run test:repair -- --only react --scenario semantic-block --react-root artifacts/repair-upstream/react
npm run test:repair -- --only react --scenario timeout --react-root artifacts/repair-upstream/react
```

Windows 使用已有环境文档中的独立 `PLAYWRIGHT_BROWSERS_PATH`。setup 需要不存在的 `artifacts/repair-upstream/react` 和 next 目录；不覆盖已有应用，重复运行先选择新副本/人工归档旧测试目录。普通 npm test 不下载框架、不启动浏览器或模型。

上游：react-i18next `2aab7f1d18a27da859ce218a6945415b651b00cc` 的 Vite 客户端示例；next-i18next `7a9995093bb795ee0dac564869d1be95e4c7982d` 的 Next.js Pages Router 示例。保留 MIT 原文，使用各自锁定依赖；Next standalone lock 复用 v0.2 审查记录。新增 greeting 只用于明确核对实际 locale。不是合成 SSR 代替真实框架，也不等于生产客户全面验收。

CI 的审查修复更新现扩为 Windows/Linux × Node22/24 的单测与视觉矩阵，保留 `contents:read` 和既有门禁，新增实际点击、滚动保护与进程树回归。只上传报告/截图，排除上游 node_modules/Git 克隆。历史 v0.3 结果见 [执行证据](V03_RESULTS_CN.md)，本次实现、运行要求和限制见 [独立审查修复记录](V03_AUDIT_REMEDIATION_CN.md)。

## 安全边界与已知误报/漏报

- 只在权限受控、可信、独占目录使用。Node 测试/适配器及依赖、Git 配置仍拥有同用户系统能力；复制目录、入口摘要和浏览器拦截不构成 OS 沙箱。报告不是签名测试证明，禁止把任意外部 `passed:true` 当安全凭据。
- 沿用 v0.2 非合作同用户 TOCTOU、锁只协调协作者、单文件事务、Windows ACL/xattr/断电持久性限制。所有候选都会保留备份和失败现场；不支持多文件原子修复。
- 重叠/遮挡仍是 DOM 启发式；本次已修复已知透明祖先误报、父子文字及实色遮罩漏报，有意叠放也需要审核。canvas、伪元素、跨源 iframe、阴影、动画和全部像素语义未完整建模。元素/文本超过扫描上限会失败，不悄悄跳过。布局变化保存几何差异并进入截图审核，不把任何正常译文换行都自动判为错误。
- 已修正 Firefox 普通 inline 的零 clientWidth 误报，仍保留页面范围与真实文字几何检查。完整正常/负例矩阵证明没有靠关闭溢出门禁变绿。
- 悬空逗号在某些称呼/拼接上下文可能合法，故只生成审核候选；短语含义、敬语和上下文错误仍可能漏报，`semanticCorrectness` 始终为 `unproven`。模型评分不能代替实际格式、术语、应用验证与真人语言审核。
- Next 原有 a11y/溢出及外部图片阻断继续阻止交付。不会忽略错误、联网补图、删除内容或自动改应用原有行为来制造通过。
