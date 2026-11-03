/*
 * Meituan Loon response cleaner. Independently implemented 2026-11-03.
 * SPDX-License-Identifier: GPL-2.0-only
 * Original behavior/reference: TG@ZenMoFiShi, https://github.com/ZenmoFeiShi/Qx
 * Schema references and verification limits are documented in README.md.
 */
(function () {
  const request = typeof $request === "object" && $request;
  const response = typeof $response === "object" && $response;
  const url = request && request.url;
  const body = response && response.body;
  const match = typeof url === "string" && url.match(/^https?:\/\/([^/?#]+)(\/[^?#]*)/);
  if (!match || typeof body !== "string" || !body) return $done({});
  const route = match[1] + match[2].replace(/\/$/, "");
  let data;
  try {
    data = JSON.parse(body);
    if (!isObject(data)) return $done({});
    const before = JSON.stringify(data);
    if (route === "apimobile.meituan.com/aggroup/indexTab") {
      const resource = data.data && data.data.resource;
      if (isObject(resource) && Array.isArray(resource.tabArea)) {
        const tabs = resource.tabArea.filter(tab => !isObject(tab) || !(
          ["video", "xiaotuan"].includes(tab.tabName) ||
          isTargetImage(tab.imgUrl) || isTargetImage(tab.selectedImage)
        ));
        // Do not replace the navigation with an empty list.
        if (tabs.length) resource.tabArea = tabs;
      }
    } else if (/^feedguess\.meituan\.com\/lycoris\/scene\/(gwc_feed1_2265|personalcenter_2154)$/.test(route)) {
      if (Array.isArray(data.data)) {
        data.data = [];
        data.bottom = true;
        if (!isObject(data.ext)) data.ext = {};
        data.ext.forbidByExp = true;
      }
    } else if (route === "mt-personalcenter.meituan.com/usercenter/display") {
      if (Array.isArray(data.children)) {
        data.children = data.children.filter(section => !isObject(section) || !["mine_cross_recommend", "mine_walletV3"].includes(section.name));
      }
    } else if (route === "apimobile.meituan.com/group/v1/deal/searchpage/defaultword") {
      const introduce = data.searchIntroduceResponse;
      if (isObject(introduce)) {
        clearArray(introduce.defaultWordRes, "defaultWordItems");
        clearArray(introduce, "HotWordInfos");
      }
    } else if (/^apimobile\.meituan\.com\/group\/v1\/deal\/searchpage\/hotword\/city\/divide\/hotrecommend(?:\/|$)/.test(route)) {
      const search = data.data;
      if (isObject(search)) {
        if (Array.isArray(search.segmentsV2)) {
          search.segmentsV2 = search.segmentsV2.filter(segment => {
            if (!isObject(segment) || !Array.isArray(segment.hotwordSegments)) return true;
            const words = segment.hotwordSegments.filter(word => !isObject(word) || !["EntranceHotwordsV2Hotwords", "EntranceHotwordsV2ContentCard"].includes(word.pageName));
            if (words.length === segment.hotwordSegments.length) return true;
            segment.hotwordSegments = words;
            return words.length > 0;
          });
        }
        // Bubble cleanup does not depend on the optional hotword segment list.
        clearArray(search.aiSearchBubble, "bubbleTexts");
      }
    } else if (route === "assistify.meituan.com/assistant/getAppClientHornConfig") {
      if (typeof data.data === "string") {
        const config = JSON.parse(data.data);
        if (isObject(config) && isObject(config.skills) && Object.keys(config.skills).length) {
          config.skills = {};
          data.data = JSON.stringify(config);
        }
      }
    } else if (route === "mop.meituan.com/mop/entry/shoppingCartEntry") {
      clearResourceArea(data, "topBannerArea");
    } else if (route === "mop.meituan.com/api/entryModule/startupPicture") {
      clearResourceArea(data, "startupPicArea");
    }
    const output = JSON.stringify(data);
    return $done(output === before ? {} : { body: output });
  } catch (error) {
    return $done({});
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function isTargetImage(value) {
    if (typeof value !== "string") return false;
    return /^https?:\/\/p0\.meituan\.net\/aixiaotuan\/759944e1d23af9c12fd2be85af8d7b6125132\.(?:png(?:\.webp)?|webp)(?:@[^/?#]*)?(?:\?[^#]*)?$/.test(value) ||
      /^https?:\/\/p1\.meituan\.net\/monitorimage\/3ff407cd7478df1cdee7e646de094abe232932\.(?:png(?:\.webp)?|webp)(?:@[^/?#]*)?(?:\?[^#]*)?$/.test(value) ||
      /^https?:\/\/p0\.meituan\.net\/linglong\/(?:0021570faa939f1f079b2e0cb54497574565|90d2e0abc1d6295bd3190f16faef26066070)\.(?:png(?:\.webp)?|webp)(?:@[^/?#]*)?(?:\?[^#]*)?$/.test(value);
  }
  function clearArray(object, key) {
    if (isObject(object) && Array.isArray(object[key]) && object[key].length) object[key] = [];
  }
  function clearResourceArea(object, key) {
    [object, object.data].forEach(holder => {
      if (isObject(holder)) [holder.resource, holder.resourcesMap].forEach(resource => clearArray(resource, key));
    });
  }
})();
