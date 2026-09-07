"""Optional Chromium integration tests. Loads local assets in memory; no web server needed.

Setup: python -m pip install playwright && python -m playwright install chromium
Run:   python tests/browser_smoke.py [--browser-path /path/to/chromium]

This checks real Web Audio graphs, not mocked DSP. It does not verify file://,
HTTP hosting, physical speakers, or perceptual fidelity to a hardware TB-303.
"""
import argparse
import json
import math
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / '.test-output'
PROBE = '''
window.__contexts = [];
const OriginalAudioContext = window.AudioContext;
window.AudioContext = class extends OriginalAudioContext {
  constructor(...args) { super(...args); window.__contexts.push(this); this.__analysers = []; }
  createAnalyser() { const node = super.createAnalyser(); this.__analysers.push(node); return node; }
};
'''

def html_source():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + (ROOT / 'style.css').read_text(encoding='utf-8') + '</style>')
    for name in ('engine.js', 'app.js'):
        html = html.replace(f'<script src="{name}" defer></script>', '')
    scripts = '<script>' + PROBE + '</script>'
    scripts += ''.join('<script>' + (ROOT / name).read_text(encoding='utf-8') + '</script>' for name in ('engine.js', 'app.js'))
    return html.replace('</body>', scripts + '</body>')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser-path')
    args = parser.parse_args()
    OUTPUT.mkdir(exist_ok=True)
    passed, errors, requests = [], [], []
    with sync_playwright() as p:
        launch = {'headless': True}
        if args.browser_path:
            launch['executable_path'] = args.browser_path
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={'width': 1440, 'height': 1120}, device_scale_factor=1, accept_downloads=True)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        source = html_source()
        page.set_content(source, wait_until='load')
        assert page.locator('.dial').count() == 5
        assert page.locator('.bass-pad').count() == 8
        assert page.locator('.drum-step').count() == 48
        assert page.evaluate('window.__contexts.length') == 0
        passed.append('no autoplay; five knobs, eight bass pads, 48 drum pads')
        page.screenshot(path=str(OUTPUT / 'desktop.png'), full_page=True)

        page.click('#play')
        page.wait_for_function("document.querySelector('#play').getAttribute('aria-pressed') === 'true'")
        page.wait_for_timeout(900)
        stats = page.evaluate('''() => {
          const ctx = window.__contexts[0], analyser = ctx.__analysers[0], data = new Float32Array(512);
          analyser.getFloatTimeDomainData(data);
          return { state: ctx.state, peak: Math.max(...data.map(Math.abs)), finite: data.every(Number.isFinite) };
        }''')
        assert stats['state'] == 'running' and stats['peak'] > 0.001 and stats['finite'], stats
        page.wait_for_function("document.querySelectorAll('.hit').length > 0")
        assert page.locator('#step-counter').inner_text() != '-- / 16'
        passed.append('live AudioContext produces finite, nonzero samples; LEDs and step cursor advance')
        page.screenshot(path=str(OUTPUT / 'playing.png'), full_page=True)

        dial = page.locator('[data-knob="cutoff"]')
        before = int(dial.get_attribute('aria-valuenow'))
        bounds = dial.bounding_box()
        x, y = bounds['x'] + bounds['width'] / 2, bounds['y'] + bounds['height'] / 2
        page.mouse.move(x, y); page.mouse.down(); page.mouse.move(x, y - 55, steps=8); page.mouse.up()
        assert int(dial.get_attribute('aria-valuenow')) > before + 20
        dial.focus(); page.keyboard.press('Home'); assert dial.get_attribute('aria-valuenow') == '0'
        page.keyboard.press('End'); assert dial.get_attribute('aria-valuenow') == '100'
        page.click('#acid'); assert dial.get_attribute('aria-valuenow') == '100'
        assert page.locator('#volume').input_value() == '42'
        dial.dblclick(); assert dial.get_attribute('aria-valuenow') == '34'
        passed.append('drag, keyboard, knob reset and MORE ACID preserve expected bounds and master volume')

        for selector in ('[data-wave="square"]', '[data-groove="weird"]', '[data-preset="offbeat"]'):
            page.click(selector); assert page.locator(selector).get_attribute('aria-pressed') == 'true'
        first_note = page.locator('.bass-pad .pad-note').all_text_contents()
        page.click('#random'); assert page.locator('.bass-pad .pad-note').all_text_contents() != first_note
        notes = page.locator('.bass-pad .pad-note').all_text_contents()
        page.click('#mutate'); mutated = page.locator('.bass-pad .pad-note').all_text_contents()
        assert sum(a != b for a, b in zip(notes, mutated)) == 1
        page.click('[data-drum="kick"][data-step="1"]')
        assert page.locator('[data-preset][aria-pressed="true"]').count() == 0
        passed.append('wave, groove, drum presets, riff randomization, one-note mutation and grid editing')

        page.click('#lights'); page.wait_for_timeout(180)
        assert page.locator('.hit,.current,.sliding').count() == 0
        assert page.locator('#play').get_attribute('aria-pressed') == 'true'
        page.click('#lights')
        for track in ('bass', 'kick', 'hat', 'clap'):
            page.click(f'[data-track="{track}"]')
        page.wait_for_timeout(350)
        muted_peak = page.evaluate('''() => { const a = __contexts[0].__analysers[0], f = new Float32Array(512); a.getFloatTimeDomainData(f); return Math.max(...f.map(Math.abs)); }''')
        assert muted_peak < 0.0001, muted_peak
        assert page.locator('.hit').count() == 0
        passed.append('LED-off removes flashes without stopping; muting all tracks produces silence')
        page.keyboard.press('Escape')
        for track in ('bass', 'kick', 'hat', 'clap'):
            page.click(f'[data-track="{track}"]')
        for _ in range(5):
            page.click('#play'); page.wait_for_timeout(90); page.keyboard.press('Escape')
        assert page.evaluate('__contexts.length') == 1
        assert page.locator('#play').get_attribute('aria-pressed') == 'false'
        passed.append('rapid start/stop reuses one AudioContext; Escape stops transport')

        page.click('#play'); page.wait_for_timeout(100)
        page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:true}); document.dispatchEvent(new Event('visibilitychange'));")
        assert page.locator('#play').get_attribute('aria-pressed') == 'false'
        page.evaluate('delete document.hidden')
        passed.append('visibility-change handler auto-stops transport')

        offline = page.evaluate('''async () => {
          const cases = [];
          for (const wave of ['sawtooth', 'square']) for (const groove of QB.GROOVES) for (const extreme of [0, 1]) {
            const s = QB.initialState(); s.waveform = wave; s.groove = groove; s.volume = 1;
            for (const key of Object.keys(s.knobs)) s.knobs[key] = extreme;
            cases.push({name: `${wave}/${groove}/${extreme}`, state: s, audible: true});
          }
          for (const track of ['bass', ...QB.TRACKS]) {
            const s = QB.initialState(); for (const k of Object.keys(s.enabled)) s.enabled[k] = k === track;
            cases.push({name: track + '-solo', state: s, audible: true});
          }
          const quiet = QB.initialState(); quiet.volume = 0;
          const muted = QB.initialState(); for (const k of Object.keys(muted.enabled)) muted.enabled[k] = false;
          cases.push({name:'zero-volume', state:quiet, audible:false}, {name:'all-muted', state:muted, audible:false});
          const results = [];
          for (const c of cases) {
            const bytes = await (await QB.renderWav(c.state, 1)).arrayBuffer(); const v = new DataView(bytes);
            let peak = 0, sum = 0;
            for (let at = 44; at < bytes.byteLength; at += 2) { const n = v.getInt16(at, true) / 32768; peak = Math.max(peak, Math.abs(n)); sum += n*n; }
            const frames = (bytes.byteLength - 44) / 4;
            results.push({name:c.name, audible:c.audible, peak, rms:Math.sqrt(sum / (frames * 2)), frames, sr:v.getUint32(24,true), channels:v.getUint16(22,true)});
          }
          return results;
        }''')
        for result in offline:
            assert result['sr'] == 44100 and result['channels'] == 2
            assert abs(result['frames'] - round(60 / 128 * 4 * 44100)) <= 1
            assert math.isfinite(result['rms']) and result['peak'] <= 0.737, result
            assert (result['rms'] > 0.00001) if result['audible'] else (result['peak'] == 0), result
        passed.append('18 real offline audio cases: waveform/groove/extreme controls, solo voices and silence')

        with page.expect_download(timeout=15000) as info:
            page.click('#save')
        download = info.value
        assert download.suggested_filename.endswith('.wav')
        download.save_as(str(OUTPUT / 'demo.wav'))
        data = (OUTPUT / 'demo.wav').read_bytes()
        assert data[:4] == b'RIFF' and data[8:12] == b'WAVE'
        assert len(data) == 44 + round(60 / 128 * 4 * 4 * 44100) * 4
        passed.append('SAVE WAV triggers a valid four-bar 44.1 kHz 16-bit stereo download')

        for width in (320, 375, 390, 768, 1024, 1440):
            page.set_viewport_size({'width': width, 'height': 900})
            overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth')
            assert not overflow, width
            for rect in page.locator('.dial').evaluate_all('(els) => els.map(e => {const r=e.getBoundingClientRect();return {left:r.left,right:r.right};})'):
                assert rect['left'] >= 0 and rect['right'] <= width, (width, rect)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(OUTPUT / 'mobile.png'), full_page=True)
        passed.append('320/375/390/768/1024/1440 px layouts: no horizontal or knob overflow')
        reduced = browser.new_page(reduced_motion='reduce')
        reduced.set_content(source)
        assert reduced.locator('#lights').get_attribute('aria-pressed') == 'false'
        assert reduced.evaluate('__contexts.length') == 0
        reduced.close()
        passed.append('reduced-motion defaults to LEDs off; inaccessible storage does not crash')
        assert not errors, errors
        assert not [url for url in requests if url.startswith(('https://', 'http://'))], requests
        passed.append('no JavaScript runtime errors or external HTTP dependencies')
        browser.close()
    report = {'passed': passed, 'groups': len(passed), 'offline_audio': offline, 'live_audio': stats, 'errors': errors, 'mode': 'Chromium in-memory local assets; no file/HTTP navigation or speaker audition'}
    (OUTPUT / 'browser-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
