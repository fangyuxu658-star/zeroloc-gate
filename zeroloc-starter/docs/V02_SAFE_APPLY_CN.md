# v0.2 Safe Apply and reviewable PR workflow

这是未发布的 **0.2.0-dev.0**，MIT、免费、自部署、Local-first。已发布 beta 为 [v0.1.0-beta.1](https://github.com/fangyuxu658-star/zeroloc-gate/releases/tag/v0.1.0-beta.1)。旧 check/extract/translate/visual 参数继续支持；本分支不自动合并或发布。GitHub 只是显式选择的远端适配器，本地应用/验证不需要账号或商业平台。

## 可实际运行的验收

进入 zeroloc-starter/，使用 Node22/24（或更新版）与 Git：

```sh
npm ci --ignore-scripts
npm test
npm run check:example
npm run licenses:check
npx --no-install playwright install --with-deps chromium firefox
npm run test:workflow
```

最后一步使用明确标记的本地 HTTP 协议桩，**不是真实模型**，实际运行 React/i18next SSR、Node 单测、两浏览器×两语言×两视口8组 UI，以及单测失败/UI失败/超时字节级回滚和冲突保留。CI 在现有 visual job 中运行它，不改变5项必要检查名称/权限。

真实模型另行显式执行（仅已安装的本地模型，不自动下载）：

```sh
npm run test:workflow -- --model qwen2.5:0.5b --endpoint http://127.0.0.1:11435
```

服务启动/模型许可与 Windows PLAYWRIGHT_BROWSERS_PATH 独立缓存步骤见 [环境说明](STABILIZATION_ENVIRONMENT_CN.md)。端口须与本机服务一致。报告：artifacts/workflow-e2e/ci-report.json 或 real-model-report.json；截图在同目录 success/ 与 ui-failure/。默认 npm test 不要求模型或浏览器。示例源码：[React/i18next](../examples/react-i18next/server.mjs)；直接 node examples/react-i18next/server.mjs 在4174端口显示初始页面；全链路脚本在隔离副本中新增英文键，保留原例文件。

## 候选、预览与批准

以下从 ZeroLoc 源码目录运行；把 PROJECT 替换为可信客户 Git 仓库的根目录（整个流程必须使用同一个 root，monorepo 中也使用 Git 根及相对文件路径）。例中的 en.json/de.json 为客户资源，不是 ZeroLoc 的文件。

```sh
node bin/zeroloc.mjs translate --provider ollama --model qwen2.5:0.5b --endpoint http://127.0.0.1:11435 --source PROJECT/en.json --target PROJECT/de.json --source-locale en --target-locale de --message-format i18next > PROJECT/proposal.json
node bin/zeroloc.mjs quality --root PROJECT --source en.json --target de.json --target-locale de --message-format i18next
node bin/zeroloc.mjs apply --root PROJECT --source en.json --target de.json --proposal proposal.json --validation-config validation.json
```

translate 只生成候选；apply 默认 dry-run，不执行测试或写资源。阅读输出中的 plan、quality、changed、前置条件，记录 planId。旧候选 envelope 或裸 RFC6902 数组必须带根 test；没有来源哈希时，必须显式 --bind-legacy 才能绑定当前 source 生成审查计划。这不能证明旧候选最初看到的 source，建议重新生成。只支持翻译所需 test/add/replace；remove/move/copy、根替换、已有非空人工译文覆盖均拒绝。

新候选绑定 source/target 原始字节哈希；批准绑定 root指纹、source/target路径/哈希、结果、补丁、格式/语言、质量策略和验证配置。任何修改须重新预览，不能复用旧 planId。root 以内仅允许明确相对路径；拒绝 ../、绝对/Windows盘符、保留路径、链接/硬链接、非法UTF-8、数组/原型键和超过2MiB的资源。

## 只运行批准的验证配置

validation.json 是纯 JSON，不加载 JS 配置/插件或 shell/npm/build 命令。将 SHA256_OF_TEST_FILE 替换为实际文件摘要：

```json
{
  "schemaVersion": 1,
  "timeoutMs": 30000,
  "unitTests": [{"path": "test/catalog.test.mjs", "sha256": "SHA256_OF_TEST_FILE"}],
  "ui": {
    "url": "http://127.0.0.1:4173",
    "browsers": ["chromium", "firefox"],
    "locales": ["en", "de"],
    "viewports": [{"width": 375, "height": 812}]
  }
}
```

ui 可省略；应用必须事先由维护者启动，ZeroLoc 不启动任意项目构建脚本。SHA-256 可用 node -e "const f=require('node:fs'),c=require('node:crypto');console.log(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex'))" FILE 计算。分别计算测试入口和完整 validation.json 的摘要。入口及其导入的项目/依赖代码必须可信：批准执行不是操作系统沙箱，不能把任意客户测试当安全代码。

```sh
node bin/zeroloc.mjs apply --root PROJECT --source en.json --target de.json --proposal proposal.json --validation-config validation.json --write --approve PLAN_ID --allow-validation CONFIG_SHA256 > PROJECT/report.json
```

这是两项独立批准：精确变更计划 + 精确验证配置。不要把 stdout 重定向到资源文件。缺少批准/配置时不写；失败退出1，输入/配置/冲突错误退出2。进程只以参数数组执行固定 Node 测试入口，剥离继承的 secret/token 环境，限制输出和运行时间。UI 仅 loopback、HTTP资源同源，关闭 WebSockets/service workers，设整体截止时间。图片保留在 OS 临时目录，公开报告仅含文件名、hash和临时目录basename；应用级完整证明不等于所有网络/系统能力被沙箱隔离。

## 质量策略与人工复核

可通过 --policy policy.json 配置：

```json
{
  "brands": ["ZeroLoc"],
  "allowedSourceTexts": ["NASA"],
  "allowSourceKeys": ["legal.productName"],
  "terms": [{"source": "Save", "target": "Speichern"}],
  "minLengthRatio": 0.25,
  "maxLengthRatio": 4,
  "expectedLanguage": "deu",
  "blockWarnings": false
}
```

同原文候选和术语/品牌违例默认失败；长度/语言为辅助风险，blockWarnings=true 可阻断警告。短文本不作可靠语言结论，未知语言可显式配置ISO639-3。保留原文豁免只影响启发式，不绕过 ICU/变量/标签结构校验。字面术语、长度、统计识别都有误报/漏报，不保证语义或无人审翻译。

## 原子替换、回滚与恢复

单次事务只支持一个目标JSON；使用同目录 wx 临时文件、同步写入、原子 rename，以及独占 ZeroLoc 锁。原始字节备份与不可变恢复记录先于替换持久写入。应用后结构检查及批准的验证失败，会在目标仍是本事务结果时恢复原字节；外部编辑/备份损坏或恢复 I/O失败则保留现场，返回 rollbackConflict，不覆盖外部工作。

backup 与 journal 路径在报告内。需要恢复成功应用或进程崩溃后的结果时，先确认相关进程已结束、人工审查残留锁与日志；工具不会自动清除陈旧锁。必要时由维护者显式归档那一个锁文件后运行：

独立审查后补充：JSON 输入拒绝重复成员（含转义同名键），避免隐藏的人工译文在重新序列化时丢失。POSIX 替换保留原文件的 uid/gid 和普通权限位，无法保留则在替换前失败；Windows ACL、扩展属性和特殊权限位不作保留保证。成功应用会规范化为双空格缩进和 LF，失败/恢复则还原原始字节及其 CRLF。锁含随机所有权标记；锁缺失、被替换或不能清理时返回 `passed:false`、`lockCleanupFailed:true` 和真实 `applied`/`recovered` 状态及恢复路径，不能据此假定资源未被写入。`recover --dry-run` 明确拒绝，恢复只使用已审查的当前哈希审批。

```sh
node bin/zeroloc.mjs recover --root PROJECT --journal de.json.zeroloc-UUID.recovery.json --approve CURRENT_TARGET_SHA256
```

恢复也要求当前结果/备份哈希与记录精确匹配，目标变化则拒绝。备份/恢复记录不自动删除，按组织策略人工保管。此设计不是多文件事务，不保证突然断电时的目录元数据持久性，也不保证保留所有Windows ACL元数据；需可信目录权限。同用户恶意并发文件系统修改无法由便携Node API完全排除，锁只协调 ZeroLoc 调用者。

## 本地 PR 准备与远端授权

成功报告必须含通过的单元测试；PR准备重新校验资源、质量与 Git 基线人工译文，不把报告当签名证明。保持独立 checkout，除目标/报告/本事务备份外不得混入未审改动；拒绝既有 staged 内容。报告/备份不要忽略到无法显式提交报告；备份和恢复记录不会进入 commit。

```sh
node bin/zeroloc.mjs pr-prepare --root PROJECT --report report.json
node bin/zeroloc.mjs pr-prepare --root PROJECT --report report.json --prepare --approve LOCAL_PREVIEW_ID
node bin/zeroloc.mjs pr-publish --root PROJECT --repo OWNER/REPO --body pr-body.md
node bin/zeroloc.mjs pr-publish --root PROJECT --repo OWNER/REPO --body pr-body.md --publish --approve REMOTE_PREVIEW_ID
```

本地审批后创建 codex/zeroloc-* 分支，仅提交目标和报告；preview 输出 body 可人工保存为 pr-body.md。远端 preview 不联网，审批摘要包含完整正文、文件列表、HEAD/base/分支。只有 --publish + 当前ID 才读取远端、push该分支并创建/更新同仓 Draft PR，需用户自行安装并登录 gh（可用 --gh 指定路径）。origin须精确匹配目标仓库，无凭证URL；main变化则重新fetch/审查。Git hooks/fsmonitor/签名调用禁用；测试代码/依赖仍须可信。

永不 push main、force push、自动 merge、修改Ruleset、发布Release或收费API。远端调用中途失败可能已推送主题分支，检查现场再重试，不自动删除。多次发布只复用相同分支的同仓Draft，拒绝跨仓或Ready PR。五项 main CI 必须通过仍由仓库规则执行。

独立审查后的额外约束：同时核对 origin 的读取地址和唯一有效推送地址（含 pushurl/pushInsteadOf）；远端预检后重新核对审批输入，并推送审批的提交 SHA，而不是可变化的 HEAD。准备 PR 时拒绝目标或报告上的 Git filter/encoding/ident 转换，提交前核对暂存文件列表和完整字节。Git 配置、凭证 helper 和仓库代码仍必须可信；不声称抵御同用户在检查与 Git/rename 调用之间恶意修改配置或文件的竞态。

UI 页面必须使用最终的、无重定向的同源 HTTP URL；所有 HTTP 3xx Location 跳转均拒绝。通用视觉矩阵只添加 `?locale=...`，应用必须自行支持该约定；它不会验证实际语言。标准 react-i18next 语言检测通常使用 `?lng=de`，Next.js 示例使用 `/de`。必须用应用的实际 URL，并额外断言渲染出的译文，不能仅以矩阵标签证明德语覆盖。新网络回归：`npm run test:network`。
