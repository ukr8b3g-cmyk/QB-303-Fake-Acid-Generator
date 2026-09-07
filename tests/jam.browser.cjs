/* Optional: NODE_PATH may point to an existing Playwright installation.
   node tests/jam.browser.cjs <Chromium executable> */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[2] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1120 }, acceptDownloads: true });
    const errors = []; page.on('pageerror', e => { errors.push(String(e)); console.error(e); });
    let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    html = html.replace('<link rel="stylesheet" href="style.css">', `<style>${fs.readFileSync(path.join(root, 'style.css'), 'utf8')}</style>`);
    for (const name of ['engine.js', 'app.js']) html = html.replace(`<script src="${name}" defer></script>`, '');
    html = html.replace('</body>', () => ['engine.js', 'app.js'].map(name => `<script>${fs.readFileSync(path.join(root, name), 'utf8')}</script>`).join('') + '</body>');
    await page.setContent(html);
    assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'false');
    await page.click('#auto-jam'); await page.click('#hold-riff');
    const notes = await page.locator('.pad-note').allTextContents();
    await page.locator('#bpm').fill('180'); await page.locator('#bpm').dispatchEvent('change');
    await page.click('#play');
    await page.waitForFunction(() => QB.JAM_MOVES.includes(document.querySelector('#jam-now').textContent));
    await page.waitForTimeout(3200);
    assert.deepEqual(await page.locator('.pad-note').allTextContents(), notes);
    await page.click('#go-mad');
    await page.waitForFunction(() => document.querySelector('#jam-now').textContent === 'SCRATCH!');
    await page.click('#calm');
    await page.waitForFunction(() => document.querySelector('#jam-now').textContent === 'YOUR HANDS. YOUR NOISE.');
    assert.equal(await page.locator('#auto-jam').getAttribute('aria-pressed'), 'false');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'false');
    await page.click('#go-mad');
    await page.waitForFunction(() => document.querySelector('#jam-now').textContent === 'SCRATCH!');
    await page.waitForFunction(() => document.querySelector('#jam-now').textContent === 'YOUR HANDS. YOUR NOISE.');
    await page.keyboard.press('Escape');
    await page.click('#auto-jam'); await page.click('#play');
    await page.waitForFunction(() => document.querySelector('#play').getAttribute('aria-pressed') === 'true');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'false');
    await page.evaluate(() => { delete document.hidden; });
    await page.click('#auto-jam');
    await page.click('#metal');
    assert.equal(await page.locator('#metal').getAttribute('aria-pressed'), 'true');
    const palettes = new Set();
    for (let i = 0; i < 5; i++) { await page.click('#color-pop'); palettes.add(await page.locator('.machine').getAttribute('data-color')); }
    assert.equal(palettes.size, 5);
    await page.click('#rush');
    await page.waitForFunction(() => document.querySelector('#jam-now').textContent.startsWith('RUSH 1/4'));
    await page.waitForFunction(() => document.querySelector('#jam-now').textContent.startsWith('RUSH 3/4'));
    assert.equal(await page.locator('#live-bpm').innerText(), '240 BPM');
    assert.equal(await page.locator('#bpm').inputValue(), '180');
    await page.waitForFunction(() => document.querySelector('#jam-now').textContent.startsWith('RUSH 4/4'));
    assert.equal(await page.locator('#live-bpm').innerText(), '180 BPM');
    await page.click('#speed-wander');
    await page.waitForFunction(() => document.querySelector('#live-bpm').textContent !== '180 BPM', { timeout: 15000 });
    await page.click('#calm');
    await page.waitForFunction(() => document.querySelector('#live-bpm').textContent === '180 BPM');
    assert.equal(await page.locator('.machine').getAttribute('data-color'), 'classic');
    assert.equal(await page.locator('#metal').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#speed-wander').getAttribute('aria-pressed'), 'false');
    await page.keyboard.press('Escape');
    const audio = await page.evaluate(async () => {
      const results = [];
      for (let move = 0; move < QB.JAM_MOVES.length; move++) for (const muted of [false, true]) {
        const s = QB.initialState(); s.volume = 1; s.metal = move >= 6;
        // New scenes are solo metal, proving these voices produce their own audio.
        if (move >= 6) for (const k of ['bass', ...QB.TRACKS]) s.enabled[k] = false;
        if (muted) for (const k of Object.keys(s.enabled)) s.enabled[k] = false;
        const ctx = new OfflineAudioContext(2, 44100 * 4, 44100), engine = new QB.Engine(ctx, s);
        const plan = { ...QB.jamPlan(303, 1), move };
        for (let t = 0; t < 32; t++) engine.step(QB.jamEvent(s, t, t < 16 ? plan : null), t * 0.12, 0.12, s);
        const buffer = await ctx.startRendering(), data = buffer.getChannelData(0);
        let peak = 0, sum = 0;
        for (const v of data) { if (!Number.isFinite(v)) throw Error('Nonfinite audio'); peak = Math.max(peak, Math.abs(v)); sum += v * v; }
        results.push({ move, muted, peak, rms: Math.sqrt(sum / data.length), detune: engine.osc.detune.value });
        engine.dispose();
      }
      return results;
    });
    for (const item of audio) {
      assert.ok(item.peak <= 0.737, JSON.stringify(item));
      assert.ok(item.muted ? item.peak === 0 : item.rms > 0.001, JSON.stringify(item));
      assert.equal(item.detune, 0);
    }
    const output = path.join(root, '.test-output'); fs.mkdirSync(output, { recursive: true });
    const downloadEvent = page.waitForEvent('download'); await page.click('#save');
    const download = await downloadEvent; await download.saveAs(path.join(output, 'jam-base.wav'));
    assert.equal(fs.readFileSync(path.join(output, 'jam-base.wav')).toString('ascii', 0, 4), 'RIFF');
    await page.click('#color-pop');
    for (const width of [320, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1120 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}`);
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, `jam-${width}.png`), fullPage: true });
    }
    assert.deepEqual(errors, []);
    const reduced = await browser.newPage({ reducedMotion: 'reduce' });
    await reduced.setContent(html);
    assert.equal(await reduced.locator('#lights').getAttribute('aria-pressed'), 'false');
    await reduced.close();
    const report = { audio, errors, checks: ['no autoplay', 'HOLD RIFF', 'queued GO MAD', 'CALM DOWN', 'Escape', 'one-bar GO MAD from stopped', 'visibility stops AUTO JAM', 'reduced motion disables LEDs', '18 offline audio cases including solo metal, bounded peaks, mute and detune reset', 'METAL toggle', 'five palettes', 'RUSH accelerates and returns without changing base BPM', 'WILD SPEED varies tempo', 'WAV download', '6 responsive widths'] };
    fs.writeFileSync(path.join(output, 'jam-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
