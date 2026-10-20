# v0.1.0-beta.1 首次公开发布审查

> 本文件保留首次创建时的计划/审查记录；仓库与首次 push 已完成。本轮 PR 验收的当前状态以 [BETA_RELEASE_ACCEPTANCE_CN.md](BETA_RELEASE_ACCEPTANCE_CN.md) 和 [STATUS](../STATUS.md) 为准。

日期：2026-10-19。状态：**本地准备完成，GitHub 账号已核实；等待最后明确批准**。没有远端写入、仓库创建、push、PR、tag、Release 或分支保护修改。

## 仓库、历史与公开范围

Git 根包含 `.github/`、MIT LICENSE、根 README/CONTRIBUTING、忽略规则，以及 `zeroloc-starter/` 全部源码、CLI、测试、合成示例、演示、锁文件、文档、许可声明与已脱敏验证证据。根 workflow 的 cwd/artifact 路径适应该子目录布局。

初始分支为 `master`，没有 HEAD commit、branch/tag 历史或 remote。`.git` 内存在工具 checkpoint 引用与不可达对象；它们不在公开导出中，不删除它们，也不使用 mirror/all 推送。批准后只推送从无父提交创建的公开 main，指定 tag 留待 Release 阶段单独确认。

登录后的额外核查扫描了当时对象库的 118 个 blob（含不可达对象）和两个内部 tree 的导出：Gitleaks 未发现密钥；候选源码与内部 tree 导出没有本机用户路径，但 **1 个不在公开候选中的不可达 blob 保留本机路径**。因此不宣称整个 `.git` 对象库没有隐私；仅批准过的源码 tree 和新建无父提交进入 main，`.git` 与内部引用不打包/上传。首次提交后、push 前还要检查该提交的实际祖先链与文件集合。

原本 Git 身份使用非 noreply 邮箱；没有创建 commit，因此未把该地址写入任何公开提交。登录后会核对真实 login/id，再展示拟用的 repo-local noreply 身份。当前 Git 配置不导出、不上传，私人邮箱不写入本文。

拟建仓库：**fangyuxu658-star/zeroloc-gate，public，MIT，默认分支 main**。账号由 gh auth status 和 API 双重核实，用户 ID 为 234267204；仓库 API 返回 404，账号仓库列表也无同名项。创建时仍须检查冲突并停止，不能覆盖已有资源。拟定 repo-local 作者为 `fangyuxu658-star`，隐私邮箱 `234267204+fangyuxu658-star@users.noreply.github.com`，尚未配置或提交；不使用当前私人 Git 邮箱，也不修改全局 Git 身份。

## 内容与凭证审查

`qa/publication-audit.mjs` 基于 Git 的实际公开候选文件列表生成独立源码树、逐文件 SHA-256 manifest，排除 `.git`、node_modules、artifacts、本地工具与模型，拒绝非普通文件和意外大文件。扫描本机绝对用户路径、个人机器标识、私钥标记及带凭证 URL；不把命中值打印出来。已公开验证日志的用户目录前缀使用 `<USERPROFILE>` 占位符，原始本机路径不公开。

成熟工具 **Gitleaks 8.30.1** 扫描同一公开树，结果 **no leaks found**。隐私/路径扫描无未解决命中。唯一人工复核例外是 endpoint 负例测试的假 loopback 凭证 URL，它用于证明拒绝带用户名/密码的 endpoint，不是有效账号或 API key；未通过宽泛忽略规则放过其他文件。第三方 LICENSE/NOTICE 内的上游作者归属按许可证保留，不将其误删。

所有工具、Ollama/浏览器运行时、模型、Git 身份与认证配置均不在候选树。扫描降低泄露风险，不声称能数学上保证不存在任何未知秘密；创建首次 commit 后、push 前还将对实际提交文件/作者和祖先链再次核对。

本地快照与 manifest 在被忽略的 `artifacts/release-v0.1.0-beta.1/`，只是审查产物，尚未上传。

## 文档、许可与版本

