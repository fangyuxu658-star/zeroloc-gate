# 首次 GitHub 开源发布：v0.1.0-beta.1

## 必须保持的授权边界

目标仓库：`fangyuxu658-star/zeroloc-gate`，public，MIT；默认分支拟为 main。gh 认证与 API 已核实真实 login=`fangyuxu658-star`、id=`234267204`；同名仓库查询未发现已有仓库。当前等待用户最后批准创建和初次 push，登录不等于发布授权。下面的登录命令保留作复现参考，无需重复登录。

授权应分为可审查的阶段：

1. **创建 + 初次 push**：确认真实 `OWNER/zeroloc-gate`、public、公开文件清单、初始作者 noreply 身份；只创建空仓库、配置 origin、推送初始 main。不要覆盖已有同名仓库、不要 force push。
2. **测试 PR**：确认要 push 的成功/失败测试分支以及 Draft PR 内容。正常 PR 用文档微改触发 checks；负例 PR 去掉德语 fixture 的 `{{name}}`，确认 gate 失败，禁止合并该负例。推送、创建/关闭远端 PR 都在授权范围明确后执行。
3. **分支保护**：展示真实 API 适用性和拟定规则，再请求批准。不能因 GitHub Free 计划名称就断言不支持；public Free 支持基本 protected branches。必须核对仓库权限、端点结果、可用规则与维护者人数。
4. **Release**：实际 CI 和 PR 验证完成、最终 commit 与附件校验和确定后，单独批准 `v0.1.0-beta.1` tag/Release，勾选 pre-release，非 latest stable。不在初次 push 时顺便发布。

没有任何批准时，只进行本地检查、打包、只读账户查询和文档准备。

## 最简单的登录操作

已将官方 GitHub CLI 2.102.0 校验后解压在被忽略的 `.local-tools` 中，无需安装器或管理员权限。从仓库根目录的 PowerShell 执行：

```powershell
& .\zeroloc-starter\.local-tools\gh-2.102.0\runtime\bin\gh.exe auth login --hostname github.com --git-protocol https --web --scopes workflow
```

若提示是否用 GitHub 凭证认证 Git，输入 `Y`。按终端提示打开 `https://github.com/login/device`，输入终端提供的一次性代码；确认浏览器登录的是你希望拥有仓库的账户，核对 GitHub CLI 请求的仓库/工作流权限，再点击 Continue / Authorize GitHub CLI。`--scopes workflow` 是为了首次 push 中包含 `.github/workflows/ci.yml`，避免随后重复授权；这不等于批准现在写入远端。设备码由此次命令产生，不在文档预填。不要把 token、密码或设备码发到聊天或提交进仓库。

然后执行：

```powershell
& .\zeroloc-starter\.local-tools\gh-2.102.0\runtime\bin\gh.exe auth status
& .\zeroloc-starter\.local-tools\gh-2.102.0\runtime\bin\gh.exe api user --jq .login
```

告诉助手“已登录”。助手将只读核对用户名，并给出下一步具体确认清单。**登录不等于批准创建/push/发布。** 不需要手动上传文件；后续批准后由 Git 一次性推送完整代码。

## 公开内容与排除项

公开根 LICENSE/README/忽略规则/.github、子项目源码/CLI/测试/合成 fixtures、演示、锁文件、许可证/SBOM、已脱敏验证记录和 Release Notes。排除 Git 凭证/配置、`.env`、私钥、API key、本地日志/缓存、node_modules、Ollama/gh/Gitleaks/浏览器二进制及模型权重。实际文件清单与摘要见本地 `artifacts/release-v0.1.0-beta.1/` 的 manifest；它不是远端已创建的证明。

当前 Git 的分支/tag 没有提交；但 `.git` 内有本地工具 checkpoint 引用和不可达对象，不应把它说成“整个对象库完全为空”。这些本机元数据不进入源码导出，不上传 `.git`，不使用 mirror/all 推送，只允许批准后的显式 `main` 和指定 beta tag。首次提交将从无父提交开始，并再次核对公开分支的提交链。**仍需在初次提交前设置 repo-local 作者身份为真实账户的 noreply 邮箱**，避免把现有私人提交邮箱写进首次公开 commit。不修改全局 Git 身份。用户可在 GitHub Settings → Emails 勾选 Keep my email addresses private，并使用页面显示的 noreply 地址；也可在核对真实用户 login/id 后展示拟用 noreply 地址请求确认。

## 批准后执行与验证

创建前先检查同名仓库是否存在。初次 push 后，读取仓库可见性/default branch/HEAD 并观察真实 Actions：Ubuntu/Windows × Node 22/24 regression，以及 Linux Chromium/Firefox visual。用 `gh run list/view/watch` 记录每个 run URL、commit 和 conclusion，下载并检查 artifacts；失败就修复本地并为后续 push 获取授权，不将失败改称通过。

成功测试 PR 和故意失败 PR 的证据都要记录。fork PR 若当前只有一个账号、没有可用 fork 贡献者，保持“未验证”，不能用同仓分支 PR 假装 fork 权限验证。

分支保护只读检查：`GET repos/OWNER/zeroloc-gate`、`GET .../branches/main/protection`、`GET .../rulesets`；区分 404（可能未配置、权限/资源不可见）、403（权限/计划/组织策略）、422（配置不适用）。公开 Free 仓库通常可设置基本保护，但仍以真实 API/界面为准。独立维护者不能批准自己的 PR，不默认强加“至少 1 个批准”使项目无法合并；必要状态检查使用实际 CI 生成的名字。只有远端更新成功并读回规则才能记录为 enabled。

最终 Release Notes 使用 `RELEASE_NOTES_v0.1.0-beta.1.md`，将“本地准备”段落替换为实测 CI/PR/commit 链接；保留已知问题。附件只包括审核过的源码、SBOM、许可证/NOTICE、验证摘要与 SHA256SUMS，不包含运行时或模型。

参考：[gh 登录](https://cli.github.com/manual/gh_auth_login)、[创建仓库](https://cli.github.com/manual/gh_repo_create)、[protected branches 的可用性](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)、[创建 Release](https://cli.github.com/manual/gh_release_create)。
