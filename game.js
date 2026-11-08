/* 微信小游戏入口（萌宠公寓 · 治愈手绘）
   架构：Web 与微信共用 js/ 下的全部玩法内核，仅平台层与 UI 层不同。
   前置：在微信开发者工具中执行「构建 npm」（package.json 依赖 threejs-miniprogram）。 */
const { createScopedThreejs } = require('threejs-miniprogram');

const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
const W = sys.windowWidth, H = sys.windowHeight;
const DPR = Math.min(sys.pixelRatio || 1, 2);

// 1) 上屏 canvas（2D 合成）+ 离屏 WebGL canvas
const screenCanvas = wx.createCanvas();
screenCanvas.width = Math.floor(W * DPR);
screenCanvas.height = Math.floor(H * DPR);
const ctx2d = screenCanvas.getContext('2d');
ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0);

const glCanvas = wx.createCanvas();
glCanvas.width = Math.floor(W * DPR);
glCanvas.height = Math.floor(H * DPR);

// 2) 全局 shim：让 Web 版内核模块原样复用（window/document/AudioContext）
global.window = global;
window.innerWidth = W;
window.innerHeight = H;
window.devicePixelRatio = DPR;
window.addEventListener = function () {};       // 小游戏窗口尺寸固定
window.performance = window.performance || { now: function () { return Date.now(); } };
window.AudioContext = function () { return wx.createWebAudioContext(); };
window.document = {
  createElement: function (tag) {
    if (tag === 'canvas') return wx.createCanvas(); // 离屏画布（贴图/动物/海报）
    return {};
  }
};

// 3) 注入 scoped THREE（官方适配包，非全局）
global.THREE = createScopedThreejs(glCanvas);

// 4) 加载内核：顺序与 Web 端一致，平台层换成 wx 版、UI 换成 canvas 版
require('./js/config.js');
require('./js/platform-wx.js');
require('./js/audio.js');
require('./js/animals.js');
require('./js/textures.js');
require('./js/scene.js');
require('./js/game.js');
require('./js/ui-wx.js');

// 5) 初始化
NT.Scene.init(glCanvas);
NT.setStyle(NT.Platform.storageGet('nt_style', 'cozy'));
NT.Scene.applyStyle();       // 恢复画风 + 创建氛围粒子
NT.uiWx.init(W, H);

try { wx.showShareMenu({ withShareTicket: true }); } catch (e) {}
wx.onShareAppMessage(function () {
  return { title: '萌宠公寓·叠叠塔：来和我比比谁的塔更高！🐾', query: 'from=share' };
});
wx.onShow(function () { lastTime = Date.now(); });

// 6) 触摸：UI 命中优先，否则放置方块
wx.onTouchStart(function (e) {
  const t = e.touches && e.touches[0];
  if (!t) return;
  NT.Audio.unlock();
  NT.uiWx.touch(t.clientX, t.clientY);
});

// 7) 主循环：内核更新 → WebGL 渲染 → 上屏 2D 合成（渐变天幕 + 画面 + UI）
let lastTime = Date.now();
function frame() {
  const now = Date.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  NT.game.update(dt);
  NT.Scene.update(dt);
  NT.Scene.render();

  const css = NT.Scene.getThemeCss();
  const grad = ctx2d.createLinearGradient(0, 0, 0, H);
  css.forEach(function (col, i) { grad.addColorStop(i / (css.length - 1), col); });
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0, 0, W, H);
  ctx2d.drawImage(glCanvas, 0, 0, W, H);
  NT.uiWx.draw(ctx2d);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
