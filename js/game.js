/* 游戏状态机与核心逻辑：放置判定/连击/道具/主题/成就/双人/每日/完美模式/辅助保底 */
(function (NT) {
  'use strict';

  const BOX = NT.BOX, CFG_SPEED = NT.SPEED;

  const G = {
    state: 'MENU',
    mode: 'classic',            // classic | daily | perfect | 2p
    blocks: [],                 // {x,z,w,d,color}
    combo: 0,
    assistStreak: 0,
    slowUntil: 0,
    reviveAvailable: false,
    widenNext: false,
    rng: Math.random,
    scores: [0, 0],             // 2p 双人分数
    curPlayer: 0,
    eliminated: [false, false],
    unlockedThisRun: [],
    lastTime: 0
  };

  // ---------- 存档 ----------
  const Store = {
    get best() { return NT.Platform.storageGet('nt_best', 0); },
    set best(v) { NT.Platform.storageSet('nt_best', v); },
    dailyBest: function (seed) { return NT.Platform.storageGet('nt_daily_' + seed, 0); },
    setDailyBest: function (seed, v) { NT.Platform.storageSet('nt_daily_' + seed, v); },
    get ach() { return NT.Platform.storageGet('nt_ach', {}); },
    set ach(v) { NT.Platform.storageSet('nt_ach', v); },
    get animals() { return NT.Platform.storageGet('nt_animals', {}); },
    set animals(v) { NT.Platform.storageSet('nt_animals', v); },
    get skin() { return NT.Platform.storageGet('nt_skin', 0); },
    set skin(v) { NT.Platform.storageSet('nt_skin', v); },
    get album() { return NT.Platform.storageGet('nt_album', []); },
    set album(v) { NT.Platform.storageSet('nt_album', v); }
  };

  function palette() { return NT.palettes()[Store.skin] || NT.palettes()[0]; }

  function unlockAch(id) {
    const all = Store.ach;
    if (all[id]) return false;
    all[id] = Date.now();
    Store.ach = all;
    if (!G.unlockedThisRun.includes(id)) G.unlockedThisRun.push(id);
    emit('unlock', id);
    NT.Platform.vibrate([30, 40, 30]);
    return true;
  }

  function emit(type, data) { if (NT.game.onEvent) NT.game.onEvent(type, data); }

  function layerThemeIdx(layer) { return Math.floor(layer / 10) % NT.themes().length; }

  // ---------- 开局 ----------
  function start(mode) {
    G.mode = mode || 'classic';
    G.state = 'PLAY';
    G.blocks = [];
    G.combo = 0;
    G.assistStreak = 0;
    G.slowUntil = 0;
    G.reviveAvailable = false;
    G.widenNext = false;
    G.scores = [0, 0];
    G.curPlayer = 0;
    G.eliminated = [false, false];
    G.unlockedThisRun = [];
    G.rng = (G.mode === 'daily') ? NT.makeRng(NT.dailySeed() * 7919) : Math.random;

    NT.Scene.reset();
    NT.Scene.addTowerBlock(0, 0, 0, BOX.w, BOX.d, 0xe8ecff, false);
    G.blocks.push({ x: 0, z: 0, w: BOX.w, d: BOX.d, color: '#e8ecff' });
    NT.Scene.setTheme(0, true);

    emit('start', { mode: G.mode });
    spawn();
  }

  // ---------- 生成移动块 ----------
  function spawn() {
    const prev = G.blocks[G.blocks.length - 1];
    const layer = G.blocks.length;
    const axis = (layer % 2 === 1) ? 'x' : 'z';

    let w = prev.w, d = prev.d;
    // 道具：加宽（下一块恢复）
    if (G.widenNext) {
      G.widenNext = false;
      if (axis === 'x') w = Math.min(prev.w * 1.25, BOX.w);
      else d = Math.min(prev.d * 1.25, BOX.d);
      emit('toast', '加宽层生效！');
    }
    // 动态难度保底：连续大失误后悄悄加宽
    if (G.assistStreak >= NT.ASSIST.streak) {
      if (axis === 'x') w = Math.min(w + NT.ASSIST.widthBonus, BOX.w);
      else d = Math.min(d + NT.ASSIST.widthBonus, BOX.d);
    }

    // 特殊层（每7层）
    let prop = null;
    if (layer > 0 && layer % 7 === 0) {
      const roll = G.rng() * 100;
      let acc = 0;
      for (const p of NT.PROPS) {
        acc += p.weight;
        if (roll < acc) { prop = p.id; break; }
      }
      emit('toast', '特殊层：' + NT.PROPS.find(function (p) { return p.id === prop; }).name);
      NT.Audio.prop();
    }

    const color = NT.Scene.colorFor(layer, layerThemeIdx(layer), palette());
    const startPos = axis === 'x'
      ? { x: prev.x, z: prev.z }
      : { x: prev.x, z: prev.z };
    NT.Scene.spawnMoving(layer, startPos.x, startPos.z, w, d, color, axis, prop);
    emit('spawn', { layer: layer, prop: prop });
  }

  function speedNow() {
    let s = Math.min(CFG_SPEED.base + G.blocks.length * CFG_SPEED.inc, CFG_SPEED.max);
    if (G.assistStreak >= NT.ASSIST.streak) s *= NT.ASSIST.speedFactor;
    return s;
  }

  // ---------- 放置判定 ----------
  function place() {
    if (G.state !== 'PLAY') return;
    const m = NT.Scene.getMoving();
    if (!m) return;
    const prev = G.blocks[G.blocks.length - 1];
    const axis = m.axis;

    // 沿活动轴求重叠区间
    const curMin = (axis === 'x' ? m.x - m.w / 2 : m.z - m.d / 2);
    const curMax = (axis === 'x' ? m.x + m.w / 2 : m.z + m.d / 2);
    const prevMin = (axis === 'x' ? prev.x - prev.w / 2 : prev.z - prev.d / 2);
    const prevMax = (axis === 'x' ? prev.x + prev.w / 2 : prev.z + prev.d / 2);
    const ovStart = Math.max(curMin, prevMin);
    const ovEnd = Math.min(curMax, prevMax);
    const overlap = ovEnd - ovStart;
    const curLen = curMax - curMin;

    if (overlap <= 0) { miss(); return; }

    // 完美判定（阈值随尺寸自适应）
    const curCenter = (curMin + curMax) / 2;
    const prevCenter = (prevMin + prevMax) / 2;
    const perfectT = Math.max(NT.PERFECT_MIN, curLen * NT.PERFECT_RATIO);
    const perfect = Math.abs(curCenter - prevCenter) <= perfectT;

    // 完美模式：非完美即失败
    if (G.mode === 'perfect' && !perfect) { miss(); return; }

    const movingY = NT.Scene.layerY(G.blocks.length);
    let nb = { w: prev.w, d: prev.d, x: prev.x, z: prev.z };
    let pts = 0;

    if (perfect) {
      G.combo++;
      pts = 2 * Math.min(G.combo, 10);
      NT.Audio.perfect(G.combo - 1);
      NT.Platform.vibrate(15);
      unlockAch('perfect_first');
      if (G.combo >= 3) NT.Scene.cheer(); // 住户欢呼
      if (G.combo >= 5) {
        unlockAch('combo_5');
        NT.Scene.burst(movingY, 0xffffff);
        NT.Platform.vibrate([20, 30, 20]);
      }
      if (G.combo >= 10) unlockAch('combo_10');
      emit('perfect', { combo: G.combo, pts: pts });
    } else {
      G.combo = 0;
      pts = 1;
      NT.Audio.place();
      NT.Platform.vibrate(8);

      // 裁剪
      const newLen = overlap;
      const newCenter = (ovStart + ovEnd) / 2;
      nb = { x: prev.x, z: prev.z, w: prev.w, d: prev.d };
      if (axis === 'x') { nb.w = newLen; nb.x = newCenter; }
      else { nb.d = newLen; nb.z = newCenter; }

      // 掉落碎片（裁掉的部分）
      let dStart = null, dEnd = null;
      if (curMin < prevMin) { dStart = curMin; dEnd = prevMin; }
      if (curMax > prevMax) { dStart = prevMax; dEnd = curMax; }
      if (dStart !== null) {
        const dCenter = (dStart + dEnd) / 2;
        const dLen = dEnd - dStart;
        const dx = axis === 'x' ? dCenter : prev.x;
        const dz = axis === 'z' ? dCenter : prev.z;
        const dw = axis === 'x' ? dLen : m.w;
        const dd = axis === 'z' ? dLen : m.d;
        NT.Scene.dropDebris(dx, movingY, dz, dw, dd, rgbToHex(m.color));
      }

      // 动态难度保底计数
      const loss = 1 - overlap / curLen;
      G.assistStreak = loss > NT.ASSIST.lossRatio ? G.assistStreak + 1 : 0;
    }

    // 特殊层效果
    if (m.prop === 'gold') pts += 10;
    if (m.prop === 'widen') G.widenNext = true;
    if (m.prop === 'slow') G.slowUntil = Date.now() + 3000;
    if (m.prop === 'revive') {
      if (!G.reviveAvailable) { G.reviveAvailable = true; emit('toast', '已获得复活机会'); }
    }

    // 固化新块
    const colorStr = m.color;
    NT.Scene.addTowerBlock(G.blocks.length, nb.x, nb.z, nb.w, nb.d, rgbToHex(colorStr), G.blocks.length % 10 === 0);
    G.blocks.push({ x: nb.x, z: nb.z, w: nb.w, d: nb.d, color: colorStr });
    NT.Scene.removeMoving();

    // 计分
    if (G.mode === '2p') G.scores[G.curPlayer] += pts;
    else G._soloScore = (G._soloScore || 0) + pts;
    emit('score', getScoreView());

    // 里程碑：主题切换 + 动物入住 + 庆祝
    const cnt = G.blocks.length;
    if (cnt % 10 === 0) {
      const ti = layerThemeIdx(cnt);
      NT.Scene.setTheme(ti, false);
      NT.Scene.burst(NT.Scene.layerY(cnt), 0xffd700);
      // 动物住户按里程碑顺序入住
      const mi = cnt / 10 - 1;
      const animal = NT.ANIMALS[mi % NT.ANIMALS.length];
      NT.Scene.addResident(cnt - 1, nb.x, nb.z, nb.w, nb.d, animal.id);
      const zoo = Store.animals;
      const isNewAnimal = !zoo[animal.id];
      if (isNewAnimal) {
        zoo[animal.id] = true;
        Store.animals = zoo;
        if (NT.ANIMALS.every(function (a) { return zoo[a.id]; })) unlockAch('animal_all');
      }
      emit('milestone', { layer: cnt, theme: NT.themes()[ti].name, idx: ti });
      emit('resident', { name: animal.name, isNew: isNewAnimal, layer: cnt });
      if (cnt >= 41) unlockAch('themes_all');
    }
    if (cnt >= 30) unlockAch('layer_30');
    if (cnt >= 50) unlockAch('layer_50');
    if (G.mode === 'perfect' && cnt >= 20) unlockAch('pmode_20');

    // 分数成就
    const sc = getScoreView().total;
    if (sc >= 100) unlockAch('score_100');
    if (sc >= 500) unlockAch('score_500');

    NT.Scene.setFocusY(cnt * BOX.h);
    spawn();
  }

  function rgbToHex(colorStr) {
    // hsl() 字符串 → 经 canvas 转换为 hex
    const cv = rgbToHex._c || (rgbToHex._c = document.createElement('canvas'));
    cv.getContext('2d').fillStyle = colorStr;
    return cv.getContext('2d').fillStyle;
  }

  function getScoreView() {
    if (G.mode === '2p') {
      return { p1: G.scores[0], p2: G.scores[1], cur: G.curPlayer, total: G.scores[0] + G.scores[1] };
    }
    return { total: G._soloScore || 0 };
  }

  // ---------- 失误 ----------
  function miss() {
    NT.Audio.miss();
    NT.Platform.vibrate([60, 40, 60]);
    NT.Scene.movingDropAsDebris();

    if (G.mode === '2p') {
      G.eliminated[G.curPlayer] = true;
      const other = 1 - G.curPlayer;
      if (!G.eliminated[other]) {
        G.curPlayer = other;
        emit('turn', getScoreView());
        emit('toast', '轮到玩家 ' + (other + 1) + '！');
        spawn();
        return;
      }
    }
    if (G.mode !== '2p') G._soloScore = G._soloScore || 0;

    if (G.reviveAvailable) {
      G.state = 'REVIVE';
      emit('reviveOffer', null);
      return;
    }
    gameOver();
  }

  function useRevive() {
    if (G.state !== 'REVIVE') return;
    G.reviveAvailable = false;
    unlockAch('revive_used');
    G.state = 'PLAY';
    emit('toast', '复活！');
    spawn();
  }

  function declineRevive() {
    if (G.state !== 'REVIVE') return;
    gameOver();
  }

  function gameOver() {
    G.state = 'OVER';
    if (G.mode === 'daily') unlockAch('daily_done');

    const view = getScoreView();
    let isNewBest = false, winner = null, dailyInfo = null;

    if (G.mode === '2p') {
      winner = G.scores[0] === G.scores[1] ? -1 : (G.scores[0] > G.scores[1] ? 0 : 1);
      if (winner >= 0) unlockAch('tower_2p_win');
    } else if (G.mode === 'daily') {
      const seed = NT.dailySeed();
      const old = Store.dailyBest(seed);
      if (view.total > old) { Store.setDailyBest(seed, view.total); isNewBest = old === 0 ? false : true; }
      dailyInfo = { seed: seed, best: Store.dailyBest(seed) };
    } else {
      if (view.total > Store.best) { Store.best = view.total; isNewBest = true; }
    }

    // 相册：破纪录自动收藏
    let albumImg = null;
    if (isNewBest) {
      try {
        albumImg = NT.Scene.snapshot();
        const album = Store.album;
        album.unshift({ date: new Date().toLocaleDateString('zh-CN'), score: view.total, img: albumImg });
        Store.album = album.slice(0, 3); // 只保留最近3张，防止超存储
      } catch (e) { albumImg = null; }
    }

    // 成绩海报
    let poster = null;
    try {
      const modeName = { classic: '经典模式', daily: '每日挑战', perfect: '完美模式', '2p': '双人对战' }[G.mode];
      poster = NT.Scene.poster(G.blocks, 'NEON TOWER 霓虹塔', String(view.total),
        modeName + ' · ' + G.blocks.length + ' 层 · ' + new Date().toLocaleDateString('zh-CN'));
    } catch (e) { poster = null; }

    emit('over', {
      view: view, winner: winner, isNewBest: isNewBest,
      best: Store.best, daily: dailyInfo,
      unlocked: G.unlockedThisRun.slice(),
      albumImg: albumImg, poster: poster,
      layers: G.blocks.length
    });
  }

  // ---------- 每帧 ----------
  function update(dt) {
    if (G.state === 'PLAY') {
      const now = Date.now();
      const slow = now < G.slowUntil ? 0.5 : 1;
      if (now < G.slowUntil && !(G._slowShown)) { G._slowShown = true; emit('toast', '慢速 3 秒'); }
      if (now >= G.slowUntil) G._slowShown = false;
      NT.Scene.updateMoving(dt, speedNow(), slow);
    }
  }

  NT.game = {
    G: G,
    Store: Store,
    onEvent: null,
    start: start,
    place: place,
    update: update,
    useRevive: useRevive,
    declineRevive: declineRevive,
    palette: palette,
    unlockAch: unlockAch,
    layerThemeIdx: layerThemeIdx,
    getScoreView: getScoreView
  };

  // 开局重置 solo 分数
  const _start = start;
  NT.game.start = function (mode) {
    G._soloScore = 0;
    G._slowShown = false;
    _start(mode);
  };
})(window.NT = window.NT || {});
