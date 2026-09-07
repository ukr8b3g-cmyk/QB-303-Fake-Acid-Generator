# QB-303 · Fake Acid Generator
<img width="1179" height="913" alt="{F964F339-248C-4E5D-8B4E-5398AA7FC1CB}" src="https://github.com/user-attachments/assets/ab2e6c36-b44b-486c-804d-42b2671dc729" />


**A Tiny Browser Acid Toy with Squelchy Bass, Drums & Blinking LEDs**  
*Turn Knobs. Punch Beats. Make It Squeal.*

大きなノブを回して、ギュルギュル鳴らす小さなブラウザ玩具です。
曲作りの知識も、音符の入力も不要。ベースとドラムを鳴らして遊ぶだけ。
ComfyUI・VST・AIモデル・アカウント・マイクは使いません。

## 遊び方

**[最新版のZIPをダウンロード](https://github.com/ukr8b3g-cmyk/QB-303-Fake-Acid-Generator/archive/refs/heads/main.zip)**

ZIP を展開し、`index.html` を Chrome / Edge などで開いて **LET'S GO** を押します。
ページを開いただけでは音は出ません。最初は小さな音量で試してください。

ローカルファイルの読み込みを制限している環境では、このフォルダで次を実行してください。
Python がある環境向けの任意の起動方法です。アプリ本体は Python に依存しません。

```sh
python -m http.server 8080 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:8080/` を開きます。ビルドや `npm install` は不要です。

## AUTO JAM — 勝手に、弾ける。

`AUTO JAM` をオンにして `LET'S GO`。スクラッチ風の音程往復、フィルターのうねり、連打、音程上昇、短い音抜き、アクセントとスライドの変化を、小節ごとにランダムに切り替えます。音声サンプルの逆再生ではなく、合成音によるスクラッチ風の効果です。

- `CHAOS`：スクラッチやフィルターの変化幅と、リフが変わる確率を調整。0でも自動演奏は続きます。
- `HOLD RIFF`：リフの自動書き換えだけを止めます。音色や刻み方の変化は続き、手動編集もできます。
- `GO MAD!`：次の小節を強いスクラッチにします。停止中なら再生開始。AUTO JAM がオフなら1小節で通常演奏に戻ります。
- `METAL!`：独立した金属パーカッションを追加。通常はカンカン、AUTO JAMではシャカシャカと短いキュッキュッも混ざります。もう一度押すと金属音だけをミュートします。
- `WILD SPEED`：元のBPMを保ったまま、小節ごとに0.85／1／1.12／1.25倍の速さへ変化。演奏テンポはパネル下のBPM表示で確認できます。
- `RUSH!`：次の小節から4小節の盛り上げ。1.12→1.28→1.5→1倍で加速して戻ります（60〜240 BPM）。停止中なら再生開始。連打では次の小節から再スタートします。終了後はWILD SPEEDがオンならランダム速度へ戻ります。
- `COLOR POP`：本体とベースパッドを含む配色を、通常／ピンク／紫／青／ライムの5種類で切り替えます。RUSH中は小節ごとにも切り替わります。LEDsオフまたはOSのreduced-motion設定では自動配色変更を止めます。手動の配色ボタンは使えます。
- `CALM DOWN`：自動変化・金属音・加速を止め、音色と配色を戻します。先読みで予約済みの最大約0.1秒の音は残ります。

自動モードのオン・オフと CHAOS は次の小節から反映します。元のテンポ設定、音量、手動ミュートは自動変更しません。自動で変わったベースパターンとMETALのオン状態は通常の設定として保存されます。AUTO JAM・CHAOS・HOLD・WILD SPEED・RUSH・配色は再読み込みで初期状態に戻ります。`STOP IT` / Escape で停止でき、画面を離れたときの自動停止も有効です。

`SAVE WAV` は現在のベースパターンとノブ設定、元のBPMによる通常演奏を4小節書き出します。METALがオンなら通常のカンカン音も含みます。AUTO JAMのスクラッチや展開、速度変化を録音する機能ではありません。

追加のブラウザ検証は、既存の Playwright（Node.js版）と Chromium がある環境で `node tests/jam.browser.cjs <Chromium実行ファイル>` を実行できます。自動モードの操作、全9効果の実音声レンダリング、金属音単独・ミュート、音程復帰、加速と復帰、配色、WAV、画面幅を確認します。

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
