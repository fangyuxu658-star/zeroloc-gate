# ZeroLoc 7 天启动计划

## Day 1 — 建仓库与跑通测试
- 在电脑安装 Node.js 24、Git、VS Code 或 Codex CLI。
- 将本项目创建为新的公开 GitHub 仓库（先确认名称与许可证）。
- 执行 `npm test` 和 `npm run check:example`。
- 手动改坏 `examples/locales/de.json` 中的 `{{name}}`，确认 CLI 失败。

## Day 2 — 用真实小型项目试验
- 找一个获得授权的 React/i18next 项目，准备英文与一门目标语言的 JSON 资源。
- 修改 CLI 参数指向真实文件，记录所有误报与漏报。

## Day 3 — 提升检查准确度
- 为复数规则、点号键、重复资源项的处理方式撰写测试与规范。
- 不要尝试靠简单正则解析完整 ICU。

## Day 4 — GitHub CI
- 将校验命令放进被测仓库的 GitHub Actions 工作流。
- 对一个故意破坏占位符的 PR 观察失败状态。
- 收紧权限：只读权限、无密钥、无自动合并。

## Day 5 — 向开发者展示
- 录制 60 秒 GIF/视频：原本绿灯 → 改坏字符串 → CI 红灯 → 修复恢复绿灯。
- 公开 README 中的限制与测试结果。

## Day 6 — 访谈开发者
- 找 3–5 个真实开发者，确认他们的国际化格式及最棘手的失败类型。
- 不询问他们愿不愿意购买；重点理解问题是否值得持续解决。

## Day 7 — 发布 v0.1.0
- 根据反馈修复至少一个真实问题。
- 打 Git tag `v0.1.0`，发布 GitHub Release。
- 开 issue：ICU parser、JSON variants、visual UI checks、BYOK translator、safe patch suggestions。

## 两项原则
1. 先把工具做成可靠的公共技术，再追求自动化覆盖范围。
2. 指标是采用量、错误检测准确度、节省工时和复现能力，不是任何人的就业损失。
