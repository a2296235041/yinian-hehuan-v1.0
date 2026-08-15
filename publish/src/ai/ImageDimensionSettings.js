(function installImageDimensionSettings(root) {
  'use strict';

  const options = Object.freeze([
    Object.freeze({ value: '2:3', label: '竖向 2:3' }),
    Object.freeze({ value: '1:1', label: '方形 1:1' }),
    Object.freeze({ value: '3:2', label: '横向 3:2' })
  ]);
  let selected = '2:3';

  function normalize(value) {
    return options.some((option) => option.value === value) ? value : '2:3';
  }

  root.GameImageDimensions = Object.freeze({
    options,
    get: () => selected,
    set(value) {
      selected = normalize(value);
      return selected;
    },
    normalize
  });
}(window));
