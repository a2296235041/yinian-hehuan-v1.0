var Game = window.Game || {};

Game.TournamentEntry = {
    create(scene) {
        const internal = scene.addViewObject(Game.UISkin.makeButton(
            scene, 105, 680, '宗门大比', () => this.open('internal'), {
                width: 150, height: 46, fontSize: 17, variant: 'secondary'
            }
        ));
        const spirit = scene.addViewObject(Game.UISkin.makeButton(
            scene, 270, 680, '灵界武道大会', () => this.open('spirit'), {
                width: 165, height: 46, fontSize: 16, variant: 'secondary'
            }
        ));
        return [internal, spirit];
    },

    open(mode) {
        window.GameAudio.sfx('click');
        window.GameTournamentPanel.open(mode);
    }
};
