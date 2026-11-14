import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const CHANNELS = 2;
const BITS_PER_SAMPLE = 16;
const TWO_PI = Math.PI * 2;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'audio');

// ============================================================================
// Core Studio DSP Primitives
// ============================================================================

function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createStereoBuffer(durationSeconds) {
  const length = Math.round(durationSeconds * SAMPLE_RATE);
  return {
    length,
    left: new Float64Array(length),
    right: new Float64Array(length),
  };
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function adsr(t, attack, decay, sustainLevel, release, gateDuration) {
  if (t < 0) return 0;
  if (t < attack) {
    return attack > 0 ? t / attack : 1;
  }
  if (t < attack + decay) {
    const u = decay > 0 ? (t - attack) / decay : 1;
    return 1 - (1 - sustainLevel) * u;
  }
  if (t < gateDuration) {
    return sustainLevel;
  }
  const relT = t - gateDuration;
  if (relT < release) {
    const u = release > 0 ? relT / release : 1;
    return sustainLevel * (1 - u);
  }
  return 0;
}

function createPinkFilter() {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  return (white) => {
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const out = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
    return out;
  };
}

function createBrownFilter(leak = 0.995) {
  let last = 0;
  return (white) => {
    last = (last + 0.025 * white) * leak;
    return clamp(last * 3.2, -1.5, 1.5);
  };
}

/**
 * Cytomic TPT State-Variable Filter (unconditionally stable under fast LFO modulation)
 */
function createSvf() {
  let ic1eq = 0;
  let ic2eq = 0;

  return (input, cutoffHz, q, mode = 'bandpass') => {
    const fc = clamp(cutoffHz, 20, SAMPLE_RATE * 0.45);
    const res = clamp(q, 0.3, 24);
    const g = Math.tan((Math.PI * fc) / SAMPLE_RATE);
    const k = 1 / res;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;

    const v3 = input - ic2eq;
    const v1 = a1 * ic1eq + a2 * v3;
    const v2 = ic2eq + a2 * ic1eq + a3 * v3;
    ic1eq = 2 * v1 - ic1eq;
    ic2eq = 2 * v2 - ic2eq;

    if (mode === 'lowpass') return v2;
    if (mode === 'highpass') return input - k * v1 - v2;
    if (mode === 'notch') return input - k * v1;
    return v1; // bandpass (normalized peak)
  };
}

/**
 * RBJ Audio EQ Cookbook static biquad filter
 */
function createBiquad(type, freqHz, q = 0.707, gainDb = 0) {
  const w0 = (TWO_PI * clamp(freqHz, 15, SAMPLE_RATE * 0.46)) / SAMPLE_RATE;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * Math.max(0.1, q));
  const A = Math.pow(10, gainDb / 40);

  let b0 = 1;
  let b1 = 0;
  let b2 = 0;
  let a0 = 1;
  let a1 = 0;
  let a2 = 0;

  if (type === 'lowpass') {
    b0 = (1 - cosW0) / 2;
    b1 = 1 - cosW0;
    b2 = (1 - cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  } else if (type === 'highpass') {
    b0 = (1 + cosW0) / 2;
    b1 = -(1 + cosW0);
    b2 = (1 + cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  } else if (type === 'bandpass') {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  } else if (type === 'lowshelf') {
    const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;
    b0 = A * (A + 1 - (A - 1) * cosW0 + twoSqrtAAlpha);
    b1 = 2 * A * (A - 1 - (A + 1) * cosW0);
    b2 = A * (A + 1 - (A - 1) * cosW0 - twoSqrtAAlpha);
    a0 = A + 1 + (A - 1) * cosW0 + twoSqrtAAlpha;
    a1 = -2 * (A - 1 + (A + 1) * cosW0);
    a2 = A + 1 + (A - 1) * cosW0 - twoSqrtAAlpha;
  }

  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;

  return (x) => {
    const y = nb0 * x + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

/**
 * Algorithmic Schroeder Stereo Reverb (4 damped comb filters + 2 allpass diffusers per channel)
 */
function applyStereoReverb(buf, { wet = 0.28, roomSize = 0.78, damping = 0.35 } = {}) {
  const combDelaysL = [1116, 1188, 1277, 1356];
  const combDelaysR = [1139, 1211, 1300, 1379];
  const allpassDelaysL = [556, 441];
  const allpassDelaysR = [579, 464];

  const feedback = clamp(0.68 + roomSize * 0.24, 0.5, 0.93);
  const damp1 = clamp(damping, 0.05, 0.85);
  const damp2 = 1 - damp1;

  function processMonoChannel(input, combDelays, allpassDelays) {
    const combs = combDelays.map((d) => ({
      buf: new Float64Array(d),
      idx: 0,
      filterStore: 0,
    }));
    const allpasses = allpassDelays.map((d) => ({
      buf: new Float64Array(d),
      idx: 0,
    }));
    const out = new Float64Array(input.length);

    for (let i = 0; i < input.length; i++) {
      const inp = input[i] * 0.22;
      let combSum = 0;

      for (let c = 0; c < combs.length; c++) {
        const comb = combs[c];
        const delayed = comb.buf[comb.idx];
        comb.filterStore = delayed * damp2 + comb.filterStore * damp1;
        comb.buf[comb.idx] = inp + comb.filterStore * feedback;
        comb.idx = (comb.idx + 1) % comb.buf.length;
        combSum += delayed;
      }

      let apOut = combSum;
      for (let a = 0; a < allpasses.length; a++) {
        const ap = allpasses[a];
        const bufOut = ap.buf[ap.idx];
        const feed = apOut + bufOut * 0.5;
        ap.buf[ap.idx] = feed;
        apOut = bufOut - feed * 0.5;
        ap.idx = (ap.idx + 1) % ap.buf.length;
      }

      out[i] = apOut;
    }
    return out;
  }

  const revL = processMonoChannel(buf.left, combDelaysL, allpassDelaysL);
  const revR = processMonoChannel(buf.right, combDelaysR, allpassDelaysR);
  const dry = 1 - wet * 0.35;

  for (let i = 0; i < buf.length; i++) {
    buf.left[i] = buf.left[i] * dry + revL[i] * wet;
    buf.right[i] = buf.right[i] * dry + revR[i] * wet;
  }
}

/**
 * Equal-power seamless loop crossfade: folds [loopLen .. loopLen + fadeLen) onto [0 .. fadeLen)
 */
function crossfadeToLoop(extendedBuf, targetDurationSec, fadeDurationSec) {
  const loopSamples = Math.round(targetDurationSec * SAMPLE_RATE);
  const fadeSamples = Math.min(
    Math.round(fadeDurationSec * SAMPLE_RATE),
    Math.floor(loopSamples / 2),
  );
  const out = {
    length: loopSamples,
    left: new Float64Array(loopSamples),
    right: new Float64Array(loopSamples),
  };

  for (let i = 0; i < loopSamples; i++) {
    out.left[i] = extendedBuf.left[i];
    out.right[i] = extendedBuf.right[i];
  }

  for (let i = 0; i < fadeSamples; i++) {
    const u = i / fadeSamples;
    const headGain = Math.sin(u * Math.PI * 0.5);
    const tailGain = Math.cos(u * Math.PI * 0.5);
    const tailIdx = loopSamples + i;
    if (tailIdx < extendedBuf.length) {
      out.left[i] = out.left[i] * headGain + extendedBuf.left[tailIdx] * tailGain;
      out.right[i] = out.right[i] * headGain + extendedBuf.right[tailIdx] * tailGain;
    }
  }

  return out;
}

function applyEdgeFades(buf, fadeInSec, fadeOutSec) {
  const inSamples = Math.min(Math.round(fadeInSec * SAMPLE_RATE), buf.length);
  const outSamples = Math.min(Math.round(fadeOutSec * SAMPLE_RATE), buf.length);

  for (let i = 0; i < inSamples; i++) {
    const g = 0.5 * (1 - Math.cos((Math.PI * i) / inSamples));
    buf.left[i] *= g;
    buf.right[i] *= g;
  }
  for (let i = 0; i < outSamples; i++) {
    const idx = buf.length - 1 - i;
    const g = 0.5 * (1 - Math.cos((Math.PI * i) / outSamples));
    buf.left[idx] *= g;
    buf.right[idx] *= g;
  }
}

function finalizeBuffer(buf, { targetPeak = 0.84, softLimitDrive = 1.15, dcBlock = true } = {}) {
  if (dcBlock) {
    let lx1 = 0;
    let ly1 = 0;
    let rx1 = 0;
    let ry1 = 0;
    const coeff = 0.9975;
    for (let i = 0; i < buf.length; i++) {
      const lx = buf.left[i];
      const ly = lx - lx1 + coeff * ly1;
      lx1 = lx;
      ly1 = ly;
      buf.left[i] = ly;

      const rx = buf.right[i];
      const ry = rx - rx1 + coeff * ry1;
      rx1 = rx;
      ry1 = ry;
      buf.right[i] = ry;
    }
  }

  // Gentle saturation before peak normalization for studio warmth
  let peak = 0;
  const tanhNorm = Math.tanh(softLimitDrive);
  for (let i = 0; i < buf.length; i++) {
    const l = Math.tanh(buf.left[i] * softLimitDrive) / tanhNorm;
    const r = Math.tanh(buf.right[i] * softLimitDrive) / tanhNorm;
    buf.left[i] = l;
    buf.right[i] = r;
    const absL = Math.abs(l);
    const absR = Math.abs(r);
    if (absL > peak) peak = absL;
    if (absR > peak) peak = absR;
  }

  if (peak > 1e-6) {
    const scale = targetPeak / peak;
    for (let i = 0; i < buf.length; i++) {
      buf.left[i] *= scale;
      buf.right[i] *= scale;
    }
  }
}

function writeStereoWav(filePath, buf) {
  const dataBytes = buf.length * CHANNELS * (BITS_PER_SAMPLE / 8);
  const out = Buffer.allocUnsafe(44 + dataBytes);

  out.write('RIFF', 0, 'ascii');
  out.writeUInt32LE(36 + dataBytes, 4);
  out.write('WAVE', 8, 'ascii');
  out.write('fmt ', 12, 'ascii');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(CHANNELS, 22);
  out.writeUInt32LE(SAMPLE_RATE, 24);
  out.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8), 28);
  out.writeUInt16LE(CHANNELS * (BITS_PER_SAMPLE / 8), 32);
  out.writeUInt16LE(BITS_PER_SAMPLE, 34);
  out.write('data', 36, 'ascii');
  out.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  for (let i = 0; i < buf.length; i++) {
    const l = clamp(Math.round(buf.left[i] * 32767), -32768, 32767);
    const r = clamp(Math.round(buf.right[i] * 32767), -32768, 32767);
    out.writeInt16LE(l, offset);
    out.writeInt16LE(r, offset + 2);
    offset += 4;
  }

  fs.writeFileSync(filePath, out);
  return out.length;
}

// ============================================================================
// 12 Studio Sound Synthesizers
// ============================================================================

function synthesizeRainAmegakure() {
  const loopSec = 12;
  const fadeSec = 2.0;
  const ext = createStereoBuffer(loopSec + fadeSec);
  const rng = createRng(101);

  const pinkL = createPinkFilter();
  const pinkR = createPinkFilter();
  const brownL = createBrownFilter(0.992);
  const brownR = createBrownFilter(0.992);
  const thunderNoise = createBrownFilter(0.996);

  const hpL = createBiquad('highpass', 300, 0.707);
  const hpR = createBiquad('highpass', 300, 0.707);
  const lpL = createBiquad('lowpass', 4200, 0.65);
  const lpR = createBiquad('lowpass', 4200, 0.65);
  const dropSvfL = createSvf();
  const dropSvfR = createSvf();
  const thunderLpL = createBiquad('lowpass', 145, 0.8);
  const thunderLpR = createBiquad('lowpass', 145, 0.8);

  let dropTailL = 0;
  let dropTailR = 0;
  let dropFreqL = 1800;
  let dropFreqR = 1900;

  for (let i = 0; i < ext.length; i++) {
    const t = i / SAMPLE_RATE;
    const wL = rng() * 2 - 1;
    const wR = rng() * 2 - 1;

    // Gentle Amegakure rainfall density shimmer
    const rainMod = 0.88 + 0.12 * Math.sin(TWO_PI * 0.18 * t);
    const bedL = lpL(hpL(pinkL(wL) * 0.78 + brownL(wL) * 0.16)) * rainMod;
    const bedR = lpR(hpR(pinkR(wR) * 0.78 + brownR(wR) * 0.16)) * rainMod;

    // Sparse individual droplet patters on stone
    if (rng() < 0.0022) {
      dropTailL = 0.35 + rng() * 0.45;
      dropFreqL = 1100 + rng() * 2400;
    }
    if (rng() < 0.0022) {
      dropTailR = 0.35 + rng() * 0.45;
      dropFreqR = 1100 + rng() * 2400;
    }
    const dropL = dropSvfL((rng() * 2 - 1) * dropTailL, dropFreqL, 5.2, 'bandpass') * 0.22;
    const dropR = dropSvfR((rng() * 2 - 1) * dropTailR, dropFreqR, 5.2, 'bandpass') * 0.22;
    dropTailL *= 0.994;
    dropTailR *= 0.994;

    // Two soft distant sub-bass thunder swells safely inside the non-crossfade window
    const tRoll1 = Math.exp(-Math.pow((t - 3.6) / 0.85, 2));
    const tRoll2 = Math.exp(-Math.pow((t - 8.4) / 1.05, 2)) * 0.75;
    const thunderEnv = tRoll1 + tRoll2;
    const tRaw = thunderNoise(rng() * 2 - 1) + 0.35 * Math.sin(TWO_PI * 48 * t + 0.5 * Math.sin(TWO_PI * 6 * t));
    const thunderL = thunderLpL(tRaw * thunderEnv) * 0.42;
    const thunderR = thunderLpR((tRaw + 0.1 * (rng() * 2 - 1)) * thunderEnv) * 0.42;

    ext.left[i] = bedL + dropL + thunderL;
    ext.right[i] = bedR + dropR + thunderR;
  }

  applyStereoReverb(ext, { wet: 0.24, roomSize: 0.75, damping: 0.48 });
  const looped = crossfadeToLoop(ext, loopSec, fadeSec);
  finalizeBuffer(looped, { targetPeak: 0.68, softLimitDrive: 1.05, dcBlock: true });
  return looped;
}

function synthesizeWindUchiha() {
  const loopSec = 12;
  const fadeSec = 2.0;
  const ext = createStereoBuffer(loopSec + fadeSec);
  const rng = createRng(202);

  const pinkL = createPinkFilter();
  const pinkR = createPinkFilter();
  const brownL = createBrownFilter(0.994);
  const brownR = createBrownFilter(0.994);

  const svfLowL = createSvf();
  const svfLowR = createSvf();
  const svfHighL = createSvf();
  const svfHighR = createSvf();
  const svfHowlL = createSvf();
  const svfHowlR = createSvf();

  for (let i = 0; i < ext.length; i++) {
    const t = i / SAMPLE_RATE;
    const wL = rng() * 2 - 1;
    const wR = rng() * 2 - 1;

    const srcL = pinkL(wL) * 0.8 + brownL(wL) * 0.35;
    const srcR = pinkR(wR) * 0.8 + brownR(wR) * 0.35;

    // Asymmetric L/R LFO modulation for organic nocturnal sanctuary wind
    const lfoL1 = 0.5 + 0.5 * Math.sin(TWO_PI * 0.11 * t + 0.3);
    const lfoR1 = 0.5 + 0.5 * Math.sin(TWO_PI * 0.13 * t + 1.9);
    const lfoL2 = 0.5 + 0.5 * Math.sin(TWO_PI * 0.075 * t + 2.4);
    const lfoR2 = 0.5 + 0.5 * Math.sin(TWO_PI * 0.09 * t + 0.7);

    const lowL = svfLowL(srcL, 190 + lfoL1 * 280, 2.3, 'bandpass') * (0.55 + 0.45 * lfoL2);
    const lowR = svfLowR(srcR, 210 + lfoR1 * 270, 2.3, 'bandpass') * (0.55 + 0.45 * lfoR2);

    const highL = svfHighL(srcL, 780 + lfoL2 * 920, 1.8, 'bandpass') * 0.34;
    const highR = svfHighR(srcR, 840 + lfoR2 * 880, 1.8, 'bandpass') * 0.34;

    // Subtle stone-pillar hollow whistle
    const howlL = svfHowlL(srcL, 380 + lfoL1 * 140, 8.5, 'bandpass') * 0.18 * lfoL1;
    const howlR = svfHowlR(srcR, 395 + lfoR1 * 135, 8.5, 'bandpass') * 0.18 * lfoR1;

    ext.left[i] = lowL + highL + howlL;
    ext.right[i] = lowR + highR + howlR;
  }

  applyStereoReverb(ext, { wet: 0.32, roomSize: 0.85, damping: 0.4 });
  const looped = crossfadeToLoop(ext, loopSec, fadeSec);
  finalizeBuffer(looped, { targetPeak: 0.64, softLimitDrive: 1.05, dcBlock: true });
  return looped;
}

function synthesizeBinauralGenjutsu() {
  const loopSec = 10;
  const fadeSec = 1.6;
  const extPad = createStereoBuffer(loopSec + fadeSec);
  const rng = createRng(303);

  const pinkL = createPinkFilter();
  const pinkR = createPinkFilter();
  const lpL = createBiquad('lowpass', 360, 0.8);
  const lpR = createBiquad('lowpass', 360, 0.8);

  // Dark warm drone pad (integer-friendly slow drift crossfaded seamlessly)
  for (let i = 0; i < extPad.length; i++) {
    const t = i / SAMPLE_RATE;
    const drift = Math.sin(TWO_PI * 0.2 * t);
    const subPad = Math.sin(TWO_PI * 50 * t + 0.25 * Math.sin(TWO_PI * 100 * t));
    const fifthPad = Math.sin(TWO_PI * 75 * t + 0.35 * drift) * 0.45;
    const darkChord = Math.sin(TWO_PI * 150 * t + 0.2 * Math.sin(TWO_PI * 0.3 * t)) * 0.16;
    const airL = lpL(pinkL(rng() * 2 - 1)) * 0.06;
    const airR = lpR(pinkR(rng() * 2 - 1)) * 0.06;

    const padBase = (subPad * 0.36 + fifthPad + darkChord) * (0.88 + 0.12 * drift);
    extPad.left[i] = padBase + airL;
    extPad.right[i] = padBase * 0.96 + airR;
  }

  applyStereoReverb(extPad, { wet: 0.28, roomSize: 0.82, damping: 0.55 });
  const loopPad = crossfadeToLoop(extPad, loopSec, fadeSec);

  // Pure 40Hz Gamma binaural beat: 100Hz Left (1000 cycles in 10s), 140Hz Right (1400 cycles in 10s)
  for (let i = 0; i < loopPad.length; i++) {
    const t = i / SAMPLE_RATE;
    const binLeft = Math.sin(TWO_PI * 100 * t) * 0.48;
    const binRight = Math.sin(TWO_PI * 140 * t) * 0.48;
    loopPad.left[i] = loopPad.left[i] * 0.42 + binLeft;
    loopPad.right[i] = loopPad.right[i] * 0.42 + binRight;
  }

  finalizeBuffer(loopPad, { targetPeak: 0.62, softLimitDrive: 1.0, dcBlock: false });
  return loopPad;
}

function synthesizeSharinganActivate() {
  const dur = 0.85;
  const buf = createStereoBuffer(dur);
  const rng = createRng(404);
  const pink = createPinkFilter();
  const whooshSvf = createSvf();

  let phaseCarrier = 0;
  let phaseMod = 0;
  let phaseSub = 0;

  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    // Canonical spin sweep down -> sharp upward snap -> crimson lock
    const sweepFreq =
      t < 0.14
        ? 380 - (t / 0.14) * 230
        : t < 0.32
          ? 150 + ((t - 0.14) / 0.18) * 690
          : 840 * Math.exp(-(t - 0.32) * 3.8) + 210;

    const modIndex = 2.6 * Math.exp(-t * 3.2) + 0.35;
    phaseCarrier += (TWO_PI * sweepFreq) / SAMPLE_RATE;
    phaseMod += (TWO_PI * (sweepFreq * 1.498)) / SAMPLE_RATE;

    const fmTone = Math.sin(phaseCarrier + modIndex * Math.sin(phaseMod));

    // Metallic crimson resonance ring at lock-in (t >= 0.20s)
    const lockT = Math.max(0, t - 0.2);
    const lockEnv = t >= 0.2 ? Math.exp(-lockT * 7.5) * Math.min(1, lockT / 0.012) : 0;
    const ring =
      (Math.sin(TWO_PI * 622.25 * t) * 0.45 +
        Math.sin(TWO_PI * 932.33 * t) * 0.32 +
        Math.sin(TWO_PI * 1480.0 * t) * 0.18) *
      lockEnv;

    const subFreq = 125 * Math.exp(-t * 4.5) + 46;
    phaseSub += (TWO_PI * subFreq) / SAMPLE_RATE;
    const sub = Math.sin(phaseSub) * Math.exp(-t * 4.8) * 0.55;

    const whooshCut = 420 + Math.sin(Math.min(1, t / 0.36) * Math.PI) * 2200;
    const whoosh = whooshSvf(pink(rng() * 2 - 1), whooshCut, 2.8, 'bandpass') * Math.exp(-t * 5.2) * 0.55;

    const env = adsr(t, 0.015, 0.25, 0.35, 0.32, 0.52);
    const stereoPan = 0.22 * Math.sin(TWO_PI * 6.5 * t) * Math.exp(-t * 3.0);

    const mono = (fmTone * 0.42 + sub + whoosh) * env + ring * 0.48;
    buf.left[i] = mono * (1 - stereoPan);
    buf.right[i] = mono * (1 + stereoPan);
  }

  applyStereoReverb(buf, { wet: 0.22, roomSize: 0.62, damping: 0.35 });
  applyEdgeFades(buf, 0.003, 0.045);
  finalizeBuffer(buf, { targetPeak: 0.85, softLimitDrive: 1.25 });
  return buf;
}

function synthesizeMangekyouAwaken() {
  const dur = 1.2;
  const buf = createStereoBuffer(dur);
  const rng = createRng(505);
  const pink = createPinkFilter();
  const svf = createSvf();

  let subPhase = 0;
  let p1 = 0;
  let p2 = 0;
  let p3 = 0;

  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    // Deep sub-drop 118 Hz -> 34 Hz
    const subFreq = 34 + 84 * Math.exp(-t * 5.2);
    subPhase += (TWO_PI * subFreq) / SAMPLE_RATE;
    const sub = Math.sin(subPhase) * Math.min(1, t / 0.012) * Math.exp(-t * 2.2) * 0.72;

    // Tense kaleidoscopic FM harmonics (tritone + minor second shimmer)
    const modEnv = 3.2 * Math.sin(Math.min(1, t / 0.45) * (Math.PI * 0.5)) * Math.exp(-t * 1.9);
    const f1 = 220 * (1 + 0.012 * Math.sin(TWO_PI * 7.5 * t));
    const f2 = 311.13 * (1 - 0.01 * Math.sin(TWO_PI * 6.2 * t)); // Eb4
    const f3 = 466.16; // Bb4

    p1 += (TWO_PI * f1) / SAMPLE_RATE;
    p2 += (TWO_PI * f2) / SAMPLE_RATE;
    p3 += (TWO_PI * f3) / SAMPLE_RATE;

    const fm1 = Math.sin(p1 + modEnv * Math.sin(TWO_PI * 440 * t));
    const fm2 = Math.sin(p2 + modEnv * 0.9 * Math.sin(TWO_PI * 622.25 * t));
    const fm3 = Math.sin(p3 + modEnv * 0.7 * Math.sin(TWO_PI * 932.33 * t));

    const kaleidEnv = adsr(t, 0.03, 0.3, 0.48, 0.45, 0.72);
    const noiseSweep = svf(pink(rng() * 2 - 1), 650 + 1800 * Math.exp(-t * 3.5), 3.6, 'bandpass') * Math.exp(-t * 3.8) * 0.45;

    buf.left[i] = sub + (fm1 * 0.42 + fm2 * 0.34 + fm3 * 0.2) * kaleidEnv + noiseSweep * 0.9;
    buf.right[i] = sub + (fm1 * 0.34 + fm2 * 0.42 + fm3 * 0.24) * kaleidEnv + noiseSweep * 1.1;
  }

  applyStereoReverb(buf, { wet: 0.32, roomSize: 0.82, damping: 0.32 });
  applyEdgeFades(buf, 0.004, 0.06);
  finalizeBuffer(buf, { targetPeak: 0.86, softLimitDrive: 1.3 });
  return buf;
}

