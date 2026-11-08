/* 画风样张：开始面板 / 22层游戏画面 / 结束海报 */
const { chromium } = require('C:/Users/shuix/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');
const URL = 'http://127.0.0.1:8125/index.html';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/shuix/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  await page.screenshot({ path: 'shot-cozy-start.png' });

  await page.evaluate(() => {
    NT.game.start('classic');
    for (let i = 0; i < 22; i++) {
      const m = NT.Scene.getMoving();
      const prev = NT.game.G.blocks[NT.game.G.blocks.length - 1];
      NT.Scene.setMovingPos(m.axis, (m.axis === 'x' ? prev.x : prev.z));
      NT.game.place();
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shot-cozy-play.png' });

  await page.evaluate(() => {
    const m = NT.Scene.getMoving();
    const prev = NT.game.G.blocks[NT.game.G.blocks.length - 1];
    NT.Scene.setMovingPos(m.axis, (m.axis === 'x' ? prev.x : prev.z) + 5);
    NT.game.place();
    let guard = 0;
    while (NT.game.G.state === 'REVIVE' && guard++ < 3) NT.game.declineRevive();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shot-cozy-poster.png', fullPage: false });
  console.log('ERRORS:', errors.length ? errors.join(' | ') : 'NONE');
  await browser.close();
})();
