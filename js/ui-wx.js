/* 微信小游戏 UI：Canvas 2D 绘制（无 DOM），复用 NT.game 事件流 */
(function (NT) {
  'use strict';

  let W = 375, H = 667;
  let screen = 'menu';           // menu | play | over | revive
  let buttons = [];              // 每帧重建：{x,y,w,h,action}
  let modeName = '经典模式', turnText = '';
  let toastText = '', toastUntil = 0, comboText = '', comboUntil = 0;
  let overData = null;

  function ink() { return NT.isCozy() ? '#6b5442' : '#ffffff'; }
  function soft() { return NT.isCozy() ? '#9c8370' : '#9aa'; }
  function panelBg() { return NT.isCozy() ? 'rgba(255,251,242,.96)' : 'rgba(10,10,26,.94)'; }
  function btnGrad(g, x, y, w, h) {
    const gr = g.createLinearGradient(x, y, x + w, y + h);
    if (NT.isCozy()) { gr.addColorStop(0, '#ffdca6'); gr.addColorStop(1, '#ffad8f'); }
    else { gr.addColorStop(0, '#ff00cc'); gr.addColorStop(1, '#3333ff'); }
    return gr;
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  function panel(g, top, height) {
    const pw = Math.min(W - 32, 380);
    const px = (W - pw) / 2;
    g.fillStyle = panelBg();
    roundRect(g, px, top, pw, height, 22); g.fill();
    g.strokeStyle = NT.isCozy() ? '#e6c6a5' : 'rgba(255,255,255,.18)';
    g.lineWidth = 3; g.setLineDash([8, 6]);
    roundRect(g, px, top, pw, height, 22); g.stroke();
    g.setLineDash([]);
    return { x: px, w: pw };
  }

  function text(g, str, x, y, size, color, bold) {
    g.textAlign = 'center';
    g.font = (bold ? 'bold ' : '') + size + 'px sans-serif';
    g.fillStyle = color;
    g.fillText(str, x, y);
  }

  function button(g, label, y, action, small) {
    const bw = Math.min(W - 72, 320), bx = (W - bw) / 2, bh = small ? 40 : 48;
    g.fillStyle = btnGrad(g, bx, y, bw, bh);
    roundRect(g, bx, y, bw, bh, bh / 2); g.fill();
    text(g, label, W / 2, y + bh / 2 + (small ? 6 : 7), small ? 16 : 18,
         NT.isCozy() ? '#6b5442' : '#ffffff', true);
    buttons.push({ x: bx, y: y, w: bw, h: bh, action: action });
    return y + bh + 10;
  }

  function toast(msg) { toastText = msg; toastUntil = Date.now() + 1800; }

  // 订阅游戏事件（与 Web 端 ui.js 同一套事件协议）
  NT.game.onEvent = function (type, data) {
    switch (type) {
      case 'start':
        screen = 'play';
        modeName = { classic: '经典模式', daily: '每日挑战', perfect: '完美模式', '2p': '双人对战' }[data.mode] || '';
        turnText = data.mode === '2p' ? '轮到玩家 1' : '';
        comboText = ''; toastText = '';
        break;
      case 'perfect':
        comboText = 'COMBO ×' + data.combo + '  +' + data.pts;
        comboUntil = Date.now() + 900;
        break;
      case 'turn': turnText = '轮到玩家 ' + (data.cur + 1); break;
      case 'toast': toast(data); break;
      case 'milestone': toast('第 ' + data.layer + ' 层 · 进入「' + data.theme + '」'); break;
      case 'resident': toast(data.isNew ? '🎉 ' + data.name + ' 入住你的塔！' : data.name + ' 又来了~'); break;
      case 'unlock': {
        const a = NT.ACH.find(function (x) { return x.id === data; });
        if (a) toast('🏅 成就解锁：' + a.name);
        break;
      }
      case 'reviveOffer': screen = 'revive'; break;
      case 'over': screen = 'over'; overData = data; break;
    }
  };

  NT.uiWx = {
    init: function (w, h) { W = w; H = h; },

    // 每帧绘制（主循环在 WebGL 合成之后调用）
    draw: function (g) {
      buttons = [];
      const now = Date.now();

      if (screen === 'play') {
        const v = NT.game.getScoreView();
        const s = (v.p1 !== undefined) ? (v.cur === 0 ? v.p1 : v.p2) : v.total;
        g.lineWidth = 5; g.strokeStyle = NT.isCozy() ? '#6b5442' : 'rgba(160,120,255,.7)';
        g.font = 'bold 46px sans-serif'; g.textAlign = 'center';
        g.strokeText(String(s), W / 2, 62);
        g.fillStyle = NT.isCozy() ? '#fffdf6' : '#ffffff';
        g.fillText(String(s), W / 2, 62);
        text(g, modeName, W / 2, 88, 14, soft(), false);
        if (turnText) text(g, turnText, W / 2, 110, 15, ink(), true);
        if (v.p1 !== undefined) text(g, '玩家1 ' + v.p1 + '  :  ' + v.p2 + ' 玩家2', W / 2, 132, 15, soft(), false);
        if (comboText && now < comboUntil) text(g, comboText, W / 2, H * 0.36, 26, ink(), true);
      } else if (screen === 'menu') {
        const top = Math.max(20, (H - 590) / 2);
        const p = panel(g, top, 570);
        // 主角头像
        NT.drawAnimal(g, 'tangyuan', W / 2 - 45, top + 12, 90);
        text(g, '萌宠公寓 · 叠叠塔', W / 2, top + 128, 25, ink(), true);
        text(g, '点一下放一层楼 · 每 10 层有萌宠入住 🐾', W / 2, top + 152, 12, soft(), false);
        text(g, '最高分 ' + NT.game.Store.best + '   今日最佳 ' + (NT.game.Store.dailyBest(NT.dailySeed()) || 0),
             W / 2, top + 176, 13, soft(), false);

        let y = top + 196;
        y = button(g, '🏠 经典模式', y, function () { NT.game.start('classic'); });
        y = button(g, '📅 每日挑战', y, function () { NT.game.start('daily'); });
        y = button(g, '✨ 完美模式', y, function () { NT.game.start('perfect'); });
        y = button(g, '👯 双人对战', y, function () { NT.game.start('2p'); });

        // 动物图鉴（头像直接画，零素材）
        const zoo = NT.game.Store.animals || {};
        const size = 34, gap = (p.w - 20 - size * 5) / 4;
        for (let i = 0; i < NT.ANIMALS.length; i++) {
          const a = NT.ANIMALS[i];
          const ax = p.x + 10 + i * (size + gap), ay = y + 4;
          if (zoo[a.id]) NT.drawAnimal(g, a.id, ax, ay, size);
          else {
            g.fillStyle = NT.isCozy() ? '#efe0cc' : 'rgba(255,255,255,.12)';
            g.beginPath(); g.arc(ax + size / 2, ay + size / 2, size / 2, 0, Math.PI * 2); g.fill();
            text(g, '?', ax + size / 2, ay + size / 2 + 7, 18, soft(), true);
          }
        }
        y += 48;
        y = button(g, NT.isCozy() ? '🌙 切换霓虹夜' : '🌤 切换治愈手绘', y, function () {
          NT.setStyle(NT.isCozy() ? 'neon' : 'cozy');
          NT.Platform.storageSet('nt_style', NT.STYLE);
          NT.Scene.applyStyle();
          toast(NT.isCozy() ? '已切换：治愈手绘 ☀️' : '已切换：霓虹夜 🌙');
        }, true);
        button(g, NT.Audio.muted ? '🔇 音效已关' : '🔊 音效开启', y, function () {
          NT.Audio.toggleMute(); toast(NT.Audio.muted ? '音效已关' : '音效已开');
        }, true);
      } else if (screen === 'revive') {
        const top = (H - 230) / 2;
        panel(g, top, 230);
        text(g, '复活机会！', W / 2, top + 58, 26, ink(), true);
        text(g, '收集到的复活层，现在用吗？', W / 2, top + 90, 14, soft(), false);
        let y = top + 110;
        y = button(g, '💗 立即复活', y, function () { NT.game.useRevive(); screen = 'play'; });
        button(g, '放弃', y, function () { NT.game.declineRevive(); }, true);
      } else if (screen === 'over' && overData) {
        const top = Math.max(20, (H - 470) / 2);
        panel(g, top, 470);
        const d = overData;
        text(g, '塔倒啦~', W / 2, top + 52, 26, ink(), true);
        const s = (d.winner !== null && d.winner !== undefined)
          ? (d.winner < 0 ? '平局！' : '玩家 ' + (d.winner + 1) + ' 获胜！')
          : String(d.view.total);
        text(g, s, W / 2, top + 112, 48, ink(), true);
        text(g, d.layers + ' 层 · 历史最高 ' + d.best, W / 2, top + 142, 14, soft(), false);
        if (d.isNewBest) text(g, '🏆 新纪录！', W / 2, top + 168, 17, '#e08a3c', true);
        if (d.unlocked && d.unlocked.length) text(g, '本局解锁 ' + d.unlocked.length + ' 个成就 🏅', W / 2, top + 192, 14, soft(), false);
        let y = top + 214;
        y = button(g, '再来一局', y, function () { NT.game.start(NT.game.G.mode); });
        y = button(g, '📤 分享成绩给好友', y, function () {
          NT.Platform.shareScore(d.view.total, d.layers, modeName);
        });
        button(g, '返回菜单', y, function () { screen = 'menu'; }, true);
      }

      // 全局 toast
      if (toastText && now < toastUntil) {
        const tw = Math.min(W - 40, toastText.length * 16 + 44);
        g.fillStyle = 'rgba(107,84,66,.92)';
        roundRect(g, (W - tw) / 2, H - 96, tw, 38, 19); g.fill();
        text(g, toastText, W / 2, H - 71, 15, '#fffdf6', false);
      }
    },

    // 返回 true 表示点中了 UI；false 表示应放置方块
    touch: function (x, y) {
      for (let i = 0; i < buttons.length; i++) {
        const b = buttons[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          try { b.action(); } catch (e) { console.warn('ui action error', e); }
          return true;
        }
      }
      if (screen === 'play') { NT.game.place(); return true; }
      return false;
    }
  };
})(window.NT = window.NT || {});
