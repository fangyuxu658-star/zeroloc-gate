# ZeroLoc v0.2 — PR #6 最终人工验收

日期：2026-10-20，America/Los_Angeles。PR：[ZeroLoc #6](https://github.com/fangyuxu658-star/zeroloc-gate/pull/6)。

**当前合并执行结论：No-Go，等待下列真人验收与明确合并授权。技术建议：这些条件全部满足后，可对功能范围受限、未发布的 v0.2 给出 Go。Ready 只表示可开始人工审查，不是已经批准合并或 Beta 发布。**

## 1. 已完成的核验与 Ready 操作

- 核验输入 head：`8b021f3c7990d2df5ab32b4e51819059a42107c9`；main/base：`bcb542a7dc672c97be34289cbaf86667cceff118`。
- 完整差异 **115 个文件，+10377/-64**，本地与 GitHub 文件清单逐项相同。`git diff --binary base...head` 为 734252 bytes，SHA-256：`41e6921d24f9c2c1fba9d5f20feb8e5a14694a2c4bc6b779ffd0c130f2d84937`。完整路径和 56 项测试名称/行号见 [核验快照](zeroloc-starter/docs/verification/final-acceptance/snapshot-8b021f3.json)。
- 最后代码修复 `6ffeb8b` 至 `8b021f3` 只有 4 份报告/证据文件变化，没有可执行代码、依赖、测试或 CI 配置变化。本轮再审应用/文件、验证、质量、发布及 CLI 入口，**在已声明的可信独占工作区模型内，未发现已修复 P0/P1 被重新引入**；不是无漏洞证明。
- 在 `8b021f3` 再次实际运行 `npm test`：56 total，55 passed、0 failed、1 POSIX-only skipped，[本机记录](zeroloc-starter/docs/verification/final-acceptance/local-recheck-8b021f3.txt)。
- 该 head 的 [GitHub CI 39478179598](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39478179598) **5/5 success**。Linux Node22/24 各 56 passed、0 skipped；Windows Node22/24 各 55 passed、1 POSIX-only skipped；visual 包含原始 12 组矩阵、五场景工作流、网络边界对抗测试。Check Runs 共 5 个，另有 0 个 legacy status context，没有将其默认聚合的空状态误报为失败或额外通过。
- **已转为 Ready for Review**。GitHub 读取确认：`draft:false`、`state:open`、`merged:false`，操作后 head/base 不变；GitHub `updated_at` 为 `2026-10-20T23:30:45Z`。连接器因 `Resource not accessible by integration` 拒绝，随后使用既有已认证 GitHub CLI 成功执行，并用 API 回读确认。没有调整集成权限或仓库保护。

本文件及本轮快照/日志是随后加入 PR 分支的验收材料，不改变上述代码。它们会增加文档差异并触发同步 CI；最终提交及其最新 Checks 以 PR 和本轮最终答复为准。任何新的源代码、依赖、测试或工作流变动，都需要重新核验，不能沿用此签核。

[V02_INDEPENDENT_REVIEW.md](V02_INDEPENDENT_REVIEW.md) 保留上一轮审查时“保持 Draft”的历史记录；本文件记录本轮明确授权后的 Ready 转换，不把上一轮结论改写成当时已 Ready。

## 2. 十类修复与回归逐项对照

以下“有覆盖”表示用例与实现已检查且相关 CI 通过，不表示所有可能的输入/竞态均已形式化验证。路径均相对仓库根。

| 修复 | 对应回归入口 | 本轮确认 |
|---|---|---|
| F1 重复 JSON 键隐藏人工译文 | `test/independent-hardening.test.mjs:114` 的 duplicate JSON names；`test/pull-request.test.mjs:52` 的 Git baseline duplicate names | 工作区和原始 Git blob 都严格解析；转义同名键覆盖。 |
| F2 recover dry-run 实际写入 | `test/independent-hardening.test.mjs:185` 的 recover --dry-run | CLI 提前退出 2，保留当前资源哈希。 |
| F3 pushurl、多目标、pushInsteadOf 错仓推送 | `test/independent-hardening.test.mjs:42` 的 publish rejects alternate… | 预览前核对唯一有效 push 地址；测试断言 transport 调用为 0。 |
| F4 远端预检期间 HEAD 改变 | `test/independent-hardening.test.mjs:56` 的 publish refuses a commit introduced… | 重新核对预览；推送批准 SHA，不使用变化的 HEAD。 |
| F5 Git clean filter 改写批准内容 | `test/pull-request.test.mjs:41` 的 Git clean filters cannot… | 拒绝 filter/encoding/ident 转换，并检查实际暂存文件及字节。 |
| F6 最终 diff 隐藏历史文件 | `test/independent-hardening.test.mjs:192` 的 publish rejects unrelated files hidden… | 拒绝历史中出现但最终 diff 消失的路径；不冒充秘密扫描器。 |
| F7 HTTP 重定向越过同源边界 | `qa/independent-network.mjs`，`npm run test:network`，现有 visual job 执行 | 无自动跟随重定向；redirectRejected=true，HTTP/WS/SW 见证计数 0。**不计入 56 项 Node 单测**。 |
| F8 Linux 文件权限退化 | `test/independent-hardening.test.mjs:72` 的 atomic replacement preserves POSIX… | Linux 执行，成功/回滚保持普通访问权限；Windows 该项有意跳过。 |
| F9 不可见字符绕过原文保留检查 | `test/independent-hardening.test.mjs:108` 的 source-retention quality gate… | 比较时处理不可见码点；不改写实际译文。 |
| F10 清锁错误掩盖已写入状态 | `test/independent-hardening.test.mjs:174` 的 lock cleanup failure returns… | 返回真实 applied 状态、失败标记和备份/日志；不把异常当成“从未写入”。 |

表中 `test/`、`qa/` 的完整前缀均为 `zeroloc-starter/`。机器可读的精确测试名、完整路径及检查摘要见快照中的 `fixRegressionMap`、`testInventory`、`checks`、`workflow.logSummaries`。

## 3. 本次可接受的功能范围

技术 Go 仅适用于：**可信、权限受控、独占副本中的单目标嵌套 JSON Safe Apply**；只填充缺失/空白译文；显式 plain/i18next/ICU 格式；精确计划和验证配置批准；单文件替换、条件回滚及人工恢复；显式可选的 Git 准备/发布。

本次不是只挑选几个文件合并：完整 PR 还含质量检查、验证器、PR CLI、示例、依赖与证据，全部必须审查。它们可作为显式启用的辅助/实验性能力合入开发代码，但不能因此宣称已经验收了通用 UI、语义翻译、任意客户脚本沙箱或所有 React/i18next 应用。保持 `private:true` 和开发版本；不创建 Tag、Release 或 npm 发布。

## 4. 真人验收清单

所有 `[ ]` 均等待真人逐项记录结论；自动测试成功和代理执行的批准参数不会自动勾选。只在可信、可丢弃的隔离项目副本操作，不把故障用例用于生产资源。每项填写实际路径、哈希/日志和审核人，不能复制历史审批 ID。

### A. 冻结版本与运行边界

- [ ] 确认本轮最终 head、base、完整文件清单，阅读新增验收文档；最终 head 的全部必需 Checks 成功，无待运行/失败项；没有新 P0/P1。base 若前进、解决冲突或代码变化，重新审查和验证。
- [ ] 项目是可信且权限受控的独占副本；停止编辑器/其他程序对资源的并发写入。接受锁只协调 ZeroLoc，不能阻止非合作同用户写入者或消除全部 TOCTOU。
- [ ] 审阅实际验证入口及其全部导入/依赖、Git 配置和 credential helper。入口哈希不等于依赖树锁定，更不是 OS 沙箱；不接受模型生成的脚本或任意客户脚本直接执行。
- [ ] 确认资源确属支持的嵌套 JSON 字符串；选择真实格式；不把点号键、数组、更多格式化语法、复杂 Trans 候选等当成已支持。

### B. Safe Apply 写入、回滚与恢复

- [ ] 在隔离副本保存 source/target 原始 SHA-256 和原始字节。默认 apply 预览不修改资源、不执行验证；人工阅读 changed、patch、policy、quality、root/来源绑定和 result hash。
- [ ] 用当前 `--approve <planId>` 和独立 `--allow-validation <configSha256>` 成功执行一次；只改变批准目标和批准键，source 不变，结果哈希等于预览。
- [ ] 验证备份等于原始目标字节，日志路径/原始与应用哈希正确；成功输出不意味着备份可立即删除。成功写入会规范化缩进/LF；不把“成功也保留原 CRLF/格式”作为已实现承诺。
- [ ] 让批准的单测失败，再分别验证 UI 失败和超时；确认失败退出、`rolledBack:true`，目标恢复原始字节（包括 CRLF），人工值保留。已知 UI 失败必须阻止采用该 UI 配置的写入成功，不能通过忽略结果制造绿色。
- [ ] 模拟资源变旧或验证期间外部编辑：拒绝过期计划；冲突时保留外部内容及备份/日志，不能反复强制重试覆盖。
- [ ] 核对崩溃后锁/备份/日志；只有确认所属进程已结束并审查记录后，人工归档那一个锁。用明确批准的当前结果哈希恢复，不能批量删锁。`recover --dry-run` 应明确拒绝而不是写入。
- [ ] 读懂 `lockCleanupFailed:true` / `rollbackConflict:true`：结合 applied/recovered、实际哈希及日志判定状态；不因退出失败就假定目标没有被修改。
- [ ] Linux 核对普通权限/所有权保留。对 Windows ACL、xattr、特殊权限位、目录 fsync/物理断电持久性，承认没有保证；确认该项目能接受，不能则 No-Go。

### C. 人工译文保护与授权

- [ ] 目标中已有非空人工译文的字符串值完全保留；空白值可视为空。测试直接覆写、祖先对象替换、删除/move/copy、原型键、非法 Pointer，以及工作区/Git 基线的重复键均被拒绝。
- [ ] 确认 source/target 任一字节、policy、语言/格式、验证配置或 root 变化都会使旧批准失效；重新阅读新计划，不自动接受新 ID。
- [ ] 缺少/错误计划批准、缺少/错误验证配置批准、改动测试入口时均不能写入。`--bind-legacy` 只是显式绑定当前资源，不证明旧候选最初所见内容；优先重新生成。
- [ ] 独立区分四种授权：执行可信测试、应用具体计划、本地 PR 准备、远端发布。此次将 ZeroLoc PR #6 转 Ready 不授权客户资源写入、远端发布、合并或发布版本。

### D. GitHub PR 推送边界

- [ ] 本地 pr-prepare 默认只预览；实际准备使用独立 previewId，只创建专用 codex/ 分支，仅提交批准目标/报告；无关 staged/tracked/untracked 内容被拒绝。备份/恢复日志不进入提交。
- [ ] 读清实际暂存字节和 Git 基线；有 clean filter/encoding/ident 时拒绝，不通过移除保护来绕过。框架生成的 AGENTS/type 文件等须单独处理，不能塞进翻译提交。
- [ ] 远端预览本身不联网；人工核对 repo、origin、唯一有效 pushurl/重写结果、branch、批准 SHA、base/main SHA、完整正文、文件列表及**完整提交历史**。同一路径旧版本中的秘密仍要独立检查。
- [ ] pr-publish 需独立且当前的远端 previewId；错误仓库/多个地址、变化的 main/HEAD、已有非 Draft/跨仓 PR 均应拒绝。不推 main、不 force、不跟随 Tags、不 merge。
- [ ] 本轮 PR #6 已 Ready，产品的 `pr-publish` 不应自动重用它作为 Draft。该命令的负例验证用 stub 或自有隔离测试仓库；本轮不向第三方项目推送，不借验收启动额外发布。

### E. 实际翻译与截图审核

- [ ] 由真人阅读实际语义、术语、变量、语气、标点与保留原文豁免。确认结构/语言统计通过不等于翻译正确；比较 [原始 Next 模型候选](zeroloc-starter/docs/verification/independent/next-original-model-proposal.json) 与 [审阅后候选](zeroloc-starter/docs/verification/independent/next-proposal.json)，记录真实语言验收人。
- [ ] 打开 [React 移动截图](zeroloc-starter/docs/verification/independent/react-mobile.png) 与 [Next 移动截图](zeroloc-starter/docs/verification/independent/next-mobile.png)，检查重叠、裁切、溢出、可读性、a11y、缺图；再核对两浏览器、两视口的运行记录和本地其他截图，不只阅读 passed。
- [ ] 使用应用真实德语 URL（React `?lng=de`、Next `/de`），断言实际显示 `Hallo Ada` 等译文；不能仅凭 `locale=de` 标签认为测试了德语。浏览器语言/fallback 可能掩盖覆盖不足。
- [ ] 接受通用 visual 仅允许最终、无跳转的 loopback 同源 URL，跨源图片等被拦截；不宣称截图完整保真。涉及远端资源的业务页面需要另行设计可信验收。
- [ ] 逐项阅读下列未解决事项并签署适用范围/风险接受；不把代理修订或自动绿色当作真人验收。

## 5. 明确保留的未解决事项

| 编号/级别 | 事实与当前状态 | 合并验收处理 |
|---|---|---|
| UI-01 / P2 | **未解决：React UI 重叠漏报。** 自动 visual 为 passed，但移动截图按钮与正文重叠；没有完整重叠/像素基线检测。 | 必须人工审图；范围内仅承诺已有溢出/部分 a11y 检查。不能标为已修复或“视觉全绿”。 |
| UI-02 / P2 | **未解决：Next.js 独立 UI 检查失败。** PAGE/ELEMENT_OVERFLOW、color-contrast、image-alt、link-in-text-block、link-name；离线拦截外部图片也影响画面。 | 其 unit-only apply/本地准备通过不是 UI 通过。若实际采用 UI 验证配置，失败必须继续阻断，不能压制结果。 |
| SEM-01 / P2 | **未解决：语义检查漏报。** `Hallo {{name}}, ` 的多余逗号/空格仍能通过结构和质量检查；本次由代理修订，不是自动语义修复能力或真人签字。 | 真人逐条检查；质量/结构指标不能作为语义或 HTML/URI 上下文安全证书。 |
| TRUST-01 / P2（越界可高） | **未解决：信任与系统边界。** 非合作写入者 TOCTOU、可信测试/导入/Git 配置、报告非签名证明、Windows ACL/xattr/断电持久性限制。 | 必须采用独占可信副本并明确接受。若实际使用需要抵御不可信脚本/敌对同用户写入，当前实现 No-Go。 |
| COVERAGE-01 / P3 | 两个上游是独立仓库中的官方示例，各新增一个键；不是生产客户大规模多 namespace/多语言验收。 | 不对外扩大兼容性结论；Beta 仍须更广负载及真人验收。 |

原始证据继续保留：[React 运行](zeroloc-starter/docs/verification/independent/react-runtime.json)、[Next 运行](zeroloc-starter/docs/verification/independent/next-runtime.json)、[独立审查](V02_INDEPENDENT_REVIEW.md)。本轮没有修改这些 UI、语义算法或其失败结果。

## 6. Go / No-Go 必须条件与签核

**目前 No-Go 执行合并。以下条件全部满足并取得新的、明确绑定最终 head 的合并批准后，建议 Go：合并功能范围受限的未发布 v0.2 开发代码。**

1. 最终 head/base 冻结，完整差异已审阅；56 项回归及全部最新 GitHub Checks 成功；无新增 P0/P1，无未完成 CI。
2. 真人完成 A–D 的写入、字节回滚、人工值保护、分阶段授权和发布边界验收，并提供证据；不在生产文件上做故障测试。
3. 真人完成 E 的语言/截图检查，明确接受 UI-01、UI-02、SEM-01、TRUST-01 的未解决状态及上述受限使用范围。不能在验收表中将这些事项勾为“已修复”。
4. 保留默认预览、无网络默认、单目标 JSON、显式 opt-in/授权及现有 main 保护；其他适配器/启发式不得被描述为已完成通用产品验收。
5. 维护者明确批准“把指定最终 head 的 PR #6 合并到指定 main/base”；本轮请求只授权 Ready 与验收准备，**不包含 merge 授权**。合并方式需在批准时确认；若 squash，还应核对 resulting main 并等待其 CI。

**仍为 No-Go：正式 Beta 发布、Tag/Release、npm 发布、自动 merge、main 直接写入、v0.3 开发，以及不可信代码/非独占目录下的安全保证。** 合并与 Beta 发布为两个不同决策，不能互相推导授权。

| 真人签核项 | 审核人/日期 | 证据/结论 |
|---|---|---|
| Safe Apply / 回滚 / 恢复 | 待填写 | 待填写 |
| 人工译文与分阶段授权 | 待填写 | 待填写 |
| Git / 推送边界 | 待填写 | 待填写 |
| 实际语言与截图、未解决事项接受 | 待填写 | 待填写 |
| 最终 head/base 与最新 Checks | 待填写 | 待填写 |
| 维护者合并决定（另行明确批准） | 待填写 | 未授权 |

下一步需用户批准的是：在完成并记录上述真人验收/风险接受后，是否授权合并**指定最终 head**。在获得此批准前继续保持 PR open、Ready、unmerged；不自动开展发布或下一版本工作。
