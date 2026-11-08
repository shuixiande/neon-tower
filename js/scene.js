/* Three.js 场景：相机/方块/碎片/粒子/主题过渡/截图海报 */
(function (NT) {
  'use strict';

  const BOX = NT.BOX;
  const th = function () { return NT.themes(); };
  let scene, camera, renderer, towerGroup;
  let ambient, dirLight;
  let focusY = 0, focusTargetY = 0;
  let moving = null;        // { mesh, axis, dir, w, d, prop, mat }
  let debris = [];          // 下落碎片
  let ambientPts = null, ambientVelY = 0.2, ambientCount = 140;
  let bursts = [];          // 烟花粒子组
  let residents = [];       // 动物住户精灵
  const MAX_RESIDENTS = 6;  // 只保留最近6只，控性能
  let clockT = 0;
  let curTheme = 0;

  const VIEW_HALF = 6;      // 正交视口半高
  const CAM_DIST = 14;      // 相机距离

  function frustum() {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    return { w: VIEW_HALF * aspect, h: VIEW_HALF };
  }

  // 材质销毁（兼容六面材质数组）
  function disposeMat(m) {
    if (!m) return;
    if (Array.isArray(m)) {
      const seen = [];
      m.forEach(function (x) { if (x && seen.indexOf(x) < 0) { seen.push(x); x.dispose(); } });
    } else if (m.dispose) m.dispose();
  }

  // 六面材质：四侧面=手绘楼层贴图，顶/底=奶油屋顶（不再让窗户爬上屋顶）
  function faceMaterials(colorHex, layer, glow, emissiveHex) {
    if (!NT.isCozy()) {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        emissive: new THREE.Color(emissiveHex || colorHex), emissiveIntensity: glow,
        roughness: 0.4, metalness: 0.1
      });
    }
    const tex = NT.makeBlockTexture(colorHex, layer);
    const side = new THREE.MeshStandardMaterial({
      map: tex, color: 0xffffff, roughness: 0.95, metalness: 0,
      emissive: new THREE.Color(emissiveHex || colorHex), emissiveIntensity: glow
    });
    const roof = new THREE.MeshStandardMaterial({
      color: 0xfff6e6, roughness: 1, metalness: 0,
      emissive: new THREE.Color(emissiveHex || colorHex), emissiveIntensity: glow * 0.5
    });
    return [side, side, roof, roof, side, side];
  }

  NT.Scene = {
    init: function (canvas) {
      // alpha:true → 背景透明，由页面 CSS 渐变天幕负责背景
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      const f = frustum();
      camera = new THREE.OrthographicCamera(-f.w, f.w, f.h, -f.h, 0.1, 100);
      camera.position.set(CAM_DIST, CAM_DIST + 2, CAM_DIST);
      camera.lookAt(0, 0, 0);

      ambient = new THREE.AmbientLight(0xffffff, NT.isCozy() ? 0.95 : 0.7);
      scene.add(ambient);
      dirLight = new THREE.DirectionalLight(0xffffff, NT.isCozy() ? 0.7 : 1.05);
      dirLight.position.set(5, 12, 6);
      scene.add(dirLight);

      towerGroup = new THREE.Group();
      scene.add(towerGroup);

      window.addEventListener('resize', function () {
        const fr = frustum();
        camera.left = -fr.w; camera.right = fr.w;
        camera.top = fr.h; camera.bottom = -fr.h;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    },

    reset: function () {
      // 清空塔与碎片，重置相机与主题（回到主题0）
      while (towerGroup.children.length) {
        const c = towerGroup.children.pop();
        c.geometry && c.geometry.dispose();
        disposeMat(c.material);
      }
      debris.forEach(function (d) {
        scene.remove(d.mesh);
        d.mesh.geometry.dispose(); d.mesh.material.dispose();
      });
      debris = [];
      bursts.forEach(function (b) { b.points.geometry.dispose(); b.points.material.dispose(); });
      bursts = [];
      residents.forEach(function (r) {
        scene.remove(r.sprite);
        r.sprite.material.map.dispose();
        r.sprite.material.dispose();
      });
      residents = [];
      focusY = 0; focusTargetY = 0;
      this.setTheme(0, true);
    },

    // 动物住户入住：蹲在里程碑层靠近镜头的塔角（探头效果，保证可见）
    addResident: function (layer, x, z, w, d, animalId) {
      const tex = NT.makeAnimalTexture(animalId);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(0.75, 0.75, 1);
      sp.renderOrder = 5;
      const y = this.layerY(layer) + BOX.h / 2 + 0.42;
      sp.position.set(x + w / 2 + 0.18, y, z + d / 2 + 0.18);
      scene.add(sp);
      residents.push({ sprite: sp, baseY: y, bounceT: null });
      while (residents.length > MAX_RESIDENTS) {
        const old = residents.shift();
        scene.remove(old.sprite);
        old.sprite.material.map.dispose();
        old.sprite.material.dispose();
      }
    },

    // 欢呼：所有在场住户蹦跳
    cheer: function () {
      residents.forEach(function (r) { if (r.bounceT === null) r.bounceT = 0; });
    },

    layerY: function (layer) { return layer * BOX.h + BOX.h / 2; },

    colorFor: function (layer, themeIdx, palette) {
      const t = th()[themeIdx % th().length];
      const hue = ((palette.hueBase || t.hue) + layer * palette.hueStep) % 360;
      return 'hsl(' + hue + ', ' + palette.sat + '%, ' + palette.lit + '%)';
    },

    addTowerBlock: function (layer, x, z, w, d, colorHex, isMilestone) {
      const geo = new THREE.BoxGeometry(w, BOX.h, d);
      const cozy = NT.isCozy();
      const mat = faceMaterials(colorHex, layer, cozy ? 0.09 : 0.5);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, this.layerY(layer), z);
      // 描边：治愈风用深棕手绘线，霓虹风用白线
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({
          color: cozy ? 0x6b5442 : 0xffffff,
          transparent: true, opacity: cozy ? 0.55 : 0.5
        })
      );
      mesh.add(edges);
      towerGroup.add(mesh);

      // 塔的生命感：霓虹风的里程碑层加发光窗口（治愈风贴图已有窗户）
      if (isMilestone && !NT.isCozy()) {
        const winGeo = new THREE.BoxGeometry(w * 0.12, BOX.h * 0.3, 0.02);
        const winMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
        for (let i = -1; i <= 1; i += 2) {
          const win = new THREE.Mesh(winGeo, winMat);
          win.position.set(x + i * w * 0.22, this.layerY(layer), z + d / 2 + 0.011);
          towerGroup.add(win);
        }
      }
      return mesh;
    },

    // 生成移动块（axis: 'x' | 'z'）
    spawnMoving: function (layer, x, z, w, d, colorHex, axis, prop) {
      this.removeMoving();
      const geo = new THREE.BoxGeometry(w, BOX.h, d);
      const cozy = NT.isCozy();
      const pColor = prop ? NT.PROPS.find(function (p) { return p.id === prop; }).color : colorHex;
      const glow = cozy ? (prop ? 0.35 : 0.12) : (prop ? 1.0 : 0.6);
      const mat = faceMaterials(colorHex, layer, glow, prop ? pColor : undefined);
      const mesh = new THREE.Mesh(geo, mat);
      // 描边：移动块更实，与已固定块区分
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({
          color: cozy ? 0x5b4334 : 0xffffff,
          transparent: true, opacity: cozy ? 0.85 : 0.95
        })
      );
      mesh.add(edges);
      const startPos = -NT.MOVE_RANGE + Math.random() * NT.MOVE_RANGE * 2;
      if (axis === 'x') { mesh.position.set(startPos, this.layerY(layer), z); }
      else { mesh.position.set(x, this.layerY(layer), startPos); }
      scene.add(mesh);
      const mats = Array.isArray(mat) ? Array.from(new Set(mat)) : [mat];
      moving = {
        mesh: mesh, axis: axis, dir: Math.random() > 0.5 ? 1 : -1,
        w: w, d: d, prop: prop || null, mat: mat, mats: mats,
        glowBases: mats.map(function (m) { return m.emissiveIntensity; }),
        color: colorHex, colorHex: colorHex, cozy: cozy
      };
    },

    removeMoving: function () {
      if (!moving) return;
      scene.remove(moving.mesh);
      moving.mesh.geometry.dispose();
      disposeMat(moving.mesh.material);
      moving = null;
    },

    movingDropAsDebris: function () {
      // 失误时整个移动块变碎片坠落
      if (!moving) return;
      this.dropDebris(moving.mesh.position.x, moving.mesh.position.y, moving.mesh.position.z, moving.w, moving.d, new THREE.Color(moving.colorHex).getHex());
      this.removeMoving();
    },

    getMoving: function () {
      if (!moving) return null;
      return { x: moving.mesh.position.x, z: moving.mesh.position.z, w: moving.w, d: moving.d, axis: moving.axis, prop: moving.prop, color: moving.color };
    },

    // 设置移动块位置（测试钩子 / 潜在的辅助瞄准）
    setMovingPos: function (axis, v) {
      if (!moving) return;
      if (axis === 'x') moving.mesh.position.x = v;
      else moving.mesh.position.z = v;
    },

    updateMoving: function (dt, speed, slowFactor) {
      if (!moving) return;
      const v = speed * (slowFactor || 1);
      const p = moving.mesh.position;
      let c = (moving.axis === 'x') ? p.x : p.z;
      c += moving.dir * v * dt;
      if (c > NT.MOVE_RANGE) { c = NT.MOVE_RANGE; moving.dir = -1; }
      if (c < -NT.MOVE_RANGE) { c = -NT.MOVE_RANGE; moving.dir = 1; }
      if (moving.axis === 'x') p.x = c; else p.z = c;
    },

    dropDebris: function (x, y, z, w, d, colorHex) {
      const geo = new THREE.BoxGeometry(w, BOX.h, d);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex), emissive: new THREE.Color(colorHex),
        emissiveIntensity: 0.3, transparent: true, opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      debris.push({
        mesh: mesh, vy: 0.5,
        rot: (Math.random() - 0.5) * 2, life: 1
      });
    },

    // 每帧更新（碎片/粒子/相机/主题过渡/塔呼吸）
    update: function (dt) {
      clockT += dt;

      // 碎片
      for (let i = debris.length - 1; i >= 0; i--) {
        const db = debris[i];
        db.vy += 9.8 * dt;
        db.mesh.position.y -= db.vy * dt;
        db.mesh.rotation.x += db.rot * dt;
        db.mesh.rotation.z += db.rot * dt * 0.6;
        db.life -= dt * 0.9;
        db.mesh.material.opacity = Math.max(0, db.life);
        if (db.life <= 0) {
          scene.remove(db.mesh);
          db.mesh.geometry.dispose(); db.mesh.material.dispose();
          debris.splice(i, 1);
        }
      }

      // 氛围粒子
      if (ambientPts) {
        const pos = ambientPts.geometry.attributes.position;
        for (let i = 0; i < ambientCount; i++) {
          let y = pos.getY(i) + ambientVelY * dt;
          if (y > 14) y = -1;
          if (y < -1) y = 14; // 治愈风花瓣向下飘落
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }

      // 烟花
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life -= dt;
        const pos = b.points.geometry.attributes.position;
        for (let j = 0; j < b.vels.length; j++) {
          const v = b.vels[j];
          pos.setX(j, pos.getX(j) + v.x * dt);
          pos.setY(j, pos.getY(j) + v.y * dt);
          pos.setZ(j, pos.getZ(j) + v.z * dt);
        }
        pos.needsUpdate = true;
        b.points.material.opacity = Math.max(0, b.life / b.maxLife);
        if (b.life <= 0) {
          scene.remove(b.points);
          b.points.geometry.dispose(); b.points.material.dispose();
          bursts.splice(i, 1);
        }
      }

      // 动物住户欢呼蹦跳
      for (let i = 0; i < residents.length; i++) {
        const r = residents[i];
        if (r.bounceT !== null) {
          r.bounceT += dt;
          r.sprite.position.y = r.baseY + Math.abs(Math.sin(r.bounceT * 9)) * 0.18;
          if (r.bounceT > 0.8) {
            r.sprite.position.y = r.baseY;
            r.bounceT = null;
          }
        }
      }

      // 移动块发光呼吸脉冲
      if (moving && moving.mats) {
        const amp = moving.cozy ? 0.08 : 0.22;
        const wave = Math.sin(clockT * 7) * amp;
        moving.mats.forEach(function (m, i) {
          m.emissiveIntensity = moving.glowBases[i] + wave;
        });
      }

      // 相机跟随
      focusY += (focusTargetY - focusY) * Math.min(1, dt * 3.2);
      camera.position.set(CAM_DIST, CAM_DIST + 2 + focusY, CAM_DIST);
      camera.lookAt(0, focusY + 0.5, 0);

      // 塔呼吸摆动
      const sway = Math.min(1, towerGroup.children.length / 20) * 0.004;
      towerGroup.rotation.x = Math.sin(clockT * 0.5) * sway;
      towerGroup.rotation.z = Math.cos(clockT * 0.4) * sway;
    },

    render: function () { renderer.render(scene, camera); },

    getFocusY: function () { return focusY; },
    setFocusY: function (y) { focusTargetY = y; },

    // 主题切换（instant: 重开局直接跳变；背景渐变由 UI 层过渡）
    setTheme: function (idx, instant) {
      curTheme = idx % th().length;
      if (!instant) NT.Audio.chord();
      this._makeAmbient(th()[curTheme]);
    },
    getThemeIndex: function () { return curTheme; },
    getThemeCss: function () { return th()[curTheme].css; },

    // 切换画风皮肤：清贴图缓存、重建光照氛围、重设背景
    applyStyle: function () {
      NT.clearBlockTextures();
      ambient.intensity = NT.isCozy() ? 0.95 : 0.7;
      dirLight.intensity = NT.isCozy() ? 0.7 : 1.05;
      this.setTheme(0, true);
    },

    _makeAmbient: function (th) {
      if (ambientPts) {
        scene.remove(ambientPts);
        ambientPts.geometry.dispose(); ambientPts.material.dispose();
        ambientPts = null;
      }
      ambientCount = th.particle.count;
      ambientVelY = th.particle.velY;
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(ambientCount * 3);
      for (let i = 0; i < ambientCount; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 14;
        arr[i * 3 + 1] = Math.random() * 15 - 1;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 14;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const mat = new THREE.PointsMaterial({
        color: th.particle.color, size: th.particle.size,
        transparent: true, opacity: 0.8, sizeAttenuation: true
      });
      ambientPts = new THREE.Points(geo, mat);
      scene.add(ambientPts);
    },

    // 烟花爆发（combo/里程碑庆祝）
    burst: function (y, colorHex) {
      const n = 60;
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(n * 3);
      const vels = [];
      for (let i = 0; i < n; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 0.5;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        const a = Math.random() * Math.PI * 2;
        const sp = 1.5 + Math.random() * 2.5;
        vels.push({ x: Math.cos(a) * sp, y: Math.random() * 2.5, z: Math.sin(a) * sp });
      }
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const mat = new THREE.PointsMaterial({
        color: colorHex, size: 0.09, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      bursts.push({ points: points, vels: vels, life: 1.4, maxLife: 1.4 });
    },

    // 当前画面截图（WebGL 透明背景 → 先铺主题渐变再叠加，降尺寸存相册用）
    snapshot: function () {
      this.render();
      const src = renderer.domElement;
      const c = document.createElement('canvas');
      const scale = 480 / src.width;
      c.width = 480;
      c.height = Math.round(src.height * scale);
      const g = c.getContext('2d');
      const css = this.getThemeCss();
      const grad = g.createLinearGradient(0, 0, 0, c.height);
      css.forEach(function (col, i) { grad.addColorStop(i / (css.length - 1), col); });
      g.fillStyle = grad;
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.6);
    },

    // 成绩海报：治愈风=暖底大字+主角大头（适配微信分享缩略图）；霓虹风=旧版
    poster: function (blocks, title, scoreText, subText) {
      const W = 900, H = 1200;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      const cozy = NT.isCozy();
      const themes = th();

      const grad = g.createLinearGradient(0, 0, 0, H);
      if (cozy) {
        grad.addColorStop(0, '#fff3d6'); grad.addColorStop(0.55, '#ffd9b8'); grad.addColorStop(1, '#ffb59b');
      } else {
        themes[curTheme].css.forEach(function (col, i) { grad.addColorStop(i / (themes[curTheme].css.length - 1), col); });
      }
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);

      if (cozy) {
        // 手绘感装饰：圆点、云朵、爪印
        g.fillStyle = 'rgba(255,255,255,.45)';
        for (let i = 0; i < 26; i++) {
          const x = (i * 137) % W, y = (i * 211) % H;
          g.beginPath(); g.arc(x, y, 5 + (i % 3) * 3, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,.6)';
        [[80, 250, 90, 34], [760, 520, 110, 40]].forEach(function (cl) {
          g.beginPath(); g.ellipse(cl[0], cl[1], cl[2], cl[3], 0, 0, Math.PI * 2); g.fill();
        });
      }

      // 主角大头
      if (cozy) {
        NT.drawAnimal(g, 'tangyuan', 660, 70, 210);
        NT.drawAnimal(g, 'cat', 60, 100, 150);
      }

      // 塔体（等距投影）：宽度固定基准，随每层实际宽度收窄自然成塔形
      const n = blocks.length;
      const bw = 170;
      const bh = Math.max(5, Math.min(24, (H * 0.55) / Math.max(1, n)));
      const baseX = W / 2, baseY = H * 0.88;
      const skew = bw * 0.5;
      for (let i = 0; i < n; i++) {
        const b = blocks[i];
        const y = baseY - i * bh;
        const w = bw * (b.w / NT.BOX.w);
        const col = b.color || (cozy ? '#ffd9b8' : '#8ab4ff');
        // 正面
        g.fillStyle = col;
        g.globalAlpha = cozy ? 1 : 0.9;
        g.fillRect(baseX - w / 2, y - bh, w, bh - 1);
        if (cozy) {
          g.strokeStyle = '#6b5442'; g.lineWidth = 2;
          g.strokeRect(baseX - w / 2, y - bh, w, bh - 1);
          if (i % 2 === 0 && bh > 8) { // 小窗
            g.fillStyle = '#fff3c4';
            g.fillRect(baseX - 7, y - bh + 2, 14, Math.max(4, bh - 6));
          }
        }
        // 顶面（斜切）
        g.globalAlpha = 1;
        g.fillStyle = cozy ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,0.35)';
        g.beginPath();
        g.moveTo(baseX - w / 2, y - bh);
        g.lineTo(baseX - w / 2 + skew * 0.4, y - bh - bh * 0.4);
        g.lineTo(baseX + w / 2 + skew * 0.4, y - bh - bh * 0.4);
        g.lineTo(baseX + w / 2, y - bh);
        g.closePath();
        g.fill();
      }

      // 文案
      g.textAlign = 'center';
      if (cozy) {
        g.fillStyle = '#6b5442';
        g.font = 'bold 62px sans-serif';
        g.fillText('萌宠公寓 · 叠叠塔', W / 2, 110);
        // 大字分数：奶白字 + 深棕描边，缩略图也清晰
        g.font = 'bold 190px sans-serif';
        g.lineWidth = 12; g.lineJoin = 'round';
        g.strokeStyle = '#6b5442';
        g.strokeText(scoreText, W / 2, H * 0.30);
        g.fillStyle = '#fffdf6';
        g.fillText(scoreText, W / 2, H * 0.30);
        g.fillStyle = '#6b5442';
        g.font = 'bold 38px sans-serif';
        g.fillText('分  ·  你来挑战我！', W / 2, H * 0.30 + 58);
        g.font = '28px sans-serif';
        g.fillText(subText || '', W / 2, H * 0.30 + 108);
      } else {
        g.fillStyle = '#ffffff';
        g.font = 'bold 52px sans-serif';
        g.fillText(title || 'NEON TOWER 霓虹塔', W / 2, 110);
        g.font = 'bold 120px sans-serif';
        g.shadowColor = 'rgba(255,255,255,0.6)'; g.shadowBlur = 30;
        g.fillText(scoreText, W / 2, H * 0.14);
        g.shadowBlur = 0;
        g.font = '28px sans-serif';
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.fillText(subText || '', W / 2, H * 0.14 + 52);
      }

      return c.toDataURL('image/png');
    }
  };
})(window.NT = window.NT || {});
