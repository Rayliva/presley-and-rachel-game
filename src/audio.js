/**
 * Procedural sound effects for Campfire Survival
 * Uses Web Audio API - no external audio files needed
 */

let audioCtx = null;
let fireNoise = null;
let fireGain = null;
let fireFilter = null;
let fireInterval = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/** Wood chop - short thunk when chopping trees */
export function playChop() {
  const ctx = getAudioContext();
  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.4;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  const gain = ctx.createGain();
  gain.gain.value = 0.3;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(0);
}

/** Chest open - creak when opening treasure chest */
export function playChestOpen() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.35);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

/** Start fire crackling loop - volume scales with fuel (0-1) */
export function startFireCrackling() {
  const ctx = getAudioContext();
  if (fireNoise) return;

  const bufferSize = ctx.sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  fireNoise = ctx.createBufferSource();
  fireNoise.buffer = buffer;
  fireNoise.loop = true;

  fireFilter = ctx.createBiquadFilter();
  fireFilter.type = 'bandpass';
  fireFilter.frequency.value = 2500;
  fireFilter.Q.value = 2;

  fireGain = ctx.createGain();
  fireGain.gain.value = 0;

  fireNoise.connect(fireFilter).connect(fireGain).connect(ctx.destination);
  fireNoise.start(0);

  // Random crackle pops - modulate filter for variation
  let lastPop = 0;
  fireInterval = setInterval(() => {
    if (!fireFilter || !fireGain) return;
    const now = ctx.currentTime;
    if (now - lastPop > 0.1 + Math.random() * 0.3) {
      lastPop = now;
      fireFilter.frequency.setValueAtTime(1500 + Math.random() * 2000, now);
      fireFilter.frequency.exponentialRampToValueAtTime(2500, now + 0.05);
    }
  }, 50);
}

/** Update fire volume based on fuel ratio (0-1). Call each frame. */
export function setFireVolume(fuelRatio) {
  if (!fireGain) return;
  const target = Math.max(0, fuelRatio) * 0.15;
  const current = fireGain.gain.value;
  fireGain.gain.value = current + (target - current) * 0.05;
}

/** Stop fire crackling */
export function stopFireCrackling() {
  if (fireInterval) {
    clearInterval(fireInterval);
    fireInterval = null;
  }
  if (fireNoise) {
    try {
      fireNoise.stop();
    } catch (_) {}
    fireNoise = null;
  }
  fireGain = null;
  fireFilter = null;
}

/** Wolf growl - when wolves get close */
export function playWolfGrowl() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
  osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

/** OOF - death sound (uses custom Oof.m4a from public folder) */
let oofAudio = null;

export function playDeathOof() {
  if (!oofAudio) {
    oofAudio = new Audio('/Oof.m4a');
  }
  oofAudio.currentTime = 0;
  oofAudio.play().catch(() => {});
}

/** Resume audio context (browsers require user interaction first) */
export function resumeAudio() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}
