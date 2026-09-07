# QB-303 · Fake Acid Generator

**A Tiny Browser Acid Toy with Squelchy Bass, Drums & Blinking LEDs**  
*Turn Knobs. Punch Beats. Make It Squeal.*

大きなノブを回して、ギュルギュル鳴らす小さなブラウザ玩具です。
曲作りの知識も、音符の入力も不要。ベースとドラムを鳴らして遊ぶだけ。
ComfyUI・VST・AIモデル・アカウント・マイクは使いません。

## 遊び方

ZIP を展開し、`index.html` を Chrome / Edge などで開いて **LET'S GO** を押します。
ページを開いただけでは音は出ません。最初は小さな音量で試してください。

ローカルファイルの読み込みを制限している環境では、このフォルダで次を実行してください。
Python がある環境向けの任意の起動方法です。アプリ本体は Python に依存しません。

```sh
python -m http.server 8080 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:8080/` を開きます。ビルドや `npm install` は不要です。

## V1 に入っているもの

| 操作 | 何が起こるか |
|---|---|
| **LET'S GO / STOP IT** | ベースとドラムを再生・停止 |
| **GYUUU** | フィルターを開いて音を明るくする |
| **SQUELCH** | レゾナンスを強め、クセのある音にする |
| **BITE** | フィルターの動きを変え、キュッとさせる |
| **SLIDE** | スライド印のある音を、次の音へ滑らかにつなぐ |
| **DIRTY** | 歪みを足す |
| **SAW / SQUARE** | ベースの波形を切り替える |
| **NEW RIFF / MUTATE** | ベースをガチャ / 1ステップだけ変える |
| **MORE ACID / CALM DOWN** | もっとギュルギュル / 音色を初期値へ戻す |
| **4 BEAT / 8 BEAT / OFFBEAT / WEIRD** | ドラムのリズムを切り替える |
| **STRAIGHT / BOUNCE / WEIRD** | ベースの発音位置をずらして、ノリを変える |
| **SAVE WAV** | 現在の設定を4小節の WAV に書き出す |
| **LEDs** | 発音連動の点灯と波形の動きをオン・オフ |

ベースは **8パッド**、ドラムは **Kick / Hat / Clap の3音・各16ステップ**。
パッドを押すとオン・オフを切り替えられます。停止中に有効なパッドをオンにすると試聴できます。
各トラックの名前を押すとミュートします。

ノブは上下ドラッグ、矢印キー、Home / End に対応。Shift を押すと細かく調整できます。
ダブルクリックでそのノブだけ初期値に戻ります。Space で再生・停止、Escape で停止します。
入力欄やボタンにフォーカスがあるとき、Space はそのコントロールの標準操作を優先します。

## 音・光・保存について

- 音色とミュートは演奏中に変更できます。テンポ・パターン・ノリは**次の小節**から反映します。
- シンコペーションは、ベースの一部を16分音符ぶん後ろへ移動する方式です。単なる速度変更やドラムのランダム化ではありません。
- 再生中の LED は、先読みで音を予約した時点ではなく、音声クロックと出力時刻に合わせて更新します。ディスプレイの更新周期・出力機器による誤差は残ります。
- 発音位置、Accent、Slide を表示します。全画面をフラッシュさせる演出はありません。点滅が気になる場合は **LEDs をオフ**にしてください。OS の「視差効果を減らす」設定を検出した場合も初期状態をオフにします。
- 画面を離れると自動停止します。音声が中断された場合や、タイマーが大きく遅延した場合も停止し、音をまとめて鳴らしません。
- **MORE ACID はマスター音量の設定を変更しませんが、音色によって体感音量は変わります。** 出力にはコンプレッサーと振幅制限を入れていますが、耳の安全を保証するものではありません。
- **WAV はライブ録音ではありません。** 書き出しボタンを押した時点のパターン・音色・音量を固定して4小節を生成します。44.1 kHz / 16-bit PCM / 2チャンネル（左右同じ内容）。端のクリックを抑える短いフェードを付けます。
- 設定はブラウザ内の `localStorage` に保存します。保存を許可しない環境では、そのセッション内だけ保持します。端末や別ブラウザとの同期はしません。

## 実装

`index.html` / `style.css` / `engine.js` / `app.js` の4ファイルで動きます。
実行時の外部ライブラリ、CDN、外部フォント、音声サンプル、ネットワーク通信は不要です。

音源は独自の簡易実装です。ベースは Web Audio の Saw / Square オシレーター、2段のローパスフィルター、エンベロープ、Accent / Slide、ソフトサチュレーションを組み合わせています。
ドラムはサイン波と固定シードのノイズから合成します。実機のダイオード回路を忠実にモデル化したものではありません。

音の予約には `AudioContext.currentTime` を使用し、LED 描画のフレームレートから独立させています。
WAV 生成にも同じ音源エンジンを `OfflineAudioContext` 上で使います。ただしブラウザ間でのビット完全一致は保証しません。

V1 に MIDI、VST、Song Mode、リアルタイム録音、ComfyUI ノードは含まれません。
TB-303 の完全再現ではなく、303風の音で遊ぶ独立した玩具です。Roland とは関係ありません。

## テスト

Node.js 22 で、外部パッケージなしに実行できます。

```sh
npm test
npm run check
```

ブラウザの操作と実際の Web Audio の検証は任意で実行できます。

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/browser_smoke.py
```

既存の Chromium を指定する場合は `--browser-path` を使います。
このテストはローカルの4ファイルをブラウザへメモリ内読み込みして検証します。
結果・画面・テスト用 WAV は `.test-output/` に出力されます。

初期検証結果は [TEST_REPORT.md](TEST_REPORT.md) に記載しています。
Windows / Edge 実機、スマートフォン実機、スピーカーでの聴感、`file://` と HTTP での起動確認は未実施です。

## GitHub Pages で公開する場合

公開用のビルドは不要です。リポジトリの **Settings → Pages → Deploy from a branch → main / (root)** を選択して保存します。
本リポジトリへのソース追加だけでは、Pages の公開設定は変更しません。

参考：
[GitHub Pages の公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) / 
[MDN: Audio scheduling](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) / 
[MDN: OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)
