# ZeroLoc Gate

Local-first、MIT、免费自部署的本地化质量门禁与可审核翻译自动化。已发布 [v0.1.0-beta.1](https://github.com/fangyuxu658-star/zeroloc-gate/releases/tag/v0.1.0-beta.1)；本分支是未发布的 **v0.2开发版**，基于受保护main，未自动合并或发布。

- [核心用法与v0.1兼容命令](zeroloc-starter/README.md)
- [v0.2 Safe Apply、验证授权、恢复、PR CLI](zeroloc-starter/docs/V02_SAFE_APPLY_CN.md)
- [各阶段真实测试与模型验收](zeroloc-starter/docs/V02_ENGINEERING_CN.md)
- [当前状态与限制](zeroloc-starter/STATUS.md)

```sh
cd zeroloc-starter
npm ci --ignore-scripts
npm test
npm run check:example
```

默认预览；写文件、本地准备、远端push/创建Draft PR分别需要当前摘要的显式批准。GitHub集成可选，本地流程不需要账号。结构与语言风险检查不保证语义正确，所有候选须人工复核。保持现有main保护；不自动merge、收费API、发布npm或版本。
