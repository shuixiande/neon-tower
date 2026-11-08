/* 画风切换回归：neon 皮肤可玩 + 选择持久化 */
const { chromium } = require('C:/Users/shuix/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
const URL = 'http://127.0.0.1:8125/index.html';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/shuix/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
  });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => ({ style: NT.STYLE, cls: document.body.className }));

  await page.click('#btnStyle');
  await page.waitForTimeout(200);
  const afterSwitch = await page.evaluate(() => ({ style: NT.STYLE, cls: document.body.className, saved: localStorage.getItem('nt_style') }));

  await page.click('#btnClassic');
  await page.waitForTimeout(300);
  const play = await page.evaluate(() => {
    for (let i = 0; i < 12; i++) {
      const m = NT.Scene.getMoving();
      const prev = NT.game.G.blocks[NT.game.G.blocks.length - 1];
      NT.Scene.setMovingPos(m.axis, (m.axis === 'x' ? prev.x : prev.z));
      NT.game.place();
    }
    return { state: NT.game.G.state, blocks: NT.game.G.blocks.length };
  });

  // 失误 → 结束（含海报生成）
  await page.evaluate(() => {
    const m = NT.Scene.getMoving();
    const prev = NT.game.G.blocks[NT.game.G.blocks.length - 1];
    NT.Scene.setMovingPos(m.axis, (m.axis === 'x' ? prev.x : prev.z) + 5);
    NT.game.place();
    let guard = 0;
    while (NT.game.G.state === 'REVIVE' && guard++ < 3) NT.game.declineRevive();
  });
  await page.waitForTimeout(300);
  const over = await page.evaluate(() => ({
    state: NT.game.G.state,
    posterVisible: document.getElementById('posterImg').style.display === 'block'
  }));

  // 刷新验证持久化
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const reloaded = await page.evaluate(() => ({ style: NT.STYLE, cls: document.body.className }));

  console.log(JSON.stringify({ before, afterSwitch, play, over, reloaded, errors }, null, 1));
  await browser.close();
})();
