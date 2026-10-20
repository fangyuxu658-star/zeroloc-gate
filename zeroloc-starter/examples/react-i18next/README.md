# React/i18next workflow acceptance application

Real React SSR + i18next, reading JSON on every request. No bundler, hosted account or paid service. Run from the ZeroLoc package root: `node examples/react-i18next/server.mjs` (loopback4174). The initial resource has no new greeting; `npm run test:workflow` copies this app into isolated temporary projects, adds English app.newGreeting, detects the missing German key, generates a proposal, applies only after exact approval, executes this app's real Node test and Chromium/Firefox UI checks, then prepares a local PR branch.

Default provider is an explicitly labelled local HTTP protocol stub. Actual Ollama requires `npm run test:workflow -- --model qwen2.5:0.5b --endpoint http://127.0.0.1:11435`. Model/runtime installation and rights review remain separate; no weights are bundled. Successful, unit-failing, UI-failing, timed-out and conflicted scenarios all assert their real outcomes. `verify.test.mjs` intentionally expects the new key to be applied, so it fails against the initial incomplete target.

This is synthetic business data in an actual React/i18next application, not proof of compatibility with every production app or semantic translation quality. See [CLI/security documentation](../../docs/V02_SAFE_APPLY_CN.md).
