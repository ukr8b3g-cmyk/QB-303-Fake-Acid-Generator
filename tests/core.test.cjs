'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../engine.js');

test('metal scenes are available only when enabled, with legal hit counts and pitches', () => {
  const state = Q.initialState(); state.metal = true;
  const moves = new Set();
  for (let seed = 0; seed < 200; seed++) {
    const plan = Q.jamPlan(seed, 1, false, true); moves.add(plan.move);
    for (let i = 0; i < 16; i++) {
      const hit = Q.jamEvent(state, i, plan).metal;
      assert.ok(['clang', 'shaka', 'chirp'].includes(hit.kind));
      assert.ok(hit.count >= 0 && hit.count <= 2); assert.ok(hit.pitch >= 1 && hit.pitch <= 2);
    }
  }
  assert.equal(moves.size, 9);
  assert.equal(Q.jamEvent(Q.initialState(), 0, Q.jamPlan(3)).metal, undefined);
  assert.equal(Q.normalize(state).metal, true);
});

test('speed variation is bounded and rush returns to the untouched base tempo', () => {
  assert.deepEqual([0, 1, 2, 3, -1].map(i => Q.performanceBpm(128, 303, false, i)), [143, 164, 192, 128, 128]);
  const speeds = new Set();
  for (let seed = 0; seed < 200; seed++) {
    speeds.add(Q.performanceBpm(128, seed, true));
    for (const bpm of [60, 128, 180]) for (const rush of [-1, 0, 1, 2, 3]) {
      const speed = Q.performanceBpm(bpm, seed, true, rush);
      assert.ok(speed >= 60 && speed <= 240);
    }
  }
  assert.equal(speeds.size, 4);
});

test('jam is deterministic, varied and cannot overwrite the source pattern or controls', () => {
  const state = Q.initialState(), before = Q.clone(state), moves = new Set();
  for (let seed = 0; seed < 200; seed++) {
    const plan = Q.jamPlan(seed, 1); moves.add(plan.move);
    assert.deepEqual(plan, Q.jamPlan(seed, 1));
    for (let tick = 0; tick < 16; tick++) {
      const event = Q.jamEvent(state, tick, plan);
      assert.ok(event.jam.cutoff >= 0 && event.jam.cutoff <= 1);
      if (event.bass) { assert.ok(event.bass.note >= 24 && event.bass.note <= 72); assert.ok(event.bass.ticks > 0); }
    }
  }
  assert.equal(moves.size, 6); assert.deepEqual(state, before);
  for (let i = 0; i < 16; i++) {
    const { hook, synth, vox, ...base } = Q.jamEvent(state, i, null);
    assert.deepEqual(base, Q.eventsAt(state, i));
  }
});

test('HOOK repeats over two bars and VOX survives saved settings and mute controls', () => {
  const state = Q.initialState();
  assert.deepEqual(Q.jamEvent(state, 2, null).hook, Q.jamEvent(state, 34, null).hook);
  assert.notDeepEqual(Q.jamEvent(state, 7, null).hook, Q.jamEvent(state, 23, null).hook);
  assert.ok(Q.jamEvent(state, 46, null).vox);
  assert.equal(Q.jamEvent(state, 47, null).vox, null);
  assert.ok(Q.jamEvent(state, 174, null).vox);
  state.hook.variation = 9; state.vox.level = 0.7;
  const saved = Q.normalize(Q.clone(state));
  assert.equal(saved.hook.variation, 9); assert.equal(saved.vox.level, 0.7);
  saved.hook.enabled = false; saved.vox.enabled = false;
  assert.equal(Q.jamEvent(saved, 2, null).hook, null);
  assert.equal(Q.jamEvent(saved, 46, null).vox, null);
});

