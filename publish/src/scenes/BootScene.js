/**
 * @file BootScene.js
 * @description 游戏启动场景
 * 这是游戏加载的第一个场景，它的职责非常简单：
 * 1. 加载预加载场景（PreloadScene）所需的最小资源（例如加载进度条的背景、边框等）。
 * 2. 加载完成后，立即启动预加载场景。
 * 这种分离可以提供更好的用户体验，避免在显示加载界面前出现长时间的白屏或黑屏。
 */

// 使用命名空间模式，避免污染全局作用域
// 我们将所有场景都挂载到 window.Game.Scenes 对象下
var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.BootScene = class BootScene extends Phaser.Scene {
    /**
     * 场景的构造函数。
     * 我们为场景指定一个唯一的键（key），后续可以通过这个键来切换或启动场景。
     */
    constructor() {
        super('BootScene');
    }

    /**
     * preload() 是Phaser场景生命周期中的一个核心方法。
     * 在场景创建时，Phaser会自动调用此方法。
     * 我们在这里加载游戏资源。
     */
    preload() {
        // 在这里加载 PreloadScene 需要的资源
        // 例如，加载进度条的背景图片和前景图片
        // 为了简化，我们暂时不加载实际图片，在PreloadScene中用图形API绘制
        console.log('BootScene: preload');
    }

    /**
     * create() 是Phaser场景生命周期中的另一个核心方法。
     * 在 preload() 完成后，此方法会被自动调用。
     * 我们在这里创建游戏对象、设置场景等。
     */
    create() {
        console.log('BootScene: create');
        
        // 当BootScene创建完成后，它的使命就完成了。
        // 立即启动下一个场景：PreloadScene。
        // 'PreloadScene' 是我们下一个场景的唯一键。
        Game.SceneTransition.start(this, 'PreloadScene', undefined, 120);
    }
};

// 为了让 main.js 能够找到这个场景，我们需要在 main.js 中取消对 BootScene 的注释。
// 并且，我们需要确保这个脚本在 main.js 之前被加载（我们已经在 index.html 中做好了）。
