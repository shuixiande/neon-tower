/* 微信小游戏端逻辑冒烟：mock wx/window/document，验证模块加载、事件协议、按钮命中 */
const path = require('path');
const fs = require('fs');
const vm = require('vm');

// --- 通用 mock 2D 上下文 ---
function mockCtx() {
  const target = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', globalAlpha: 1,
    createLinearGradient: function () { return { addColorStop: function () {} }; }
  };
  return new Proxy(target, {
    get: function (t, p) { return (p in t) ? t[p] : function () {}; },
    set: function (t, p, v) { t[p] = v; return true; }
  });
}

const sandbox = {
  console: console, Date: Date, Math: Math, JSON: JSON, Array: Array, Object: Object,
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  document: {
    createElement: function () {
      return { width: 0, height: 0, getContext: function () { return mockCtx(); }, toDataURL: function () { return ''; } };
    }
  },
  wx: {
    getStorageSync: function () { return ''; },
    setStorageSync: function () {},
    vibrateShort: function () {},
    shareAppMessage: function () {},
    createWebAudioContext: function () { return {}; }
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

load('js/config.js');
load('js/platform-wx.js');

// 内核依赖的最小 mock（UI 层只用事件协议与只读状态）
let started = null, placed = 0, shared = null;
const NT = sandbox.NT;
NT.drawAnimal = function () {};
NT.Scene = { applyStyle: function () {}, getThemeCss: function () { return ['#fff', '#eee', '#ddd']; } };
NT.Audio = { muted: false, toggleMute: function () { this.muted = !this.muted; }, unlock: function () {} };
NT.Platform.shareScore = function (score, layers) { shared = score + '/' + layers; };
NT.game = {
  G: { state: 'MENU', mode: 'classic' },
  Store: { best: 0, dailyBest: function () { return 0; }, animals: {} },
  getScoreView: function () { return { total: 0 }; },
  start: function (m) { started = m; NT.game.G.state = 'PLAY'; NT.game.onEvent('start', { mode: m }); },
  place: function () { placed++; },
  useRevive: function () {}, declineRevive: function () {},
  onEvent: null
};

load('js/ui-wx.js');
NT.uiWx.init(375, 667);
const ctx = mockCtx();
NT.uiWx.draw(ctx);

// 菜单第一个按钮：top=(667-590)/2=38.5，首按钮 y=234.5，高 48
NT.uiWx.touch(375 / 2, 250);
const okStart = started === 'classic';
NT.uiWx.draw(ctx);            // play 画面
NT.uiWx.touch(10, 400);       // 空白处 = 放置
const okPlace = placed === 1;

NT.game.onEvent('perfect', { combo: 3, pts: 6 });
NT.game.onEvent('milestone', { layer: 10, theme: '薄荷午后' });
NT.game.onEvent('resident', { name: '猫咪', isNew: true });
NT.game.onEvent('over', {
  view: { total: 42 }, winner: null, layers: 12, best: 42,
  isNewBest: true, unlocked: ['combo_5']
});
NT.uiWx.draw(ctx);
// 结束面板「分享成绩」按钮：top=(667-470)/2=98.5，第一个按钮 y=312.5，第二个 y=370.5
NT.uiWx.touch(375 / 2, 395);
const okShare = shared === '42/12';

NT.game.onEvent('reviveOffer', null);
NT.uiWx.draw(ctx);            // 复活面板
const noCrash = true;

console.log(JSON.stringify({
  moduleLoaded: typeof NT.uiWx === 'object',
  eventProtocol: typeof NT.game.onEvent === 'function',
  menuButtonHit: okStart,
  playTouchPlaces: okPlace,
  shareCardHit: okShare,
  revivePanelRendered: noCrash,
  styleSwitchable: (function () { NT.setStyle('neon'); const a = !NT.isCozy(); NT.setStyle('cozy'); return a && NT.isCozy(); })()
}, null, 1));
