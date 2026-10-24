# v0.3 执行证据

本轮从 v0.2 的 `7295075` 开发。以下为实际执行结果；远端 CI 独立记录，不把本机 Windows Node25 结果称为 Node22/24 CI。

## 本地检查

- Windows Node25：69 total，68 passed，1 POSIX-only skipped；[完整日志](verification/v03/windows-tests.txt)。
- WSL2 原生 ext4 临时副本：Node22.23.3、24.22.0 各 69 passed，0 skipped；[Node22](verification/v03/linux-node22.23.3-tests.txt)、[Node24](verification/v03/linux-node24.22.0-tests.txt)。两份既有官方 runtime archive 重新逐一核对官方 SHA256。
- 原有 12 组视觉矩阵及故意失败页面、五场景 React/i18next 工作流、同源/重定向/WS/SW 边界继续验证；[工作流](verification/v03/workflow.txt)、[网络](verification/v03/network.txt)。工作流沿用明确标识的本地 HTTP 协议桩，非模型推理。
- [112 项核心依赖许可证](verification/v03/licenses.txt)、[audit](verification/v03/npm-audit.json)、[示例](verification/v03/example.txt)。本轮未新增核心 npm 依赖或模型。

## 真实上游验证

应用通过 `test:repair:setup` 从固定提交和锁重新安装，非只复用旧验收的副本。应用许可、lock、截图及摘要见 [机器证据](verification/v03/real-apps.json)。

| 场景 | 预期/实际结果 |
|---|---|
| React/Vite 原始移动页面 | Chromium、Firefox 都发现按钮/正文 `DOM_OVERLAP`；同时记录固定头部 `CONTENT_ESCAPE`。对照源语言判断是原有还是本地化扩大。 |
| 自动 CSS 修复 | `.App-header` 的 height150px → min-height150px + height:auto；1 次成功，源/德语 × 两浏览器 × 两视口每阶段 8 组通过，原目录 CSS 字节不变。 |
| 审核与 Git 准备 | 缺少 review/preparation 批准拒绝；精确批准后新 checkout 仅提交 `src/App.css` 和 `zeroloc-repair-review.json`。原 Git HEAD/分支不变，未向上游发布。 |
| React 可信单测故意失败 | 即使 CSS 视觉复测改善也撤回；原始 CRLF 字节恢复、失败截图/备份保留，1 次尝试后拒绝重复候选，不能交付。 |
| 语义风险 | `Hallo {{name}}, ` 被检出，给出 `Hallo {{name}}` 候选；`SEMANTIC_REVIEW_REQUIRED`、0 次 CSS 改写，不交付。 |
| 整体超时 | `DEADLINE_EXCEEDED`，停止自有进程，不交付。 |
| Next.js 原有问题与离线限制 | 双浏览器、两视口真实运行；保留 a11y/溢出错误及 `environment` 资源阻断。`NO_SAFE_CANDIDATE`，没有通过或准备 PR。 |

截图：[React 修复前](verification/v03/react-before-mobile.png)、[修复后](verification/v03/react-after-mobile.png)、[Next 阻断页面](verification/v03/next-blocked-mobile.png)。完整矩阵在 CI `visual-findings` artifact 和本地 `artifacts/repair-real-apps/*-evidence/`；各截图摘要见机器证据。公开摘要移除私有临时根路径，原始报告保留于本地临时副本/artifacts。

## 失败与误报记录

- 初次桌面沙箱回归被既有 Windows rename EPERM 阻断；没有改断言，改用本机权限重跑完整回归。
- 上游 partial clone checkout 在 Windows 失败；保留诊断后改为完整公开 Git 对象下载，固定提交不变，重新安装成功。
- 几何正常样例首次暴露旧视觉检查对 Firefox 普通 inline `clientWidth=0` 的误报。修正比较前提后，正常嵌套文字通过，双浏览器继续检出重叠、裁切、遮挡和布局移动。没有删除负例或屏蔽可见错误。
- 原网络安全测试曾把受阻页面标为 visual passed；新增环境报告后该旧断言失败。[首次日志](verification/v03/network-old-expectation.txt)。现在明确要求 visual=false、RESOURCE_BLOCKED，并保留跨源 HTTP/WS/SW 命中数均为0和 redirectRejected=true。
- 文档收尾 head `165fb47` 的 [CI 39891219520](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39891219520) 四项平台回归成功，但超时场景暴露信号退出后的重复清理竞态，Node exit13；[真实失败日志](verification/v03/timeout-ci-failure.txt)。子进程被信号终止时 exitCode 仍为 null，第二次清理误等已发出的 close。Windows 新回归还发现 taskkill 回调早于目标 close。修复为检查 exitCode/signalCode、共享同一次真实关闭等待并设置清理安全截止，避免等待死进程或向可能复用的 PID 发信号；新增真实子进程两次清理回归。修复后真实 React 成功链路及[连续三次超时阻断](verification/v03/timeout-cleanup-recheck.txt)通过。没有增加测试超时、忽略退出码或跳过故障场景。
- v0.2 的移动重叠、尾部逗号漏报均有真实/重放回归；剩余误报/漏报和信任边界列于 [工程说明](V03_REPAIR_ENGINE_CN.md)。没有声称已解决通用视觉或语义正确性。

## 远端状态

[Draft PR #7](https://github.com/fangyuxu658-star/zeroloc-gate/pull/7) 已创建并回读确认：`draft:true`，base 为 `codex/v0.2-safe-apply`，base SHA `7295075`。GitHub 连接器创建时返回 `must be a collaborator`，随后使用本机既有认证 CLI 成功；未调整仓库权限或更换基础分支。

代码提交 `d1c32be35330ce28998e7113d422ab3a1f3fb2cb` 的 [实际 CI 39887314998](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39887314998) **5/5 success**：[机器快照](verification/v03/remote-code-ci.json)、[实际日志摘录](verification/v03/remote-ci-log-summary.txt)。Linux Node22/24 各 68 passed/0 skipped；Windows Node22/24 各 67 passed/1 POSIX-only skipped。visual 的既有矩阵、工作流/网络对抗、几何回归、固定上游安装、React 成功/Next 阻断、修复回滚、语义阻断、超时场景全部执行成功。Next 阻断是预期的负例，不能解读为其页面视觉已通过。

`165fb47` 只补充验收记录和扫描/CI证据。随后修复上述真实 CI 清理竞态，并补充两个覆盖完整性拒绝条件及回归断言：不能重复同一视口，源/目标语言 URL 不能相同；真实验收原本就使用不同视口/URL。没有改变 CSS 修复规则或放宽任何门禁。最终 head 必须通过自己的 [最新 Checks](https://github.com/fangyuxu658-star/zeroloc-gate/pull/7/checks)，不能拿旧 head 的绿色作替代。PR #6 仍为 open/Ready/unmerged，head 未变；本地 main `4a64f6d`、origin/main `bcb542a` 未变。没有合并、main 写入、Release/tag、npm 发布或付费服务。

首次代码提交的全部历史 diff（相对 v0.2）经 Gitleaks 扫描，无泄漏；[扫描记录](verification/v03/gitleaks-history.txt)。报告不是独立安全审计或真人语言签字，原安全边界继续保留。
