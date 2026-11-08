# 萌宠公寓 · 叠叠塔（PET TOWER）

2D 原版（`../游戏代码.html`）的 3D 重制版。**核心叠塔玩法不变**，画风主视觉为「方案 A：萌宠公寓 · 治愈手绘」，并保留初版霓虹赛博作为可切换皮肤。Web 单页 + 微信小游戏**双端共用同一套玩法内核**。

## 画风（本次改造重点）
- 方块不再是砖：每层是一层**手绘公寓楼层**（窗户、窗帘、屋檐、花盆、晒衣绳、爪印、纸纹噪点），六面材质中顶/底为奶油屋顶
- 深棕手绘描边、粉彩配色、纸纹天幕、向下飘落的花瓣/泡泡
- **主角汤圆**（雪白圆球+小叶+星星）作为开场形象；猫咪/柴犬/熊猫/兔子/汤圆按里程碑入住塔角，带图鉴
- 成绩海报改为**高饱和暖底 + 大字分数 + 主角大头**，微信聊天缩略图一眼可辨
- 开局面板可切换「治愈手绘 / 霓虹夜」两套皮肤，选择持久化保存（玩法代码完全不动）

## 玩法系统（15 项）
| 系统 | 说明 |
|---|---|
| 核心叠塔 | 方块沿 X/Z 轴交替往返，重叠保留、错开坠落；精准阈值随尺寸自适应（5%） |
| Combo 连击 | 完美连击倍分（2×combo，上限10倍），≥3 住户欢呼，≥5 烟花庆祝 |
| 特殊层（每7层） | 🟡金币+10 / 🟢加宽 / 🔵慢速3秒 / 💗复活 |
| 里程碑（每10层） | 五主题循环 + 动物入住 + 烟花；治愈/霓虹各一套主题色 |
| 音画联动 | 完美放置沿五声音阶爬升（WebAudio 合成，无音频文件） |
| 动态难度保底 | 连续 3 次大失误自动降速+加宽（隐形辅助） |
| 震动反馈 | 放置/完美/失误/成就差异化震动（Web: navigator.vibrate / wx: vibrateShort） |
| 每日挑战 | 固定种子，全玩家同局；记录今日最佳 |
| 完美模式 | 只有 Perfect 才能继续 |
| 双人对战 | 同一塔轮流放置，失误淘汰，比分数 |
| 成就+配色 | 13 项成就，4 款塔身配色按成就解锁 |
| 我的塔相册 | 破纪录自动收藏塔全景（最近3张，Web 可保存） |
| 成绩海报 | Web 一键下载 PNG；小游戏端走微信分享卡片 |
| 塔的生命感 | 里程碑亮窗、塔身呼吸摆动 |
| 画风皮肤 | 治愈手绘 / 霓虹夜 双套视觉切换 |

## 双端架构
```
                  ┌─ Web 入口  index.html + js/platform.js + js/ui.js + js/main.js
共享内核 js/ ─────┤
(config/audio/animals/textures/scene/game)
                  └─ 小游戏入口 game.js + js/platform-wx.js + js/ui-wx.js
```
小游戏无 DOM：UI 全部由 Canvas 2D 绘制（`ui-wx.js`），上屏 canvas 2D 合成「渐变天幕 + WebGL 画面 + UI」，WebGL 渲染在离屏 canvas。`window/document/AudioContext` 由入口 shim 提供，内核模块原样复用。

## 立即游玩（Web 版）
直接双击 `index.html`（需联网加载 three CDN），或：
```
python -m http.server 8125
# 打开 http://localhost:8125
```

## 部署到 neon.aitesn.top
1. 推 GitHub → Vercel 导入项目（纯静态，无需构建）
2. Cloudflare DNS 加 CNAME：`neon` → `cname.vercel-dns.com`
3. Vercel 项目 Settings → Domains 添加 `neon.aitesn.top`

## 微信小游戏运行步骤
1. 用**微信开发者工具**导入本目录（项目类型：小游戏；`project.config.json` 已配 `compileType: game`，AppID 先为 `touristappid`）
2. 终端执行 `npm install`（依赖 `threejs-miniprogram@^0.0.8`，对应 three r108）
3. 开发者工具菜单「工具 → 构建 npm」
4. 编译预览 → 真机预览（AppID 注册前可用测试号）
5. 后续上线：注册小游戏 AppID（类目选休闲游戏）→ 替换 `project.config.json` 里的 appid → 提审

> 官方适配包用法：`const { createScopedThreejs } = require('threejs-miniprogram'); global.THREE = createScopedThreejs(glCanvas)`（THREE 不在全局，需注入）。

## 验证状态（如实记录）
| 项目 | 状态 |
|---|---|
| Web 端全流程（42 层 / 27 完美 / 4 次主题切换 / 复活 / 重开） | ✅ Playwright + Chromium 实测，控制台零错误 |
| 画风样张（开始面板 / 22 层塔 / 成绩海报） | ✅ `scripts/shot-cozy.js` 生成并目视确认 |
| 小游戏端模块加载、事件协议、按钮命中、分享、复活、画风切换 | ✅ `scripts/smoke-wx.js` Node mock wx 实测全绿 |
| 全部 JS 语法检查 | ✅ `node --check` 全量通过 |
| **微信开发者工具编译 / 真机运行 / 性能** | ⚠️ **未验证**——本机无 AppID 与开发者工具，需在工具里构建 npm 后实测 |
| threejs-miniprogram(r108) 与 CanvasTexture / 六面材质数组的兼容性 | ⚠️ 未真机验证（Web 端用 r149 已验证） |
| 小游戏端海报下载 / 相册 | 简化：改为分享卡片；离屏 canvas 的 `toDataURL` 能力依基础库而定，已做 try/catch 兜底 |

## 目录
```
index.html            Web 入口（奶油手绘 UI，CSS 变量双皮肤）
game.js               微信小游戏入口（shim + 上屏合成 + 主循环）
game.json / project.config.json / package.json   小游戏工程与依赖
js/config.js          配置：两套主题/色板/道具/成就/动物
js/platform.js        Web 平台适配
js/platform-wx.js     微信平台适配（存储/震动/分享）
js/audio.js           WebAudio 音效
js/animals.js         5 只动物 Canvas 绘制（贴图/头像/海报通用）
js/textures.js        手绘公寓楼层贴图（缓存复用）
js/scene.js           Three.js 场景/材质/粒子/海报
js/game.js            状态机与核心逻辑（双端共用）
js/ui.js              Web DOM UI
js/ui-wx.js           小游戏 Canvas 2D UI
js/main.js            Web 主循环
scripts/smoke-test.js Web 浏览器冒烟测试
scripts/smoke-wx.js   小游戏端逻辑冒烟（Node mock wx）
scripts/shot-cozy.js  画风样张生成
```
