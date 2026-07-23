(function installAudioManager(root) {
  'use strict';
  let context = null;
  let master = null;
  let music = null;
  let effects = null;
  let phraseTimer = 0;
  let melodyStep = 0;
  let muted = false, active = false;
  const musicNodes = new Set();
  // 明亮的 G 宫五声音阶配合跳进旋律，营造轻快但不吵闹的修仙日常。
  const scale = [196, 220, 261.63, 293.66, 329.63, 392, 440, 523.25];
  const melody = [2, 4, 5, 4, 2, 3, 4, null, 4, 5, 7, 5, 4, 2, 3, null,
    0, 2, 4, 5, 4, 2, 1, null, 2, 3, 4, 2, 1, 0, 2, null];
  // 混响脉冲只在首次解锁音频时创建，用于模拟山谷和殿堂回声。
  function createReverbImpulse() {
    const length = Math.floor(context.sampleRate * 1.4);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const decay = Math.pow(1 - index / length, 4.5);
        data[index] = (Math.random() * 2 - 1) * decay;
      }
    }
    return impulse;
  }
  function init() {
    if (context) return;
    const AudioContext = root.AudioContext || root.webkitAudioContext;
    if (!AudioContext) return;
    context = new AudioContext();
    master = context.createGain();
    music = context.createGain();
    effects = context.createGain();
    const filter = context.createBiquadFilter();
    const reverb = context.createConvolver();
    const reverbGain = context.createGain();
    master.gain.value = muted ? 0 : 0.64;
    music.gain.value = 0.14;
    effects.gain.value = 0.3;
    filter.type = 'lowpass';
    filter.frequency.value = 5600;
    filter.Q.value = 0.45;
    reverb.buffer = createReverbImpulse();
    reverbGain.gain.value = 0.09;
    music.connect(filter);
    filter.connect(master);
    music.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(master);
    effects.connect(master);
    master.connect(context.destination);
  }
  // 所有音色共用包络创建器，并跟踪音乐节点以便暂停时立即回收。
  function trackMusicNode(node) {
    musicNodes.add(node);
    node.addEventListener('ended', () => musicNodes.delete(node), { once: true });
  }
  function playVoice(frequency, start, options = {}) {
    const {
      type = 'sine', peak = 0.05, attack = 0.02,
      hold = 0.1, release = 0.3, target = music
    } = options;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const stop = start + attack + hold + release + 0.05;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.setValueAtTime(peak, start + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop - 0.05);
    oscillator.connect(gain);
    gain.connect(target);
    oscillator.start(start);
    oscillator.stop(stop);
    if (target === music) trackMusicNode(oscillator);
    return { oscillator, stop };
  }
  // 箫声使用缓慢起音和轻微颤音，作为持续主旋律。
  function playFlute(frequency, start, duration) {
    const voice = playVoice(frequency, start, {
      peak: 0.045, attack: 0.07,
      hold: Math.max(0.08, duration - 0.25), release: 0.18
    });
    const vibrato = context.createOscillator();
    const depth = context.createGain();
    vibrato.frequency.value = 5.2;
    depth.gain.value = 0.9;
    vibrato.connect(depth);
    depth.connect(voice.oscillator.frequency);
    vibrato.start(start);
    vibrato.stop(voice.stop);
    trackMusicNode(vibrato);
  }
  // 古琴拨弦叠加二次泛音；低频长音负责稳定整段氛围。
  function playGuqin(frequency, start) {
    playVoice(frequency, start, { type: 'triangle', peak: 0.065, attack: 0.008,
      hold: 0.04, release: 0.55 });
    playVoice(frequency * 2, start, { peak: 0.025, attack: 0.008,
      hold: 0.03, release: 0.45 });
  }
  function playDrone(frequency, start, duration) {
    playVoice(frequency, start, { peak: 0.012, attack: 0.35,
      hold: Math.max(0.2, duration - 0.8), release: 0.45 });
  }
  function playWindBell(frequency, start) {
    [1, 2.01, 3.98].forEach((multiple, index) => {
      playVoice(frequency * multiple, start, {
        peak: 0.018 / (index + 1), attack: 0.01, hold: 0.03, release: 1.2
      });
    });
  }
  // 每约五秒预排一个八拍乐句，避免在 Phaser 帧循环中执行音频逻辑。
  function schedulePhrase() {
    phraseTimer = 0;
    if (!active || muted || !context) return;
    const beat = 0.62;
    const start = context.currentTime + 0.08;
    playDrone(scale[0] / 2, start, beat * 4);
    playDrone(scale[3] / 2, start + beat * 4, beat * 4);
    for (let index = 0; index < 8; index += 1) {
      const noteIndex = melody[(melodyStep + index) % melody.length];
      const noteStart = start + index * beat;
      if (noteIndex !== null) playGuqin(scale[noteIndex], noteStart);
      if (noteIndex !== null && (index === 0 || index === 4)) {
        playFlute(scale[noteIndex], noteStart, beat * 2.8);
      }
    }
    if (melodyStep % 16 === 0) playWindBell(scale[5] * 2, start + beat * 7);
    melodyStep = (melodyStep + 8) % melody.length;
    phraseTimer = root.setTimeout(schedulePhrase, beat * 8 * 1000 - 220);
  }
  function stopMusicVoices() {
    musicNodes.forEach((node) => {
      try { node.stop(); } catch (_) {}
    });
    musicNodes.clear();
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
    if (!phraseTimer && !muted) schedulePhrase();
    return true;
  }
  function sfx(name) {
    init();
    if (!context || muted) return;
    context.resume().catch(() => {});
    const tone = (frequency, type, peak, release) => playVoice(
      frequency, context.currentTime,
      { type, peak, attack: 0.015, hold: 0.02, release, target: effects }
    );
    if (name === 'deny') return tone(130, 'sawtooth', 0.1, 0.18);
    if (name === 'success') {
      tone(392, 'triangle', 0.12, 0.12);
      root.setTimeout(() => tone(587, 'triangle', 0.11, 0.18), 90);
      return;
    }
    if (name === 'score') return tone(660, 'triangle', 0.11, 0.1);
    tone(330, 'triangle', 0.085, 0.09);
  }
  function setMuted(next) {
    muted = Boolean(next);
    if (master && context) {
      master.gain.setTargetAtTime(muted ? 0 : 0.64, context.currentTime, 0.04);
    }
    if (muted && phraseTimer) {
      root.clearTimeout(phraseTimer);
      phraseTimer = 0;
    } else if (!muted && active && !phraseTimer) {
      schedulePhrase();
    }
    if (muted) stopMusicVoices();
    return muted;
  }
  function pause() {
    active = false;
    if (phraseTimer) root.clearTimeout(phraseTimer);
    phraseTimer = 0;
    stopMusicVoices();
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
