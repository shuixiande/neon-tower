/* 手绘贴图：把方块画成「萌宠公寓的一层楼」——窗户/屋檐/花盆/纸纹 */
(function (NT) {
  'use strict';

  const W = 256, H = 128;
  const cache = {};
  const INK = '#6b5442';

  function rnd(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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

  // 一扇窗：暖黄玻璃 + 深棕窗框 + 十字窗棂 + 小窗帘
  function windowAt(g, cx, cy, w, h, r, curtain) {
    g.fillStyle = INK;
    roundRect(g, cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8, 7); g.fill();
    g.fillStyle = '#fff3c4';
    roundRect(g, cx - w / 2, cy - h / 2, w, h, 4); g.fill();
    // 玻璃反光
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath(); g.moveTo(cx - w / 2 + 3, cy - h / 2 + 3);
    g.lineTo(cx - w / 2 + w * 0.45, cy - h / 2 + 3);
    g.lineTo(cx - w / 2 + 3, cy + h / 2 - 3); g.closePath(); g.fill();
    // 十字窗棂
    g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx, cy - h / 2); g.lineTo(cx, cy + h / 2);
    g.moveTo(cx - w / 2, cy); g.lineTo(cx + w / 2, cy); g.stroke();
    if (curtain) {
      g.fillStyle = '#ffb7b0';
      roundRect(g, cx - w / 2 - 3, cy - h / 2 - 3, w * 0.28, h * 0.45, 4); g.fill();
      roundRect(g, cx + w / 2 - w * 0.28 + 3, cy - h / 2 - 3, w * 0.28, h * 0.45, 4); g.fill();
    }
  }

  // 小盆栽
  function plantAt(g, x, y, r) {
    g.fillStyle = '#e8a87c';
    roundRect(g, x - 9, y - 6, 18, 13, 3); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x - 9, y - 6, 18, 13);
    g.fillStyle = '#8fd6a0';
    g.beginPath(); g.ellipse(x, y - 13, 8, 10, -0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(x + 8, y - 11, 7, 9, 0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(x - 8, y - 11, 7, 9, 0.2, 0, Math.PI * 2); g.fill();
  }

  // 小花
  function flowerAt(g, x, y, r) {
    g.fillStyle = '#fff1f5';
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      g.beginPath(); g.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4.5, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ffc93c';
    g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
  }

  NT.makeBlockTexture = function (colorHex, layer) {
    const key = colorHex + '|' + layer;
    if (cache[key]) return cache[key];

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const r = rnd(layer * 7919 + 13);

    // 底色（兼容 hsl 字符串与 0xRRGGBB 数字）
    g.fillStyle = new THREE.Color(colorHex).getStyle();
    g.fillRect(0, 0, W, H);

    // 纸纹：细噪点 + 淡淡斜纹
    g.fillStyle = 'rgba(255,255,255,.16)';
    for (let i = 0; i < 160; i++) {
      g.fillRect(r() * W, r() * H, 1.5, 1.5);
    }
    g.strokeStyle = 'rgba(107,84,66,.06)'; g.lineWidth = 1;
    for (let x = -H; x < W; x += 14) {
      g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke();
    }

    // 顶部屋檐（手绘略歪的横条）
    g.fillStyle = 'rgba(107,84,66,.20)';
    g.fillRect(0, 0, W, 15);
    g.strokeStyle = INK; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 16); g.lineTo(W, 14); g.stroke();
    // 檐口奶油高光
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.fillRect(0, 2, W, 4);

    // 底部阴影带
    g.fillStyle = 'rgba(107,84,66,.14)';
    g.fillRect(0, H - 12, W, 12);

    // 外框：手绘粗描边
    g.strokeStyle = INK; g.lineWidth = 6; g.lineJoin = 'round';
    roundRect(g, 4, 18, W - 8, H - 30, 10); g.stroke();

    // 窗户（2 或 3 扇）
    const count = layer % 3 === 0 ? 3 : 2;
    const step = (W - 60) / count;
    for (let i = 0; i < count; i++) {
      const cx = 30 + step * (i + 0.5);
      windowAt(g, cx, 62, Math.min(46, step * 0.56), 48, r, (layer + i) % 2 === 0);
    }

    // 装饰：花盆 / 小花 / 星星，按层变化
    const deco = layer % 4;
    if (deco === 0) plantAt(g, 26, 104, r);
    else if (deco === 1) flowerAt(g, W - 28, 100, r);
    else if (deco === 2) {
      // 晒衣绳小旗
      g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.moveTo(150, 100); g.lineTo(230, 96); g.stroke();
      ['#ffb7b0', '#9fd8f5', '#ffe08a'].forEach(function (c, i) {
        g.fillStyle = c;
        g.fillRect(160 + i * 26, 100 + i * 1.5, 16, 12);
      });
    } else {
      // 小爪印
      g.fillStyle = 'rgba(107,84,66,.35)';
      g.beginPath(); g.ellipse(W - 30, 100, 7, 6, 0, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.arc(W - 40 + i * 9, 90, 3, 0, Math.PI * 2); g.fill();
      }
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    cache[key] = tex;
    return tex;
  };

  NT.clearBlockTextures = function () {
    // 只清引用不 dispose：菜单中已建好的塔仍可能使用旧贴图
    Object.keys(cache).forEach(function (k) { delete cache[k]; });
  };
})(window.NT = window.NT || {});
