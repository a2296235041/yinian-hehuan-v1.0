var Game = window.Game || {};

Game.PlayerPortraitAssets = {
    entries: [
        {
            originId: 'demon_prince',
            textureKey: 'player-spirit-resonance',
            path: './assets/characters/player-spirit-resonance.382390b0.png'
        },
        {
            originId: 'alchemy_boy',
            textureKey: 'player-alchemy-heir',
            path: './assets/characters/player-alchemy-heir.c0cc8a24.png'
        },
        {
            originId: 'secret_guard_descendant',
            textureKey: 'player-hehuan-descendant',
            path: './assets/characters/player-hehuan-descendant.0b71464a.png'
        },
        {
            originId: 'reincarnated_immortal',
            textureKey: 'player-battle-hunter',
            path: './assets/characters/player-battle-hunter.773455ac.png'
        },
        {
            originId: 'possessed_old_monster',
            textureKey: 'player-mindful-guest',
            path: './assets/characters/player-mindful-guest.ea50fea0.png'
        },
        {
            originId: 'moonbound_cultivator',
            textureKey: 'player-moonbound-cultivator',
            path: './assets/characters/player-moonbound-cultivator.22018820.png'
        }
    ],

    preload(scene, entries = this.entries) {
        let added = 0;
        entries.forEach(({ textureKey, path }) => {
            if (scene.textures.exists(textureKey)) return;
            scene.load.image(textureKey, path);
            added += 1;
        });
        return added;
    },

    preloadFirst(scene) {
        return this.preload(scene, this.entries.slice(0, 1));
    },

    preloadRemaining(scene) {
        return this.preload(scene, this.entries.slice(1));
    },

    textureKey(originOrId) {
        const originId = typeof originOrId === 'string' ? originOrId : originOrId?.id;
        return this.entries.find((entry) => entry.originId === originId)?.textureKey || 'npc-scholar';
    },

    fit(image, maxWidth, maxHeight) {
        const width = Math.max(1, image.width || 1);
        const height = Math.max(1, image.height || 1);
        image.setScale(Math.min(maxWidth / width, maxHeight / height));
        return image;
    }
};
