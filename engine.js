/* QB-303: original, deliberately approximate acid synthesis. No samples or dependencies. */
(function (root) {
  'use strict';
  const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
  const TRACKS = ['kick', 'hat', 'clap'];
  const GROOVES = ['straight', 'bounce', 'weird'];
  const PRESETS = {
    four: { kick: [0, 4, 8, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], clap: [4, 12] },
    eight: { kick: [0, 6, 8, 10], hat: [0, 2, 4, 6, 8, 10, 12, 14], clap: [4, 12] },
    offbeat: { kick: [0, 4, 8, 12], hat: [2, 6, 10, 14], clap: [4, 12] },
    weird: { kick: [0, 3, 8, 11], hat: [0, 3, 6, 7, 10, 14, 15], clap: [4, 10, 12] }
  };
  const DEFAULT_KNOBS = { cutoff: 0.34, resonance: 0.48, bite: 0.50, slide: 0.38, drive: 0.18 };
  const clone = value => JSON.parse(JSON.stringify(value));
  function random(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function drumPattern(preset = 'four') {
    const p = Object.hasOwn(PRESETS, preset) ? PRESETS[preset] : PRESETS.four;
    return Object.fromEntries(TRACKS.map(track => [track, Array.from({ length: 16 }, (_, i) => p[track].includes(i))]));
  }
  function initialState() {
    return {
      version: 1, bpm: 128, volume: 0.42, waveform: 'sawtooth', groove: 'straight', preset: 'four',
      knobs: { ...DEFAULT_KNOBS }, seed: 303, lights: true,
      metal: false, enabled: { bass: true, kick: true, hat: true, clap: true, metal: true },
      bass: [36, 36, 43, 39, 36, 46, 43, 39].map((note, i) => ({ note, on: i !== 3, accent: i === 0 || i === 5, slide: i === 1 || i === 6 })),
      drums: drumPattern()
    };
  }
  function normalize(raw) {
    const s = initialState();
    if (!raw || typeof raw !== 'object' || raw.version !== 1) return s;
    const number = (n, fallback, min, max) => typeof n === 'number' && Number.isFinite(n) ? clamp(n, min, max) : fallback;
    s.bpm = Math.round(number(raw.bpm, s.bpm, 60, 180));
    s.volume = number(raw.volume, s.volume, 0, 1);
    s.seed = number(raw.seed, s.seed, 0, 4294967295) >>> 0;
    s.waveform = raw.waveform === 'square' ? 'square' : 'sawtooth';
    s.groove = GROOVES.includes(raw.groove) ? raw.groove : s.groove;
    s.preset = Object.hasOwn(PRESETS, raw.preset) || raw.preset === 'custom' ? raw.preset : s.preset;
    if (typeof raw.lights === 'boolean') s.lights = raw.lights;
    if (typeof raw.metal === 'boolean') s.metal = raw.metal;
    for (const key of Object.keys(s.knobs)) s.knobs[key] = number(raw.knobs?.[key], s.knobs[key], 0, 1);
    for (const key of Object.keys(s.enabled)) if (typeof raw.enabled?.[key] === 'boolean') s.enabled[key] = raw.enabled[key];
    if (Array.isArray(raw.bass) && raw.bass.length === 8) s.bass = raw.bass.map((v, i) => ({
      note: Math.round(number(v?.note, s.bass[i].note, 24, 72)),
      on: typeof v?.on === 'boolean' ? v.on : s.bass[i].on,
      accent: typeof v?.accent === 'boolean' ? v.accent : false,
      slide: typeof v?.slide === 'boolean' ? v.slide : false
    }));
    for (const track of TRACKS) if (Array.isArray(raw.drums?.[track]) && raw.drums[track].length === 16) {
      s.drums[track] = raw.drums[track].map(v => v === true);
    }
    return s;
  }
  function newRiff(seed) {
    const rng = random(seed);
    const scale = [0, 0, 3, 5, 7, 10, 12];
    return Array.from({ length: 8 }, (_, i) => ({
      note: 36 + (i === 0 ? 0 : scale[Math.floor(rng() * scale.length)]),
      on: i === 0 || rng() > 0.23,
      accent: i === 0 || rng() > 0.72,
      slide: rng() > 0.57
    }));
  }
  function positions(groove) {
    const shifted = groove === 'bounce' ? [1, 5] : groove === 'weird' ? [1, 3, 6] : [];
    return Array.from({ length: 8 }, (_, i) => 2 * i + (shifted.includes(i) ? 1 : 0));
  }
  function eventsAt(s, tick) {
    const step = ((tick % 16) + 16) % 16;
    const pos = positions(s.groove);
    const index = pos.indexOf(step);
    const bass = index >= 0 && s.bass[index].on ? {
      ...s.bass[index], index,
      ticks: (index === 7 ? 16 : pos[index + 1]) - step,
      nextOn: s.bass[(index + 1) % 8].on
    } : null;
    return { step, bass, drums: TRACKS.filter(track => s.drums[track][step]) };
  }
  function noteName(note) {
    return ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][note % 12] + (Math.floor(note / 12) - 1);
  }
  const frequency = note => 440 * Math.pow(2, (note - 69) / 12);
  const JAM_MOVES = ['SCRATCH!', 'WOBBLE', 'STUTTER', 'CLIMB', 'BREAK', 'ACID RUN', 'CLANG CLANG', 'SHAKA SHAKA', 'CHIRP CHIRP'];
  function performanceBpm(base, seed, wander = false, rushBar = -1) {
    const factor = rushBar >= 0 && rushBar < 4 ? [1.12, 1.28, 1.5, 1][rushBar] : wander ? [0.85, 1, 1.12, 1.25][Math.floor(random(seed)() * 4)] : 1;
    return Math.round(clamp(base * factor, 60, 240));
  }
  // A bounded, seeded performance layer. Never changes the user's volume or mutes.
  function jamPlan(seed, amount = 0.65, force = false, metal = false) {
    const rng = random(seed);
    const strength = Number.isFinite(amount) ? clamp(amount) : 0.65;
    return { move: force ? 0 : Math.floor(rng() * (metal ? JAM_MOVES.length : 6)), strength: force ? 1 : strength,
      direction: rng() < 0.5 ? -1 : 1, repeats: rng() < strength ? 4 : 2 };
  }
  function jamEvent(state, tick, plan) {
    const event = eventsAt(state, tick);
    const step = event.step;
    if (state.metal) {
      const move = plan?.move, strength = plan?.strength ?? 0.55;
      // Independent percussion; timbre and subdivisions follow the current scene.
      const kind = move === 7 ? 'shaka' : move === 8 ? 'chirp' : 'clang';
      const count = move === 7 || move === 8 ? (step % 4 >= 2 ? 2 : 1) : step % 2 === 0 ? 1 : 0;
      event.metal = { kind, count, strength, pitch: [1, 1.5, 1.19, 2][Math.floor(step / 4)] };
    }
    if (!plan) return event;
    const a = plan.strength;
    // Stutters use the currently selected bass pad, including its rest state.
    if (plan.move === 2 && step >= 8) {
      const index = positions(state.groove).findLastIndex(p => p <= 8);
      event.bass = state.bass[index].on ? { ...state.bass[index], index, ticks: 1, nextOn: false, slide: false } : null;
    }
    if (plan.move === 4 && step >= 12 && step < 15) { event.bass = null; event.drums = []; }
    if (event.bass) {
      if (plan.move === 3) event.bass.note = clamp(event.bass.note + Math.floor(step / 4) * 3, 24, 72);
      if (plan.move === 5) { event.bass.accent = step % 4 === 0; event.bass.slide = step % 4 !== 0; }
    }
    event.jam = { ...plan, cutoff: clamp(state.knobs.cutoff + a * (plan.move === 1 ? 0.32 * Math.sin(step * Math.PI / 4) : (step / 15 - 0.5) * 0.4)) };
    return event;
  }

  class Engine {
    constructor(context, state) {
      this.ctx = context;
      this.nodes = new Set();
      this.sources = new Set();
      this.last = null;
      this.disposed = false;
      const node = (method, ...args) => this.keep(context[method](...args));
      this.mix = node('createGain');
      this.highpass = node('createBiquadFilter');
      this.highpass.type = 'highpass';
      this.highpass.frequency.value = 25;
      const comp = node('createDynamicsCompressor');
      comp.threshold.value = -15; comp.knee.value = 16; comp.ratio.value = 8;
      comp.attack.value = 0.003; comp.release.value = 0.10;
      const ceiling = node('createWaveShaper');
      ceiling.curve = Float32Array.from({ length: 4097 }, (_, i) => clamp(2 * i / 4096 - 1, -0.92, 0.92));
      this.master = node('createGain');
      this.master.gain.value = 0;
      this.analyser = node('createAnalyser');
      this.analyser.fftSize = 512;
      this.mix.connect(this.highpass).connect(comp).connect(ceiling).connect(this.master).connect(this.analyser).connect(context.destination);
      this.buses = Object.fromEntries(['bass', ...TRACKS, 'metal'].map(track => {
        const bus = node('createGain'); bus.connect(this.mix); return [track, bus];
      }));
      this.osc = node('createOscillator');
      this.osc.type = state.waveform;
      this.osc.frequency.value = frequency(36);
      const input = node('createGain'); input.gain.value = 0.38;
      this.filter = node('createBiquadFilter'); this.filter.type = 'lowpass'; this.filter.frequency.value = 0;
      this.filter2 = node('createBiquadFilter'); this.filter2.type = 'lowpass'; this.filter2.frequency.value = 0; this.filter2.Q.value = 0.55;
      this.base = node('createConstantSource'); this.base.offset.value = 0;
      this.env = node('createConstantSource'); this.env.offset.value = 0;
      this.base.connect(this.filter.frequency); this.base.connect(this.filter2.frequency);
      this.env.connect(this.filter.frequency); this.env.connect(this.filter2.frequency);
      this.amp = node('createGain'); this.amp.gain.value = 0;
      this.drive = node('createGain');
      const saturator = node('createWaveShaper');
      saturator.curve = Float32Array.from({ length: 4097 }, (_, i) => Math.tanh(3 * (2 * i / 4096 - 1)) / Math.tanh(3));
      saturator.oversample = '2x';
      this.bassLevel = node('createGain');
      this.osc.connect(input).connect(this.filter).connect(this.filter2).connect(this.amp).connect(this.drive).connect(saturator).connect(this.bassLevel).connect(this.buses.bass);
      for (const source of [this.osc, this.base, this.env]) { this.sources.add(source); source.start(); }
      const rng = random(303);
      this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = rng() * 2 - 1;
      this.update(state, true);
    }
    keep(node) { this.nodes.add(node); return node; }
    update(state, immediate = false) {
      if (this.disposed) return;
      const t = this.ctx.currentTime;
      const set = (param, value) => immediate ? param.setValueAtTime(value, t) : param.setTargetAtTime(value, t, 0.018);
      set(this.base.offset, 90 * Math.pow(55, state.knobs.cutoff));
      set(this.filter.Q, 0.7 + state.knobs.resonance * 13);
      set(this.drive.gain, 0.8 + state.knobs.drive * 7);
      set(this.bassLevel.gain, 0.58 / (1 + 0.65 * state.knobs.drive));
      set(this.master.gain, state.volume * 0.8);
      for (const track of ['bass', ...TRACKS]) set(this.buses[track].gain, state.enabled[track] ? 1 : 0);
      set(this.buses.metal.gain, state.metal && state.enabled.metal ? 1 : 0);
      if (this.osc.type !== state.waveform) this.osc.type = state.waveform;
    }
    note(event, time, tickDuration, knobs) {
      const duration = tickDuration * event.ticks;
      const legato = this.last?.slide && Math.abs(this.last.end - time) < 0.002;
      const slide = event.slide && event.nextOn && knobs.slide > 0.02;
      this.osc.frequency.cancelScheduledValues(time);
      if (legato) this.osc.frequency.setTargetAtTime(frequency(event.note), time, 0.008 + knobs.slide * 0.075);
      else this.osc.frequency.setValueAtTime(frequency(event.note), time);
      const amp = this.amp.gain;
      const env = this.env.offset;
      if (!legato) {
        amp.cancelScheduledValues(time);
        amp.setValueAtTime(0, time);
        amp.linearRampToValueAtTime(event.accent ? 0.23 : 0.16, time + 0.004);
        const base = 90 * Math.pow(55, knobs.cutoff);
        const peak = Math.min(14000 - base, base * (Math.pow(2, 1 + knobs.bite * 3) - 1) * (event.accent ? 1.5 : 1));
        env.cancelScheduledValues(time); env.setValueAtTime(0, time);
        env.linearRampToValueAtTime(peak, time + 0.004);
        env.setTargetAtTime(0, time + 0.005, (event.accent ? 0.07 : 0.11) + (1 - knobs.bite) * 0.12);
      }
      if (!slide) {
        const release = time + duration * 0.65;
        amp.setTargetAtTime(0, release, Math.min(0.025, duration * 0.08));
        amp.setValueAtTime(0, time + duration * 0.98);
      }
      this.last = { end: time + duration, slide };
    }
    rest(time) {
      if (this.last?.slide && this.last.end <= time + 0.002) {
        this.amp.gain.cancelScheduledValues(time);
        this.amp.gain.setTargetAtTime(0, time, 0.008);
        this.last = null;
      }
    }
    drum(track, time, tick = 0) {
      const ctx = this.ctx;
      const env = this.keep(ctx.createGain()); env.gain.value = 0;
      const local = [env];
      let source;
      let end;
      if (track === 'kick') {
        source = this.keep(ctx.createOscillator());
        source.frequency.setValueAtTime(155, time);
        source.frequency.exponentialRampToValueAtTime(49, time + 0.085);
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.80, time + 0.002);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.34);
        source.connect(env); end = time + 0.36;
      } else {
        source = this.keep(ctx.createBufferSource()); source.buffer = this.noise;
        const filter = this.keep(ctx.createBiquadFilter()); local.push(filter);
        filter.type = track === 'hat' ? 'highpass' : 'bandpass';
        filter.frequency.value = track === 'hat' ? 7600 : 1600;
        filter.Q.value = track === 'hat' ? 0.7 : 0.6;
        source.connect(filter).connect(env);
        if (track === 'hat') {
          env.gain.setValueAtTime(0, time);
          env.gain.linearRampToValueAtTime(tick % 4 === 2 ? 0.24 : 0.16, time + 0.001);
          env.gain.exponentialRampToValueAtTime(0.001, time + 0.065);
          end = time + 0.08;
        } else {
          for (let burst = 0; burst < 3; burst++) {
            const t = time + burst * 0.009;
            env.gain.setValueAtTime(0.001, t);
            env.gain.linearRampToValueAtTime(0.55 - burst * 0.04, t + 0.001);
            env.gain.exponentialRampToValueAtTime(0.025, t + 0.008);
          }
          env.gain.setValueAtTime(0.30, time + 0.027);
          env.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
          end = time + 0.20;
        }
      }
      env.connect(this.buses[track]); this.sources.add(source); local.push(source);
      source.onended = () => {
        this.sources.delete(source);
        for (const node of local) { node.disconnect(); this.nodes.delete(node); }
      };
      if (track === 'kick') source.start(time);
      else source.start(time, ((tick % 16) * 0.037) % 0.5);
      source.stop(end);
    }
    metalHit(kind, time, duration, strength, pitch) {
      const ctx = this.ctx, nodes = [], sources = [];
      const keep = node => { this.keep(node); nodes.push(node); return node; };
      const amp = keep(ctx.createGain());
      const length = Math.min(kind === 'clang' ? 0.22 : 0.075, duration * 0.94);
      amp.gain.setValueAtTime(0, time);
      amp.gain.linearRampToValueAtTime(0.045 + strength * 0.05, time + 0.002);
      amp.gain.exponentialRampToValueAtTime(0.0001, time + length);
      amp.connect(this.buses.metal);
      if (kind === 'shaka') {
        const src = keep(ctx.createBufferSource()); src.buffer = this.noise;
        const filter = keep(ctx.createBiquadFilter()); filter.type = 'highpass'; filter.frequency.value = 6500;
        src.connect(filter).connect(amp); sources.push(src);
      } else {
        // Inharmonic partials give struck metal; short pitch sweeps give chirps.
        for (const ratio of [1, 1.483, 2.137, 3.791]) {
          const osc = keep(ctx.createOscillator()); osc.type = 'sine';
          const hz = (kind === 'chirp' ? 1700 : 620) * pitch * ratio;
          osc.frequency.setValueAtTime(Math.min(hz, 14000), time);
          if (kind === 'chirp') osc.frequency.exponentialRampToValueAtTime(Math.min(hz * 0.23, 10000), time + length * 0.8);
          osc.connect(amp); sources.push(osc);
        }
      }
      let remaining = sources.length;
      for (const src of sources) {
        this.sources.add(src);
        src.onended = () => {
          this.sources.delete(src);
          if (--remaining === 0) for (const node of nodes) { node.disconnect(); this.nodes.delete(node); }
        };
        src.start(time); src.stop(time + length + 0.005);
      }
    }
    step(event, time, tickDuration, state) {
      if (event.bass && state.enabled.bass) this.note(event.bass, time, tickDuration, state.knobs);
      else this.rest(time);
      // Detune is independent of note/slide frequency automation. Each gesture
      // ends inside this tick so stopping the mode cannot leave a bent note.
      this.osc.detune.setValueAtTime(0, time);
      if (event.jam) {
        const jam = event.jam;
        this.base.offset.setTargetAtTime(90 * Math.pow(55, jam.cutoff), time, 0.012);
        if (jam.move === 0 && state.enabled.bass) {
          for (let n = 0; n < jam.repeats; n++) {
            const start = time + tickDuration * n / jam.repeats;
            this.osc.detune.linearRampToValueAtTime(jam.direction * (300 + jam.strength * 1500), start + tickDuration / jam.repeats * 0.3);
            this.osc.detune.linearRampToValueAtTime(-jam.direction * jam.strength * 700, start + tickDuration / jam.repeats * 0.65);
            this.osc.detune.linearRampToValueAtTime(0, start + tickDuration / jam.repeats * 0.95);
          }
        }
      } else this.base.offset.setTargetAtTime(90 * Math.pow(55, state.knobs.cutoff), time, 0.018);
      for (const track of event.drums) if (state.enabled[track]) this.drum(track, time, event.step);
      if (event.metal && state.metal && state.enabled.metal) {
        const hit = event.metal;
        for (let i = 0; i < hit.count; i++) this.metalHit(hit.kind, time + tickDuration * i / hit.count, tickDuration / hit.count, hit.strength, hit.pitch);
      }
    }
    fadeOut(time = this.ctx.currentTime) {
      this.master.gain.cancelScheduledValues(time);
      this.master.gain.setTargetAtTime(0, time, 0.004);
      this.master.gain.setValueAtTime(0, time + 0.025);
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      for (const source of this.sources) { source.onended = null; try { source.stop(); } catch (_) { /* Already ended. */ } }
      for (const node of this.nodes) node.disconnect();
      this.sources.clear(); this.nodes.clear();
    }
  }

  function encodeWav(channels, sampleRate) {
    if (!Array.isArray(channels) || channels.length < 1 || channels.length > 2 || !channels[0]?.length) throw new Error('Invalid audio channels');
    const frames = channels[0].length;
    if (channels.some(c => c.length !== frames) || !Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Invalid audio format');
    const count = channels.length, bytes = frames * count * 2;
    const buffer = new ArrayBuffer(44 + bytes); const view = new DataView(buffer);
    const text = (at, s) => { for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i)); };
    text(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, count, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * count * 2, true);
    view.setUint16(32, count * 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, bytes, true);
    for (let i = 0, offset = 44; i < frames; i++) for (let c = 0; c < count; c++, offset += 2) {
      const v = Number.isFinite(channels[c][i]) ? clamp(channels[c][i], -1, 1) : 0;
      view.setInt16(offset, Math.round(v * (v < 0 ? 32768 : 32767)), true);
    }
    return buffer;
  }
  async function renderWav(rawState, bars = 4) {
    const state = normalize(rawState);
    if (!Number.isInteger(bars) || bars < 1 || bars > 16) throw new Error('Bars must be 1–16');
    const Offline = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    if (!Offline) throw new Error('This browser does not support WAV rendering.');
    const sr = 44100, tickDuration = 60 / state.bpm / 4, barDuration = tickDuration * 16;
    // Warm up one bar, then crop it: slides/filter history at the loop boundary are preserved.
    const pre = Math.round(barDuration * sr), frames = Math.round(barDuration * bars * sr);
    const ctx = new Offline(2, pre + frames, sr);
    const engine = new Engine(ctx, state);
    try {
      for (let i = 0; i < (bars + 1) * 16; i++) engine.step(jamEvent(state, i, null), i * tickDuration, tickDuration, state);
      const audio = await ctx.startRendering();
      const channels = [0, 1].map(c => audio.getChannelData(c).slice(pre, pre + frames));
      // Tiny edge fades avoid clicks when the rendered file is opened on its own.
      const fade = Math.min(220, Math.floor(frames / 2));
      for (const channel of channels) for (let i = 0; i < fade; i++) {
        channel[i] *= i / fade; channel[frames - 1 - i] *= i / fade;
      }
      return new Blob([encodeWav(channels, sr)], { type: 'audio/wav' });
    } finally { engine.dispose(); }
  }
  const api = { clamp, clone, random, TRACKS, GROOVES, PRESETS, DEFAULT_KNOBS, JAM_MOVES, performanceBpm, jamPlan, jamEvent, initialState, normalize, drumPattern, newRiff, positions, eventsAt, noteName, Engine, encodeWav, renderWav };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QB = api;
})(typeof window !== 'undefined' ? window : globalThis);