function synthesizeTsukuyomiCast() {
  const dur = 1.5;
  const buf = createStereoBuffer(dur);
  const rng = createRng(606);
  const pink = createPinkFilter();
  const svf = createSvf();

  const strikeTime = 0.38;
  const bellFund = 82.41; // E2 deep Bonsho bell
  const bellPartials = [
    { ratio: 0.5, amp: 0.55, decay: 2.2 },
    { ratio: 1.0, amp: 0.8, decay: 2.4 },
    { ratio: 1.004, amp: 0.42, decay: 2.3 }, // Classic Bonsho beat modulation
    { ratio: 1.183, amp: 0.35, decay: 3.1 },
    { ratio: 1.506, amp: 0.32, decay: 3.6 },
    { ratio: 2.0, amp: 0.28, decay: 4.2 },
    { ratio: 2.514, amp: 0.18, decay: 5.5 },
    { ratio: 3.011, amp: 0.12, decay: 6.8 },
  ];

  let warpPhase = 0;

  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;

    // Reverse dimensional warp (0 .. strikeTime)
    let warpL = 0;
    let warpR = 0;
    if (t < strikeTime + 0.05) {
      const u = clamp(t / strikeTime, 0, 1);
      const revEnv = Math.pow(u, 2.6) * (t <= strikeTime ? 1 : Math.exp(-(t - strikeTime) * 35));
      const warpFreq = 110 + Math.pow(u, 2) * 520;
      warpPhase += (TWO_PI * warpFreq) / SAMPLE_RATE;
      const fmWarp = Math.sin(warpPhase + 1.8 * Math.sin(warpPhase * 1.5));
      const vacuum = svf(pink(rng() * 2 - 1), 240 + u * 2400, 3.5, 'bandpass');
      warpL = (fmWarp * 0.45 + vacuum * 0.55) * revEnv;
      warpR = (fmWarp * 0.42 + vacuum * 0.6) * revEnv;
    }

    // Deep Bonsho temple bell strike at strikeTime
    let bellL = 0;
    let bellR = 0;
    if (t >= strikeTime) {
      const bt = t - strikeTime;
      const attack = Math.min(1, bt / 0.008);
      for (let p = 0; p < bellPartials.length; p++) {
        const part = bellPartials[p];
        const freq = bellFund * part.ratio;
        const pEnv = Math.exp(-bt * part.decay) * attack * part.amp;
        const s = Math.sin(TWO_PI * freq * bt + 0.4 * Math.exp(-bt * 12) * Math.sin(TWO_PI * freq * 2 * bt));
        const pan = p % 2 === 0 ? 0.92 : 1.08;
        bellL += s * pEnv * pan;
        bellR += s * pEnv * (2 - pan);
      }
      // Sub impact
      bellL += Math.sin(TWO_PI * 46 * bt) * Math.exp(-bt * 4.5) * 0.52;
      bellR += Math.sin(TWO_PI * 46 * bt) * Math.exp(-bt * 4.5) * 0.52;
    }

    buf.left[i] = warpL * 0.6 + bellL * 0.65;
    buf.right[i] = warpR * 0.6 + bellR * 0.65;
  }

  applyStereoReverb(buf, { wet: 0.36, roomSize: 0.88, damping: 0.38 });
  applyEdgeFades(buf, 0.004, 0.08);
  finalizeBuffer(buf, { targetPeak: 0.86, softLimitDrive: 1.25 });
  return buf;
}

