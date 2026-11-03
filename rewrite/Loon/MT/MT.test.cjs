// Synthetic schemas only. No captured user data or request credentials.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "MT.js"), "utf8");
const plugin = fs.readFileSync(path.join(__dirname, "MT.plugin"), "utf8");
const rules = plugin.split("\n").filter(line => line.startsWith("http-response ")).map(line => new RegExp(line.split(" ")[1]));
const base = "https://apimobile.meituan.com";
const tabsURL = base + "/aggroup/indexTab";
const mineURL = "https://mt-personalcenter.meituan.com/usercenter/display";
const defaultURL = base + "/group/v1/deal/searchpage/defaultword";
const hotURL = base + "/group/v1/deal/searchpage/hotword/city/divide/hotrecommend/1";
let tests = 0;
function run(url, input, script = source) {
  const body = typeof input === "string" ? input : JSON.stringify(input);
  let result;
  let calls = 0;
  vm.runInNewContext(script, { $request: { url }, $response: { body }, $done(value) { result = value; calls++; } }, { timeout: 1000 });
  assert.equal(calls, 1);
  return { changed: typeof result.body === "string", value: result.body ? JSON.parse(result.body) : input };
}
function check(name, fn) { fn(); tests++; console.log("PASS " + name); }
function cleaned(url, input) { return run(url, input).value; }
check("tabs retain homepage, mine, orders and unknown tabs", () => {
  const list = ["homepage", "video", "xiaotuan", "orders", "mine", "future"];
  assert.deepEqual(cleaned(tabsURL, { data: { resource: { tabArea: list.map(tabName => ({ tabName })) } } }).data.resource.tabArea.map(t => t.tabName), ["homepage", "orders", "mine", "future"]);
});
check("partial tab responses no longer require both homepage and mine", () => {
  assert.deepEqual(cleaned(tabsURL, { data: { resource: { tabArea: [{ tabName: "homepage" }, { tabName: "xiaotuan" }] } } }).data.resource.tabArea, [{ tabName: "homepage" }]);
});
check("never empty navigation", () => {
  assert.equal(run(tabsURL, { data: { resource: { tabArea: [{ tabName: "xiaotuan" }] } } }).changed, false);
});
check("wallet card removed without removing orders or service section", () => {
  const input = { children: [{ name: "mine_cross_recommend" }, { name: "mine_walletV3", data: { balance: "synthetic" } }, { name: "mine_order" }, { name: "mine_serviceV3", data: { newTools: [{ identification: "help" }] } }], account: { wallet: "untouched" } };
  const output = cleaned(mineURL, input);
  assert.deepEqual(output.children, input.children.slice(2));
  assert.deepEqual(output.account, input.account);
});
check("default recommendations cleared while typed query metadata remains", () => {
  const input = { searchIntroduceResponse: { defaultWordRes: { defaultWordItems: [{ word: "synthetic" }], flag: 1 }, HotWordInfos: [1], query: "typed search" }, orders: [1] };
  const output = cleaned(defaultURL, input);
  assert.deepEqual(output.searchIntroduceResponse.defaultWordRes, { defaultWordItems: [], flag: 1 });
  assert.deepEqual(output.searchIntroduceResponse.HotWordInfos, []);
  assert.equal(output.searchIntroduceResponse.query, "typed search");
  assert.deepEqual(output.orders, [1]);
});
check("hotword segments filtered and unknown segments preserved", () => {
  const input = { data: { segmentsV2: [{ hotwordSegments: [{ pageName: "EntranceHotwordsV2Hotwords" }] }, { hotwordSegments: [{ pageName: "EntranceHotwordsV2ContentCard" }, { pageName: "History" }] }, { custom: true }, { hotwordSegments: [] }], aiSearchBubble: { bubbleTexts: [1], enabled: true } } };
  assert.deepEqual(cleaned(hotURL, input).data, { segmentsV2: [{ hotwordSegments: [{ pageName: "History" }] }, { custom: true }, { hotwordSegments: [] }], aiSearchBubble: { bubbleTexts: [], enabled: true } });
});
check("AI bubble cleared without segmentsV2", () => {
  assert.deepEqual(cleaned(hotURL, { data: { aiSearchBubble: { bubbleTexts: [1] }, history: [1] } }).data, { aiSearchBubble: { bubbleTexts: [] }, history: [1] });
});
check("AI bubble cleared with malformed segmentsV2", () => {
  assert.deepEqual(cleaned(hotURL, { data: { segmentsV2: null, aiSearchBubble: { bubbleTexts: [1] } } }).data, { segmentsV2: null, aiSearchBubble: { bubbleTexts: [] } });
});
check("AI skills string format preserved", () => {
  const url = "https://assistify.meituan.com/assistant/getAppClientHornConfig";
  const output = cleaned(url, { data: JSON.stringify({ skills: { example: true }, other: 1 }) });
  assert.deepEqual(JSON.parse(output.data), { skills: {}, other: 1 });
  assert.equal(run(url, { data: "invalid" }).changed, false);
});
check("only the two intended recommendation feeds are cleared", () => {
  for (const scene of ["gwc_feed1_2265", "personalcenter_2154"]) {
    const output = cleaned("https://feedguess.meituan.com/lycoris/scene/" + scene, { data: [1], ext: { preserve: 1 } });
    assert.deepEqual(output, { data: [], bottom: true, ext: { preserve: 1, forbidByExp: true } });
  }
  assert.equal(run("https://feedguess.meituan.com/lycoris/scene/order_feed", { data: [1] }).changed, false);
});
check("cart banner and startup picture preserve unrelated resource areas", () => {
  for (const [url, key] of [["https://mop.meituan.com/mop/entry/shoppingCartEntry", "topBannerArea"], ["https://mop.meituan.com/api/entryModule/startupPicture", "startupPicArea"]]) {
    for (const holder of ["resource", "resourcesMap"]) {
      for (const nested of [false, true]) {
        const resource = { [key]: [1], orderArea: [2] };
        const input = nested ? { data: { [holder]: resource } } : { [holder]: resource };
        const output = cleaned(url, input);
        const changed = nested ? output.data[holder] : output[holder];
        assert.deepEqual(changed, { [key]: [], orderArea: [2] });
      }
    }
  }
});
check("trailing slash and query accepted for exact endpoint", () => {
  assert.equal(run(defaultURL + "/?city=0", { searchIntroduceResponse: { HotWordInfos: [1] } }).changed, true);
});
check("unrelated search, order and payment endpoints never change", () => {
  const input = { data: { resource: { tabArea: [{ tabName: "homepage" }, { tabName: "xiaotuan" }] } }, children: [{ name: "mine_walletV3" }], searchIntroduceResponse: { HotWordInfos: [1] } };
  for (const url of [base + "/group/v1/deal/search", base + "/orders", "https://npay.meituan.com/pay", tabsURL + "Extra", mineURL + "/pay", "https://example.com/aggroup/indexTab", "https://example.com/?url=" + tabsURL]) assert.equal(run(url, input).changed, false);
});
check("invalid, empty and unknown shapes pass through", () => {
  for (const input of ["", "not json", "null", "[]", "1", "{}", '{"data":null}']) assert.equal(run(tabsURL, input).changed, false);
});
check("applying cleaner twice is stable", () => {
  const input = { children: [{ name: "mine_walletV3" }, { name: "mine_order" }] };
  assert.equal(run(mineURL, cleaned(mineURL, input)).changed, false);
});
check("plugin routes all eight intended endpoints to the bundled fork script", () => {
  assert.equal(rules.length, 8);
  for (const url of [tabsURL, mineURL, defaultURL, hotURL, "https://feedguess.meituan.com/lycoris/scene/personalcenter_2154", "https://assistify.meituan.com/assistant/getAppClientHornConfig", "https://mop.meituan.com/mop/entry/shoppingCartEntry", "https://mop.meituan.com/api/entryModule/startupPicture"]) assert(rules.some(rule => rule.test(url)));
  for (const url of [tabsURL + "Extra", defaultURL + "Extra", mineURL + "/pay"]) assert(!rules.some(rule => rule.test(url)));
  assert.equal((plugin.match(/script-path=https:\/\/raw\.githubusercontent\.com\/GravityRyu\/ios_rule_script\/master\/rewrite\/Loon\/MT\/MT\.js/g) || []).length, 8);
});
check("all eight plugin routes agree with script across query and slash forms", () => {
  const cases = [
    [tabsURL, { data: { resource: { tabArea: [{ tabName: "homepage" }, { tabName: "xiaotuan" }] } } }],
    [mineURL, { children: [{ name: "mine_walletV3" }, { name: "mine_order" }] }],
    [defaultURL, { searchIntroduceResponse: { HotWordInfos: [1] } }],
    [hotURL.replace(/\/1$/, ""), { data: { aiSearchBubble: { bubbleTexts: [1] } } }],
    ["https://feedguess.meituan.com/lycoris/scene/gwc_feed1_2265", { data: [1] }],
    ["https://assistify.meituan.com/assistant/getAppClientHornConfig", { data: JSON.stringify({ skills: { example: true } }) }],
    ["https://mop.meituan.com/mop/entry/shoppingCartEntry", { resource: { topBannerArea: [1] } }],
    ["https://mop.meituan.com/api/entryModule/startupPicture", { resource: { startupPicArea: [1] } }]
  ];
  for (const [url, input] of cases) {
    for (const suffix of ["", "?city=0", "/", "/?city=0"]) {
      assert(rules.some(rule => rule.test(url + suffix)), "plugin " + url + suffix);
      assert.equal(run(url + suffix, input).changed, true, "script " + url + suffix);
    }
    assert(!rules.some(rule => rule.test(url + "Other")));
    assert.equal(run(url + "Other", input).changed, false);
    if (!url.includes("hotrecommend")) {
      assert(!rules.some(rule => rule.test(url + "/pay")));
      assert.equal(run(url + "/pay", input).changed, false);
    }
  }
});
check("malformed wallet sections pass through safely", () => {
  for (const input of [{ children: null }, { children: {} }, { children: [null, 1, {}, { name: "mine_serviceV3" }] }]) assert.equal(run(mineURL, input).changed, false);
});
console.log(`${tests} synthetic checks passed`);
module.exports = { run, source, rules };
