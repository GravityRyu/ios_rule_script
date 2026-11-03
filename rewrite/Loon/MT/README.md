# 美团 Loon 候选修订

本目录包含插件 `MT.plugin`、独立实现的响应脚本 `MT.js` 和仅使用虚构数据的 `MT.test.cjs`。修订日期为 2026-11-03，代码遵循仓库的 GPL-2.0 许可。

本轮补充两个已确认的小团图标的精确图片替换，以及底栏中的对应图片识别。这是部分修复。图片替换仅隐藏图像，不能保证消除底栏点击入口或文字。12.68.201 搜索栏的咖啡推荐尚未解决，钱包隐藏也仍需用户实际响应验证。

已包含的行为：

- 底栏移除 `video`、`xiaotuan`，也识别 `data.resource.tabArea` 条目的 `imgUrl` 或 `selectedImage` 是否为下述两个精确资源。取消必须同时包含 `homepage` 和 `mine` 的前提，保留至少一个导航项。
- 搜索页的 `aiSearchBubble.bubbleTexts` 独立清空，不再因缺少 `segmentsV2` 提前返回。原有默认推荐词和热词过滤保持。
- “我的”页面只移除 `children` 中的 `mine_walletV3` 钱包卡片，继续移除原有 `mine_cross_recommend`。保留 `mine_serviceV3`、订单和其他模块。
- 八个响应规则使用同仓库脚本地址，匹配查询串和可选尾斜杠。脚本同时检查主机及接口边界，不处理支付接口和正常搜索结果接口。
- 仅替换下面两张图片，允许同一资源的 PNG、WebP、尺寸和查询串变体。其他主机、路径或图片哈希不匹配。

图片来自用户提供的公开链接，最新抓包中也分别记录了成功的原始图片响应：

- [p0 / aixiaotuan 小团图标](https://p0.meituan.net/aixiaotuan/759944e1d23af9c12fd2be85af8d7b6125132.png.webp@1284w_1l)
- [p1 / monitorimage 小团图标](https://p1.meituan.net/monitorimage/3ff407cd7478df1cdee7e646de094abe232932.png)

两条图片规则使用 [Loon 的 `reject-img`](https://nsloon.app/en/docs/Rewrite/)，返回 200 和一张 1×1 图片。为处理 HTTPS 图片，MITM 主机新增 `p0.meituan.net` 和 `p1.meituan.net`，规则仍只匹配上述两个资源。若图标位于其他接口或已缓存，图片规则不保证消除其入口。没有针对“瑞星咖啡”或“luckin coffee”字串删除正常搜索结果。

这是针对已知结构的候选补丁。当前用户新版的底栏、搜索和钱包 JSON 尚未捕获。修改没有在 Loon 或美团真机上执行，不能据本地测试声称完整界面修复。

## 来源与字段依据

原插件来源是 [GravityRyu/ios_rule_script](https://github.com/GravityRyu/ios_rule_script/blob/2cdb3fd1db07865755a4d8553506f252f8d337b1/rewrite/Loon/MT/MT.plugin)。原规则和原始脚本作者为 TG@ZenMoFiShi。

[原始 MT.js](https://github.com/ZenmoFeiShi/Qx/blob/a7b9dfaee697edbfc157c4a66a776e177adec692/MT.js) 定义了八个端点、底栏 `data.resource.tabArea`、搜索推荐字段和原有清理行为。这里按这些已公开结构独立实现，没有复制上游脚本文本。上游仓库 README 标注 Personal Use，本目录代码不将其脚本重新作为 GPL 副本分发。

钱包模块标识 `mine_walletV3` 的依据是[公开派生脚本](https://github.com/ifflagged/Romeo/blob/c7eb9c0651c562ad66978d90fe6f8f163e7bf1d2/Modules/JavaScript/sooyaaabo/MeiTuan/loon_MeiTuan.js)。该来源同时移除 `mine_serviceV3`，本修订只采用钱包模块标识，保留服务区。此依据不能证明用户当前新版响应仍有同一字段。

## 验证与使用

用 Node.js 运行：

```sh
node rewrite/Loon/MT/MT.test.cjs
```

测试覆盖八条插件匹配与脚本处理的一致性、原有功能、两个提前返回问题、钱包删除、重复执行、无关端点不变和异常响应原样放行。新增测试检查两个资源的正负 URL 匹配、改名底栏项的已知图片字段识别、单项导航保留及 MITM 主机。响应测试数据全部为虚构结构，图片 URL 仅使用上述公开资源，不含用户抓包。

已检查用户提供的多批抓包，包括最新的 271 条请求、174 个原始响应体和 10 个替换响应体。两个目标图片请求均为原始 200 响应，但核心 API 域名仍未出现，压缩遥测只有调用记录，没有可供修改的 API JSON。私密重放检查两张图片命中新规则，其他捕获请求不命中这两条图片规则。抓包没有随代码发布。

另以无认证 GET 直接获取了公开 `indexTab` JSON，仍为 `data.resource.tabArea` 结构，现脚本可移除视频项。该匿名配置不含小团，`defaultword` 匿名响应也不含推荐词。仅设置当前版本 UA 的请求没有复现用户实际的版本参数、设备或实验分组，因此不能当作新版个性化响应。

`MT.plugin` 的八个 `script-path` 均指向同仓库 master 分支的 `MT.js?v=20261103-2`，本轮同步更新 URL 版本以避开旧脚本缓存。通过 [master 插件链接](https://raw.githubusercontent.com/GravityRyu/ios_rule_script/master/rewrite/Loon/MT/MT.plugin) 添加或更新 Loon 插件即可获取这些链接。若使用其他分支或托管地址，请同步修改八个 `script-path`。

真机验证需检查插件响应规则是否命中，并收集 `indexTab`、`defaultword`、`hotrecommend` 和 `usercenter/display` 的已解密 JSON 响应。分享前删除请求凭证、位置、账号、余额和订单等个人数据。隐藏钱包卡片只改变页面入口，不会关闭账户钱包或相关支付服务。
