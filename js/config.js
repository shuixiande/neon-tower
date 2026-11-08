/* 萌宠公寓 - 配置与数据表（画风：治愈手绘 / 霓虹 两套皮肤） */
(function (NT) {
  'use strict';

  NT.BOX = { w: 3, d: 3, h: 0.45 };          // 方块尺寸（世界单位）
  NT.SPEED = { base: 2.6, inc: 0.12, max: 9.0 }; // 移动速度曲线（继承原版思路）
  NT.MOVE_RANGE = 3.6;                        // 往返行程半径
  NT.PERFECT_RATIO = 0.05;                    // 精准阈值 = 尺寸*5%（随块变小自适应）
  NT.PERFECT_MIN = 0.04;

  // 动态难度保底（隐形辅助）
  NT.ASSIST = { streak: 3, lossRatio: 0.2, speedFactor: 0.85, widthBonus: 0.3 };

  // ===== 画风皮肤 =====
  // cozy：治愈手绘（默认，微信小游戏主视觉）；neon：初版霓虹赛博
  NT.COZY_THEMES = [
    { name: '晨光奶油', hue: 32, sat: 62, lit: 80,
      css: ['#fff7ec', '#ffe9d5', '#ffd2bd'],
      particle: { color: 0xffc7a1, velY: -0.35, size: 0.075, count: 90 } },
    { name: '薄荷午后', hue: 152, sat: 45, lit: 78,
      css: ['#f2fcf5', '#dcf5e7', '#bfe8d9'],
      particle: { color: 0x9fe0bd, velY: -0.28, size: 0.07, count: 80 } },
    { name: '蜜桃黄昏', hue: 14, sat: 72, lit: 82,
      css: ['#fff2e9', '#ffdcc9', '#ffc0ae'],
      particle: { color: 0xffb49c, velY: -0.4, size: 0.08, count: 95 } },
    { name: '薰衣草夜', hue: 268, sat: 48, lit: 82,
      css: ['#f6f1ff', '#e6ddf8', '#cdc0ec'],
      particle: { color: 0xc9b4f0, velY: -0.22, size: 0.07, count: 110 } },
    { name: '晴空乐园', hue: 198, sat: 62, lit: 82,
      css: ['#eff9ff', '#d8eeff', '#b9e0ff'],
      particle: { color: 0xffffff, velY: -0.3, size: 0.085, count: 100 } }
  ];

  NT.NEON_THEMES = [
    { name: '霓虹夜', hue: 285, sat: 78, lit: 60,
      css: ['#0b0b1e', '#1c1740', '#43318a'],
      particle: { color: 0x9d8cff, velY: 0.25, size: 0.05, count: 140 } },
    { name: '深海', hue: 190, sat: 75, lit: 55,
      css: ['#03141f', '#07354c', '#0d6a8f'],
      particle: { color: 0x6fd6ff, velY: 0.45, size: 0.06, count: 120 } },
    { name: '星空', hue: 250, sat: 70, lit: 62,
      css: ['#06060f', '#191243', '#33206e'],
      particle: { color: 0xffffff, velY: 0.08, size: 0.05, count: 220 } },
    { name: '熔岩', hue: 18, sat: 85, lit: 55,
      css: ['#130303', '#420d0d', '#7d2110'],
      particle: { color: 0xff8a3c, velY: 0.6, size: 0.05, count: 150 } },
    { name: '极光', hue: 160, sat: 70, lit: 58,
      css: ['#02120f', '#074034', '#0e7a5c'],
      particle: { color: 0x7dffc8, velY: 0.3, size: 0.06, count: 160 } }
  ];

  NT.STYLE = 'cozy';                 // 'cozy' | 'neon'
  NT.isCozy = function () { return NT.STYLE === 'cozy'; };
  NT.themes = function () { return NT.isCozy() ? NT.COZY_THEMES : NT.NEON_THEMES; };
  NT.setStyle = function (id) { NT.STYLE = (id === 'neon') ? 'neon' : 'cozy'; return NT.STYLE; };

  // ===== 塔身色板（收集解锁） =====
  NT.COZY_PALETTES = [
    { id: 'neon',  name: '奶油',  unlock: null,          sat: 66, lit: 76, hueStep: 11 },
    { id: 'sunset',name: '蜜桃',  unlock: 'combo_5',     sat: 72, lit: 74, hueStep: 8,  hueBase: 12 },
    { id: 'ice',   name: '薄荷',  unlock: 'layer_30',    sat: 56, lit: 78, hueStep: 6,  hueBase: 160 },
    { id: 'gold',  name: '杏黄',  unlock: 'score_100',   sat: 70, lit: 74, hueStep: 5,  hueBase: 40 }
  ];
  NT.NEON_PALETTES = [
    { id: 'neon',  name: '霓虹',  unlock: null,          sat: 90, lit: 64, hueStep: 14 },
    { id: 'sunset',name: '落日',  unlock: 'combo_5',     sat: 95, lit: 62, hueStep: 10, hueBase: 10 },
    { id: 'ice',   name: '冰晶',  unlock: 'layer_30',    sat: 85, lit: 72, hueStep: 6,  hueBase: 185 },
    { id: 'gold',  name: '鎏金',  unlock: 'score_100',   sat: 90, lit: 64, hueStep: 4,  hueBase: 42 }
  ];
  NT.palettes = function () { return NT.isCozy() ? NT.COZY_PALETTES : NT.NEON_PALETTES; };

  // 手绘色（描边/文字）
  NT.INK = '#6b5442';

  // 特殊层（每7层随机一种）
  NT.PROPS = [
    { id: 'gold',   name: '金币层', color: 0xffc93c, weight: 30, desc: '额外 +10 分' },
    { id: 'widen',  name: '加宽层', color: 0x7fd8a4, weight: 25, desc: '下一块加宽' },
    { id: 'slow',   name: '慢速层', color: 0x8ec5ff, weight: 25, desc: '3 秒减速' },
    { id: 'revive', name: '复活层', color: 0xff9ec4, weight: 20, desc: '获得一次复活' }
  ];

  // 动物住户（里程碑层入住，按顺序解锁；汤圆=塔顶守护者）
  NT.ANIMALS = [
    { id: 'cat',      name: '猫咪' },
    { id: 'shiba',    name: '柴犬' },
    { id: 'panda',    name: '熊猫' },
    { id: 'rabbit',   name: '兔子' },
    { id: 'tangyuan', name: '汤圆' }
  ];

  // 成就表
  NT.ACH = [
    { id: 'perfect_first', name: '初次完美',  desc: '完成一次完美放置' },
    { id: 'combo_5',       name: '五连击',    desc: '达成 5 连击' },
    { id: 'combo_10',      name: '十连击',    desc: '达成 10 连击' },
    { id: 'layer_30',      name: '三十层塔',  desc: '单局达到 30 层' },
    { id: 'layer_50',      name: '摩天之塔',  desc: '单局达到 50 层' },
    { id: 'score_100',     name: '百分先生',  desc: '单局得分 100' },
    { id: 'score_500',     name: '塔神',      desc: '单局得分 500' },
    { id: 'themes_all',    name: '周游列境',  desc: '单局解锁全部主题' },
    { id: 'revive_used',   name: '向死而生',  desc: '使用一次复活' },
    { id: 'daily_done',    name: '每日打卡',  desc: '完成一次每日挑战' },
    { id: 'pmode_20',      name: '完美主义',  desc: '完美模式达到 20 层' },
    { id: 'tower_2p_win',  name: '双塔奇兵',  desc: '双人模式获胜一次' },
    { id: 'animal_all',    name: '动物公寓',  desc: '集齐全部动物住户' }
  ];

  // 每日挑战种子
  NT.dailySeed = function () {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  };

  // 可播种 RNG（mulberry32）
  NT.makeRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
})(window.NT = window.NT || {});
