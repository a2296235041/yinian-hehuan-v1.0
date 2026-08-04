var Game = window.Game || {};

Game.TournamentEntry = {
    configs: [
        { mode: 'internal', x: 105, width: 160, fontSize: 17 },
        { mode: 'spirit', x: 285, width: 190, fontSize: 16 }
    ],

    renderButton(button, config) {
        const info = window.GameTournament.MODE_INFO[config.mode];
        const access = window.GameTournament.getAccess(config.mode);
        const label = access.unlocked
            ? info.title
            : `${info.title} · ${access.requiredRealmName.replace('期', '')}`;
        button.setText(label).setAlpha(access.unlocked ? 1 : 0.62);
        button.labelText?.setFontSize?.(access.unlocked ? config.fontSize : 14);
        button.labelText?.setColor?.(access.unlocked ? '#fff8fa' : '#c8aab4');
    },

    create(scene) {
        const buttons = this.configs.map((config) => {
            const button = scene.addViewObject(Game.UISkin.makeButton(
                scene, config.x, 680, '', () => this.open(scene, config.mode), {
                    width: config.width,
                    height: 46,
                    fontSize: config.fontSize,
                    variant: 'secondary'
                }
            ));
            this.renderButton(button, config);
            return button;
        });
        Promise.resolve(Game.systemsReady).then(() => {
            buttons.forEach((button, index) => {
                if (button.active) this.renderButton(button, this.configs[index]);
            });
        }).catch((error) => {
            console.error('赛事入口状态刷新失败:', error.message, error.stack);
        });
        return buttons;
    },

    open(scene, mode) {
        const info = window.GameTournament.MODE_INFO[mode];
        const access = window.GameTournament.getAccess(mode);
        if (!access.unlocked) {
            window.GameAudio.sfx('deny');
            scene.scene.get('UIScene')?.showLog?.(
                `${info.title}尚未解锁：达到${access.requiredRealmName}后方可参加`
            );
            return;
        }
        window.GameAudio.sfx('click');
        window.GameTournamentPanel.open(mode);
    }
};
