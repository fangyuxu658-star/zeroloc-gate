# 可复现的 React 演示

`npm run demo` 启动绑定在 `127.0.0.1:4173` 的 React 服务端渲染页面。它只使用本地样式与系统字体，无外部资源和账号。

`npm run test:visual` 自动启动临时端口，使用 Chromium × en/de/ja × 375/1280 两种视口（6 组）。`npm run test:visual -- --all-browsers` 额外运行 Firefox（共 12 组）。输出在 `artifacts/visual/`，包含 PNG 和 `findings.json`。负例位于 `artifacts/visual-negative/`，必须检测到横向溢出和无名称按钮。首次运行前执行 `npx --no-install playwright install chromium firefox`。启动失败会使测试失败，不会跳过并计为通过。

Stabilization 排查确认，本机默认缓存的报错指向 mozglue 私有程序集，未证明是 Visual C++ 缺失。使用项目隔离缓存后完整 12 组连续两次通过，具体环境变量和复现命令见 [环境指南](../docs/STABILIZATION_ENVIRONMENT_CN.md)。

自己的应用需先启动，再运行：

```sh
node bin/zeroloc.mjs visual --url http://127.0.0.1:3000/test-page --output artifacts/my-app
```

页面应根据 `?locale=` 切换资源，使用稳定数据。插件会阻止其他 origin 的请求。该版本检查可见元素/页面水平溢出及 axe 的 WCAG A/AA 规则，保留需人工核查的 incomplete 项；不做截图基线像素比较、语义翻译评分、字体完备性或自动 CSS 修复。截图包含页面内容，分享前由项目所有者复核。默认没有任何自动修复，修改应经过测试与 PR 审核。