function synthesizeSusanooSummon() {
  const dur = 1.3;
  const buf = createStereoBuffer(dur);
  const rng = createRng(707);
  const pinkL = createPinkFilter();
  const pinkR = createPinkFilter();
  const roarSvfL = createSvf();
  const roarSvfR = createSvf();

  let subPhase = 0;
  let brassPhase = 0;

  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;

    // Heavy chakra shockwave sub pulse
    const subFreq = 32 + 78 * Math.exp(-t * 9.5);
    subPhase += (TWO_PI * subFreq) / SAMPLE_RATE;
    const shockwave = Math.sin(subPhase) * Math.min(1, t / 0.006) * Math.exp(-t * 3.1) * 0.85;

    // Spectral ribcage/armor chakra horn roar (low FM brass + spectral noise roar)
    const hornFreq = 65.41 * (1 + 0.015 * Math.sin(TWO_PI * 5.5 * t));
    brassPhase += (TWO_PI * hornFreq) / SAMPLE_RATE;
    const modI = 3.4 * Math.exp(-t * 2.1) + 0.8;
    const horn =
      Math.sin(brassPhase + modI * Math.sin(brassPhase * 2.0)) * 0.45 +
      Math.sin(brassPhase * 1.5 + 1.2 * Math.sin(brassPhase * 3.0)) * 0.25;

    const auraCutL = 320 + 1350 * Math.exp(-t * 2.4) + 180 * Math.sin(TWO_PI * 6 * t);
    const auraCutR = 350 + 1280 * Math.exp(-t * 2.4) - 180 * Math.sin(TWO_PI * 6 * t);
    const roarL = roarSvfL(pinkL(rng() * 2 - 1), auraCutL, 2.2, 'bandpass') * 0.72;
    const roarR = roarSvfR(pinkR(rng() * 2 - 1), auraCutR, 2.2, 'bandpass') * 0.72;

    const env = adsr(t, 0.025, 0.35, 0.5, 0.42, 0.82);
    buf.left[i] = shockwave + (horn + roarL) * env;
    buf.right[i] = shockwave + (horn * 0.96 + roarR) * env;
  }

  applyStereoReverb(buf, { wet: 0.3, roomSize: 0.8, damping: 0.36 });
  applyEdgeFades(buf, 0.003, 0.065);
  finalizeBuffer(buf, { targetPeak: 0.86, softLimitDrive: 1.35 });
  return buf;
}

