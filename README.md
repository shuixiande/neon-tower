# 萌宠公寓 · 叠叠塔（PET TOWER）

2D 原版（`../游戏代码.html`）的 3D 重制版。**核心叠塔玩法不变**，主视觉为「萌宠公寓 · 治愈手绘」，保留初版霓虹赛博为可切换皮肤。Web 单页 + 微信小游戏**双端共用同一套玩法内核**。

## 画风
- 方块不再是砖：每层是**手绘公寓楼层**（窗户、窗帘、屋檐、花盆、晒衣绳、爪印、纸纹），顶/底为奶油屋顶
- 深棕手绘描边、粉彩配色、纸纹天幕、向下飘落的花瓣/泡泡
- **主角汤圆**（雪白圆球+小叶+星星）开场；猫咪/柴犬/熊猫/兔子/汤圆按里程碑入住塔角，带图鉴
- 成绩海报为**高饱和暖底 + 大字分数 + 主角大头**，微信聊天缩略图一眼可辨
- 开局面板可切换「治愈手绘 / 霓虹夜」两套皮肤，选择持久化（玩法代码不动）

## 玩法系统（15 项）
| 系统 | 说明 |
|---|---|
| 核心叠塔 | 方块沿 X/Z 轴交替往返，重叠保留、错开坠落；精准阈值随尺寸自适应（5%） |
| Combo 连击 | 完美连击倍分（2×combo，上限10倍），≥3 住户欢呼，≥5 烟花庆祝 |
| 特殊层（每7层） | 🟡金币+10 / 🟢加宽 / 🔵慢速3秒 / 💗复活 |
| 里程碑（每10层） | 五主题循环 + 动物入住 + 烟花；治愈/霓虹各一套主题色 |
| 音画联动 | 完美放置沿五声音阶爬升（WebAudio 合成，无音频文件） |
| 动态难度保底 | 连续 3 次大失误自动降速+加宽（隐形辅助） |
| 震动反馈 | 放置/完美/失误/成就差异化震动 |
| 每日挑战 | 固定种子，全玩家同局；记录今日最佳 |
| 完美模式 | 只有 Perfect 才能继续 |
| 双人对战 | 同一塔轮流放置，失误淘汰，比分数 |
| 成就+配色 | 13 项成就，4 款塔身配色按成就解锁 |
| 我的塔相册 | 破纪录自动收藏塔全景（最近3张） |
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
小游戏无 DOM：UI 全部 Canvas 2D 绘制（`ui-wx.js`），上屏合成「渐变天幕 + WebGL 画面 + UI」。`window/document/AudioContext` 由入口 shim 提供，内核模块原样复用。

## 立即游玩（Web 版）
直接双击 `index.html` 即可（three.js 已本地化到 `js/vendor/`，**完全离线可用、无外部请求**），或：
```
python -m http.server 8125
# 打开 http://localhost:8125
```

## 线上部署（Vercel + Cloudflare）

| 项 | 值 |
|---|---|
| GitHub | https://github.com/shuixiande/neon-tower （`main` 分支） |
| Vercel 项目 | `neon-tower`（已关联 GitHub，push 到 main 自动部署） |
| 生产地址 | https://neon-tower-nu.vercel.app |
| 目标域名 | https://neon.aitesn.top |
| 部署方式 | 纯静态，`vercel.json` 声明 `framework/buildCommand/installCommand = null` |

**最后一步需手动完成**：Cloudflare 上 `aitesn.top` 区域加一条 DNS 记录（Vercel 侧域名已绑定并验证通过，当前 `misconfigured` 仅因解析未指向 Vercel）：

| 字段 | 值 |
|---|---|
| Type | `CNAME` |
| Name | `neon` |
| Target | `cname.vercel-dns.com` |
| Proxy status | **DNS only（灰云）** ← 不要开橙云代理，否则证书签发可能失败 |
| TTL | Auto |

保存后 Vercel 自动签发证书，几分钟内 `https://neon.aitesn.top` 生效。Vercel API 给出的推荐值即 `cname.vercel-dns.com.`（备用方案：A 记录 `76.76.21.21`）。

> 本地验证说明：本机 DNS 被劫持且代理隧道对 `*.vercel.app` 返回 502，因此本机 curl 打不开预览域名；部署状态已通过 Vercel API 确认 `READY`，线上文件树 17 个文件（含 `js/vendor/three.min.js`、`js/game.js`）核对无误。手机流量/其他网络可直接访问。

## 注册微信小游戏 AppID（个人主体 IAA 路线）

官方文档：https://developers.weixin.qq.com/minigame/dev/guide/develop/start

