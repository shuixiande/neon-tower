/* 卡通动物住户：Canvas 程序化绘制（零图片素材） */
(function (NT) {
  'use strict';

  const S = 128; // 贴图尺寸

  function base(hue, sat, lit) { return 'hsl(' + hue + ',' + sat + '%,' + lit + '%)'; }

  function drawBody(g, color, cy, r) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(64, cy, r, 0, Math.PI * 2);
    g.fill();
  }

  function drawEars(g, type, color, inner) {
    g.fillStyle = color;
    if (type === 'cat' || type === 'shiba') {
      // 三角耳
      g.beginPath(); g.moveTo(30, 42); g.lineTo(22, 12); g.lineTo(52, 28); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(98, 42); g.lineTo(106, 12); g.lineTo(76, 28); g.closePath(); g.fill();
      if (inner) {
        g.fillStyle = inner;
        g.beginPath(); g.moveTo(33, 38); g.lineTo(28, 20); g.lineTo(46, 30); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(95, 38); g.lineTo(100, 20); g.lineTo(82, 30); g.closePath(); g.fill();
      }
    } else if (type === 'rabbit') {
      // 长竖耳
      g.beginPath(); g.ellipse(44, 26, 13, 34, -0.12, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(84, 26, 13, 34, 0.12, 0, Math.PI * 2); g.fill();
      if (inner) {
        g.fillStyle = inner;
        g.beginPath(); g.ellipse(44, 28, 7, 24, -0.12, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(84, 28, 7, 24, 0.12, 0, Math.PI * 2); g.fill();
      }
    } else if (type === 'panda') {
      g.beginPath(); g.arc(32, 26, 16, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(96, 26, 16, 0, Math.PI * 2); g.fill();
    }
  }

  function drawFace(g, opts) {
    // 眼睛（高光豆豆眼）
    const ey = opts.eyeY || 60;
    g.fillStyle = '#2b2b2b';
    g.beginPath(); g.arc(48, ey, 7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(80, ey, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(50.5, ey - 2.5, 2.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(82.5, ey - 2.5, 2.5, 0, Math.PI * 2); g.fill();
    // 腮红
    g.fillStyle = 'rgba(255,130,150,.55)';
    g.beginPath(); g.arc(34, ey + 12, 8, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(94, ey + 12, 8, 0, Math.PI * 2); g.fill();
    // 微笑
    g.strokeStyle = '#2b2b2b';
    g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath();
    if (opts.tongue) {
      g.arc(64, ey + 8, 9, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.fillStyle = '#ff8ea1';
      g.beginPath(); g.ellipse(64, ey + 16, 6, 4, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.arc(64, ey + 6, 10, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      // 鼻子
      g.fillStyle = '#2b2b2b';
      g.beginPath(); g.ellipse(64, ey + 2, 4.5, 3.5, 0, 0, Math.PI * 2); g.fill();
    }
  }

  const PAINTERS = {
    cat: function (g) {
      drawEars(g, 'cat', base(28, 85, 62), base(340, 70, 75));
      drawBody(g, base(28, 85, 62), 72, 44);
      drawFace(g, {});
      // 胡须
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.5;
      [0, 1, 2].forEach(function (i) {
        g.beginPath(); g.moveTo(20, 66 + i * 8); g.lineTo(2, 62 + i * 9); g.stroke();
        g.beginPath(); g.moveTo(108, 66 + i * 8); g.lineTo(126, 62 + i * 9); g.stroke();
      });
    },
    shiba: function (g) {
      drawEars(g, 'shiba', base(30, 70, 58), '#e8b88a');
      drawBody(g, base(30, 70, 58), 72, 44);
      // 白色脸谱
      g.fillStyle = '#fff6ea';
      g.beginPath(); g.ellipse(64, 82, 30, 26, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(64, 60, 26, 16, 0, 0, Math.PI * 2); g.fill();
      drawFace(g, { tongue: true, eyeY: 58 });
    },
    panda: function (g) {
      drawEars(g, 'panda', '#2b2b2b');
      drawBody(g, '#f5f5f5', 72, 44);
      // 黑眼圈
      g.fillStyle = '#2b2b2b';
      g.beginPath(); g.ellipse(48, 60, 12, 15, 0.35, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(80, 60, 12, 15, -0.35, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(50, 58, 6, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(78, 58, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2b2b2b';
      g.beginPath(); g.arc(50.5, 58, 4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(78.5, 58, 4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(64, 74, 5, 4, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2b2b2b'; g.lineWidth = 3;
      g.beginPath(); g.arc(64, 78, 9, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.fillStyle = 'rgba(255,130,150,.5)';
      g.beginPath(); g.arc(32, 74, 7, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(96, 74, 7, 0, Math.PI * 2); g.fill();
    },
    rabbit: function (g) {
      drawEars(g, 'rabbit', '#f5f0f5', '#ffc9d6');
      drawBody(g, '#f5f0f5', 72, 44);
      drawFace(g, { eyeY: 62 });
    },
    tangyuan: function (g) {
      // 汤圆：雪白圆球 + 星星高光 + 小叶子（塔顶守护者）
      drawBody(g, '#ffffff', 76, 46);
      g.strokeStyle = 'rgba(200,200,220,.6)'; g.lineWidth = 2;
      g.beginPath(); g.arc(64, 76, 45, 0, Math.PI * 2); g.stroke();
      drawFace(g, { eyeY: 66 });
      // 头顶叶子
      g.fillStyle = '#7dffc8';
      g.beginPath(); g.ellipse(64, 26, 6, 12, 0.5, 0, Math.PI * 2); g.fill();
      // 星星
      g.fillStyle = '#ffd700';
      g.font = '22px sans-serif'; g.textAlign = 'center';
      g.fillText('✦', 104, 34);
      g.fillText('✦', 26, 42);
    }
  };

  // 在任意 2D 上下文按指定位置/尺寸画动物（海报、图鉴、UI 复用）
  NT.drawAnimal = function (g, id, x, y, size) {
    g.save();
    g.translate(x, y);
    g.scale(size / S, size / S);
    (PAINTERS[id] || PAINTERS.cat)(g);
    g.restore();
  };

  // 生成动物头像 dataURL（Web 端 <img> 使用）
  NT.animalDataURL = function (id, size) {
    const cv = document.createElement('canvas');
    cv.width = size || S; cv.height = size || S;
    const g = cv.getContext('2d');
    NT.drawAnimal(g, id, 0, 0, size || S);
    return cv.toDataURL('image/png');
  };

  // 生成 3D 精灵贴图
  NT.makeAnimalTexture = function (id) {
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    (PAINTERS[id] || PAINTERS.cat)(g);
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  };
})(window.NT = window.NT || {});