test('ten HOOK phrases are distinct and repeat over two bars', () => {
  const state = Q.initialState(), signatures = new Set();
  assert.equal(Q.HOOK_PATTERN_COUNT, 10);
  for (let variation = 0; variation < 10; variation++) {
    state.hook.variation = variation;
    const phrase = Array.from({ length: 32 }, (_, tick) => Q.jamEvent(state, tick, null).hook?.note ?? null);
    assert.ok(phrase.filter(Boolean).length >= 6);
    assert.ok(phrase.every(note => note === null || note >= 36 && note <= 96));
    assert.deepEqual(phrase, Array.from({ length: 32 }, (_, tick) => Q.jamEvent(state, tick + 32, null).hook?.note ?? null));
    signatures.add(JSON.stringify(phrase));
  }
  assert.equal(signatures.size, 10);
  assert.equal(Q.normalize({ ...state, hook: { enabled: true, variation: 999 } }).hook.variation, 9);
});

test('synth arrangements have distinct two-bar counterlines and persist', () => {
  const state = Q.initialState(), signatures = new Set();
  assert.deepEqual(Q.ARRANGEMENTS, ['off', 'parade', 'night', 'arcade']);
  assert.equal(Q.jamEvent(state, 0, null).synth, null);
  for (const arrangement of Q.ARRANGEMENTS.slice(1)) {
    state.arrangement = arrangement;
    const phrase = Array.from({ length: 32 }, (_, tick) => Q.jamEvent(state, tick, null).synth?.note ?? null);
    assert.ok(phrase.filter(Boolean).length >= 8);
    assert.deepEqual(phrase, Array.from({ length: 32 }, (_, tick) => Q.jamEvent(state, tick + 32, null).synth?.note ?? null));
    signatures.add(JSON.stringify(phrase));
    assert.equal(Q.normalize(Q.clone(state)).arrangement, arrangement);
  }
  assert.equal(signatures.size, 3);
  assert.equal(Q.normalize({ ...state, arrangement: 'unknown' }).arrangement, 'off');
  const broken = Q.jamEvent(state, 12, { ...Q.jamPlan(303), move: 4 });
  assert.equal(broken.synth, null);
});

test('AUTO MODE uses a four-bar drum phrase and moves every sound knob within bounds', () => {
  const first = Array.from({ length: 4 }, (_, bar) => Q.autoTrackMask(303, bar));
  assert.deepEqual(first[0], { kick: true, hat: true, clap: true });
  assert.deepEqual(first[1], first[0]);
  assert.deepEqual(first[3], first[0]);
  for (const mask of first) assert.ok(Object.values(mask).filter(Boolean).length >= 2);
  assert.deepEqual(first, Array.from({ length: 4 }, (_, bar) => Q.autoTrackMask(303, bar)));
  const base = { ...Q.DEFAULT_KNOBS };
  assert.deepEqual(Q.autoKnobs(base, 7, 303, 0), base);
  const values = Array.from({ length: 64 }, (_, tick) => Q.autoKnobs(base, tick, 303));
  for (const key of Object.keys(base)) {
    assert.ok(values.some(knobs => Math.abs(knobs[key] - base[key]) > 0.01), `${key} should move`);
    assert.ok(values.every(knobs => knobs[key] >= 0 && knobs[key] <= 1));
  }
  assert.deepEqual(base, Q.DEFAULT_KNOBS);
});

test('AUTO MODE rests bass for one 16-step loop, then plays for one loop; BASS RAND refreshes every four', () => {
  assert.deepEqual(Array.from({ length: 8 }, (_, bar) => Q.autoBassRest(bar, true)), [true, false, true, false, true, false, true, false]);
  assert.deepEqual(Array.from({ length: 8 }, (_, bar) => Q.autoBassRest(bar, false)), Array(8).fill(false));
  assert.deepEqual(Q.bassRandomizerPlan(4, 5), { refresh: false });
  const cycle = Array.from({ length: 9 }, (_, bar) => Q.bassRandomizerPlan(bar + 5, 5));
  assert.deepEqual(cycle.map(plan => plan.refresh), [false, false, false, false, true, false, false, false, true]);
});

test('GO MAD forces scratch, stutters respect rests and breaks return on the last tick', () => {
  const s = Q.initialState();
  assert.equal(Q.jamPlan(20, 0, true).move, 0);
  assert.equal(Q.jamPlan(20, 0, true).strength, 1);
  const plan = { ...Q.jamPlan(303), move: 2 };
  s.bass[4].on = false;
  for (let t = 8; t < 16; t++) assert.equal(Q.jamEvent(s, t, plan).bass, null);
  const broken = Q.jamEvent(s, 12, { ...plan, move: 4 });
  assert.equal(broken.bass, null); assert.deepEqual(broken.drums, []);
  assert.deepEqual(Q.jamEvent(s, 15, { ...plan, move: 4 }).drums, Q.eventsAt(s, 15).drums);
});

