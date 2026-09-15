# Tarot Card · 塔罗占卜

![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Android-blue.svg)
![Release](https://img.shields.io/badge/release-v1.0%20APK-brightgreen.svg)
![Frontend](https://img.shields.io/badge/Vue-3.4-brightgreen.svg)
![Build](https://img.shields.io/badge/Vite-5-orange.svg)
![Capacitor](https://img.shields.io/badge/Capacitor-8-lightgrey.svg)

一款以经典韦特塔罗（Rider-Waite-Smith）为底、手机竖屏优先的塔罗占卜应用：从「每日一抽」的情绪指引，到完整牌阵的深度占卜，再到 78 张牌的牌义学习，把「问牌」变成一件有仪式感、可回溯的日常小事。

- **纯本地**：无后端、无账号、无埋点，数据只存在本机；不配置 AI 时零网络请求
- **一套代码两端**：Vue 3 + Vite 前端，Capacitor 8 套壳出 Android 安装包，前端资产 100% 复用
- **内容扎实**：78 张牌 × 正逆位 × 多场景的结构化中文牌义库，引擎零硬编码文案

---

## 下载体验（成品安装包）

仓库内置已构建好的 **Release 安装包**，可直接下载安装体验，无需任何开发环境：

| 文件 | 说明 |
|---|---|
| [`release/塔罗牌.apk`](release/塔罗牌.apk) | Android 安装包，约 **7.4 MB**，versionName `1.0`（versionCode 1） |

- **系统要求**：Android 7.0（API 24）及以上，armeabi-v7a / arm64-v8a
- **安装方式**：手机下载 APK 后点击安装；若系统提示「未知来源」，在设置中允许本次安装即可（该包为自签名包，未上架应用商店）
- **首次启动**：会先走 3 屏新手引导（可跳过），随后进入「每日一抽」首页
- **数据说明**：所有占卜记录保存在本机，卸载即清除；如需保留可在「设置 → 数据导出」导出备份
- **网络说明**：默认完全离线可用；只有你在设置里自行填入 AI 接口并主动请求解读时才会联网（BYOK，请求直连你填写的服务，不经过本项目任何服务器）

> 也可以到 Releases 页面下载历史版本；仓库中的 `release/` 目录随代码一同更新。

---

## 功能特性

### 占卜主链（Ask → Spread → Draw → Result）

1. **提问**：输入问题 → 自动场景路由（11 个域 / 64 个场景 + 子情境匹配）→ 推荐牌阵
2. **选阵**：9 种牌阵 —— 每日一抽、是/否单抽、三张阵（时间线 / 情境 / 二选一）、情境十字、关系牌阵（7 张）、马蹄阵（7 张）、凯尔特十字（10 张）
3. **五步仪式链**：长按洗牌（鸽尾式 riffle，摆幅随蓄力放大）→ 三摞切牌 → 78 张扇形捻开抽牌 → 抽中牌 FLIP 飞行入位 → 逐张翻牌解读
4. **解读**：单牌段 → 关联位段（元素关系矩阵）→ 综合结论四件套（正逆占比 / 大阿卡纳占比 / 元素分布 / 建议聚合）→ 场景收束语

### 能力清单

| 能力 | 说明 |
|---|---|
| 每日一抽 | 每日一张 + 关键词 + 短解读 + 今日功课，闭环出口「今天就这样 / 我想问件具体的事 / 这是什么牌」 |
| 是/否单抽 | 快速是非判断；逆位不改档位，只在解释层追加提示 |
| 牌义词典 | 78 张牌浏览、搜索、正逆位切换、分域牌义、是/否倾向 |
| 历史记录 | 时间线回看，**快照不回写**（重看仍是当时抽到的牌与当时的解读文本），本地 200 条 FIFO + 导出 / 导入 |
| 分享图 | 原生 Canvas 2D 生成（牌面 + 关键词 + 金句 + 二维码 + 免责声明角落） |
| Mirror 统计 | 抽牌频次、正逆位比例、元素分布等回顾 |
| 学习中心 | 《塔罗 10 分钟入门》三篇图文（78 张牌是什么 / 正逆位不是好坏 / 怎么问牌才答得好） |
| 新手引导 | 首启 3 屏 onboarding + 首启守卫 + 新手任务三步解锁深度牌阵 + 流程内微指导 |
| AI 深度解读（BYOK） | 用户自填 API 地址与密钥，应用直连**用户指定的服务**；默认关闭，不开则完全不联网 |
| 无障碍与降级 | `prefers-reduced-motion` 全部动效直切；低端机只动 `transform / opacity` |

---

## 快速开始（Web）

环境：Node.js ≥ 18.18、npm ≥ 9。

```bash
git clone https://github.com/<your-name>/tarot-card.git
cd tarot-card/tarot-web

npm install          # 安装依赖
npm run dev          # 本地开发（默认 http://localhost:5173）
npm test             # Vitest 引擎层单测（12 个文件 / 72 个用例）
npm run build        # 生产构建（内容闸 + vue-tsc 类型检查 + vite build）
npm run preview      # 预览构建产物
```

> 验收以浏览器 DevTools 手机模拟（390×844）为准；桌面浏览器保证「可用不破版」，不做桌面专属布局。

---

## Android 构建

```bash
cd tarot-web
npm install
npm run cap:sync      # = build:android + npx cap sync android（同步 web 资产与原生插件）
```

随后二选一：

- **Android Studio**：打开 `tarot-web/android`，直接 Run / Build APK
- **命令行**（Windows PowerShell）：

```powershell
$env:JAVA_HOME = "<Android Studio 自带 JBR 路径>"   # 例如 .../Android Studio/jbr
cd tarot-web\android
.\gradlew.bat assembleDebug      # 产物：app\build\outputs\apk\debug\app-debug.apk
.\gradlew.bat assembleRelease    # 产物：app\build\outputs\apk\release\app-release.apk
```

关键配置：`applicationId = com.tarot.app`，`minSdk 24` / `targetSdk 36`，`androidScheme = https`（保证 WebView 处于安全上下文，`crypto.getRandomValues` 可用）。

**签名**：复制 `android/keystore.properties.template` 为 `keystore.properties` 并填入自己的密钥信息即可产出签名包；未提供时会构建未签名包，不会中断构建。`*.keystore`、`keystore.properties`、`local.properties` 均已在 `.gitignore` 中，**请勿提交**。

---

## 目录结构

```
tarot-card/
├─ release/                      # 成品安装包（随仓库分发，可直接下载体验）
│  └─ 塔罗牌.apk
├─ tarot-web/                    # 前端工程（Web + Android 共用）
│  ├─ src/
│  │  ├─ views/                  # Home / Ask / Spread / Draw / Result / Library /
│  │  │                          # CardDetail / YesNo / History / Stats / Settings /
│  │  │                          # Onboarding / Learn
│  │  ├─ components/             # Backdrop / CardFace / CardBack / TaskProgress
│  │  ├─ engine/                 # 纯函数域逻辑（不碰 DOM）
│  │  │  ├─ shuffle.ts           # Fisher-Yates 洗牌 + 切牌偏移 + 位相预置
│  │  │  ├─ interpreter.ts       # 静态解读组装引擎
│  │  │  ├─ match.ts             # 问题 → 域 / 场景 / 子情境路由
│  │  │  ├─ yesno.ts  stats.ts   # 是/否单抽、Mirror 统计
│  │  │  ├─ compliance.ts        # 合规词表运行时兜底
│  │  │  ├─ share.ts             # Canvas 分享图
│  │  │  └─ ai/                  # BYOK 客户端：client / prompt / scan / http
│  │  ├─ stores/                 # Pinia：reading / history / daily / settings / task / ai / toast
│  │  ├─ platform/               # 平台适配：storage / back / insets / haptics / share / notify / sound …
│  │  ├─ data/                   # cards.json / spreads.json / compliance.json + content/（生成物）
│  │  └─ router/                 # hash 模式路由 + 首启守卫
│  ├─ public/cards/              # 78 张牌面 + 牌背（开发期素材，见「素材与许可」）
│  ├─ scripts/                   # sync-content（内容闸）/ parse-cards / build-android-icons
│  ├─ android/                   # Capacitor Android 工程
│  └─ tests/unit/                # Vitest 单测
├─ .gitignore
├─ LICENSE
└─ README.md
```

---

## 内容管线与内容闸

文案**不写在代码里**，走「母版 → 产物」单向同步：

```
内容母版（内部资料，不随仓库发布）
        └─(npm run content:sync)─▶  src/data/content/*.json（已入库，运行时直接使用）
```

`scripts/sync-content.mjs` 同时充当**内容闸**（不过闸即 `exit 1`，`npm run build` 直接失败）：

1. 合规词闸：`src/data` 全量 JSON 扫禁词，`block` 级命中即失败（`ai-prompt.json` 需向模型列举禁词，豁免词闸、改为结构校验）
2. 场景注册表：id 唯一、`basedOn ∈ 11 域`、字段完整
3. 场景文案：78 个 card key 全覆盖，长度 <30 / >120 字告警
4. 金句：78 key 全覆盖，>28 字告警
5. 位置模板：牌阵每个 `position.tpl` 都有 intro + 3 个变体 callback
6. 关联表：16 组关系 × 4 种正逆组合齐全
7. 综合层：四件套 + 场景收束语 + 通用开场；学习中心三篇结构完整

> **母版不在仓库中也能正常构建**：未检测到母版目录时脚本自动进入「仅校验产物」模式，直接用仓库内已有的 `src/data/content/` 完成校验，只多一条提示性 warn。要改文案才需要自备母版目录。

---

## 架构要点

- **分层纪律**：`views` 不写业务规则，`engine` 不碰 DOM。引擎输入输出均为 JSON，可整体单测，迁移 Android / 后端时原样复用。
- **随机性**：洗牌瞬间固化全量排列与位相（Fisher-Yates），随机源为 `crypto.getRandomValues`（操作系统加密级熵源）；单一注入口 `setRandomSource` 便于单测固定种子；逆位开关在 draw 输出层生效，不重洗。
- **快照不回写**：解读文本产文即快照，随记录落库，后续改版不影响历史记录。
- **存储适配层**：`platform/storage.ts` —— 原生端 Preferences（小）+ Filesystem（大），Web 端 localStorage；`SCHEMA_VERSION` + 迁移表，禁用破坏性重建。
- **动效纪律**：只动 `transform / opacity`；时长与曲线统一走 motion token，禁止散落魔法数。
- **零动画库、零 UI 组件库**：CSS transition / keyframes + Web Animations API，控件手写。

---

## 路线图

- **已完成**：Web 全链路（骨架 / 占卜主链 / 记录与分享 / 新手引导）、Android 自用级包（图标、启动图、安全区、返回键、Haptics、签名与压缩）、是/否单抽、学习中心、三张阵变体、Mirror 统计、AI 深度解读（BYOK）
- **P1**：PWA、音效完善、字体子集化、分享美学升级
- **P2**：桌面小组件、每日提醒、牌图高清替换
- **P3**：后端化（账号 / 云端同步 / AI 服务端代理）
- **不做**：账号与支付（当前阶段）、社交与直播、命理信息收集、韦特以外的牌组

---

## 随机性与合规

**随机性**：洗牌与位相均由 `crypto.getRandomValues` 生成，切牌只改变发牌起始偏移；设置页「关于」中有完整的算法说明。

**内容红线**（写入内容闸与运行时兜底，双重保险）：

1. 不做医疗断言，健康问题引导就医
2. 不做投资建议，财运限定「财务心态 / 规划倾向」
3. 不做确定性预言，统一「倾向 / 可能 / 建议关注」话术
4. 娱乐与文化定位，上架类目走「娱乐」或「生活」
5. 未成年人保护：年龄门槛 + 免责声明常驻结果页与分享图
6. AI 生成内容显著标识「AI 生成，仅供参考」并标注模型名

**隐私**：无账号、无埋点、无第三方 SDK；AI 为 BYOK 模式且默认关闭，不配置即零网络请求，本项目不持有任何密钥、不留存任何数据。

---

## 关于文档

产品与工程的设计文档（产品定义、牌义体系、解读规则、动效方案、Android 规划等）属于内部资料，**未随本仓库发布**。仓库中保留的是可直接运行的工程代码与内容产物，接口与数据结构本身自解释：

- 数据结构与字段约定见 `tarot-web/src/data/`（cards / spreads / compliance / content）
- 域逻辑与校验规则见 `tarot-web/src/engine/` 与 `tarot-web/tests/unit/`
- 内容校验规则见 `tarot-web/scripts/sync-content.mjs`

---

## 素材与许可

- **代码**：MIT，见 [LICENSE](LICENSE)
- **牌面素材**：`tarot-web/public/cards` 中的牌图为开发期使用的第三方素材，**未确认可自由分发**。若你计划公开分发或上架，请先替换为 1909 年 Rider-Waite-Smith 原版公有领域扫描件并保留来源 URL
- **牌背**：原创设计，可随代码使用
- **签名密钥**：仓库不含任何 keystore；构建签名包请使用自己的密钥

> 本应用定位为娱乐与文化体验工具，解读结果不构成任何医疗、法律或投资建议。

---

## 参与贡献

欢迎 Issue 与 PR。提交前请确保：

```bash
npm run content:sync   # 内容闸：合规词 + 覆盖率 + 模板完整性
npm test               # 引擎层单测
npm run build          # 类型检查 + 构建
```

改动引擎逻辑请补充 `tests/unit/` 用例；文案类改动请用内容母版生成，不要直接改 `src/data/content/`。

---

## 许可证

[MIT](LICENSE) © 2026 Tarot Card contributors