function synthesizeAmaterasuIgnite() {
  const dur = 1.1;
  const buf = createStereoBuffer(dur);
  const rng = createRng(808);
  const pinkL = createPinkFilter();
  const pinkR = createPinkFilter();
  const flameSvfL = createSvf();
  const flameSvfR = createSvf();
  const crackleSvfL = createSvf();
  const crackleSvfR = createSvf();

  let subPhase = 0;
  let crackleAmpL = 0;
  let crackleAmpR = 0;
  let crackleFreqL = 2200;
  let crackleFreqR = 2600;

  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;

    // Black-flame ignition low-end whoosh
    const subFreq = 44 + 62 * Math.exp(-t * 6.0);
    subPhase += (TWO_PI * subFreq) / SAMPLE_RATE;
    const subBoom = Math.sin(subPhase) * Math.min(1, t / 0.015) * Math.exp(-t * 3.5) * 0.65;

    const igniteSweep = 160 + 1150 * Math.sin(Math.min(1, t / 0.28) * Math.PI) * Math.exp(-t * 1.4);
    const flameEnv = adsr(t, 0.018, 0.26, 0.42, 0.42, 0.62);
    const flameL = flameSvfL(pinkL(rng() * 2 - 1), igniteSweep, 1.9, 'bandpass') * flameEnv * 0.85;
    const flameR = flameSvfR(pinkR(rng() * 2 - 1), igniteSweep * 1.07, 1.9, 'bandpass') * flameEnv * 0.85;

    // Crackling dark embers
    if (rng() < 0.014 * Math.exp(-t * 1.5)) {
      crackleAmpL = 0.5 + rng() * 0.6;
      crackleFreqL = 1600 + rng() * 3400;
    }
    if (rng() < 0.014 * Math.exp(-t * 1.5)) {
      crackleAmpR = 0.5 + rng() * 0.6;
      crackleFreqR = 1600 + rng() * 3400;
    }
    const cL = crackleSvfL((rng() * 2 - 1) * crackleAmpL, crackleFreqL, 4.2, 'bandpass') * 0.42;
    const cR = crackleSvfR((rng() * 2 - 1) * crackleAmpR, crackleFreqR, 4.2, 'bandpass') * 0.42;
    crackleAmpL *= 0.985;
    crackleAmpR *= 0.985;

    buf.left[i] = subBoom + flameL + cL;
    buf.right[i] = subBoom + flameR + cR;
  }

  applyStereoReverb(buf, { wet: 0.24, roomSize: 0.65, damping: 0.42 });
  applyEdgeFades(buf, 0.003, 0.055);
  finalizeBuffer(buf, { targetPeak: 0.85, softLimitDrive: 1.3 });
  return buf;
}

