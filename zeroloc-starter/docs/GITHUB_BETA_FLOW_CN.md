# GitHub remote、PR 与 Actions

最新状态：PR #1 已获批准 Squash Merge 为 d498d4aae8e9a6f22a8e350ed6cc7325c1cfcd2a，[合并后 main CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39356683284) 5/5 成功。以下首轮 run 保留为历史证据；当前状态以 [发布收尾日志](RELEASE_CLOSEOUT_CN.md) 为准。规则、Tag 和 Release 尚未执行，后续文档 PR 不自动合并。

仓库：[fangyuxu658-star/zeroloc-gate](https://github.com/fangyuxu658-star/zeroloc-gate)，公开、main 基线 `4a64f6d6350ed5e80c1738ffa145a8dba46da66f`。origin 已配置，不要重复创建仓库或覆盖已有历史。Git 根在源码目录上一层；根 `.github/workflows/ci.yml` 是实际入口，子目录 workflow 只是独立建仓模板。

## 克隆与本地验收

```sh
git clone https://github.com/fangyuxu658-star/zeroloc-gate.git
cd zeroloc-gate
git switch main
git pull --ff-only
git switch -c codex/beta-docs
cd zeroloc-starter
npm ci --ignore-scripts
npm test
npm run check:example
npm run licenses:check
npm audit --audit-level=high
npm sbom --sbom-format cyclonedx
npx --no-install playwright install --with-deps chromium firefox
npm run test:visual -- --all-browsers
```

Windows 原默认 Firefox 缓存问题和项目独立缓存设置见 [环境复现](STABILIZATION_ENVIRONMENT_CN.md)。`npm test` 只运行正式 `test/*.test.mjs`，避免 artifacts 中旧审查副本被递归发现。安装需要网络；运行时 check 默认离线，翻译仅在显式本地 Ollama 操作中调用 HTTP。不把 token 放到 remote URL 或文件中。

## PR 流程与真实验收

从最新 main 创建主题分支，明确选择本次文件提交，push 该主题分支，base=main 建立 Draft PR。描述问题、实际命令/退出码、负例与限制；等待最新 head 的所有 Checks 完成后再请维护者审查。合并、保护设置与 tag/Release 必须单独获得批准。本次两条测试分支名由维护者指定。

- [正常 Draft PR #1](https://github.com/fangyuxu658-star/zeroloc-gate/pull/1)：[首轮 PR CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39349812116) 5/5 成功；最终文档提交另触发 CI，以最新 Checks 为准。
- [负例 PR #2](https://github.com/fangyuxu658-star/zeroloc-gate/pull/2)：[CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39349987984) 按预期失败，已关闭、未合并。仅移除合成德语 greeting 的 name 插值变量。失败发生于 npm test，之后的 check:example 步骤被跳过；不是虚构的独立 check:example job。
- [首次 main CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39347428254)：5/5 成功。

## Actions、安全与保护

根 workflow 在 pull_request 和 main push 时触发。四个 regression jobs 覆盖 Ubuntu/Windows × Node 22/24，执行锁定安装、测试、示例、许可、audit 和 JSON/SARIF/SBOM。visual 在 Ubuntu/Node 24 运行 Chromium/Firefox × 3 locales × 2 viewports，共 12 组及故意错误页面。下载 reports artifacts 和 visual-findings 核验报告；原始上传附件保留 7 天，持久化脱敏摘要见 [验收日志](BETA_RELEASE_ACCEPTANCE_CN.md)。

所有 actions 固定 SHA；contents:read、checkout persist-credentials=false；无 secrets 引用、pull_request_target、自动合并或模型推理。API 确认默认 token 只读、不能批准 review，仓库 secrets=0、environments=0。真实外部 fork 事件尚未测试，同仓 PR 不能代替 fork 动态安全验证；首次外部贡献者可能需要维护者批准 workflow 运行。

main 当前 protected=false、rulesets=[]。失败 CI 已证明能检测错误，尚不能保证服务器阻止合并。具体 [保护方案](BRANCH_PROTECTION_PROPOSAL_CN.md) 未应用；不得把 Draft 状态或红灯当成 required-check 执行证据。
