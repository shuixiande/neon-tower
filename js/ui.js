/* UI：面板/HUD/成就/皮肤/相册/海报 */
(function (NT) {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function fmtBest() { return NT.game.Store.best; }

  // ---------- 开始面板 ----------
  function renderSkins() {
    const ach = NT.game.Store.ach;
    const row = $('skinRow');
    row.innerHTML = '';
    NT.palettes().forEach(function (p, i) {
      const unlocked = !p.unlock || ach[p.unlock];
      const btn = document.createElement('button');
      btn.className = 'chip' + (unlocked ? '' : ' locked') + (NT.game.Store.skin === i ? ' active' : '');
      btn.textContent = unlocked ? p.name : '🔒' + p.name;
      if (unlocked) {
        btn.onclick = function (e) {
          e.stopPropagation();
          NT.game.Store.skin = i;
          renderSkins();
        };
      }
      row.appendChild(btn);
    });
  }

  function renderAch() {
    const ach = NT.game.Store.ach;
    const grid = $('achGrid');
    grid.innerHTML = '';
    NT.ACH.forEach(function (a) {
      const div = document.createElement('div');
      div.className = 'ach' + (ach[a.id] ? ' got' : '');
      div.innerHTML = '<b>' + (ach[a.id] ? '★' : '☆') + '</b> ' + a.name + '<br><span>' + a.desc + '</span>';
      grid.appendChild(div);
    });
  }

  function renderStartInfo() {
    $('bestLine').textContent = '最高分：' + fmtBest();
    const dBest = NT.game.Store.dailyBest(NT.dailySeed());
    $('dailyLine').textContent = '今日挑战最佳：' + (dBest || '未挑战');
    renderSkins();
    renderAch();
    renderDex();
  }

  // 动物图鉴（头像用 Canvas 直接生成，零素材）
  function renderDex() {
    const zoo = NT.game.Store.animals || {};
    const row = $('dexRow');
    row.innerHTML = '';
    NT.ANIMALS.forEach(function (a) {
      const got = zoo[a.id];
      const chip = document.createElement('span');
      chip.className = 'chip dex' + (got ? ' got' : ' locked');
      if (got) {
        const img = document.createElement('img');
        img.src = NT.animalDataURL(a.id, 64);
        img.alt = a.name;
        chip.appendChild(img);
        chip.appendChild(document.createTextNode(a.name));
      } else {
        chip.textContent = '🐾 ???';
      }
      row.appendChild(chip);
    });
  }

  // 画风皮肤切换（纯渲染层，玩法不动）
  function applyStyleToUI() {
    document.body.className = NT.STYLE;
    const btn = $('btnStyle');
    if (btn) btn.textContent = NT.isCozy() ? '🌙 切换霓虹夜' : '🌤 切换治愈手绘';
  }
  function switchStyle() {
    NT.setStyle(NT.isCozy() ? 'neon' : 'cozy');
    NT.Platform.storageSet('nt_style', NT.STYLE);
    NT.Scene.applyStyle();
    setBg(0);
    applyStyleToUI();
    renderStartInfo();
    toast(NT.isCozy() ? '已切换：治愈手绘 ☀️' : '已切换：霓虹夜 🌙');
  }

  // ---------- 相册 ----------
  function openAlbum() {
    const list = $('albumList');
    list.innerHTML = '';
    const album = NT.game.Store.album;
    if (!album.length) {
      list.innerHTML = '<p style="color:#9aa">还没有收藏，破纪录时会自动收录塔的全景。</p>';
    }
    album.forEach(function (item) {
      const div = document.createElement('div');
      div.className = 'albumItem';
      const img = document.createElement('img');
      img.src = item.img;
      img.onclick = function (e) {
        e.stopPropagation();
        NT.Platform.downloadImage('neon-tower-' + item.score + '.jpg', item.img);
      };
      const cap = document.createElement('p');
      cap.textContent = item.score + ' 分 · ' + item.date + '（点击保存）';
      div.appendChild(img); div.appendChild(cap);
      list.appendChild(div);
    });
    show($('albumModal'));
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 1800);
  }

  // ---------- 渐变天幕（双层交叉淡入） ----------
  let bgFront = 'A';
  function setBg(idx) {
    const themes = NT.themes();
    const t = themes[idx % themes.length];
    const grad = 'linear-gradient(180deg, ' + t.css.join(' ') + ')';
    const backEl = bgFront === 'A' ? $('bgB') : $('bgA');
    const frontEl = bgFront === 'A' ? $('bgA') : $('bgB');
    backEl.style.background = grad;
    backEl.style.opacity = 1;
    frontEl.style.opacity = 0;
    bgFront = bgFront === 'A' ? 'B' : 'A';
  }

  // ---------- 游戏事件 ----------
  NT.game.onEvent = function (type, data) {
    switch (type) {
      case 'start': {
        hide($('startPanel')); hide($('overPanel')); hide($('revivePanel'));
        $('toast').classList.remove('on');
        setBg(0);
        const names = { classic: '经典', daily: '每日挑战', perfect: '完美模式', '2p': '双人对战' };
        $('modeBadge').textContent = names[data.mode] || '';
        $('scoreHud').textContent = '0';
        $('p2hud').style.display = data.mode === '2p' ? 'flex' : 'none';
        break;
      }
      case 'score': {
        if (data.p1 !== undefined) {
          $('scoreHud').textContent = data.cur === 0 ? data.p1 : data.p2;
          $('p1v').textContent = data.p1;
          $('p2v').textContent = data.p2;
          $('turnBadge').textContent = '轮到玩家 ' + (data.cur + 1);
        } else {
          $('scoreHud').textContent = data.total;
        }
        break;
      }
      case 'perfect': {
        const pop = $('comboPop');
        pop.textContent = 'COMBO ×' + data.combo + '  +' + data.pts;
        pop.classList.remove('on');
        void pop.offsetWidth; // 重触发动画
        pop.classList.add('on');
        break;
      }
      case 'turn': break;
      case 'toast': toast(data); break;
      case 'milestone': toast('第 ' + data.layer + ' 层 · 进入「' + data.theme + '」'); setBg(data.idx); break;
      case 'resident': {
        toast(data.isNew ? '🎉 ' + data.name + ' 入住你的塔！' : data.name + ' 又来了~');
        renderDex();
        break;
      }
      case 'unlock': {
        const a = NT.ACH.find(function (x) { return x.id === data; });
        if (a) toast('🏅 成就解锁：' + a.name);
        break;
      }
      case 'reviveOffer': show($('revivePanel')); break;
      case 'over': {
        hide($('revivePanel'));
        const over = $('overPanel');
        const names = { classic: '经典模式', daily: '每日挑战', perfect: '完美模式', '2p': '双人对战' };

        if (data.winner !== null && data.winner !== undefined) {
          $('overTitle').textContent = data.winner < 0 ? '平局！' : '玩家 ' + (data.winner + 1) + ' 获胜！';
          $('overScore').textContent = data.view.p1 + ' : ' + data.view.p2;
          $('overSub').textContent = names[data.mode] || '';
        } else {
          $('overTitle').textContent = '塔倒啦~';
          $('overScore').textContent = data.view.total;
          $('overSub').textContent = (names[data.mode] || '') + ' · ' + data.layers + ' 层' +
            (data.mode === 'daily' && data.daily ? ' · 今日最佳 ' + data.daily.best : '') +
            ' · 历史最高 ' + data.best;
        }
        $('newRecord').style.display = data.isNewBest ? 'inline-block' : 'none';

        const chips = $('unlockedChips');
        chips.innerHTML = '';
        data.unlocked.forEach(function (id) {
          const a = NT.ACH.find(function (x) { return x.id === id; });
          if (a) {
            const s = document.createElement('span');
            s.className = 'chip got';
            s.textContent = '🏅 ' + a.name;
            chips.appendChild(s);
          }
        });

        const posterImg = $('posterImg');
        if (data.poster) {
          posterImg.src = data.poster;
          posterImg.style.display = 'block';
          $('btnPoster').style.display = 'inline-block';
          $('btnPoster').onclick = function (e) {
            e.stopPropagation();
            NT.Platform.downloadImage('neon-tower-poster.png', data.poster);
          };
        } else {
          posterImg.style.display = 'none';
          $('btnPoster').style.display = 'none';
        }

        renderStartInfo();
        show(over);
        break;
      }
    }
  };

  // ---------- 按钮 ----------
  function bindMode(id, mode) {
    $(id).onclick = function (e) {
      e.stopPropagation();
      NT.Audio.unlock();
      NT.game.start(mode);
    };
  }
  bindMode('btnClassic', 'classic');
  bindMode('btnDaily', 'daily');
  bindMode('btnPerfect', 'perfect');
  bindMode('btn2p', '2p');

  $('btnRestart').onclick = function (e) { e.stopPropagation(); NT.game.start(NT.game.G.mode); };
  $('btnMenu').onclick = function (e) {
    e.stopPropagation();
    hide($('overPanel'));
    renderStartInfo();
    show($('startPanel'));
  };
  $('btnRevive').onclick = function (e) { e.stopPropagation(); hide($('revivePanel')); NT.game.useRevive(); };
  $('btnNoRevive').onclick = function (e) { e.stopPropagation(); NT.game.declineRevive(); };
  $('btnAlbum').onclick = function (e) { e.stopPropagation(); openAlbum(); };
  $('albumClose').onclick = function (e) { e.stopPropagation(); hide($('albumModal')); };

  function toggleMute(e) {
    e.stopPropagation();
    const muted = NT.Audio.toggleMute();
    $('btnMute').textContent = muted ? '🔇' : '🔊';
  }
  $('btnMute').onclick = toggleMute;
  $('btnMuteHud').onclick = toggleMute;
  $('btnMute').textContent = NT.Audio.muted ? '🔇' : '🔊';
  $('btnMuteHud').textContent = NT.Audio.muted ? '🔇' : '🔊';

  $('btnStyle').onclick = function (e) { e.stopPropagation(); switchStyle(); };
  $('mascot').src = NT.animalDataURL('tangyuan', 160);
  NT.setStyle(NT.Platform.storageGet('nt_style', 'cozy'));
  applyStyleToUI();
  renderStartInfo();
  show($('startPanel'));
})(window.NT = window.NT || {});
