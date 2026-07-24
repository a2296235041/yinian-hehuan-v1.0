(function installAudioManager(root) {
  'use strict';

  const tracks = Object.freeze({
    global: './assets/audio/global-bgm.mp3',
    battle: './assets/audio/battle-bgm.mp3'
  });
  let context = null;
  let master = null;
  let music = null;
  let effects = null;
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
    music = context.createGain();
    effects = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 5600;
    filter.Q.value = 0.45;
    master.gain.value = muted ? 0 : 0.64;
    music.gain.value = 0.14;
    effects.gain.value = 0.3;
    music.connect(filter);
    filter.connect(master);
    effects.connect(master);
    master.connect(context.destination);
  }

  function createTrack(name) {
    const audio = new root.Audio(tracks[name]);
    audio.loop = true;
    audio.preload = 'auto';
    audio.dataset.track = name;
    const source = context.createMediaElementSource(audio);
    const gain = context.createGain();
    gain.gain.value = 1;
    source.connect(gain);
    gain.connect(music);
    return audio;
  }

  function ensureTrack(name) {
    if (!context || activeTrack?.dataset.track === name) return;
    if (activeTrack) {
      activeTrack.pause();
      activeTrack.currentTime = 0;
    }
    activeTrack = createTrack(name);
    if (active && !muted) {
      activeTrack.play().catch((error) => {
        console.error('背景音乐启动失败:', error.message, error.stack);
      });
    }
  }

  function playMusic(name = 'global') {
    requestedTrack = tracks[name] ? name : 'global';
    init();
    if (!context) return false;
    ensureTrack(requestedTrack);
    context.resume().catch(() => {});
    if (active && !muted) {
      activeTrack?.play().catch((error) => {
        console.error('背景音乐切换失败:', error.message, error.stack);
      });
    }
    return true;
  }

  async function start() {
    active = true;
    init();
    if (!context) return false;
    try {
      await context.resume();
    } catch (error) {
      console.error('音频启动失败:', error.message, error.stack);
      return false;
    }
    ensureTrack(requestedTrack);
    if (!muted) {
      try {
        await activeTrack.play();
      } catch (error) {
        console.error('背景音乐播放失败:', error.message, error.stack);
      }
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
    if (muted) {
      activeTrack?.pause();
    } else if (active && activeTrack) {
      context.resume().catch(() => {});
      activeTrack.play().catch((error) => {
        console.error('背景音乐恢复失败:', error.message, error.stack);
      });
    }
    return muted;
  }

  function pause() {
    active = false;
    activeTrack?.pause();
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
