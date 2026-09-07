# V1 initial verification — 2026-09-07

## Scope

The repository was empty at the initial inspection. No existing source, instructions or user changes were replaced.
Implementation is a dependency-free static browser app; no ComfyUI changes, AI models, credentials, external samples or backend were introduced.

## Results

| Check | Result |
|---|---|
| `npm test` | **19 / 19 passed** |
| `npm run check` | Both JavaScript files passed syntax checks |
| Chromium integration | **12 / 12 check groups passed** |
| Actual offline Web Audio rendering | **18 / 18 cases passed** |
| Runtime JavaScript errors in integration run | **0** |
| External HTTP dependencies during integration run | **0** |

Browser checks cover initial no-autoplay, five knobs, eight bass pads, 48 drum steps, playback, nonzero finite audio samples, LED activity, drag/keyboard/reset behavior, waveform/groove/preset selection, riff generation, single-step mutation, grid editing, LED-off, all-track mute, repeated start/stop, Escape, visibility-handler stop, WAV download, reduced-motion behavior and storage-denied fallback.

Layouts were checked at **320 / 375 / 390 / 768 / 1024 / 1440 px**. No horizontal page overflow or off-screen knobs were found in the final run. Desktop and 390px screenshots were visually inspected.

The offline matrix covers saw/square × three groove modes × minimum/maximum knobs, plus bass/kick/hat/clap solo, zero volume and all-muted states. Every audible case contained nonzero samples, with bounded peak magnitude (maximum measured approximately **0.6974**, on a normalized -1…1 scale). Both silence cases contained exactly zero PCM samples. The export button produced a valid four-bar **44.1 kHz, 16-bit stereo WAV**.

## Limitations

Tests used headless Chromium on Linux with local assets loaded **in memory**. The environment blocked local URL navigation; no browser policy was changed. Consequently, `file://`, localhost HTTP startup and GitHub Pages deployment were **not verified**. The optional browser test uses the same in-memory method explicitly.

Windows / Edge, Safari / Firefox, physical mobile devices, audio-device latency and long-session endurance remain unverified. Audio sample checks are not a listening test and do not establish fidelity to a hardware TB-303. Real audio-to-display alignment is best-effort, not a sample-accurate visual guarantee.

GitHub Pages settings were not changed. No release was created.

## Reproduce

```sh
npm test
npm run check
python -m pip install playwright
python -m playwright install chromium
python tests/browser_smoke.py
```

Use `--browser-path /path/to/chromium` to select an existing installation. The test writes detailed results, screenshots and a demo WAV under `.test-output/` (excluded from Git).
