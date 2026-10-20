# Beta release engineering acceptance

> 以下是前轮验收历史记录；后续用户已授权 PR #1 的 Ready/Squash Merge。Ready 已完成，合并因 GitHub 作者邮箱校验失败而未执行成功。最新研发日志见 [RELEASE_CLOSEOUT_CN.md](RELEASE_CLOSEOUT_CN.md)，不能将以下“未授权合并”作为当前权限状态。

目标 v0.1.0-beta.1；基线 4a64f6d6350ed5e80c1738ffa145a8dba46da66f；仓库 [fangyuxu658-star/zeroloc-gate](https://github.com/fangyuxu658-star/zeroloc-gate)。维护者仅授权两个指定测试分支/两个 Draft PR、相关修复与验证、关闭负例和更新文档；没有合并、main 修改、tag/Release 或规则设置授权。

## 研发日志与真实证据

1. 核对 latest origin/main 为基线、工作区干净、gh 账号为 fangyuxu658-star。创建 test/beta-release-validation，更新过时文档、验收证据与 npm test 的发现范围。
2. 首次 [main CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39347428254) 已下载验证：四环境各 21/21、视觉 12 组、四份 JSON/SARIF/SBOM 与 13 张截图。
3. [正常 Draft PR #1](https://github.com/fangyuxu658-star/zeroloc-gate/pull/1)；[真实 PR CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39349812116)：success，5/5 jobs 通过，4 个系统/Node 组合各 21/21，视觉 12 组通过。记录运行的 head=8817f1b2f4ea4beecd01f6122783dca098f3468f。
4. [负例 Draft PR #2](https://github.com/fangyuxu658-star/zeroloc-gate/pull/2)；[故意失败 CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39349987984)：failure。移除合成德语 greeting 的 name 后，直接 CLI 退出 1 并定位 app.greeting / PLACEHOLDER_MISMATCH；远端检查失败。PR 已关闭且未合并，合成错误未进入 main。
5. 验收最终文档提交需再次观察正常 PR 最新 head 的所有 jobs；历史 run 链接明确对应其记录的 SHA，不以旧绿灯掩盖新改动。

## 安全与可靠性

[脱敏验收证据 JSON](verification/beta-pr-acceptance.json) 保存两个 PR 的 commit/run/jobs、负例 CLI 错误、audit/SBOM 与本地原始日志 SHA-256。正常 PR 首轮成功 head 是 8817f1b2f4ea4beecd01f6122783dca098f3468f；最终文档提交的 CI 应在 PR Checks 单独核对，不能用旧 run 代替。

本轮本地验证：Node 25.2.0，21/21 测试通过；双浏览器 12 组与故意错误页面通过；示例 0 errors/0 warnings；107 项锁定依赖许可无未审表达式；npm audit 所有级别共 0 vulnerabilities；重新生成 CycloneDX，Windows 安装树 96 个组件。PR CI 则真实覆盖 Node 22/24。四份远端 JSON/SARIF 均 0 errors/results，Linux SBOM 97、Windows 96；13 张视觉截图已下载。

公开候选共 110 个文件；隐私/绝对路径检查 0 个未解决问题（已识别一处无效 localhost 凭证 URL 是既有安全测试合成数据）。Gitleaks 8.30.1 对导出公开文件和 main/两个测试分支历史扫描均无发现；作者使用 GitHub noreply 邮箱。22 份 Markdown 的 103 个本地链接存在。扫描属于启发式检查，不作绝对无秘密保证；未推送本机工具引用或不可达对象。

可复现步骤：进入 zeroloc-starter 后执行 npm ci --ignore-scripts、npm test、npm run check:example、npm run licenses:check、npm audit --audit-level=high、npm sbom --sbom-format cyclonedx；浏览器依赖和独立缓存按环境文档安装后运行 npm run test:visual -- --all-browsers。负例审计可查看已关闭 PR diff；若在独立临时检出中复现，运行 node bin/zeroloc.mjs check --source examples/locales/en.json --targets examples/locales/de.json --format json，预期退出 1。不要把故意错误恢复到正常分支或 main。

负例仅修改 examples/locales/de.json 一行，head=4a8ef0ef10c17d715fc80f93ab16d667bf7a8f1b。远端 Ubuntu/Node 24 为 20 pass / 1 fail，npm test 退出 1；其他三个 regression 被 fail-fast 取消，不能计为通过；visual 成功。CI 日志定位 passes good example catalogs / test/check.test.mjs:33，但断言只显示 false !== true；准确的 app.greeting / Expected [name], got [] 来自单独 CLI JSON。此诊断粒度限制明确保留，没有声称 CI 原生日志已输出变量名。PR #2 已关闭，mergedAt=null，分支保留作为审计证据。

- 实际 workflow 仅 contents:read；所有 uses 固定 SHA；npm ci --ignore-scripts；无 pull_request_target、无 secrets 引用或外部账号/付费云 API，checkout persist-credentials=false。
- 仓库默认 Actions token 权限为 read、不能批准 PR review。只读 API 确认仓库 secrets=0、environments=0；五个 checks 均来自 github-actions（app ID 15368）。未读取 secret 值。
- 真正外部 fork 未测试，当前个人账号无法 fork 自己的同一仓库，不创建第二账号、不调用第三方替身；静态审查不冒充动态证据。
- 门禁能让 CI 失败；main protected=false、rulesets=[]，目前**不能保证失败 CI 阻止服务器端合并**。故意失败 Draft PR 不可合并还受 Draft 状态影响，不将其归因于 required checks。
- 建议保护：要求 PR、必要的四个 regression 与 visual 检查且与 main 同步、管理员同样遵守、禁止强推/删除、要求解决讨论。单维护者审批数先设 0，第二名协作者到位后改 1；实际 check 名称/app ID 以 API 返回为准。设置与 read-back 需另获批准，未启用不标通过。
- 核心 MIT 及第三方声明保留，模型与浏览器权利独立；新 audit/SBOM/公开文件及拟推分支历史扫描结果以验收证据为准。内部工具引用/不可达对象不推送，不使用 mirror/all。

具体保护方案见 [BRANCH_PROTECTION_PROPOSAL_CN.md](BRANCH_PROTECTION_PROPOSAL_CN.md)。GET main/protection 返回 404 Branch not protected，分支 API 同时返回 protected=false，rulesets=[]。这确认当前未保护；未执行 PUT/POST 设置来试探写权限，也未声称保护已生效。原始日志另含 ubuntu-latest 迁移至 Ubuntu 26 的平台公告；本轮实际运行通过，后续 release commit 仍须重验。

## 发现的问题与修复

- 根/子 README、STATUS、Checklist、Release Notes 仍写“没有 remote/没有真实 CI”，已改为真实地址、基线 SHA、成功 run 和准确的 pending 项。
- 原 checklist 把“正常 PR checks 成功”和“合并”合为一个勾选项，现拆开，防止在禁止合并时伪称完成。
- CI 失败检测与合并保护原本易混淆，现明确无保护时没有服务端硬性阻断；不擅自设置远端规则。
- 初次 npm test 意外递归执行 artifacts 中旧审查副本：84 项中 81 通过、3 个副本因依赖缺失失败。将测试入口限定为 test/*.test.mjs 后，在保留副本的同一工作区恢复正式 21/21。没有开发新产品功能，也没有调整 ICU/provider/视觉架构。小模型未译 Continue、Windows 默认缓存及语义质量限制继续披露。

## Go / No-Go

工程候选 **有条件 Go（可继续人工审核）**；正式 tag/Release **No-Go**。需要用户批准合并正常文档/验收 PR，验证合并后 main 完整 CI，并批准保护设置或明确接受未启用风险；真实 fork 未测作为披露的残余风险。负例绝不合并。最终 tag/Release 另行确认。
