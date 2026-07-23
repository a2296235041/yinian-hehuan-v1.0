/**
 * @file EventBus.js
 * @description 全局事件总线
 * 这是一个全局的Phaser事件发射器实例，用于在游戏的不同部分（特别是不同的场景）之间进行通信，
 * 以实现松耦合的架构。
 * 例如：GameScene可以发出'show-dialogue'事件，而UIScene可以监听此事件来显示对话框。
 */

var Game = window.Game || {};

// 创建一个一次性的、全局的事件发射器实例
Game.EventBus = new Phaser.Events.EventEmitter();

console.log('全局事件总线 (Game.EventBus) 已创建。');

/*
 * === 使用示例 ===
 *
 * // 在任何地方发出事件:
 * Game.EventBus.emit('some-event', data1, data2);
 *
 * // 在任何地方监听事件:
 * Game.EventBus.on('some-event', (data1, data2) => {
 *   console.log('接收到事件:', data1, data2);
 * });
 *
 * // 移除监听:
 * // Game.EventBus.off('some-event', callback);
 *
 */
