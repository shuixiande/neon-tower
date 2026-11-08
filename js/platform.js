/* 平台适配层：Web 实现（微信端见 platform-wx.js 占位） */
(function (NT) {
  'use strict';

  NT.Platform = {
    id: 'web',

    storageGet: function (key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    storageSet: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 存储满则忽略 */ }
    },

    // 震动反馈
    vibrate: function (pattern) {
      try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
    },

    // 下载图片（Web 端的“分享/保存”形态）
    downloadImage: function (filename, dataURL) {
      const a = document.createElement('a');
      a.href = dataURL; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    },

    // 是否支持原生分享卡片
    canShareCard: function () { return false; }
  };
})(window.NT = window.NT || {});
