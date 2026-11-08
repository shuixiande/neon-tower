/* WebAudio 合成音效 + 音画联动（无外部音频文件） */
(function (NT) {
  'use strict';

  // 五声音阶（宫商角徵羽），连击时沿音阶爬升形成旋律
  const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

  let ctx = null, master = null;
  let muted = NT.Platform.storageGet('nt_muted', false);

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
    return true;
  }

  function tone(freq, dur, type, vol, when) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  NT.Audio = {
    get muted() { return muted; },
    toggleMute: function () {
      muted = !muted;
      NT.Platform.storageSet('nt_muted', muted);
      return muted;
    },
    unlock: ensure, // 首次交互时初始化（移动端自动播放策略）

    // 普通放置：低沉“嗒”
    place: function () { tone(130, 0.09, 'triangle', 0.3); },

    // 完美放置：沿五声音阶爬升 → 连击成旋律
    perfect: function (comboIndex) {
      const f = SCALE[Math.min(comboIndex, SCALE.length - 1)];
      tone(f, 0.16, 'sine', 0.3);
      tone(f * 2, 0.1, 'sine', 0.12, 0.03);
    },

    // 失误：下行滑音
    miss: function () { tone(220, 0.5, 'sawtooth', 0.2); tone(110, 0.7, 'sawtooth', 0.15, 0.08); },

    // 里程碑/主题切换：三音和弦
    chord: function () {
      tone(329.63, 0.5, 'sine', 0.18);
      tone(392.0, 0.5, 'sine', 0.18, 0.05);
      tone(523.25, 0.7, 'sine', 0.18, 0.1);
    },

    // 特殊层提示音
    prop: function () { tone(660, 0.12, 'square', 0.12); tone(880, 0.12, 'square', 0.12, 0.1); }
  };
})(window.NT = window.NT || {});
