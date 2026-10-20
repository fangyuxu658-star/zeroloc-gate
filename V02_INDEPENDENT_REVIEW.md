# ZeroLoc v0.2 独立审查与加固报告

审查日期：2026-10-20（America/Los_Angeles）。仓库：`fangyuxu658-star/zeroloc-gate`，Draft [PR #6](https://github.com/fangyuxu658-star/zeroloc-gate/pull/6)。原审查提交：`a463a63c33400d945106b0c600710b7a9f92a890`；比较基线 main：`bcb542a7dc672c97be34289cbaf86667cceff118`。检查覆盖该比较中的全部 41 个变更文件，重点审阅应用、文件系统、质量、验证、CLI、Git 发布、测试与工作流。

## 结论

- **原提交不建议转 Ready**：复现了可隐藏人工译文、绕过 dry-run、改变提交/推送内容及浏览器跨源跳转的问题。
- **加固后建议进入 Ready 的人工代码审查阶段**，前提是本报告所列修复提交的五项远端 CI 均通过。Ready 不等同发布批准，本任务保持 PR 为 Draft。
- **暂不建议进入正式 v0.2 Beta 发布流程**。需要维护者明确接受可信独占目录/可信测试的边界，落实实际语言与截图人工验收，并补充更广泛的生产应用负载。两个上游应用已完成工作流，但存在真实的 UI 漏报及上游 UI 失败，不能报告“全面兼容、视觉全绿”。

修复代码提交及最终远端 CI：见本文末的交付记录。没有修改 main、合并 PR、创建 Tag/Release、发布 npm，或向第三方仓库推送。

## 1. 已验证功能

1. v0.1 `check/extract/translate/visual` 原有回归保持通过；默认预览/离线行为、JSON/SARIF 输出、显式 ICU/i18next 解析保持兼容。
2. RFC6902 仅允许受限 `test/add/replace`；根 test、原始字节来源哈希、精确计划批准与验证配置批准分别校验。祖先对象覆盖、根替换、remove/move/copy、非法 Pointer、原型键、人工非空译文覆盖被拒绝。
3. 目录穿越、盘符/ADS、`.git`、Windows 保留名、符号链接/目录 junction、硬链接、非普通文件及关联备份被拒绝；损坏备份、过期来源/目标、占用锁均保持现场。
4. 单测失败、UI 失败及超时恢复原始字节；源/目标外部编辑冲突被保留。另启动两个真实进程竞争同一资源，失败者因锁或过期计划被拒绝，未删除成功者锁。强制终止处于验证阶段的自有测试进程后，备份、日志和锁保留；显式归档该死进程锁后恢复原始 CRLF 字节。
5. 结构门禁独立于质量豁免；原文保留、术语、品牌、长度与语言风险检查按现有策略执行。它们不构成语义证明。
6. 验证配置不接受 shell/build hook；脚本入口哈希、配置哈希、超时、环境变量剥离和错误脱敏有回归。导入代码仍属于可信代码，见风险 R2。
7. PR 准备拒绝无关工作区/暂存文件，核对 Git 基线人工译文；核对实际暂存字节。发布预览不联网；发布绑定仓库、有效推送目标、提交 SHA、历史路径和正文，继续仅创建/更新同仓 Draft。
8. 浏览器对抗页面尝试跨源 HTTP、WebSocket、service worker 和 302 跳转；修复后见证服务的三个访问计数均为 0，重定向被拒绝。

## 2. 已发现并修复的问题

严重度采用 P1（高）、P2（中）、P3（低）；不是 CVSS 评分。下列测试在相关修复前实际失败，修复后纳入回归。文件位置指加固后的实现；`before` 证据可能包含此前已经应用的其他修复，但被测问题当时尚未修复。

| ID | 级别 | 复现、影响与代码位置 | 修复及证据 |
|---|---|---|---|
| F1 | P1 | `{"human":"人工译文","human":""}` 被 `JSON.parse` 静默折叠，Patch 可把隐藏人工值替换掉；转义同名键同样有效。Git 历史基线也有相同入口。`src/safe-files.mjs:30`、`src/pull-request.mjs:51`。 | 拒绝重复成员；Git blob 使用原始 Buffer、严格 UTF-8/重复键解析与大小上限。[工作区证据](zeroloc-starter/docs/verification/independent/duplicate-before.txt)、[Git 基线证据](zeroloc-starter/docs/verification/independent/git-duplicate-before.txt)。 |
| F2 | P1 | `recover --dry-run --approve <有效hash>` 仍实际恢复文件。`bin/zeroloc.mjs:46`。 | 在任何恢复 I/O 前明确拒绝该组合，退出 2；不增加新的恢复模式。[证据](zeroloc-starter/docs/verification/independent/recover-dry-run-before.txt)。 |
| F3 | P1 | origin 读取地址正确，但 `remote.origin.pushurl`、多推送地址或 `pushInsteadOf` 可指向其他仓库。`src/pull-request.mjs:18`。 | 检查唯一有效推送地址并绑定预览；拒绝错误/多个目标。[证据](zeroloc-starter/docs/verification/independent/adversarial-before.txt)。 |
| F4 | P1 | 远端预检回调期间新增提交，随后 `push HEAD` 会发送未批准提交。`src/pull-request.mjs` 的发布预检/推送。 | 预检后重新生成并比对预览；推送固定批准 SHA。[证据](zeroloc-starter/docs/verification/independent/adversarial-before.txt)。 |
| F5 | P1 | Git clean filter 把已批准的 `Hallo` 改为 `UNREVIEWED` 后提交；禁用 hooks 并不禁用 filter。`src/pull-request.mjs:28`、暂存校验。 | 对目标/报告拒绝 filter、encoding、ident 转换，提交前校验暂存文件列表和完整字节；不再用 `commit --only` 重新取工作区内容。[证据](zeroloc-starter/docs/verification/independent/filters-before.txt)。 |
| F6 | P1 | 分支先提交无关文件、再删除，最终 diff 只显示译文，但 push 仍携带旧 blob。`src/pull-request.mjs` 的发布 manifest。 | 检查整个分支历史路径，拒绝最终 diff 中消失的历史文件；展示并绑定提交列表。这不替代秘密扫描。[证据](zeroloc-starter/docs/verification/independent/history-before.txt)。 |
| F7 | P1 | Playwright route 仅检查重定向链首个请求；同源地址 302 可访问未批准源。见证服务实际收到 1 次请求。`src/checks/visual.mjs:30`。 | 使用 `route.fetch({maxRedirects:0})`，拒绝带 Location 的 3xx，再 fulfill；加入 visual CI。[前后证据](zeroloc-starter/docs/verification/independent/network-before.txt)、[修复结果](zeroloc-starter/docs/verification/independent/network.json)。 |
| F8 | P2 | 同目录替换文件始终以 `0600` 创建，Linux 的 `0640` 资源在成功/回滚后变成 `0600`，可中断其他进程读取。`src/safe-files.mjs:55`。 | 替换文件保留 uid/gid 和普通权限位；无法保留则在 rename 前失败。备份/日志继续私有。[原提交实际 640→600](zeroloc-starter/docs/verification/independent/posix-mode-before.json)；Linux 回归验证成功及回滚保持 640。 |
| F9 | P2 | `Continue\u200b`、方向隔离符和软连字符可绕过完全同原文的阻断。`src/quality.mjs:7`。 | 仅在比较时去除默认不可见码点，不改写真实译文/合法连字字符。[证据](zeroloc-starter/docs/verification/independent/adversarial-before.txt)。 |
| F10 | P2 | 验证后锁删除失败，`finally unlink` 抛错掩盖“资源已写入”以及备份/日志返回值。`src/apply.mjs:10`。 | 随机所有权标记；只释放自身锁。清理失败返回实际 applied/recovered 状态、`passed:false`、`lockCleanupFailed:true` 和恢复证据，阻止 PR 准备。[证据](zeroloc-starter/docs/verification/independent/lock-cleanup-before-native.txt)。 |

新增回归主要位于 [independent-hardening.test.mjs](zeroloc-starter/test/independent-hardening.test.mjs)、[pull-request.test.mjs](zeroloc-starter/test/pull-request.test.mjs) 和 [independent-network.mjs](zeroloc-starter/qa/independent-network.mjs)。未增加核心依赖或无关产品功能。

## 3. 未修复的问题和风险

| 风险 | 级别 | 已确认边界与发布要求 |
|---|---|---|
| R1 非合作的同用户写入者 | P2；不可信目录中可升至高风险 | `lstat/read/hash/rename` 之间仍存在 TOCTOU 窗口；便携 Node API 不提供条件 rename 或目录句柄封闭解析。锁只协调 ZeroLoc 调用者。两进程正常冲突测试不证明可以抵御恶意编辑器/目录置换者。使用权限受控、独占副本；不声称跨文件 ACID。 |
| R2 测试、导入、Git 配置的信任 | P2 | 实测修改未绑定哈希的 `helper.mjs` 后，入口哈希不变，导入仍被执行。批准入口不是操作系统沙箱；Node 测试有文件/网络能力。Git credential helper、配置和其他仓库代码也须可信。报告不是签名证明，API callback 可以伪造 passed。 |
| R3 语义/上下文门禁漏报 | P2 | 小模型实际产生 `Hallo {{name}}, `，结构和质量均通过；人工修订才正确。短文本、错误含义、URI/HTML 使用上下文无充分建模；不能据格式通过宣称翻译正确或渲染安全。 |
| R4 视觉与语言覆盖不足 | P2 | React 移动截图中按钮与正文重叠，自动视觉结果却 passed；当前只测溢出和部分 a11y，没有完整重叠/像素基线检测。`?locale=de` 也不是所有应用的语言协议；必须核对实际渲染译文及真实路由。 |
| R5 持久性与元数据 | P2 | 未做物理断电/故障磁盘证明，不保证目录 fsync、Windows ACL、xattr 或特殊权限位保留。成功应用规范化 JSON 缩进/LF；失败/恢复保留原始字节。锁、备份和私有截图需要人工管理；清理失败不能当“没有写入”。 |
| R6 Git 历史及报告保密 | P2 | 历史文件检查不能识别同一允许文件早期版本中的秘密，也不是任意敏感数据检测器；预览批准需审阅完整历史和报告。独立秘密扫描只针对本次交付，不构成产品防泄漏保证。 |
| R7 兼容性覆盖范围 | P3 | 仅嵌套 JSON 字符串；数组、点号键、更多 i18next 格式化语法、候选 Trans 标记等仍可能拒绝。两个应用各新增一个键，不等同大型多 namespace/多语言迁移、复数和复杂业务覆盖。 |

这些风险没有被静默降级为“测试全绿即安全”。R2/R5/R7 中多项原文档已声明，本次通过代码审查/测试再次界定；不把既有声明当作已消除风险。

## 4. 实际环境与证据

[环境清单](zeroloc-starter/docs/verification/independent/environment.json)：Windows x64 `10.0.26200`，Node `25.2.0`、npm `11.6.2`、Git `2.53.0.windows.2`；Ubuntu WSL2 Linux 内核 `6.18.33.2`，原生 ext4 隔离副本上的 Node `22.23.3` / `24.22.0`。Linux Node 官方压缩包逐一与 SHASUMS256 核对，摘要存于环境清单。浏览器为 Playwright `1.64.1` 的 Chromium revision 1248、Firefox revision 1555，使用仓库已有隔离缓存。

| 检查 | 结果与证据 |
|---|---|
| 原提交回归 | Windows **41/41**，[原始日志](zeroloc-starter/docs/verification/independent/baseline-tests-native.txt)。 |
| 原提交视觉 | 原始 **12** 个浏览器×语言×视口组合通过；故意溢出/无名称按钮检出，[日志](zeroloc-starter/docs/verification/independent/baseline-visual-isolated.txt)。 |
| 加固后回归 | 最终总数 **56**；Windows 55 passed、1 POSIX-only skipped；Linux Node22/24 各 56 passed、0 skipped。见 [Windows](zeroloc-starter/docs/verification/independent/final-windows-tests.txt)、[Linux22](zeroloc-starter/docs/verification/independent/linux-v22.23.3-tests.txt)、[Linux24](zeroloc-starter/docs/verification/independent/linux-v24.22.0-tests.txt)。 |
| 原始视觉/五场景工作流 | [12 组视觉与负例](zeroloc-starter/docs/verification/independent/final-visual.txt)；[成功、单测失败、UI失败、超时、冲突五场景](zeroloc-starter/docs/verification/independent/final-workflow.txt) 均符合预期。此工作流使用标明的本地 HTTP 协议桩，不称为模型证据。 |
| 新网络对抗测试 | Chromium/Firefox；跨源 HTTP、WS、SW 见证计数 0，302 被拒绝，[结果](zeroloc-starter/docs/verification/independent/network.json)。 |
| 其他 CI 项 | [示例检查](zeroloc-starter/docs/verification/independent/final-example.txt)、[112 项依赖许可证](zeroloc-starter/docs/verification/independent/final-licenses.txt)、JSON/SARIF、CycloneDX SBOM 均生成；[audit 0](zeroloc-starter/docs/verification/independent/final-audit.txt) 仅为依赖补充证据。 |

首次在桌面沙箱内执行出现 rename EPERM、浏览器缓存缺失/loopback 拒绝；默认 Firefox 缓存本身也启动失败。没有绕开断言：保留失败日志，按仓库已有说明改用本机测试权限和隔离浏览器缓存，完整重跑。早期因 loopback 限制悬挂的自有沙箱测试进程树已按 PID/命令行核实后停止。未终止用户原有 Ollama 服务。文本日志仅统一换行、清理行尾空格；截图及资源哈希不按这种方式改写。

## 5. 两个外部开源应用

选择的是两个独立上游仓库中的真实官方示例应用，**不是 ZeroLoc 自带 SSR 演示**，也不是两个独立生产客户的验收。它们技术结构不同；本次应用选择的代表性仍有限。

| 应用 | 来源与许可 | 实际结构/依赖 |
|---|---|---|
| React 客户端应用 | [react-i18next](https://github.com/i18next/react-i18next/tree/2aab7f1d18a27da859ce218a6945415b651b00cc/example/react)，提交 `2aab7f1d18a27da859ce218a6945415b651b00cc`；[MIT 原文](zeroloc-starter/docs/verification/independent/react-i18next-MIT.txt)。 | Vite 8.2.2，React 19.2.8，react-i18next 17.0.11，HTTP backend 与浏览器语言检测；嵌套 JSON、动态客户端加载。 |
| Next.js 应用 | [next-i18next](https://github.com/i18next/next-i18next/tree/7a9995093bb795ee0dac564869d1be95e4c7982d/examples/pages-router-simple)，提交 `7a9995093bb795ee0dac564869d1be95e4c7982d`；[MIT 原文](zeroloc-starter/docs/verification/independent/next-i18next-MIT.txt)。 | Next 16.4.2，next-i18next 16.4.1，React 19.3.1，Pages Router、SSG/服务端翻译加载与 locale 路径、多 namespace。 |

完整源码复制到忽略的 `.review-external/react-app` / `next-app`，分别新建本地 Git 仓库，保留许可证，**未配置 remote**。依赖安装均禁用 lifecycle scripts；Vite 使用上游 lock，Next 生成的 [精确 lock](zeroloc-starter/docs/verification/independent/next-package-lock.json) 与安装版本均保留。未把上游应用/依赖源码并入 MIT 核心。

两者均真实执行：向英文资源与页面增加 `review.greeting = Hello {{name}}` → 检出德语缺键 → 实际本地 Ollama 生成候选 → 独立检查候选并批准精确 planId/config hash → 应用 → 运行实际 i18next 测试 → 用 Chromium/Firefox 在 375×812 与 1280×800 断言 `Hallo Ada` → 构建 → 本地 PR 准备。CLI 精确批准行为另由实际 CLI 回归验证；外部全链路使用公开 JS API。

本次隔离测试的候选修订及审批参数由审查代理按用户授权审阅并执行。这验证了需要明确审批的工作流，**不是另一位真人翻译员或维护者的签字**，不能代替发布前的真人语言/截图验收。

模型为既有 Ollama **0.40.6**、`qwen2.5:0.5b`，digest `a8b0c51577010a279d933d14c2a8ab4b268079d44c5c8830c0a93900f1827c67`；读取实际模型许可证并记录摘要，未下载新模型、未使用付费/云端 API。[模型与计划证据](zeroloc-starter/docs/verification/independent/external-setup.json)。

| 项目 | React/Vite | Next.js |
|---|---|---|
| 候选与审阅干预 | `Hallo {{name}}` 经审查代理审阅后批准。 | 原输出 `Hallo {{name}}, ` 结构/质量均通过，属于语义漏报；审查代理去掉逗号和尾空格，重新绑定计划。原始与修订 proposal 均保留，仍需真人语言验收。 |
| 自动资源/译文测试 | 通过，原人工 title 保留。 | 通过，原人工 h1 保留。 |
| 实际译文页面 | 两浏览器×两视口，共 4/4 断言通过。 | 两浏览器×两视口，共 4/4 断言通过。 |
| 通用视觉检查 | 4/4 自动 passed，但人工看图发现按钮与段落重叠，**真实漏报**。 | failed：PAGE/ELEMENT_OVERFLOW、color-contrast、image-alt、link-in-text-block、link-name。外部图片因离线策略被拦截；不能声称完整视觉保真。 |
| Locale 适配 | 使用 `?lng=de`。 | 使用 `/de`。 |
| 额外人工步骤 | 查阅截图，记录重叠；未修改上游 CSS 来制造绿色。 | `next dev` 修改 `next-env.d.ts` 并生成 AGENTS.md，PR 准备正确拒绝无关文件。停止自有 dev 服务后，归档生成的 AGENTS 并还原仅这份隔离副本的生成类型变化，再准备。未把这些变化塞进翻译 PR。 |
| 构建与 PR 准备 | 上游构建通过；本地 `cf5217f5fa8044c6b6dddae27100214247bb7509`，仅目标 JSON+报告，main 不变。 | 上游生产构建、TypeScript 检查通过；本地 `538141fd97d06cf052337ba9ff691e7a7161e988`，仅目标 JSON+报告，main 不变。 |
| 已记录执行耗时 | 安装约 7s；生成约 2.56s；最终独立浏览器/视觉验证约 22.95s。 | 安装约 1min；生成约 0.39s；最终独立浏览器/视觉验证约 36.96s。 |

耗时分别来自命令日志与 harness 的 `performance.now()`，不含下载、人工排错/审批等待及其他重跑时间，不声称是整个任务耗时。Next 的正式 apply 验证配置是**明确批准的 unit-only**；后续独立 UI 失败未伪装成 apply UI 成功，因此本地 PR 准备成功也不是完整 UI 发布准入。

另强制浏览器语言为 en-US、仅传 `?locale=de` 时，两者都显示 `Hello Ada`。这证明 query 本身不是它们的语言协议；浏览器 navigator/Accept-Language 可能影响默认选择，不能只按矩阵标签推断实际语言。针对实际德语 URL 的上述断言才是本次德语证据。

详见 [React 运行记录](zeroloc-starter/docs/verification/independent/react-runtime.json)、[Next 运行记录](zeroloc-starter/docs/verification/independent/next-runtime.json)、[Next 本地准备](zeroloc-starter/docs/verification/independent/next-prepared.json)、[React 移动截图](zeroloc-starter/docs/verification/independent/react-mobile.png)、[Next 移动截图](zeroloc-starter/docs/verification/independent/next-mobile.png)。其余截图位于本地 `zeroloc-starter/artifacts/independent-apps/`，摘要清单见 [screenshots.json](zeroloc-starter/docs/verification/independent/screenshots.json)。

## 6. 复跑与交付记录

在 `zeroloc-starter` 中：

```sh
npm ci --ignore-scripts
npm test
npm run check:example
npm run licenses:check
npm run test:visual -- --all-browsers
npm run test:workflow
npm run test:network
```

浏览器需已安装，Windows 使用 `docs/STABILIZATION_ENVIRONMENT_CN.md` 中的隔离缓存。外部应用 harness 为 `qa/independent-apps.mjs`：从上述固定提交制作全新、不带 `.git` 的隔离应用副本并保留 LICENSE，安装依赖后先 `--stage setup`。审查 `*-proposal.json` 与 `*-preview.json`，人工修改候选后必须重新调用 `planApply` 绑定新 ID；本次 Next 原始候选保存在 `next-original-model-proposal.json`。再用 `--stage apply --approve-react <ID> --approve-next <ID>`，不得把样例 ID 用于其他目录/字节。`--stage resume` 只复验已有结果；`--stage prepare --only next` 可在人工处理框架生成文件后完成本地准备。harness 从不调用 push/publication。

交付代码提交：`324373c96e1595c7947d93b6ad4156d3c62d4d8d` 与最终代码修复 `6ffeb8bb6c22916c43c6ae8866117973fc6b9b13`。完整 PR 分支历史（相对 main 的 8 个提交）经 Gitleaks 8.30.1 扫描未检出秘密，见 [扫描记录](zeroloc-starter/docs/verification/independent/gitleaks-history.txt)；这不替代上文的应用级安全测试。

最终代码修复的 [真实 GitHub CI 39477670058](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39477670058) **5/5 成功**：Ubuntu/Windows × Node22/24 四项 regression，以及 visual（原始矩阵、五场景工作流、新网络对抗回归）。[结构化 job/step 证据](zeroloc-starter/docs/verification/independent/remote-ci.json)。此前首轮修复的 [CI 39476869093](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39476869093) 也为 5/5。本地结果未冒充远端结果。五项 job 名称保持不变，Actions 仍为 `contents:read`、checkout 不持久化凭证、action 使用固定 SHA。随后仅提交本报告/证据，最新文档提交的 Checks 仍应单独核对。

维护者转 Ready 前应核对这个修复提交及其后的文档提交 Checks；正式 Beta 前还需书面接受上述运行边界，扩大实际业务/多语言验证，并把人工语言/截图检查落实为发布准入。本文没有授予自动合并或发布授权。
