(function installAudioManager(root) {
  'use strict';

  let context = null;
  let master = null;
  let music = null;
  let effects = null;
  let timer = 0;
  let step = 0;
  let muted = false;
  let active = false;
  const notes = [147, 196, 220, 294, 330, 392];

  function init() {
    if (context) return;
    const AudioContext = root.AudioContext || root.webkitAudioContext;
    if (!AudioContext) return;
    context = new AudioContext();
    master = context.createGain();
    music = context.createGain();
    effects = context.createGain();
    master.gain.value = muted ? 0 : 0.7;
    music.gain.value = 0.12;
    effects.gain.value = 0.32;
    music.connect(master);
    effects.connect(master);
    master.connect(context.destination);
  }

  function tone(frequency, duration, type, volume, target) {
    if (!context || muted) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type || 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume || 0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(target || effects);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.04);
  }

  function pulse() {
    if (!active || muted || !context) return;
    tone(notes[step % notes.length], 0.45, 'sine', 0.05, music);
    if (step % 4 === 0) tone(notes[(step + 2) % notes.length], 0.32, 'triangle', 0.03, music);
    step += 1;
    timer = root.setTimeout(pulse, 850);
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
    if (!timer && !muted) pulse();
    return true;
  }

  function sfx(name) {
    init();
    if (!context || muted) return;
    context.resume().catch(() => {});
    if (name === 'deny') return tone(130, 0.18, 'sawtooth', 0.11);
    if (name === 'success') {
      tone(392, 0.12, 'triangle', 0.13);
      root.setTimeout(() => tone(587, 0.18, 'triangle', 0.12), 90);
      return;
    }
    if (name === 'score') return tone(660, 0.1, 'triangle', 0.12);
    tone(330, 0.09, 'triangle', 0.1);
  }

  function setMuted(next) {
    muted = Boolean(next);
    if (master) master.gain.value = muted ? 0 : 0.7;
    if (muted && timer) {
      root.clearTimeout(timer);
      timer = 0;
    } else if (!muted && active && !timer) {
      pulse();
    }
    return muted;
  }

  function pause() {
    active = false;
    if (timer) root.clearTimeout(timer);
    timer = 0;
    context?.suspend().catch(() => {});
  }

  root.GameAudio = {
    start,
    resume: start,
    pause,
    sfx,
    toggle: () => setMuted(!muted),
    isMuted: () => muted
  };
}(window));