test('factory creates isolated, valid state', () => {
  const a = Q.initialState(), b = Q.initialState();
  a.bass[0].note = 70; a.knobs.cutoff = 0; a.drums.kick[0] = false;
  assert.equal(b.bass[0].note, 36); assert.equal(b.knobs.cutoff, 0.34); assert.equal(b.drums.kick[0], true);
  assert.deepEqual(Q.normalize(b), b);
});
test('invalid or future-version storage falls back safely', () => {
  for (const value of [null, undefined, '', [], { version: 2 }]) assert.deepEqual(Q.normalize(value), Q.initialState());
});
test('normalization rejects NaN, infinity, malformed controls and unknown choices', () => {
  const raw = { version: 1, bpm: Infinity, volume: NaN, waveform: 'invalid', groove: 'bad', preset: '__proto__', knobs: { cutoff: '1', resonance: NaN }, enabled: { bass: 'false' } };
  const s = Q.normalize(raw), initial = Q.initialState();
  assert.equal(s.bpm, initial.bpm); assert.equal(s.volume, initial.volume);
  assert.equal(s.waveform, 'sawtooth'); assert.equal(s.groove, 'straight'); assert.equal(s.preset, 'four');
  assert.deepEqual(s.knobs, initial.knobs); assert.equal(s.enabled.bass, true);
});
test('numbers are bounded and notes are integral', () => {
  const s = Q.initialState(); s.bpm = -100; s.volume = 10; s.knobs.cutoff = -5; s.knobs.drive = 4;
  s.bass[0].note = 200.1; s.bass[1].note = -44; s.bass[2].note = 42.2;
  const n = Q.normalize(s);
  assert.equal(n.bpm, 60); assert.equal(n.volume, 1); assert.equal(n.knobs.cutoff, 0); assert.equal(n.knobs.drive, 1);
  assert.deepEqual(n.bass.slice(0, 3).map(x => x.note), [72, 24, 42]);
});
test('missing and malformed pattern elements do not crash', () => {
  const n = Q.normalize({ version: 1, bass: Array(8).fill(null), drums: { kick: [true], hat: Array(16).fill('yes') } });
  assert.equal(n.bass.length, 8); assert.equal(n.drums.kick.length, 16); assert.equal(n.drums.hat.some(Boolean), false);
});
test('PRNG and riff are deterministic and seed-sensitive', () => {
  const a = Q.random(303), b = Q.random(303);
  for (let i = 0; i < 100; i++) { const n = a(); assert.equal(n, b()); assert.ok(n >= 0 && n < 1); }
  assert.deepEqual(Q.newRiff(303), Q.newRiff(303)); assert.notDeepEqual(Q.newRiff(303), Q.newRiff(304));
});
test('1000 generated riffs have a root, legal notes and a nonempty pattern', () => {
  for (let seed = 0; seed < 1000; seed++) {
    const riff = Q.newRiff(seed); assert.equal(riff.length, 8); assert.equal(riff[0].note, 36); assert.equal(riff[0].on, true);
    for (const note of riff) { assert.ok([36, 39, 41, 43, 46, 48].includes(note.note)); assert.equal(typeof note.slide, 'boolean'); }
  }
});
test('all groove positions are unique, ordered and inside the bar', () => {
  for (const groove of Q.GROOVES) {
    const p = Q.positions(groove); assert.equal(new Set(p).size, 8);
    assert.deepEqual([...p].sort((a, b) => a - b), p); assert.equal(p[0], 0); assert.ok(p[7] < 16);
  }
});
test('syncopation changes bass onsets, not tempo or the kick pattern', () => {
  const a = Q.initialState(), b = Q.initialState(); b.groove = 'weird';
  assert.notDeepEqual(Q.positions(a.groove), Q.positions(b.groove));
  for (let t = 0; t < 16; t++) assert.deepEqual(Q.eventsAt(a, t).drums, Q.eventsAt(b, t).drums);
});
test('every groove has positive note lengths totaling 16 ticks, including wrap', () => {
  for (const groove of Q.GROOVES) {
    const s = Q.initialState(); s.groove = groove; s.bass.forEach(n => { n.on = true; });
    const events = Array.from({ length: 16 }, (_, t) => Q.eventsAt(s, t).bass).filter(Boolean);
    assert.equal(events.length, 8); assert.equal(events.reduce((sum, e) => sum + e.ticks, 0), 16);
    assert.ok(events.every(e => e.ticks > 0 && e.nextOn));
  }
});
test('rests suppress notes and break outgoing slides', () => {
  const s = Q.initialState(); s.bass[1].on = false;
  assert.equal(Q.eventsAt(s, 0).bass.nextOn, false); assert.equal(Q.eventsAt(s, 2).bass, null);
});
test('step events repeat exactly each bar', () => {
  const s = Q.initialState();
  for (let i = 0; i < 64; i++) assert.deepEqual(Q.eventsAt(s, i), Q.eventsAt(s, i + 16));
});
test('drum presets have 16 booleans per track and independent copies', () => {
  for (const preset of Object.keys(Q.PRESETS)) {
    const pattern = Q.drumPattern(preset);
    for (const track of Q.TRACKS) { assert.equal(pattern[track].length, 16); assert.ok(pattern[track].every(v => typeof v === 'boolean')); }
  }
  const p = Q.drumPattern(); p.kick[0] = false; assert.equal(Q.drumPattern().kick[0], true);
});
test('note names use MIDI C4 = 60', () => { assert.equal(Q.noteName(36), 'C2'); assert.equal(Q.noteName(60), 'C4'); });
test('WAV header describes interleaved stereo 16-bit PCM', () => {
  const result = Q.encodeWav([Float32Array.of(-1, 0, 1), Float32Array.of(1, 0, -1)], 44100);
  const v = new DataView(result); const text = (at, n) => Buffer.from(result, at, n).toString();
  assert.equal(text(0, 4), 'RIFF'); assert.equal(text(8, 4), 'WAVE'); assert.equal(text(36, 4), 'data');
  assert.equal(v.getUint32(4, true), 48); assert.equal(v.getUint16(20, true), 1); assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getUint32(24, true), 44100); assert.equal(v.getUint32(28, true), 176400);
  assert.equal(v.getUint16(32, true), 4); assert.equal(v.getUint16(34, true), 16); assert.equal(v.getUint32(40, true), 12);
  assert.equal(v.getInt16(44, true), -32768); assert.equal(v.getInt16(46, true), 32767); assert.equal(v.getInt16(52, true), 32767);
});
test('WAV clamps extreme samples and turns nonfinite values into silence', () => {
  const v = new DataView(Q.encodeWav([Float32Array.of(-5, 5, NaN, Infinity)], 48000));
  assert.deepEqual(Array.from({ length: 4 }, (_, i) => v.getInt16(44 + i * 2, true)), [-32768, 32767, 0, 0]);
});
test('WAV rejects invalid channel counts, lengths and rates', () => {
  for (const channels of [[], [new Float32Array(0)], [Float32Array.of(1), Float32Array.of(1, 2)], [Float32Array.of(1), Float32Array.of(1), Float32Array.of(1)]]) assert.throws(() => Q.encodeWav(channels, 44100));
  assert.throws(() => Q.encodeWav([Float32Array.of(1)], 0));
});
test('live DSP exposes lifecycle methods and export validates bar count', async () => {
  for (const method of ['update', 'note', 'rest', 'drum', 'step', 'fadeOut', 'dispose']) assert.equal(typeof Q.Engine.prototype[method], 'function');
  await assert.rejects(Q.renderWav(Q.initialState(), 0), /Bars/);
  await assert.rejects(Q.renderWav(Q.initialState(), 100), /Bars/);
});

test('unknown and prototype-name presets fall back to the four-beat pattern', () => {
  for (const key of ['missing', '__proto__', 'constructor']) assert.deepEqual(Q.drumPattern(key), Q.drumPattern('four'));
});
