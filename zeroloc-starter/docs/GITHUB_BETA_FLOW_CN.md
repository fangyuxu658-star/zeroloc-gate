# GitHub remote、PR 与 Actions

> 本文件保留首次创建时的计划/审查记录；仓库与首次 push 已完成。本轮 PR 验收的当前状态以 [BETA_RELEASE_ACCEPTANCE_CN.md](BETA_RELEASE_ACCEPTANCE_CN.md) 和 [STATUS](../STATUS.md) 为准。

## 当前布局与准备边界

本机 Git 根是 `本地化开源项目/`，源码在 `zeroloc-starter/`，根仓库当前无提交、无 remote，分支名为 master。已补齐根 README、根 `.github/workflows/ci.yml` 和 PR 模板。根 workflow 通过 `defaults.run.working-directory: zeroloc-starter` 运行 npm，artifact 路径也指向子目录；它才是当前布局的 GitHub 入口。子目录中的 `.github/workflows/ci.yml` 保留为“把子目录单独建仓”的模板，当前布局不会发现它。

目标已由用户指定为 public `fangyuxu658-star/zeroloc-gate`，gh 与 API 已核实对应登录账号；当前等待最后批准，没有创建仓库或 push。以下 OWNER/REPOSITORY 为通用命令占位符，不代表已执行远端操作。

## 首次接入已有空 GitHub 仓库

先在 GitHub 选择/创建一个空仓库（不要再生成另一份 README/初始提交），将命令中的 URL 替换为真实地址。在**外层 Git 根**执行：

```sh
git rev-parse --show-toplevel
git status --short
git remote -v
git remote add origin https://github.com/OWNER/REPOSITORY.git
git remote -v
git ls-remote origin
```

`ls-remote` 仅验证读取权限；无输出但退出码 0 可以表示空仓库。认证由 Git Credential Manager 或已有 SSH 配置完成，不把 token 放入 URL、README、命令历史或 CI secrets。已有 origin 时先核实；确需改地址再用 `git remote set-url origin <真实URL>`。非空远端需先 fetch 并评估历史，不使用 force push 覆盖。

确认要公开的文件与许可证之后，首次提交：

```sh
git add README.md .github zeroloc-starter
git diff --cached --stat
git diff --cached --name-only
git status --ignored --short
git commit -m "Prepare ZeroLoc beta baseline"
git branch -M main
git push -u origin main
```

提交前核实 `.local-tools/`、`.local-models/`、`node_modules/`、`artifacts/` 被忽略。公开日志仅使用合成文本；历史失败日志可能含本机绝对路径，公开前检查。`private:true` 保持阻止 npm 误发布；展示 beta 不需要 npm publish。

## 克隆后运行与日常 PR

```sh
git clone https://github.com/OWNER/REPOSITORY.git
cd REPOSITORY
git switch main
git pull --ff-only
git switch -c codex/stabilize-beta
cd zeroloc-starter
npm ci --ignore-scripts
npm test
npm run check:example
npm run licenses:check
npx --no-install playwright install chromium firefox
npm run test:visual -- --all-browsers
cd ..
git diff --check
git add <本次明确修改的文件>
git commit -m "Stabilize beta verification and documentation"
git push -u origin codex/stabilize-beta
```

在 GitHub 的 Compare & pull request 页面选择 base=main、compare=codex/stabilize-beta，先建 Draft PR，按模板附上实际环境、退出码、负例与日志。远端 checks 通过后再转 Ready，请维护者审核与合并。fork 贡献者把自己的 fork 设为 origin、主仓设为 upstream，再对主仓 main 提 PR。没有自动合并、push/deploy 或模型推理步骤。

## GitHub Actions 与验收

根 `.github/workflows/ci.yml` 在 pull_request 和 main push 时触发。regression 覆盖 Ubuntu/Windows × Node 22/24，执行锁定安装、测试、示例、许可门禁、audit 和 JSON/SARIF/SBOM；visual 在 Ubuntu Node 24 执行 Chromium/Firefox 完整矩阵。Actions 使用固定 40 位 SHA，permissions 仅 contents:read，checkout 不保留凭证。fork PR 不引用 secrets，也不使用 pull_request_target 执行不受信任代码。首次贡献者可能需要维护者在 GitHub 批准 workflow 运行；这不是测试已通过。

在 PR Checks 或仓库 Actions → ZeroLoc CI 中检查每个 job，下载 `reports-<os>-node<version>` 和 `visual-findings` artifact。保留失败 job 的日志，修复后重新运行。成功运行的 URL 和 commit SHA 应回填 STATUS 与 release checklist。不要给尚未运行的 checks 添加绿色状态 badge。

远端建立后，在 Settings → Rules/Branches 保护 main：要求 PR、必要审核，以及首次成功运行后选定的 regression/visual 状态；不允许绕过失败检查。若 visual 被系统依赖阻塞，先修环境，或将 beta 明确限定为已验证的 Chromium 演示，不能把失败静默标成通过。以仓库实际生成的 check 名称设置规则，不虚构名称。

还需建立一个**测试用、不得合并**的负例 PR：移除 `examples/locales/de.json` 中 greeting 的 `{{name}}`，确认 check:example job 失败，然后恢复或关闭 PR。另从 fork 验证日志中没有凭证、workflow 权限没有被扩大。记录这两次远端运行 URL。

官方说明：[管理 remote](https://docs.github.com/en/get-started/git-basics/managing-remote-repositories)、[workflow 语法及工作目录](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)。
