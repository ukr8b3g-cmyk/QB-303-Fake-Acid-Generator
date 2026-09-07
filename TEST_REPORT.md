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
# AUTO JAM 追加検証（2026-09-07）

ローカル作業場所: `D:\Codex\Projects\QB-303-Fake-Acid-Generator`。GitHub の main から取得し、変更前の追跡対象11ファイルを `D:\Codex\_snapshots\QB-303-Fake-Acid-Generator\20260907_234911` に保存。

- `npm test`: 21件成功。追加した自動効果の決定性、全6種類の選択、値の範囲、元パターンの不変性、休符・音抜きを含む。
- `npm run check`: 構文確認成功。
- `tests/jam.browser.cjs`: 既存の同梱Node.js版PlaywrightとEdgeで検証。HOLD RIFF、GO MADの予約と1小節後の復帰、CALM DOWN、Escape、画面非表示時の停止、reduced-motionを確認。
- 実際のOfflineAudioContextで全6効果を通常／全ミュートの計12ケース検証。非有限値なし、ピーク0.737以下、全ミュート時は無音、効果終了後のdetuneは0。
- WAVダウンロード成功。320/375/390/768/1024/1440pxで横方向のはみ出しなし。390pxと1440pxの画像を目視確認。
- 結果は `.test-output/jam-report.json`、画面は `.test-output/jam-390.png` / `jam-1440.png`。テスト用ブラウザは終了。バックエンド起動なし。

参照MP3の試聴、スピーカーでの聴感評価、実機TB-303との比較は未実施。従来のPython版 `browser_smoke.py` はPython版Playwrightがないため今回未実行。アプリの実行時依存は追加していません。上記のV1初期検証とは別の追加検証です。

## METAL / RUSH / COLOR POP 追加検証（2026-09-08）

変更前スナップショット: `D:\Codex\_snapshots\QB-303-Fake-Acid-Generator\20260908_000039-pre-metal`（12ファイル）。前回の未コミット変更を保持。

- Node単体テスト23件成功、engine.js / app.jsの構文確認成功。
- Edge＋同梱Playwrightでブラウザ検証成功。全9効果×通常／ミュートの18音声ケース。新規3ケースは金属音だけを有効にし、独立して発音することを確認。
- RUSHの加速（180 BPMから上限240 BPM）と180 BPMへの復帰、元BPM入力の維持、WILD SPEEDの変化、CALM DOWNで速度・金属・配色を戻す動作を確認。
- COLOR POPの5配色、320〜1440pxの6画面幅で横はみ出しなし。ピンク配色の390px画面を目視確認。
- 出力は既存の `.test-output/jam-report.json` とスクリーンショットを更新。音声の最大ピークは0.737以下、全ミュートは無音、非有限値・JSエラーなし。
- テスト用ブラウザは終了。バックエンド・新しい依存関係の追加なし。聴感評価は未実施。コミット・プッシュ未実施。
