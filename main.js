/**
 * @file main.js
 * @description 游戏主入口文件
 * 负责初始化Phaser游戏实例，配置全局参数，并加载所有场景。
 */

// 使用一个立即执行函数表达式 (IIFE) 来避免污染全局作用域
(function() {
    // 'use strict'; // 启用严格模式，有助于编写更安全的代码

    // 1. 定义游戏的全局配置
    const config = {
        // 渲染类型，Phaser.AUTO会自动选择最佳渲染方式（WebGL或Canvas）
        type: Phaser.AUTO,
        // 游戏画布的父容器ID，与index.html中的div id对应
        parent: 'game-container',
        // 游戏画面的宽高
        width: 1280,
        height: 720,
        // 游戏画面的缩放设置
        scale: {
            // 模式：FIT会自动缩放游戏画面以适应容器大小，同时保持宽高比
            mode: Phaser.Scale.FIT,
            // 自动将游戏画面在容器中居中
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        // 物理引擎配置，我们暂时不需要，可以先设为null或默认
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false // 设为true可以显示物理体的边界框，方便调试
            }
        },
        // 场景列表
        // 游戏会按照这个数组的顺序启动第一个场景
        // 注意：这里的场景类名需要与后续创建的场景文件中的类名完全一致
        scene: [
            Game.Scenes.BootScene,
            Game.Scenes.PreloadScene,
            Game.Scenes.MainMenuScene,
            Game.Scenes.CharacterCreationScene,
            Game.Scenes.GameScene,
            Game.Scenes.UIScene
        ]
    };

    // 2. 创建游戏实例
    // 当所有脚本加载完毕后，浏览器会执行这里的代码
    // 我们将游戏实例挂载到window对象上，方便在其他地方（如浏览器控制台）访问和调试
    window.game = new Phaser.Game(config);

    // 提示：现在运行index.html会看到一个黑屏，这是正常的。
    // 因为我们还没有创建任何场景，也没有在场景里添加任何内容。
    // 接下来，我们将逐一创建这些场景文件。

})();
