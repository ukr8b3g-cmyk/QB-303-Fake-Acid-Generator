/* UI and transport. Audio is scheduled on the audio clock, never on animation frames. */
(() => {
  'use strict';
  const Q = window.QB;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const STORAGE = 'qb303.session.v1';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let state = Q.initialState();
  state.lights = !motion.matches;
  try { const saved = localStorage.getItem(STORAGE); if (saved) state = Q.normalize(JSON.parse(saved)); } catch (_) { /* Storage is optional, including file:// and private browsing. */ }
  if (motion.matches) state.lights = false;
  let context = null, engine = null, previewEngine = null;
  let running = false, starting = false, startToken = 0;
  let timer = null, frame = null, previewTimer = null, saveTimer = null;
  let tick = 0, nextTime = 0, bar = null;
  let visuals = [];
  const pulses = new Map();
  const canvas = $('#scope'), brush = canvas.getContext('2d');
  const wave = new Float32Array(512);
  const knobs = [
    ['cutoff', 'GYUUU', 'CUTOFF', '音をひらく'],
    ['resonance', 'SQUELCH', 'RESONANCE', 'クセをつける'],
    ['bite', 'BITE', 'ENV + ACCENT', 'キュッとさせる'],
    ['slide', 'SLIDE', 'GLIDE', 'ぬるっとつなぐ'],
    ['drive', 'DIRTY', 'OVERDRIVE', 'ちょっと汚す']
  ];
  const say = text => { $('#status').textContent = text; };
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch (_) { /* No storage permission: keep this session in memory. */ } }, 150);
  }
  function changed() {
    engine?.update(state);
    syncView();
    persist();
  }
  function patternMessage(text) { say(text + (running ? ' 次の小節から反映。' : '')); }

  // Native buttons plus keyboard-operable sliders; no framework, fonts or icon downloads.
  for (const [key, label, technical, caption] of knobs) {
    const block = document.createElement('div'); block.className = 'knob-block';
    block.innerHTML = `<div class="knob-top"><span class="knob-name" id="label-${key}">${label}</span><output class="knob-value" id="value-${key}"></output></div><div class="dial" data-knob="${key}" role="slider" tabindex="0" aria-labelledby="label-${key}" aria-valuemin="0" aria-valuemax="100" aria-orientation="vertical" title="上下ドラッグ / 矢印キー / ダブルクリックでリセット"><span class="knob-cap" aria-hidden="true"></span></div><div class="knob-caption">${technical}</div><div class="knob-jp">${caption}</div>`;
    $('#knobs').append(block);
    const dial = block.querySelector('.dial');
    let drag = null;
    const set = value => { state.knobs[key] = Q.clamp(value); changed(); };
    dial.addEventListener('pointerdown', e => {
      if (e.button !== 0 || drag) return;
      e.preventDefault(); dial.focus({ preventScroll: true });
      drag = { id: e.pointerId, y: e.clientY, x: e.clientX, value: state.knobs[key] };
      dial.setPointerCapture(e.pointerId);
    });
    dial.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      set(drag.value + (drag.y - e.clientY + (e.clientX - drag.x) * 0.35) / (e.shiftKey ? 1000 : 180));
    });
    const release = e => { if (drag?.id === e.pointerId) drag = null; };
    dial.addEventListener('pointerup', release); dial.addEventListener('pointercancel', release); dial.addEventListener('lostpointercapture', release);
    dial.addEventListener('dblclick', () => set(Q.DEFAULT_KNOBS[key]));
    dial.addEventListener('keydown', e => {
      const direction = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
      if (direction) { e.preventDefault(); set(state.knobs[key] + direction * (e.shiftKey ? 0.001 : 0.01)); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); set(e.key === 'Home' ? 0 : 1); }
    });
  }
  for (let i = 0; i < 8; i++) {
    const button = document.createElement('button'); button.className = 'bass-pad'; button.dataset.bass = i;
    button.innerHTML = `<span class="pad-number">0${i + 1}</span><span class="pad-note"></span><span class="pad-marks"><i class="accent-dot"></i><i class="slide-mark">↗</i></span>`;
    button.addEventListener('click', () => {
      state.bass[i].on = !state.bass[i].on; changed();
      if (state.bass[i].on && !running) audition('bass', i, button);
    });
    $('#bass-grid').append(button);
  }
  for (const track of Q.TRACKS) {
    const row = document.createElement('div'); row.className = 'drum-row';
    const label = document.createElement('button'); label.className = 'track-toggle'; label.dataset.track = track;
    label.setAttribute('aria-label', `${track.toUpperCase()} の有効・無効`);
    label.innerHTML = `<i class="led track-led" data-hit="${track}"></i>${track.toUpperCase()}`;
    row.append(label);
    const grid = document.createElement('div'); grid.className = 'drum-steps'; grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', track.toUpperCase());
    for (let i = 0; i < 16; i++) {
      const button = document.createElement('button'); button.className = 'drum-step'; button.dataset.drum = track; button.dataset.step = i;
      button.setAttribute('aria-label', `${track.toUpperCase()} ステップ ${i + 1}`);
      button.addEventListener('click', () => {
        state.drums[track][i] = !state.drums[track][i]; state.preset = 'custom'; changed();
        if (state.drums[track][i] && !running) audition(track, i, button);
      });
      grid.append(button);
    }
    row.append(grid); $('#drum-grid').append(row);
  }
  const bassPads = $$('.bass-pad'), drumPads = $$('.drum-step');
  function syncView() {
    $('#bpm').value = state.bpm;
    $('#volume').value = Math.round(state.volume * 100);
    $('#volume-value').value = Math.round(state.volume * 100);
    for (const [key] of knobs) {
      const value = Math.round(state.knobs[key] * 100), dial = $(`[data-knob="${key}"]`);
      dial.style.setProperty('--value', state.knobs[key]); dial.setAttribute('aria-valuenow', value);
      dial.setAttribute('aria-valuetext', `${value}%`); $(`#value-${key}`).value = String(value).padStart(2, '0');
    }
    for (const [attribute, value] of [['wave', state.waveform], ['groove', state.groove], ['preset', state.preset]]) {
      $$(`[data-${attribute}]`).forEach(el => el.setAttribute('aria-pressed', String(el.dataset[attribute] === value)));
    }
    $$('[data-track]').forEach(el => el.setAttribute('aria-pressed', String(state.enabled[el.dataset.track])));
    bassPads.forEach((pad, i) => {
      const step = state.bass[i]; pad.setAttribute('aria-pressed', String(step.on));
      pad.setAttribute('aria-label', `ベース ${i + 1}: ${Q.noteName(step.note)}${step.accent ? ' アクセント' : ''}${step.slide ? ' スライド' : ''}`);
      pad.querySelector('.pad-note').textContent = Q.noteName(step.note);
      pad.querySelector('.accent-dot').style.visibility = step.accent ? 'visible' : 'hidden';
      pad.querySelector('.slide-mark').style.visibility = step.slide ? 'visible' : 'hidden';
    });
    drumPads.forEach(pad => pad.setAttribute('aria-pressed', String(state.drums[pad.dataset.drum][+pad.dataset.step])));
    $('#lights').setAttribute('aria-pressed', String(state.lights));
    document.body.classList.toggle('lights-off', !state.lights);
    if (!state.lights) clearLights();
  }
  function syncTransport() {
    $('#play').setAttribute('aria-pressed', String(running));
    $('#play-icon').textContent = running ? '■' : '▶';
    $('#play-label').textContent = running ? 'STOP IT' : "LET'S GO";
    document.body.classList.toggle('running', running);
  }
  function audioContext() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Web Audio API に対応したブラウザで開いてください。');
    if (!context || context.state === 'closed') {
      context = new Audio({ latencyHint: 'interactive' });
      context.addEventListener('statechange', () => {
        if (running && context.state !== 'running') stop('音声が中断されました。LET\'S GO で再開できます。');
      });
    }
    return context;
  }
  async function resume(ctx) {
    let timeout;
    try {
      await Promise.race([ctx.resume(), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('音声を開始できませんでした。もう一度 LET\'S GO を押してください。')), 4000); })]);
    } finally { clearTimeout(timeout); }
  }
  function clearPreview() {
    clearTimeout(previewTimer);
    if (previewEngine) { const old = previewEngine; old.fadeOut(); setTimeout(() => old.dispose(), 35); previewEngine = null; }
  }
  async function start() {
    if (running || starting) return;
    const token = ++startToken; starting = true; $('#play').disabled = true;
    try {
      const ctx = audioContext(); await resume(ctx);
      if (token !== startToken || document.hidden) return;
      clearPreview();
      engine = new Q.Engine(ctx, state); running = true;
      tick = 0; nextTime = ctx.currentTime + 0.045; visuals = []; bar = Q.clone(state);
      syncTransport(); schedule(); timer = setInterval(schedule, 25); ensureFrame();
      say('ノブを回して遊ぼう。音が大きいときは VOLUME を下げてください。');
    } catch (error) { stop(error.message || '音声の初期化に失敗しました。'); }
    finally { if (token === startToken) starting = false; $('#play').disabled = false; }
  }
  function stop(message = '停止しました。設定はそのままです。') {
    ++startToken; starting = false; running = false; $('#play').disabled = false;
    clearInterval(timer); timer = null; visuals = [];
    if (engine) { const old = engine; old.fadeOut(); setTimeout(() => old.dispose(), 35); engine = null; }
    clearPreview(); clearLights();
    if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
    $('#step-counter').textContent = '-- / 16'; syncTransport(); drawScope(null); say(message);
  }
  function schedule() {
    if (!running || !engine) return;
    const ctx = engine.ctx;
    if (nextTime < ctx.currentTime - 0.15) { stop('処理が一時停止したため安全に停止しました。LET\'S GO で再開。'); return; }
    try {
      while (nextTime < ctx.currentTime + 0.10) {
        if (tick % 16 === 0) bar = Q.clone(state);
        const duration = 60 / bar.bpm / 4;
        const event = Q.eventsAt(bar, tick);
        engine.step(event, nextTime, duration, state);
        visuals.push({ ...event, time: nextTime, cursor: Q.positions(bar.groove).findLastIndex(p => p <= event.step), enabled: { ...state.enabled }, slide: state.knobs.slide });
        nextTime += duration; tick++;
      }
    } catch (_) { stop('音声処理を停止しました。LET\'S GO で再開してください。'); }
  }
  // Compensate for the output buffer when supported. LEDs follow heard audio, not look-ahead scheduling.
  function heardTime() {
    if (!context) return 0;
    const timestamp = context.getOutputTimestamp?.();
    if (timestamp?.contextTime > 0 && timestamp.performanceTime > 0) return Math.min(context.currentTime, timestamp.contextTime + (performance.now() - timestamp.performanceTime) / 1000);
    return context.currentTime - ((context.outputLatency || 0) + (context.baseLatency || 0));
  }
  function pulse(element, milliseconds = 110, slide = false) {
    if (!element || !state.lights) return;
    element.classList.add('hit'); if (slide) element.classList.add('sliding');
    pulses.set(element, performance.now() + milliseconds); ensureFrame();
  }
  function clearLights() {
    $$('.hit,.current,.sliding').forEach(el => el.classList.remove('hit', 'current', 'sliding')); pulses.clear();
  }
  function ensureFrame() { if (frame === null) frame = requestAnimationFrame(animate); }
  function animate(now) {
    frame = null;
    const clock = heardTime();
    while (visuals.length && visuals[0].time <= clock) {
      const event = visuals.shift();
      $('#step-counter').textContent = `${String(event.step + 1).padStart(2, '0')} / 16`;
      if (state.lights) {
        $$('.current').forEach(el => el.classList.remove('current'));
        bassPads[event.cursor]?.classList.add('current');
        drumPads.filter(el => +el.dataset.step === event.step).forEach(el => el.classList.add('current'));
        let sounding = false;
        if (event.bass && event.enabled.bass && state.enabled.bass) {
          pulse(bassPads[event.bass.index], event.bass.accent ? 145 : 100, event.bass.slide && event.slide > 0.02);
          pulse($('[data-hit="bass"]')); sounding = true;
        }
        for (const track of event.drums) if (event.enabled[track] && state.enabled[track]) {
          pulse($(`[data-drum="${track}"][data-step="${event.step}"]`)); pulse($(`[data-hit="${track}"]`)); sounding = true;
        }
        if (sounding) pulse($('#beat-led'), 75);
      }
    }
    for (const [el, end] of pulses) if (end <= now) { el.classList.remove('hit', 'sliding'); pulses.delete(el); }
    drawScope(engine || previewEngine);
    if (running || previewEngine || pulses.size) ensureFrame();
  }
  function drawScope(active) {
    if (!brush) return;
    const w = canvas.width, h = canvas.height;
    brush.fillStyle = '#12180f'; brush.fillRect(0, 0, w, h);
    brush.strokeStyle = '#23331a'; brush.lineWidth = 1;
    brush.beginPath(); for (let x = 0; x < w; x += 26) { brush.moveTo(x, 0); brush.lineTo(x, h); }
    for (let y = 0; y < h; y += 20) { brush.moveTo(0, y); brush.lineTo(w, y); } brush.stroke();
    $('#scope-idle').style.display = active ? 'none' : 'block';
    if (active && state.lights) active.analyser.getFloatTimeDomainData(wave); else wave.fill(0);
    brush.strokeStyle = '#dfff00'; brush.lineWidth = 2; brush.beginPath();
    for (let i = 0; i < wave.length; i++) { const x = i / (wave.length - 1) * w, y = h * 0.62 - wave[i] * h * 1.1; if (!i) brush.moveTo(x, y); else brush.lineTo(x, y); }
    brush.stroke();
  }
  async function audition(track, index, pad) {
    if (!state.enabled[track]) return;
    const token = startToken;
    try {
      const ctx = audioContext(); await resume(ctx);
      if (running || starting || token !== startToken || document.hidden) return;
      clearPreview(); previewEngine = new Q.Engine(ctx, state);
      const time = ctx.currentTime + 0.01;
      if (track === 'bass') previewEngine.note({ ...state.bass[index], ticks: 2, nextOn: false }, time, 0.12, state.knobs);
      else previewEngine.drum(track, time, index);
      pulse(pad); pulse($(`[data-hit="${track}"]`)); ensureFrame();
      previewTimer = setTimeout(() => { clearPreview(); drawScope(null); }, 430);
    } catch (error) { say(error.message || '試聴できませんでした。'); }
  }

  $('#play').addEventListener('click', () => running ? stop() : start());
  $('#bpm').addEventListener('change', e => {
    const value = Number(e.target.value);
    if (e.target.value.trim() && Number.isFinite(value)) state.bpm = Math.round(Q.clamp(value, 60, 180));
    changed(); patternMessage(`テンポ ${state.bpm} BPM。`);
  });
  for (const [id, difference] of [['slower', -1], ['faster', 1]]) $(`#${id}`).addEventListener('click', () => { state.bpm = Q.clamp(state.bpm + difference, 60, 180); changed(); patternMessage(`テンポ ${state.bpm} BPM。`); });
  $('#volume').addEventListener('input', e => { state.volume = Number(e.target.value) / 100; changed(); });
  $$('[data-wave]').forEach(el => el.addEventListener('click', () => { state.waveform = el.dataset.wave; changed(); }));
  $$('[data-groove]').forEach(el => el.addEventListener('click', () => { state.groove = el.dataset.groove; changed(); patternMessage(`ノリを ${el.textContent} に変更。`); }));
  $$('[data-track]').forEach(el => el.addEventListener('click', () => { state.enabled[el.dataset.track] = !state.enabled[el.dataset.track]; changed(); }));
  $$('[data-preset]').forEach(el => el.addEventListener('click', () => { state.preset = el.dataset.preset; state.drums = Q.drumPattern(state.preset); changed(); patternMessage(`ドラムを ${el.textContent} に変更。`); }));
  $('#random').addEventListener('click', () => { state.seed = (state.seed + 0x9e3779b9) >>> 0; state.bass = Q.newRiff(state.seed); changed(); patternMessage('新しいベースが出ました。'); });
  $('#mutate').addEventListener('click', () => {
    state.seed = (state.seed + 1) >>> 0; const rng = Q.random(state.seed), index = Math.floor(rng() * 8);
    const candidate = Q.newRiff(state.seed)[index];
    if (candidate.note === state.bass[index].note) candidate.note = candidate.note === 48 ? 43 : 48;
    state.bass[index] = { ...candidate, on: true }; changed(); patternMessage(`ベースの ${index + 1} 番だけ変えました。`);
  });
  $('#acid').addEventListener('click', () => {
    for (const [key, amount] of [['cutoff', 0.055], ['resonance', 0.075], ['bite', 0.09], ['slide', 0.09], ['drive', 0.065]]) state.knobs[key] = Math.min(1, state.knobs[key] + amount);
    changed(); say('MORE ACID! 音量設定はそのまま。戻すときは CALM DOWN。');
  });
  $('#calm').addEventListener('click', () => { state.knobs = { ...Q.DEFAULT_KNOBS }; changed(); say('音色を初期値に戻しました。パターンと音量はそのまま。'); });
  $('#lights').addEventListener('click', () => { state.lights = !state.lights; changed(); drawScope(engine || previewEngine); });
  motion.addEventListener('change', e => { if (e.matches) { state.lights = false; changed(); } });
  $('#save').addEventListener('click', async () => {
    const button = $('#save'); button.disabled = true;
    const snapshot = Q.clone(state); say('4小節の WAV を作成しています…');
    try {
      const blob = await Q.renderWav(snapshot, 4);
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `QB-303_${snapshot.bpm}bpm_${snapshot.seed}.wav`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      say('WAV を書き出しました。現在の設定・4小節 / 44.1kHz / 16bit。');
    } catch (error) { say(error.message || 'WAV の書き出しに失敗しました。'); }
    finally { button.disabled = false; }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); stop(); return; }
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,select,button,[role="slider"],[contenteditable="true"]')) return;
    if (e.code === 'Space') { e.preventDefault(); running ? stop() : start(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop('画面を離れたため停止しました。LET\'S GO で再開。');
      setTimeout(() => { if (!running && !starting && !previewEngine) context?.suspend().catch(() => {}); }, 50);
    }
  });
  window.addEventListener('pagehide', () => {
    try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch (_) { /* Optional persistence. */ }
    stop(); context?.close().catch(() => {});
  });
  syncView(); syncTransport(); drawScope(null);
})();
