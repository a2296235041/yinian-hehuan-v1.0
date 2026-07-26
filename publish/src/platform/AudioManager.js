(function installAudioManager(root) {
  'use strict';

  const tracks = Object.freeze({
    global: './assets/audio/global-bgm.mp3',
    battle: './assets/audio/battle-bgm.mp3'
  });
  let context = null;
  let master = null;
  let effects = null;
  let musicAudio = null;
  let activeTrack = null;
  let requestedTrack = 'global';
  let muted = false;
  let active = false;

  function init() {
    if (context) return;
    const AudioContext = root.AudioContext || root.webkitAudioContext;
    if (!AudioContext) return;
    context = new AudioContext();
    master = context.createGain();
    effects = context.createGain();
    master.gain.value = muted ? 0 : 0.64;
    effects.gain.value = 0.3;
    effects.connect(master);
    master.connect(context.destination);
  }

  function ensureMusicElement() {
    if (musicAudio) return;
    musicAudio = root.document.createElement('audio');
    musicAudio.loop = true;
    musicAudio.preload = 'auto';
    musicAudio.volume = 0.14;
    musicAudio.addEventListener('error', () => {
      console.error('背景音乐加载失败:', musicAudio.error?.code || 'unknown');
    });
  }

  function ensureTrack(name) {
    ensureMusicElement();
    if (activeTrack === name) return;
    activeTrack = name;
    musicAudio.src = tracks[name];
    musicAudio.load();
  }

  function playActiveTrack() {
    if (!active || muted || !musicAudio) return;
    const promise = musicAudio.play();
    promise?.catch((error) => {
      console.error('背景音乐播放失败:', error.name, error.message, error.stack);
    });
  }

  function playMusic(name = 'global') {
    requestedTrack = tracks[name] ? name : 'global';
    ensureTrack(requestedTrack);
    init();
    playActiveTrack();
    context?.resume().catch(() => {});
    return true;
  }

  async function start() {
    active = true;
    ensureTrack(requestedTrack);
    init();
    // 在用户手势的同步调用栈中触发 play，避免浏览器拦截背景音乐。
    playActiveTrack();
    if (!context) return true;
    try {
      await context.resume();
    } catch (error) {
      console.error('音效启动失败:', error.message, error.stack);
    }
    return true;
  }

  function playTone(frequency, type, peak, release) {
    if (!context || muted) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    const stop = start + 0.02 + release;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop - 0.04);
    oscillator.connect(gain);
    gain.connect(effects);
    oscillator.start(start);
    oscillator.stop(stop);
  }

  function sfx(name) {
    init();
    if (!context || muted) return;
    context.resume().catch(() => {});
    if (name === 'deny') return playTone(130, 'sawtooth', 0.1, 0.18);
    if (name === 'success') {
      playTone(392, 'triangle', 0.12, 0.12);
      root.setTimeout(() => playTone(587, 'triangle', 0.11, 0.18), 90);
      return;
    }
    if (name === 'score') return playTone(660, 'triangle', 0.11, 0.1);
    playTone(330, 'triangle', 0.085, 0.09);
  }

  function setMuted(next) {
    muted = Boolean(next);
    if (master && context) {
      master.gain.setTargetAtTime(muted ? 0 : 0.64, context.currentTime, 0.04);
    }
    if (musicAudio) {
      musicAudio.volume = muted ? 0 : 0.14;
      if (muted) musicAudio.pause();
      else playActiveTrack();
    }
    return muted;
  }

  function pause() {
    active = false;
    musicAudio?.pause();
    context?.suspend().catch(() => {});
  }

  root.GameAudio = {
    start,
    resume: start,
    pause,
    playMusic,
    sfx,
    toggle: () => setMuted(!muted),
    isMuted: () => muted
  };
}(window));
