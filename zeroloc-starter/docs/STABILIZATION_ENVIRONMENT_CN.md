# Stabilization 环境复现

本文只处理已实现能力的运行与验收，不增加格式、provider 或自动修复功能。运行时和模型都在 `.gitignore` 中，不进入公开源码交付。

## Firefox：诊断与稳定路径

原默认路径 `%LOCALAPPDATA%\ms-playwright\firefox-1555\firefox\firefox.exe` 启动失败。系统 Application/SideBySide 日志显示：找不到从属程序集 `mozglue, version=1.0.0.0`。这不是已证明的 VC++ 缺失；没有安装系统 VC++、改安全策略或替换浏览器 DLL。

重新用 Playwright 1.64.1 安装相同 revision 1555 到项目独立缓存后，Firefox 157.0 可以启动，三语言双视口与 Firefox 故意失败页面全部通过。新旧 firefox.exe 和 mozglue.dll 的 SHA-256 相同，不能声称找到了二进制损坏的根因。默认缓存复测仍失败，因此原位置的程序集激活/环境问题继续列为 blocker；有效方案是隔离缓存。

在 **zeroloc-starter** 目录的 PowerShell 中：

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.local-tools\playwright'
npx --no-install playwright install chromium firefox
npm run test:visual -- --all-browsers
```

必须在安装和运行的同一 shell 设置相同绝对缓存路径；新终端需要重新设置。首次安装用网络，测试阶段只访问临时 loopback 演示页。缓存可随工作区保留，不写入系统或账户级永久环境变量。当前机器的 Chromium 使用已有的相同 revision 1248 本地复制到该缓存，Firefox 是官方重新下载；上述 install 命令可在另一台机器直接重建两者。

Linux CI 使用根 workflow 的 `playwright install --with-deps chromium firefox`，不依赖 Windows 缓存；真实远端结果仍须另外记录。不要用普通 Firefox 替换 Playwright 自带的补丁版本。诊断来源：[Playwright 浏览器安装与缓存](https://playwright.dev/docs/browsers)、[Mozilla mozglue 私有程序集背景](https://bugzilla.mozilla.org/show_bug.cgi?id=1496179)。

## Ollama：依赖与启动步骤

本次选择官方可移植 Ollama **v0.40.6**，不安装 GUI、系统服务或修改 PATH。机器为 Windows x64，约 28 GB 内存、AMD Radeon 780M；本次目标是小模型 CPU 验证，不承诺 GPU 加速。安装包和依赖可达数 GB，模型另需约 398 MB，另预留运行内存与解压空间。官方 Windows 要求见 [Ollama Windows](https://docs.ollama.com/windows)。

下载与校验（进入 zeroloc-starter）：

```powershell
New-Item -ItemType Directory -Force .local-tools/ollama-v0.40.6 | Out-Null
Invoke-WebRequest 'https://github.com/ollama/ollama/releases/download/v0.40.6/ollama-windows-amd64.zip' -OutFile .local-tools/ollama-v0.40.6/ollama-windows-amd64.zip
Invoke-WebRequest 'https://github.com/ollama/ollama/releases/download/v0.40.6/sha256sum.txt' -OutFile .local-tools/ollama-v0.40.6/sha256sum.txt
Get-FileHash .local-tools/ollama-v0.40.6/ollama-windows-amd64.zip -Algorithm SHA256
Select-String -Path .local-tools/ollama-v0.40.6/sha256sum.txt -Pattern 'ollama-windows-amd64.zip'
# 必须先比对摘要完全相同，再解压和执行。
Expand-Archive .local-tools/ollama-v0.40.6/ollama-windows-amd64.zip .local-tools/ollama-v0.40.6/runtime
```

在专用终端启动，只监听本机、模型存在忽略目录、禁用云端：

```powershell
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_MODELS = Join-Path (Get-Location) '.local-models'
& .\.local-tools\ollama-v0.40.6\runtime\ollama.exe serve
```

若已有服务占用 11434，不要终止用户现有进程。可使用空闲端口，例如 `127.0.0.1:11435`，同时为 pull 和验证选择该端口。本次专用服务的进程与日志单独记录；后台启动时使用 `Start-Process -WindowStyle Hidden`，不要安装开机启动。Ollama 可能在用户 `.ollama` 目录生成自己的身份文件，不要提交它或修改已有身份。

**本次实际使用 11435**，保留临时 loopback 服务便于复查；没有设置开机自启。当前 PID 保存在 `.local-tools/ollama-v0.40.6/server.pid`。本次验证命令为 `node qa/ollama-e2e.mjs qwen2.5:0.5b http://127.0.0.1:11435`；下面通用命令中的 11434 若用于复查本次服务，应一致改为 11435。

第二个终端进入同一项目目录后：

```powershell
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_MODELS = Join-Path (Get-Location) '.local-models'
Invoke-RestMethod http://127.0.0.1:11434/api/version
& .\.local-tools\ollama-v0.40.6\runtime\ollama.exe pull qwen2.5:0.5b
& .\.local-tools\ollama-v0.40.6\runtime\ollama.exe list
node qa/ollama-e2e.mjs qwen2.5:0.5b http://127.0.0.1:11434
```

pull 是一次明确联网下载，不上传资源文本；真实推理只向 loopback 发合成示例。模型选择页标明 [qwen2.5:0.5b](https://ollama.com/library/qwen2.5:0.5b) 约 398 MB、Apache-2.0；以实际 `/api/show` 返回的许可、`/api/tags` digest 和已存本地权重为本次证据，不把可变 tag 当固定内容。无权利核查的模型不用于发布展示，权重不捆绑。禁云设置见 [官方 FAQ](https://docs.ollama.com/faq)。

`qa/ollama-e2e.mjs` 仅为显式运行的验收脚本，不加入 `npm test` 默认流程。它记录服务版本、模型 digest/许可，预热模型后调用真实 ZeroLoc CLI（无 dry-run），保存候选；只将三个已知合成字段放进独立副本再调用 check。验证原始目标字节未变、人工 title 保留、占位符完整，不会自动应用 patch。结果写入 `artifacts/ollama-e2e/`。

也可独立运行 CLI 查看输出：

```powershell
node bin/zeroloc.mjs translate --provider ollama --model qwen2.5:0.5b --endpoint http://127.0.0.1:11434 --source examples/translation/en.json --target examples/translation/de.json --source-locale en --target-locale de --message-format i18next --concurrency 1
```

Provider 保持已有 30 秒请求限制；若首次模型加载慢，先用验收脚本预热，不在稳定化阶段擅自放宽产品限制。输出不合格就保留失败，并记录模型/资源条件，不通过删掉占位符或关闭验证来制造成功。

本次候选副本结构校验通过，但小模型将 `Continue` 原样返回；这是一条已确认的翻译不完整问题。适配器不提供语义门禁，也不会因此自动覆盖人工资源。Beta 展示应保留这个例子，说明人工审核的必要性。

停止本次临时后台服务（只在 PID 与可执行路径均匹配时操作）：

```powershell
$validationPid = [int](Get-Content .local-tools/ollama-v0.40.6/server.pid)
$validationProcess = Get-Process -Id $validationPid -ErrorAction SilentlyContinue
$validationExe = (Resolve-Path .local-tools/ollama-v0.40.6/runtime/ollama.exe).Path
if ($validationProcess -and $validationProcess.Path -eq $validationExe) {
    Stop-Process -Id $validationPid
}
```

若用前台终端启动，直接在该终端 Ctrl+C。不要按名称停止所有 ollama 进程，不影响其他项目服务。保留模型/运行时缓存以便复验；它们不需要提交到 Git。
