# 美团 Loon 净化修订

本目录包含 `MT.plugin`、`MT.js` 和测试。2026-11-03 的第三次修订根据实际客户端请求和直接取得的 JSON 更新。用户不需要自行构造 JSON。

本轮处理三件事：

- 底栏继续移除 `video` 和 `xiaotuan`，也通过条目的 `imgUrl`、`selectedImage` 识别四个已确认的小团图标。只处理 `data.resource.tabArea`，至少保留一个导航项。
- 对精确的 `GET /group/v1/deal/searchpage/defaultword`，在发送上游请求前返回已验证的空推荐 JSON。不等待上游响应，不处理普通手输搜索、结果列表、订单或支付接口。
- 用精确图片规则替换四张小团图标。图片替换仅隐藏图像，不能保证消除入口、文字或点击区域。

“我的”页仍沿用 `mine_walletV3` 钱包卡片隐藏，保留 `mine_serviceV3`、订单和其他模块。这部分还没有用户当前版本的实际响应验证，不会关闭账户钱包或支付服务。其余购物车推荐流、开屏图、热词和 AI 气泡清理保持原有范围。

## 真实请求和响应依据

新抓包记录了两个 `indexTab` GET 和两个 `defaultword` GET，包含 `version_name`、`utm_term`、`client` 及搜索策略参数。这里只采用公开客户端字段和功能开关，未复用用户凭证、设备 ID 或真实位置。

按这些字段构造的四种匿名 `indexTab` 请求均返回 HTTP 200、业务 `status: 1`，实际底栏为 `homepage / video / xiaotuan / shoppingcart / mine`。现脚本回放后保留 `homepage / shoppingcart / mine`。精简的 [回归样本](fixtures/indexTab-client.json) 只包含这些导航标识和公开图标 URL，没有追踪或个人字段。

`defaultword` 在保留 iPhone、12.68.201 版本及公开策略字段，并去除需要对应签名的安全选择器后，四种 GET 对照均返回 HTTP 200 和相同的空推荐结构：

```json
{"searchIntroduceResponse":{"HotWordInfos":[],"globalId":""}}
```

插件直接使用该结构，`globalId` 在原成功响应里就是空字符串。采用 [Loon 的 `response.body.mock`](https://nsloon.app/en/docs/Rewrite/rewrite_v2/)，仅以请求方法和精确 URL 为条件，在上游请求发出前生成响应。八条原响应脚本规则仍保留。

另检查了实际 `GET /aggroup/homepage/display` 的两个成功响应。搜索相关字段仅为皮肤颜色和背景，没有明确的推荐词集合，因此不修改首页数据，也不按咖啡品牌字串删除搜索结果。

这些是匿名客户端对照，不是带用户身份和设备实验分组的完整重放。仍需真机确认界面结果，已有缓存或非 HTTP 传输也不由图片替换保证解决。

## 精确图片范围

仅匹配以下主机、目录和资源哈希，允许同一图片的 PNG、WebP、尺寸及查询串变体：

- [p0 / aixiaotuan 图标](https://p0.meituan.net/aixiaotuan/759944e1d23af9c12fd2be85af8d7b6125132.png.webp@1284w_1l)
- [p1 / monitorimage 图标](https://p1.meituan.net/monitorimage/3ff407cd7478df1cdee7e646de094abe232932.png)
- [p0 / linglong 底栏未选中图标](https://p0.meituan.net/linglong/0021570faa939f1f079b2e0cb54497574565.png)
- [p0 / linglong 底栏选中图标](https://p0.meituan.net/linglong/90d2e0abc1d6295bd3190f16faef26066070.png)

后两张来自真实 `indexTab` 小团条目的 `imgUrl` 和 `selectedImage`，抓包中也有原始图片请求。规则使用 [Loon 的 `reject-img`](https://nsloon.app/en/docs/Rewrite/)，返回 200 和一张 1×1 图片。MITM 包含 `p0.meituan.net`、`p1.meituan.net`，其他图片哈希和目录不匹配。

## 验证和更新

```sh
node rewrite/Loon/MT/MT.test.cjs
```

测试覆盖八条脚本规则、真实客户端导航样本、四张图片的正负匹配、GET 默认词 mock 的边界、原有过滤及异常响应放行。私密抓包重放另外检查实际请求命中范围，抓包和完整服务端响应不随代码发布。没有在 Loon 或美团真机上运行本轮修改。

通过 [master 插件链接](https://raw.githubusercontent.com/GravityRyu/ios_rule_script/master/rewrite/Loon/MT/MT.plugin) 添加或更新插件。八个脚本地址统一使用 `MT.js?v=20261103-3`，同步更新缓存版本。若使用其他托管地址，请同步修改八个 `script-path`。

## 原始来源和许可

原插件来自 [GravityRyu/ios_rule_script](https://github.com/GravityRyu/ios_rule_script/blob/2cdb3fd1db07865755a4d8553506f252f8d337b1/rewrite/Loon/MT/MT.plugin)，原规则及脚本作者为 TG@ZenMoFiShi。

[原始 MT.js](https://github.com/ZenmoFeiShi/Qx/blob/a7b9dfaee697edbfc157c4a66a776e177adec692/MT.js) 提供八个端点和旧过滤结构的依据。本目录按公开结构独立实现，采用仓库的 GPL-2.0 许可，没有把上游 Personal Use 脚本复制为 GPL 副本。

`mine_walletV3` 标识依据为[公开派生脚本](https://github.com/ifflagged/Romeo/blob/c7eb9c0651c562ad66978d90fe6f8f163e7bf1d2/Modules/JavaScript/sooyaaabo/MeiTuan/loon_MeiTuan.js)。本目录没有采用该来源移除整个 `mine_serviceV3` 的行为。
