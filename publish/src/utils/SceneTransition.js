var Game = window.Game || {};

/**
 * Phaser 场景淡入淡出工具。
 * 所有切换先将当前画面淡至黑色，再执行场景操作，避免画面突然跳变。
 */
Game.SceneTransition = {
    defaultInDuration: 240,
    defaultOutDuration: 220,

    /**
     * 场景创建或恢复后，从黑色平滑显示内容。
     */
    fadeIn(scene, duration) {
        const camera = scene?.cameras?.main;
        if (!camera) return;
        scene.__sceneTransitioning = false;
        camera.resetFX();
        camera.fadeIn(duration || this.defaultInDuration, 0, 0, 0);
    },

    /**
     * 淡出当前场景，并在画面完全变黑后执行回调。
     * 场景锁可阻止玩家连续点击造成重复启动、重复扣除或状态错乱。
     */
    fadeOut(scene, onComplete, duration) {
        if (!scene || scene.__sceneTransitioning) return false;
        scene.__sceneTransitioning = true;
        const camera = scene.cameras?.main;
        if (!camera) {
            onComplete();
            return true;
        }

        const finish = () => {
            try {
                onComplete();
            } catch (error) {
                scene.__sceneTransitioning = false;
                camera.fadeIn(this.defaultInDuration, 0, 0, 0);
                console.error('场景切换失败:', error.message, error.stack);
            }
        };
        camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, finish);
        // fade() 的第 5 个参数才是 force；fadeOut() 的第 5 个参数是更新回调。
        // 误把 true 传给 fadeOut() 会让 Phaser 下一帧执行 true.call(...) 并直接崩溃。
        camera.fade(duration || this.defaultOutDuration, 0, 0, 0, true);
        return true;
    },

    /**
     * 淡出后停止当前场景并启动目标场景。
     */
    start(scene, targetKey, data, duration) {
        return this.fadeOut(scene, () => {
            scene.scene.start(targetKey, data);
        }, duration);
    }
};
