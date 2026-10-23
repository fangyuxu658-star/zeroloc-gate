# v0.3 执行证据

本轮从 v0.2 的 `7295075` 开发。以下为实际执行结果；远端 CI 独立记录，不把本机 Windows Node25 结果称为 Node22/24 CI。

## 本地检查

- Windows Node25：68 total，67 passed，1 POSIX-only skipped；[完整日志](verification/v03/windows-tests.txt)。
- WSL2 原生 ext4 临时副本：Node22.23.3、24.22.0 各 68 passed，0 skipped；[Node22](verification/v03/linux-node22.23.3-tests.txt)、[Node24](verification/v03/linux-node24.22.0-tests.txt)。两份既有官方 runtime archive 重新逐一核对官方 SHA256。
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
- v0.2 的移动重叠、尾部逗号漏报均有真实/重放回归；剩余误报/漏报和信任边界列于 [工程说明](V03_REPAIR_ENGINE_CN.md)。没有声称已解决通用视觉或语义正确性。

## 远端状态

待本分支 Draft PR 创建后，以最终提交的实际 GitHub Checks 和下方记录为准。必须四个 Windows/Linux Node22/24 回归及 visual 全部成功；失败会修复并重新等待，不拿旧 head 的绿色作替代。PR 只指向 `codex/v0.2-safe-apply`，不合并、不改 PR #6、不改 main、不发布 Release。
