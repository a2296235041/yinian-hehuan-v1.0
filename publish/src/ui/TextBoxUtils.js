var Game = window.Game || {};
Game.TextBoxUtils = {
    fit(text, maxChars = 48, maxLines = 4) {
        const source = String(text || '').replace(/\r/g, '');
        const lines = [];
        source.split('\n').forEach((paragraph) => {
            const chars = [...paragraph];
            if (!chars.length) {
                lines.push('');
                return;
            }
            for (let index = 0; index < chars.length; index += maxChars) {
                lines.push(chars.slice(index, index + maxChars).join(''));
            }
        });
        if (lines.length <= maxLines) return lines.join('\n');
        const visible = lines.slice(0, maxLines);
        const last = visible.length - 1;
        visible[last] = visible[last].length >= maxChars
            ? `${visible[last].slice(0, -1)}…`
            : `${visible[last]}…`;
        return visible.join('\n');
    }
};