- 根/子项目 MIT LICENSE 一致，保留第三方许可证、原始 NOTICE 和补充来源。未合并 GPL/AGPL/专有 EE 源码。
- package.json 与 lockfile 统一为 `0.1.0-beta.1`；CLI help 和报告版本一致；private=true 继续防止误发 npm。
- README、STATUS、CONTRIBUTING、实际根 Actions 与 [Release Notes](RELEASE_NOTES_v0.1.0-beta.1.md) 已核对，远端项继续标为 pending，未添加虚假 badge。
- SBOM 已在 beta 候选重新生成；模型与工具/浏览器二进制不捆绑，不在 npm SBOM 范围。

## 本地真实测试

| 项目 | 结果 |
| --- | --- |
| `npm ci --ignore-scripts` | 锁文件重新安装成功，96 packages |
| `npm test` | **21/21 通过**，包含真实 CLI 正负例/退出码、提取器和 provider 安全负例 |
| `npm run check:example` | PASS，0 errors / 0 warnings |
| `npm run licenses:check` | **107 个锁定依赖通过** |
| `npm audit --json` | **0 已知漏洞**，有时效性 |
| `npm sbom --sbom-format cyclonedx` | beta 版本，**96 个本机组件** |
| `npm run test:visual -- --all-browsers` | 独立缓存下 **12 组通过**，负例检出溢出/无名称按钮 |
| 真实 `qa/ollama-e2e.mjs` | Ollama 0.40.6、qwen2.5:0.5b，**3 候选/0 结构错误**，原目标和人工字段未改 |
| Gitleaks 与隐私检查 | 无泄露命中 / 无未解决隐私路径命中 |

本机环境 Windows、Node 25.2.0、npm 11.6.2。原默认 Firefox 缓存仍有 mozglue 激活问题，独立缓存已验证。小模型仍未翻译 Continue，不把结构 PASS 宣传为完整语言质量。此轮只调整版本与发布资料、增加审查工具，没有开发新产品功能。

已保存本次 beta 日志：[21 项测试](verification/release-tests.txt)、[示例](verification/release-example.txt)、[许可](verification/release-licenses.txt)、[audit](verification/release-audit.json)、[双浏览器](verification/release-visual.txt)、[真实模型](verification/release-ollama-e2e.txt)、[Gitleaks 空结果](verification/release-gitleaks.json)、[版本/许可/Actions/文档检查](verification/release-metadata-check.txt)、[真实 CLI JSON](verification/release-check.json)、[故意失败 SARIF](verification/release-negative.sarif)。旧版验证记录作为历史证据保留，不冒称其版本为 beta。

## 认证与远端门槛

原系统没有 gh，已安装经官方 SHA-256 验证的可移植 **gh 2.102.0**。用户完成登录后，本轮 auth status 确认 github.com 的活动账号为 **fangyuxu658-star**，凭证保存在 keyring，Git 协议 HTTPS，具有 repo/workflow 等权限；API 返回一致 login/id。没有读取或展示原始 token。认证配置不进入公开文件。

当前向用户展示 public `fangyuxu658-star/zeroloc-gate` 和重新审查的公开快照，**等待批准**。首次 push 成功后才有条件验证 GitHub Actions 和测试 PR，不能用本地矩阵替代远端运行。Release `v0.1.0-beta.1` 仍需在实际 CI/PR 证据完成后单独批准。

GitHub 官方说明 public Free 仓库支持基本 protected branches；实际仓库尚不存在，因此当前只能核对一般适用性，不能声称“已启用”或“不支持”。创建后只读检查仓库权限、规则 API 与 UI；404/403/422 分别核实，不误判；若确不适用，记录返回原因和替代人工审核流程。修改规则必须另经明确确认。单人仓库不默认强制无法由作者本人满足的批准数量。

## 待完成，不计入通过

- 用户最后批准创建及初次 push；确认拟用的 repo-local noreply 作者身份。
- 用户批准创建 public zeroloc-gate 与初次 push；随后实际 CI/正常及故意失败 PR 验证。
- fork PR 权限验证（需要可用 fork 场景），实际分支保护适用性和获批设置。
- 最终 release commit、tag、附件摘要与 pre-release 发布批准；目前没有 tag/Release。
