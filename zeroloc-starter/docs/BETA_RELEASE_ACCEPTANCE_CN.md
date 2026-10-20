# Beta release engineering acceptance

目标 v0.1.0-beta.1；基线 4a64f6d6350ed5e80c1738ffa145a8dba46da66f；仓库 [fangyuxu658-star/zeroloc-gate](https://github.com/fangyuxu658-star/zeroloc-gate)。维护者仅授权两个指定测试分支/两个 Draft PR、相关修复与验证、关闭负例和更新文档；没有合并、main 修改、tag/Release 或规则设置授权。

## 研发日志与真实证据

1. 核对 latest origin/main 为基线、工作区干净、gh 账号为 fangyuxu658-star。创建 test/beta-release-validation，更新过时文档、验收证据与 npm test 的发现范围。
2. 首次 [main CI](https://github.com/fangyuxu658-star/zeroloc-gate/actions/runs/39347428254) 已下载验证：四环境各 21/21、视觉 12 组、四份 JSON/SARIF/SBOM 与 13 张截图。
3. 正常 Draft PR 正在准备；未将尚未运行的 PR CI 计为通过。
4. 负例 PR 尚未创建/验证，保持未验证。
5. 验收最终文档提交需再次观察正常 PR 最新 head 的所有 jobs；历史 run 链接明确对应其记录的 SHA，不以旧绿灯掩盖新改动。

## 安全与可靠性

- 实际 workflow 仅 contents:read；所有 uses 固定 SHA；npm ci --ignore-scripts；无 pull_request_target、无 secrets 引用或外部账号/付费云 API，checkout persist-credentials=false。
- 仓库默认 Actions token 权限为 read、不能批准 PR review。只读 API 确认仓库 secrets=0、environments=0；五个 checks 均来自 github-actions（app ID 15368）。未读取 secret 值。
- 真正外部 fork 未测试，当前个人账号无法 fork 自己的同一仓库，不创建第二账号、不调用第三方替身；静态审查不冒充动态证据。
- 门禁能让 CI 失败；main protected=false、rulesets=[]，目前**不能保证失败 CI 阻止服务器端合并**。故意失败 Draft PR 不可合并还受 Draft 状态影响，不将其归因于 required checks。
- 建议保护：要求 PR、必要的四个 regression 与 visual 检查且与 main 同步、管理员同样遵守、禁止强推/删除、要求解决讨论。单维护者审批数先设 0，第二名协作者到位后改 1；实际 check 名称/app ID 以 API 返回为准。设置与 read-back 需另获批准，未启用不标通过。
- 核心 MIT 及第三方声明保留，模型与浏览器权利独立；新 audit/SBOM/公开文件及拟推分支历史扫描结果以验收证据为准。内部工具引用/不可达对象不推送，不使用 mirror/all。

## 发现的问题与修复

- 根/子 README、STATUS、Checklist、Release Notes 仍写“没有 remote/没有真实 CI”，已改为真实地址、基线 SHA、成功 run 和准确的 pending 项。
- 原 checklist 把“正常 PR checks 成功”和“合并”合为一个勾选项，现拆开，防止在禁止合并时伪称完成。
- CI 失败检测与合并保护原本易混淆，现明确无保护时没有服务端硬性阻断；不擅自设置远端规则。
- 初次 npm test 意外递归执行 artifacts 中旧审查副本：84 项中 81 通过、3 个副本因依赖缺失失败。将测试入口限定为 test/*.test.mjs 后，在保留副本的同一工作区恢复正式 21/21。没有开发新产品功能，也没有调整 ICU/provider/视觉架构。小模型未译 Continue、Windows 默认缓存及语义质量限制继续披露。

## Go / No-Go

工程候选 **有条件 Go（可继续人工审核）**；正式 tag/Release **No-Go**。需要用户批准合并正常文档/验收 PR，验证合并后 main 完整 CI，并批准保护设置或明确接受未启用风险；真实 fork 未测作为披露的残余风险。负例绝不合并。最终 tag/Release 另行确认。
