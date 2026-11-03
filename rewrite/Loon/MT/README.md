# 美团 Loon 候选修订

本目录包含插件 `MT.plugin`、独立实现的响应脚本 `MT.js` 和仅使用虚构数据的 `MT.test.cjs`。修订日期为 2026-11-03，代码遵循仓库的 GPL-2.0 许可。

本次改动：

- 底栏仍只移除 `video`、`xiaotuan`，取消必须同时包含 `homepage` 和 `mine` 的前提，保留至少一个导航项。
- 搜索页的 `aiSearchBubble.bubbleTexts` 独立清空，不再因缺少 `segmentsV2` 提前返回。原有默认推荐词和热词过滤保持。
- “我的”页面只移除 `children` 中的 `mine_walletV3` 钱包卡片，继续移除原有 `mine_cross_recommend`。保留 `mine_serviceV3`、订单和其他模块。
- 八个响应规则使用同仓库脚本地址，匹配查询串和可选尾斜杠。脚本同时检查主机及接口边界，不处理支付接口和正常搜索结果接口。

这是针对已知结构的候选补丁。新版 App 的“小团”和搜索栏推荐是否仍由这些接口、字段控制，尚无响应样本可确认。修改前后都没有在 Loon 或美团真机上执行。

## 来源与字段依据

原插件来源是 [GravityRyu/ios_rule_script](https://github.com/GravityRyu/ios_rule_script/blob/2cdb3fd1db07865755a4d8553506f252f8d337b1/rewrite/Loon/MT/MT.plugin)。原规则和原始脚本作者为 TG@ZenMoFiShi。

[原始 MT.js](https://github.com/ZenmoFeiShi/Qx/blob/a7b9dfaee697edbfc157c4a66a776e177adec692/MT.js) 定义了八个端点、底栏 `data.resource.tabArea`、搜索推荐字段和原有清理行为。这里按这些已公开结构独立实现，没有复制上游脚本文本。上游仓库 README 标注 Personal Use，本目录代码不将其脚本重新作为 GPL 副本分发。

钱包模块标识 `mine_walletV3` 的依据是[公开派生脚本](https://github.com/ifflagged/Romeo/blob/c7eb9c0651c562ad66978d90fe6f8f163e7bf1d2/Modules/JavaScript/sooyaaabo/MeiTuan/loon_MeiTuan.js)。该来源同时移除 `mine_serviceV3`，本修订只采用钱包模块标识，保留服务区。此依据不能证明用户当前新版响应仍有同一字段。

## 验证与使用

用 Node.js 运行：

```sh
node rewrite/Loon/MT/MT.test.cjs
```

测试覆盖八条插件匹配与脚本处理的一致性、原有功能、两个提前返回问题、钱包删除、重复执行、无关端点不变和异常响应原样放行。测试数据全部为虚构结构，不含用户抓包。

用户提供的 483 条抓包请求中，八条脚本所需的五个核心 API 域名均未出现。检查了 235 个原始响应体和 7 个替换响应体，没有命中可验证目标功能的响应。因此，抓包重放只能确认这些无关流量不被本脚本改写，不能证明界面修复成功。

`MT.plugin` 的八个 `script-path` 均指向同仓库 master 分支的 `MT.js`。通过 [master 插件链接](https://raw.githubusercontent.com/GravityRyu/ios_rule_script/master/rewrite/Loon/MT/MT.plugin) 添加或更新 Loon 插件，并刷新脚本缓存，确保插件和响应脚本一起更新。若使用其他分支或托管地址，请同步修改八个 `script-path`。

真机验证需检查插件响应规则是否命中，并收集 `indexTab`、`defaultword`、`hotrecommend` 和 `usercenter/display` 的已解密 JSON 响应。分享前删除请求凭证、位置、账号、余额和订单等个人数据。隐藏钱包卡片只改变页面入口，不会关闭账户钱包或相关支付服务。