function synthesizeIzanagiRewind() {
  const dur = 1.2;
  const buf = createStereoBuffer(dur);
  const rng = createRng(909);
  const pink = createPinkFilter();
  const svf = createSvf();

  let revPhase = 0;
  let pHeart1 = 0;
  let pHeart2 = 0;

  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;

    // 1. Reverse temporal warp (0.00s - 0.52s)
    let rev = 0;
    if (t < 0.55) {
      const u = clamp(t / 0.52, 0, 1);
      const revEnv = Math.pow(u, 2.2) * (t <= 0.52 ? 1 : Math.exp(-(t - 0.52) * 40));
      const f = 540 - 310 * Math.pow(u, 1.5) + 180 * Math.sin(TWO_PI * 9 * u);
      revPhase += (TWO_PI * f) / SAMPLE_RATE;
      rev =
        (Math.sin(revPhase + 2.0 * Math.sin(revPhase * 1.618)) * 0.55 +
          svf(pink(rng() * 2 - 1), 350 + 1800 * u, 3.0, 'bandpass') * 0.45) *
        revEnv;
    }

    // 2. Heartbeat double-thud (t=0.52s and t=0.68s)
    let heart = 0;
    if (t >= 0.52) {
      const ht1 = t - 0.52;
      pHeart1 += (TWO_PI * (42 + 48 * Math.exp(-ht1 * 18))) / SAMPLE_RATE;
      heart += Math.sin(pHeart1) * Math.exp(-ht1 * 11) * 0.72;
    }
    if (t >= 0.68) {
      const ht2 = t - 0.68;
      pHeart2 += (TWO_PI * (38 + 44 * Math.exp(-ht2 * 18))) / SAMPLE_RATE;
      heart += Math.sin(pHeart2) * Math.exp(-ht2 * 10) * 0.62;
    }

    // 3. Crystalline seal/glass snap (t=0.76s)
    let snapL = 0;
    let snapR = 0;
    if (t >= 0.76) {
      const st = t - 0.76;
      const snapEnv = Math.exp(-st * 13) * Math.min(1, st / 0.002);
      const glassTone =
        Math.sin(TWO_PI * 1318.5 * st) * 0.42 +
        Math.sin(TWO_PI * 2093.0 * st) * 0.35 +
        Math.sin(TWO_PI * 3135.96 * st) * 0.24;
      const clickNoise = (rng() * 2 - 1) * Math.exp(-st * 65) * 0.6;
      snapL = (glassTone * 0.92 + clickNoise) * snapEnv;
      snapR = (glassTone * 1.08 - clickNoise * 0.8) * snapEnv;
    }

    buf.left[i] = rev * 0.68 + heart + snapL * 0.68;
    buf.right[i] = rev * 0.62 + heart + snapR * 0.68;
  }

  applyStereoReverb(buf, { wet: 0.28, roomSize: 0.75, damping: 0.3 });
  applyEdgeFades(buf, 0.004, 0.06);
  finalizeBuffer(buf, { targetPeak: 0.85, softLimitDrive: 1.25 });
  return buf;
}