### 分步流程
1. 打开 **mp.weixin.qq.com** → 「立即注册」→ 账号类型选 **小程序**
2. 用一个**从未注册过公众平台/小程序的新邮箱**注册，激活邮箱、设密码
3. 主体类型选 **个人** → 身份证实名 + 手机号 + 管理员微信扫码 + 人脸核验（免费，约 10 分钟）
4. **最关键一步**：服务类目勾选 **「游戏」**。勾完这个账号才是**小游戏账号**；一级类目**永久不可修改**，选错只能换邮箱重新注册
5. 登录后台 → 「开发管理 → 开发设置」复制 **AppID**（`wx` 开头）
6. 把本工程 `project.config.json` 里的 `"appid": "touristappid"` 换成正式 AppID
7. 微信开发者工具导入本目录（项目类型：小游戏）→ `npm install` → 菜单「工具 → 构建 npm」→ 编译 → 真机预览
8. 上传代码 → 后台「版本管理」设为**体验版**内测 → 提交审核 → 审核通过后发布

> 还没 AppID 时，开发者工具里可选「测试号」预览，但**测试号不能上传、不能发布**。

### 主体差异
| 能力 | 个人主体 | 企业 / 个体工商户 |
|---|---|---|
| 注册成本 | 0 元、无需微信认证 | 认证费 + 对公账户/营业执照 |
| 微信支付 / 内购 | ❌ 不支持 | ✅ 可开通 |
| 变现方式 | 仅广告（IAA） | 广告 + 内购 |
| 版号 | 纯广告轻休闲一般不需要 | 企业主体 / 任何虚拟支付均需要 |
| 可选二级类目 | 不支持文化互动、角色类、牌类 | 更全 |

本项目是纯休闲、无内购，走**个人主体 + IAA 广告变现**最省事；若以后要卖皮肤/道具，必须升级企业主体并办版号。

### 提审材料清单
- **名称 / 简介 / 头像**：个人主体不得含企业名义、前置审批领域词、宽泛领域词或近似商标；**备案提交前锁定名称与主体**（审核中/通过后不可改名改主体）
- **二级类目**：选「休闲益智」等与实际玩法一致的类目；不符会在版本审核驳回；发布前可改（文化互动除外）
- **适龄提示**（合规必做）：8+ / 12+ / 16+，通过后启动页展示
- **用户隐私保护指引**：后台配置有效链接，首屏需合规弹窗
- **游戏自审自查报告**：官方模板填写，注意署名、签署日期、手印等常见驳回点
- **软件著作权证书**：IAA 通道按后台要求提供（名称含英文/「软件」字样、涉及品牌时通常必交）；建议提前按既有软著申报流程办理
- **小游戏备案**：平台初审 1–2 工作日 + 主管部门 10–20 工作日，是 IAA 上线前置
- **苹果开发者账号邮箱**：版本审核提交时为必填项

### 常见坑
- 用普通小程序账号（没选游戏类目）提审 → 直接驳回；测试号 → 无法上传发布
- 一级类目选错 → 只能重新注册（新邮箱、新主体信息）
- 二级类目与玩法不符 → 提审驳回
- 名称在备案期间改动 → 备案作废重来

## 验证状态（如实记录）
| 项目 | 状态 |
|---|---|
| Web 端全流程（42 层 / 27 完美 / 4 次主题切换 / 复活 / 重开） | ✅ Playwright + Chromium 实测，控制台零错误 |
| three.js 本地化（r149） | ✅ 零外部请求、零页面错误 |
| 画风样张（开始面板 / 22 层塔 / 成绩海报） | ✅ `scripts/shot-cozy.js` 生成并目视确认 |
| 全量 JS 语法 + 小游戏端 Node mock wx 逻辑 | ✅ 全绿 |
| Vercel 生产部署 | ✅ `READY`，线上文件树 17 个文件核对无误 |
| `neon.aitesn.top` 生效 | ⏳ 待 Cloudflare 加 CNAME |
| 微信开发者工具编译 / 真机运行 / 性能 | ⚠️ 未验证，需 AppID 与开发者工具实测 |
| threejs-miniprogram(r108) 与 CanvasTexture / 六面材质兼容性 | ⚠️ 未真机验证（Web 端 r149 已验证） |

> 官方适配包用法：`const { createScopedThreejs } = require('threejs-miniprogram'); global.THREE = createScopedThreejs(glCanvas)`（THREE 不在全局，需注入）。

## 目录
```
index.html            Web 入口（奶油手绘 UI，CSS 变量双皮肤）
game.js               微信小游戏入口（shim + 上屏合成 + 主循环）
game.json / project.config.json / package.json   小游戏工程与依赖
vercel.json           纯静态部署声明
.vercelignore         排除测试截图 / scripts / 小游戏入口
js/vendor/three.min.js  本地 three r149（MIT，零外链）
js/config.js          两套主题/色板/道具/成就/动物
js/platform.js        Web 平台适配
js/platform-wx.js     微信平台适配（存储/震动/分享）
js/audio.js           WebAudio 音效
js/animals.js         5 只动物 Canvas 绘制
js/textures.js        手绘公寓楼层贴图（缓存复用）
js/scene.js           Three.js 场景/材质/粒子/海报
js/game.js            状态机与核心逻辑（双端共用）
js/ui.js              Web DOM UI
js/ui-wx.js           小游戏 Canvas 2D UI
js/main.js            Web 主循环
scripts/              冒烟测试与样张生成脚本
```
