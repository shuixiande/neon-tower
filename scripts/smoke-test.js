/* 冒烟测试：页面加载/核心循环/放置判定 */
const { chromium } = require('C:/Users/shuix/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/shuix/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://127.0.0.1:8125/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // 面板与关键元素存在性
  const checks = await page.evaluate(() => ({
    three: typeof THREE !== 'undefined',
    scene: !!(window.NT && NT.Scene),
    game: !!(window.NT && NT.game),
    startPanelVisible: !document.getElementById('startPanel').classList.contains('hidden'),
    achCount: document.querySelectorAll('#achGrid .ach').length,
    skinCount: document.querySelectorAll('#skinRow .chip').length
  }));
  console.log('CHECKS:', JSON.stringify(checks));

  // 开始经典模式
  await page.click('#btnClassic');
  await page.waitForTimeout(800);
  const state1 = await page.evaluate(() => ({
    state: NT.game.G.state,
    blocks: NT.game.G.blocks.length
  }));
  console.log('AFTER START:', JSON.stringify(state1));

  // 模拟放置：对齐后再放置，覆盖 完美/裁剪/里程碑/失误 分支
  const sim = await page.evaluate(() => {
    const r = { placed: 0, perfects: 0, milestones: 0, over: false, finalState: '' };
    const orig = NT.game.onEvent;
    NT.game.onEvent = function (t, d) {
      if (orig) orig(t, d);
      if (t === 'perfect') r.perfects++;
      if (t === 'milestone') r.milestones++;
      if (t === 'over') r.over = true;
    };
    for (let i = 0; i < 42; i++) {
      if (NT.game.G.state !== 'PLAY') { r.finalState = NT.game.G.state; break; }
      const m = NT.Scene.getMoving();
      if (m) {
        const prev = NT.game.G.blocks[NT.game.G.blocks.length - 1];
        // i%3===0 偏移0.35(裁剪)；i%3===1 完美；i%41 偏移5(失误→结束)
        const off = (i === 41) ? 5 : (i % 3 === 0 ? 0.35 : 0);
        NT.Scene.setMovingPos(m.axis, (m.axis === 'x' ? prev.x : prev.z) + off);
      }
      NT.game.place();
      r.placed++;
    }
    r.finalState = NT.game.G.state;
    r.blocks = NT.game.G.blocks.length;
    return r;
  });
  console.log('SIM:', JSON.stringify(sim));

  await page.waitForTimeout(500);
  const state2 = await page.evaluate(() => ({
    state: NT.game.G.state,
    reviveVisible: !document.getElementById('revivePanel').classList.contains('hidden')
  }));
  console.log('AFTER SIM:', JSON.stringify(state2));
  await page.screenshot({ path: 'shot-revive.png' });

  // 复活流程（若本局收集到了复活层则走复活→再失误；否则直接已结束）
  const reviveFlow = await page.evaluate(() => {
    const r = { revivedOk: null };
    if (NT.game.G.state === 'REVIVE') {
      NT.game.useRevive();
      r.revivedOk = NT.game.G.state === 'PLAY';
      const m = NT.Scene.getMoving();
      const prev = NT.game.G.blocks[NT.game.G.blocks.length - 1];
      NT.Scene.setMovingPos(m.axis, (m.axis === 'x' ? prev.x : prev.z) + 5);
      NT.game.place();
    }
    let guard = 0;
    while (NT.game.G.state === 'REVIVE' && guard++ < 3) NT.game.declineRevive();
    r.finalState = NT.game.G.state;
    r.blocks = NT.game.G.blocks.length;
    r.overVisible = !document.getElementById('overPanel').classList.contains('hidden');
    r.best = NT.game.Store.best;
    r.scoreText = document.getElementById('overScore').textContent;
    r.animals = Object.keys(NT.game.Store.animals || {});
    return r;
  });
  console.log('REVIVE FLOW:', JSON.stringify(reviveFlow));
  await page.screenshot({ path: 'shot-over.png' });

  // 重开验证再来一局
  await page.click('#btnRestart');
  await page.waitForTimeout(600);
  const state3 = await page.evaluate(() => ({ state: NT.game.G.state, blocks: NT.game.G.blocks.length }));
  console.log('AFTER RESTART:', JSON.stringify(state3));
  await page.screenshot({ path: 'shot-play.png' });

  console.log('CONSOLE_ERRORS:', errors.length ? JSON.stringify(errors, null, 1) : 'NONE');
  await browser.close();
})();