function synthesizeMissionComplete() {
  const dur = 1.8;
  const buf = createStereoBuffer(dur);

  // Japanese In-Sen scale ritual chord: D3, Eb3, G3, A3, C4, D4
  const voices = [
    { freq: 146.83, delay: 0.0, pan: -0.1, amp: 0.55, decay: 1.55 },
    { freq: 155.56, delay: 0.055, pan: -0.35, amp: 0.38, decay: 1.8 },
    { freq: 196.0, delay: 0.11, pan: 0.3, amp: 0.42, decay: 1.7 },
    { freq: 220.0, delay: 0.165, pan: -0.25, amp: 0.4, decay: 1.65 },
    { freq: 261.63, delay: 0.22, pan: 0.38, amp: 0.36, decay: 1.6 },
    { freq: 293.66, delay: 0.28, pan: 0.05, amp: 0.42, decay: 1.5 },
  ];

  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;

    // Warm grounding sub-octave
    const sub =
      Math.sin(TWO_PI * 73.42 * t) *
      Math.min(1, t / 0.025) *
      Math.exp(-t * 1.45) *
      0.38;

    let sumL = sub;
    let sumR = sub;

    for (let v = 0; v < voices.length; v++) {
      const voice = voices[v];
      if (t < voice.delay) continue;
      const vt = t - voice.delay;
      const env = Math.min(1, vt / 0.012) * Math.exp(-vt * voice.decay);
      const modIndex = 1.6 * Math.exp(-vt * 4.2) + 0.15;
      const sample =
        (Math.sin(TWO_PI * voice.freq * vt + modIndex * Math.sin(TWO_PI * voice.freq * 2 * vt)) *
          0.72 +
          Math.sin(TWO_PI * voice.freq * 3 * vt) * 0.14 * Math.exp(-vt * 4.0)) *
        env *
        voice.amp;

      const gainL = 1 - Math.max(0, voice.pan);
      const gainR = 1 + Math.min(0, voice.pan);
      sumL += sample * gainL;
      sumR += sample * gainR;
    }

    buf.left[i] = sumL;
    buf.right[i] = sumR;
  }

  applyStereoReverb(buf, { wet: 0.38, roomSize: 0.88, damping: 0.28 });
  applyEdgeFades(buf, 0.005, 0.12);
  finalizeBuffer(buf, { targetPeak: 0.84, softLimitDrive: 1.1 });
  return buf;
}

