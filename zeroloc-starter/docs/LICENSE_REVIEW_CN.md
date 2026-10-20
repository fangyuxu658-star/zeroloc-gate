# 固定依赖与许可证核查

本地核查日期：2026-10-19。MIT 核心不包含 GPL/AGPL 服务或专有 EE 源码。此记录覆盖当前固定 npm 分发包及锁文件，不将软件许可证扩展到模型、数据或商标。

| 直接组件 | 固定版本 | 发行声明 | 使用边界 |
| --- | --- | --- | --- |
| @formatjs/icu-messageformat-parser | 3.5.21 | MIT | AST 解析，保留 npm LICENSE |
| i18next-cli | 1.77.0 | MIT | 独立子进程，仅调用 runExtractor 的 dry-run；不调用 localize/Locize |
| i18next | 26.5.0 | MIT | 显式开发依赖，保证提取器依赖树与 SBOM 完整 |
| @playwright/test | 1.64.1 | Apache-2.0 | 可选开发 QA；保留 LICENSE、NOTICE、ThirdPartyNotices |
| axe-core | 4.14.0 | MPL-2.0 | 单独 npm 文件，未修改或复制进 MIT 模块；保留 MPL 与上游源码链接 |
| react / react-dom | 19.3.1 | MIT | 仅演示页，未默认安装到客户项目 |

实际发行包的 LICENSE/NOTICE 已汇集到 `THIRD_PARTY_NOTICES.md`。`dependency-licenses.json` 覆盖全部锁定包和平台可选包，含版本、SPDX 表达式、tarball 来源与完整性摘要；`sbom.cdx.json` 为 npm 生成的 CycloneDX。锁文件中出现 MIT、Apache-2.0、二者 AND 表达式、ISC、BlueOak-1.0.0、MPL-2.0；门禁仅允许这批已检查表达式，新增/未知许可直接失败。不能把这个白名单当作所有使用场景的法律结论。

axe-core 的 npm 发行包 LICENSE 为 MPL 2.0，未发现附加商业运行条款；仅使用该发行包，没有采用 axe 品牌商业服务。分发时应保留其 MPL 文件许可，并提供适用版本的源码获取方式：[axe-core v4.14.0](https://github.com/dequelabs/axe-core/tree/v4.14.0)。修改 MPL 文件时，修改部分仍按 MPL 提供；本项目没有修改这些文件。浏览器安装单独进行，不把浏览器二进制装入源代码交付包；其分发义务需独立核查。

两个 npm 发行包未携带根 LICENSE，已补存上游原件，并记录 SHA-256：

- `@croct/json5-parser@0.2.2`：npm gitHead `330e43e0e83a028f1435b2b3fd1125e60cd4eb51`，[原始 LICENSE](https://github.com/croct-tech/json5-parser-js/blob/330e43e0e83a028f1435b2b3fd1125e60cd4eb51/LICENSE)，副本在 `vendor-licenses/croct-json5-parser-0.2.2-LICENSE`。SHA-256 `0a9376956f87f6fe24040659311a7f51502a4d7ea64d181d18499218326a6389`。
- `@swc/counter@0.1.3`：npm 未提供 gitHead；在上游固定提交 `2cbd4700aaa6c28da488aad098b150c22ba56ff1` 核对同版本 package.json 与 Apache-2.0 声明，[原始 LICENSE.txt](https://github.com/swc-project/pkgs/blob/2cbd4700aaa6c28da488aad098b150c22ba56ff1/packages/counter/LICENSE.txt)，副本在 `vendor-licenses/swc-counter-0.1.3-LICENSE.txt`。SHA-256 `d96eba1f1881334d50ffc144276dfa98e147a415e7c591ecdfcb81680361dc91`。没有把该提交声称为已证明的 npm 构建提交。

Ollama 使用 localhost HTTP 接口，不链接或分发其软件与模型。Stabilization 在忽略目录中下载了官方 Ollama 0.40.6 与 qwen2.5:0.5b，只用于本地合成资源验证：官方安装包 SHA-256、实际模型 digest 和 `/api/show` 的 Apache-2.0 全文已保存，见 [结果](STABILIZATION_RESULTS_CN.md)。这不向其他模型扩展许可，也不默认授权任意使用场景；使用者必须独立审核所选模型许可并禁用云端。权重、Ollama/浏览器二进制不进入公开源码包。Argos、LibreTranslate、Weblate、Tolgee、Paraglide、Lingui 均未合并或安装。

网络核对来源：[FormatJS](https://github.com/formatjs/formatjs/blob/main/packages/icu-messageformat-parser/package.json)、[i18next-cli](https://github.com/i18next/i18next-cli)、[Playwright LICENSE](https://github.com/microsoft/playwright/blob/main/LICENSE)、[axe LICENSE](https://github.com/dequelabs/axe-core/blob/develop/LICENSE)、[Blue Oak 1.0.0](https://blueoakcouncil.org/license/1.0.0)。这些 main/develop 链接用于来源说明；实施依据为本地固定 npm 版本、lockfile 完整性和已保留的许可文本。
