# 游戏工程架构说明

本项目使用 HTML、JavaScript 与 Phaser.js，发布内容全部位于 `publish/`。
浏览器按照 `index.html` 中的脚本顺序加载文件，各模块通过 `window.Game` 或专用全局对象协作，
不使用 ES Module、服务端框架或本地端口。

## 目录结构

```text
publish/
├── index.html                 页面入口与 DOM 弹层
├── main.js                    初始化 UI、Phaser 与场景列表
├── style.css                  基础布局、设置、AI 对话
├── ui.css                     独立弹层组件样式
├── assets/
│   ├── data/                  角色、物品、境界、区域、敌人等配置表
│   └── generated/             游戏背景与角色美术
├── src/
│   ├── ai/                    AI 模型、对话、提示词与绘图流程
│   ├── data/                  小型静态 JavaScript 配置
│   ├── platform/              DZMM 平台边界与音频管理
│   ├── scenes/                Phaser 场景与画面交互
│   ├── storage/               版本化 KV 存档基础设施
│   ├── systems/               不依赖具体画面的游戏规则
│   ├── ui/                    DOM 弹层和跨场景控制器
│   └── utils/                 事件总线等公共工具
└── vendor/                    Phaser 本地依赖
```

## 场景分层

- `BootScene`：启动 Phaser，进入资源加载流程。
- `PreloadScene`：统一加载图片和 JSON 配置，并向平台上报进度。
- `MainMenuScene`：主菜单。
- `CharacterCreationScene`：选择玩家来历。
- `GameScene`：宗门地图、建筑与 NPC 入口。
- `UIScene`：常驻 HUD、修炼、日期、储物袋和出山入口。
- `InventoryScene`：覆盖式储物袋界面。
- `ExplorationScene`：八大区域选择与探索结果。
- `BattleScene`：回合制战斗和奖励结算。

覆盖场景打开时会暂停并隐藏 `GameScene`、`UIScene`，退出后统一恢复，避免输入穿透和界面重叠。

## 系统职责

- `PlayerStateSystem`：组装当前玩家会话，并等待长期系统完成初始化。
- `InventorySystem`：管理物品数量和储物袋存档。
- `GiftSystem`：协调物品扣除与 NPC 每日赠礼限制。
- `AffinitySystem`：管理好感度、每日交谈与赠礼上限。
- `CultivationSystem`：管理境界、当前境界进度、瓶颈与双修突破。
- `ExplorationSystem`：处理区域解锁、精力消耗和随机事件。
- `CombatSystem`：纯数值战斗规则，不创建 Phaser 对象。
- `DialogueSystem`：连接场景 NPC 与 AI 对话。

系统通过 `Game.EventBus` 发布状态变化，场景只订阅并显示结果。系统不得直接操作 Phaser 画面，
场景不得绕过系统直接修改持久化数据。

## 数据配置

- `items.json`：物品、稀有度、赠礼收益和初始数量。
- `cultivation_levels.json`：境界名称与当前境界所需修为。
- `exploration_regions.json`：八大区域、解锁境界、消耗和事件池。
- `enemies.json`：敌人气血、攻击、修为奖励与掉落。
- `npcs.json`：NPC 人设与初始好感。
- `character_origins.json`：玩家来历和天赋。

新增区域、敌人或物品时优先修改配置表。只有配置协议无法表达新规则时，才扩展对应系统。

## 长期开发顺序

1. 先说明新功能属于哪个系统、场景和配置表。
2. 将规则写入 `systems/`，保持与画面无关并限制数值边界。
3. 将显示和输入写入 `scenes/` 或 `ui/`。
4. 使用事件总线同步状态，按里程碑写入 DZMM KV。
5. 验证桌面与移动横屏、错误状态、重复点击和文件行数。

每个 JavaScript 文件不得超过 200 行；大型功能继续拆成数据、规则、场景和 UI 控制器。