function synthesizeUiHoverChakra() {
  const dur = 0.08;
  const buf = createStereoBuffer(dur);
  const rng = createRng(1111);
  const svf = createSvf();

  let phase = 0;

  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 690 + 210 * (t / dur);
    phase += (TWO_PI * freq) / SAMPLE_RATE;
    const env = Math.sin((Math.PI * t) / dur) * Math.exp(-t * 28);
    const pulse = Math.sin(phase + 0.35 * Math.sin(phase * 2.0)) * env * 0.72;
    const air = svf(rng() * 2 - 1, 1800, 3.0, 'bandpass') * env * 0.22;

    buf.left[i] = pulse + air;
    buf.right[i] = pulse - air * 0.8;
  }

  applyEdgeFades(buf, 0.004, 0.012);
  finalizeBuffer(buf, { targetPeak: 0.55, softLimitDrive: 1.0 });
  return buf;
}

function synthesizeUiClickSeal() {
  const dur = 0.14;
  const buf = createStereoBuffer(dur);
  const rng = createRng(1212);
  const clickSvf = createSvf();
  const bodySvf = createSvf();

  let bodyPhase = 0;

  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;

    // Crisp tactile stone/wood hand-seal snap
    const snapEnv = Math.exp(-t * 68) * Math.min(1, t / 0.0012);
    const transient = (rng() * 2 - 1) * snapEnv;
    const woodSnap = clickSvf(transient, 1750, 3.8, 'bandpass') * 0.85;
    const highSnap = bodySvf(transient, 3200, 4.2, 'bandpass') * 0.45;

    const bodyFreq = 92 + 128 * Math.exp(-t * 55);
    bodyPhase += (TWO_PI * bodyFreq) / SAMPLE_RATE;
    const body = Math.sin(bodyPhase) * Math.exp(-t * 36) * 0.65;

    buf.left[i] = woodSnap + highSnap + body;
    buf.right[i] = woodSnap * 0.94 + highSnap * 1.06 + body;
  }

  applyStereoReverb(buf, { wet: 0.14, roomSize: 0.45, damping: 0.4 });
  applyEdgeFades(buf, 0.001, 0.018);
  finalizeBuffer(buf, { targetPeak: 0.78, softLimitDrive: 1.15 });
  return buf;
}

