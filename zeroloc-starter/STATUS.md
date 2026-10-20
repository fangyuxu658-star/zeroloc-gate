# ZeroLoc beta verification status

目标 v0.1.0-beta.1；功能冻结，只做验收和文档修正。仓库：[fangyuxu658-star/zeroloc-gate](https://github.com/fangyuxu658-star/zeroloc-gate)。main 基线 4a64f6d6350ed5e80c1738ffa145a8dba46da66f；本分支未合并，未直接修改 main，也未创建 tag/Release。

## Fully verified

- [首次 main GitHub CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39347428254) 5/5 jobs 成功：Ubuntu/Windows × Node 22/24 各 21/21；Linux Chromium/Firefox × 3 locales × 2 viewports 共 12 组通过，故意溢出/无名称按钮检出。
- 下载核验四份 JSON/SARIF/SBOM，JSON 0 errors、SARIF 0 results；Linux 安装树 97 个组件、Windows 96 个，不混淆安装平台范围。
- 格式门禁、i18next 真实提取、独立本地 HTTP provider 安全负例与真实 Ollama 0.40.6/qwen2.5:0.5b CPU E2E 已验证。原目标/人工字段未改，候选仍需人审。
- 正常 Draft PR 正在准备；未将尚未运行的 PR CI 计为通过。
- 负例 PR 尚未创建/验证，保持未验证。
- 核心 MIT、107 项锁定 npm 许可清单与原始声明已检查。现有 Actions SHA 固定、contents:read、无 secrets 引用、checkout 不保留凭证。

## Partially verified

- Fork PR：静态 workflow 与只读默认 token 配置已核对；真实外部 fork 事件尚未测试，没有第二个可用贡献者场景。不能用同仓测试 PR 代替。
- CI 门禁会检测错误，但 main 当前 protected=false、rulesets 为空，不能保证失败 CI 在服务器端阻止管理员/有写权限者合并。Draft 的不可合并状态也不是 CI 保护的证明。
- Windows 原默认 Firefox 缓存有 mozglue 激活问题；项目独立缓存及 Linux CI 可运行。小模型把 Continue 原样返回，结构通过不代表翻译完整或语义正确。
- 本分支文档最后修订会再次触发 CI；以正常 PR Checks 的最新 head 为准，历史成功 run 不替代新提交检查。

## Not yet verified / not authorized

- 外部 fork PR 的实际权限/secret 行为；GPU/其他模型及真实客户应用；完整语义质量、完整无障碍与像素基线。
- main 保护规则执行效果；正常 PR 合并后的最终 main CI；正式 beta tag/Release。远端设置、合并、tag 与发布均需维护者再次批准。

当前判断：工程候选可继续人审；正式发布 **NO-GO**，直到维护者批准并合并正常 PR、验证合并后 main，并启用保护或明确接受其未启用风险。详见 [验收日志](docs/BETA_RELEASE_ACCEPTANCE_CN.md)、[checklist](docs/RELEASE_CHECKLIST_CN.md) 和 [环境复现](docs/STABILIZATION_ENVIRONMENT_CN.md)。
