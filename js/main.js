/* 入口：主循环 */
(function (NT) {
  'use strict';

  const canvas = document.getElementById('c');
  NT.Scene.init(canvas);
  NT.Scene.applyStyle();        // 恢复画风 + 菜单飘落花瓣/星尘

  let lastTime = performance.now();

  function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // 秒，限制最大帧间隔
    lastTime = timestamp;

    NT.game.update(dt);
    NT.Scene.update(dt);
    NT.Scene.render();
    requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) lastTime = performance.now();
  });

  // 输入：指针/键盘 → 放置；首次交互解锁音频
  function handleInput(e) {
    NT.Audio.unlock();
    if (e && e.type === 'keydown' && e.code !== 'Space') return;
    if (e && e.type === 'keydown') e.preventDefault();
    if (NT.game.G.state === 'PLAY') NT.game.place();
  }
  window.addEventListener('pointerdown', handleInput);
  window.addEventListener('keydown', handleInput);

  requestAnimationFrame(loop);
})(window.NT = window.NT || {});