// ============================================================================
// Runner
// ============================================================================

const STUDIO_ASSETS = [
  ['rain-amegakure.wav', synthesizeRainAmegakure],
  ['wind-uchiha.wav', synthesizeWindUchiha],
  ['binaural-genjutsu.wav', synthesizeBinauralGenjutsu],
  ['sharingan-activate.wav', synthesizeSharinganActivate],
  ['mangekyou-awaken.wav', synthesizeMangekyouAwaken],
  ['tsukuyomi-cast.wav', synthesizeTsukuyomiCast],
  ['susanoo-summon.wav', synthesizeSusanooSummon],
  ['amaterasu-ignite.wav', synthesizeAmaterasuIgnite],
  ['izanagi-rewind.wav', synthesizeIzanagiRewind],
  ['mission-complete.wav', synthesizeMissionComplete],
  ['ui-hover-chakra.wav', synthesizeUiHoverChakra],
  ['ui-click-seal.wav', synthesizeUiClickSeal],
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.rmSync(path.join(OUTPUT_DIR, '.gitkeep'), { force: true });

for (const [filename, synthesize] of STUDIO_ASSETS) {
  const buf = synthesize();
  const filePath = path.join(OUTPUT_DIR, filename);
  const bytes = writeStereoWav(filePath, buf);
  const seconds = (buf.length / SAMPLE_RATE).toFixed(2);
  console.log(`Generated ${filename} (${seconds}s, ${bytes} bytes)`);
}
