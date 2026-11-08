/* 平台适配层：微信小游戏实现（覆盖 Web 端 platform.js，不与其同时加载） */
(function (NT) {
  'use strict';

  NT.Platform = {
    id: 'wx',

    storageGet: function (key, fallback) {
      try {
        const v = wx.getStorageSync(key);
        if (v === '' || v === null || v === undefined) return fallback;
        return (typeof v === 'string') ? JSON.parse(v) : v;
      } catch (e) { return fallback; }
    },
    storageSet: function (key, val) {
      try { wx.setStorageSync(key, JSON.stringify(val)); } catch (e) {}
    },

    vibrate: function (pattern) {
      try { wx.vibrateShort({ type: 'light', fail: function () {} }); } catch (e) {}
    },

    // 小游戏端不用下载，成绩通过分享卡片传播
    downloadImage: function () {},
    canShareCard: function () { return true; },

    // 分享卡片：微信聊天里一眼可辨的大字文案
    shareScore: function (score, layers, modeName) {
      try {
        wx.shareAppMessage({
          title: '我在《萌宠公寓》叠了 ' + layers + ' 层、拿了 ' + score + ' 分！来挑战我 🐾',
          query: 'score=' + score + '&layers=' + layers + '&mode=' + encodeURIComponent(modeName || ''),
          fail: function () {}
        });
      } catch (e) {}
    }
  };
})(window.NT = window.NT || {});
