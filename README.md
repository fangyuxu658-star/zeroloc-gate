# ZeroLoc Gate beta preparation

最新收尾：PR #1 已 Squash Merge，main `d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a` 的 [CI 5/5 成功](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39356683284)。保护规则、Tag 和 Pre-release 尚未执行；收尾文档更新尚未合并，见 [发布收尾记录](zeroloc-starter/docs/RELEASE_CLOSEOUT_CN.md)。

目标版本：**v0.1.0-beta.1**。公开仓库已创建并完成首次 main push，[真实 GitHub CI 已通过](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39347428254)；尚未发布 tag 或 Release。

源码、运行命令与使用说明位于 [zeroloc-starter/](zeroloc-starter/README.md)。

- [当前验证状态](zeroloc-starter/STATUS.md)
- [真实 PR 验收日志](zeroloc-starter/docs/BETA_RELEASE_ACCEPTANCE_CN.md)
- [分支保护方案（未应用）](zeroloc-starter/docs/BRANCH_PROTECTION_PROPOSAL_CN.md)
- [GitHub remote 与 PR 流程](zeroloc-starter/docs/GITHUB_BETA_FLOW_CN.md)
- [Beta 发布检查表](zeroloc-starter/docs/RELEASE_CHECKLIST_CN.md)
- [首次公开发布与登录步骤](zeroloc-starter/docs/FIRST_GITHUB_PUBLICATION_CN.md)
- [Release Notes 草稿](zeroloc-starter/docs/RELEASE_NOTES_v0.1.0-beta.1.md)
- [本次发布审查](zeroloc-starter/docs/PUBLICATION_READINESS_CN.md)

```sh
git clone https://github.com/fangyuxu658-star/zeroloc-gate.git
cd zeroloc-gate/zeroloc-starter
npm ci --ignore-scripts
npm test
npm run check:example
```

公开仓库：[fangyuxu658-star/zeroloc-gate](https://github.com/fangyuxu658-star/zeroloc-gate)。当前交付采用“仓库根目录 + zeroloc-starter 子目录”布局，真正的 GitHub Actions 入口为根目录 [.github/workflows/ci.yml](.github/workflows/ci.yml)，已设置命令工作目录和 artifact 路径。不要只提交子目录而遗漏根 workflow。

这是 beta 准备状态；只有 [STATUS.md](zeroloc-starter/STATUS.md) 明确列出的验证可作为展示依据。[已合并 PR #1](https://github.com/fangyuxu658-star/zeroloc-gate/pull/1) 已完成首轮 5/5 CI，最终提交以最新 Checks 为准；[负例 PR #2](https://github.com/fangyuxu658-star/zeroloc-gate/pull/2) 已按预期失败并关闭、未合并。合并、分支保护修改和 tag/Release 发布仍需分别确认。
