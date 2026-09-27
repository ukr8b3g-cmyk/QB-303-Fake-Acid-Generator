# QB-303 · Fake Acid Generator

<img width="960" height="953" alt="{EAD45202-6815-40E7-8EB8-E4F76F611F99}" src="https://github.com/user-attachments/assets/57f4170f-977f-4884-8305-59222926300f" />


**A Tiny Browser Acid Toy with Squelchy Bass, Drums & Blinking LEDs**  
*Turn Knobs. Punch Beats. Make It Squeal.*

大きなノブを回して、ギュルギュル鳴らす小さなブラウザ玩具です。
曲作りの知識も、音符の入力も不要。ベースとドラムを鳴らして遊ぶだけ。
ComfyUI・VST・AIモデル・アカウント・マイクは使いません。

## ブラウザで試すデモ

README の画面内では JavaScript と音声を直接実行できません。下のデモページを開くと、そのままノブやドラムを操作できます。音は **LET'S GO** を押してから鳴ります。

**[ブラウザでデモを開く](https://ukr8b3g-cmyk.github.io/QB-303-Fake-Acid-Generator/)**

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

## AUTO MODE — 勝手に、弾ける。

`AUTO MODE` は初期状態でオンです。`LET'S GO` を押すと音が鳴ります。下の16ステップのドラムが1周すると1小節です。最初の1周だけベースが休み、2周目から鳴ります。その後は「4周鳴る→2周休む」を2回、「4周鳴る→4周休む間奏」を1回として繰り返します。自動の音色変化は浅く、ギュウギュウしたスクラッチは自動では入りません。強い音は GO MAD! や手動ノブで出せます。ドラムと HOOK も自動で変化します。既存の曲や音声サンプルは使いません。

初期設定は `AUTO MODE`、`BASS RAND`、`METAL!`、`HOOK AUTO`、`ROBOT VOX`（レベル100）、`SYNTH ARCADE` がオン。ベースのシンコペーションとドラムプリセットはどちらも `WEIRD` です。ベースのパッドとドラムの細かい配置は画面例と同一である必要はありません。

- `CHAOS`：AUTO MODE の控えめな音色変化の幅を調整。0でもドラムと HOOK の展開は続きます。
- `BASS RAND`：初期状態でオン。4周ごとに新しいベースを生成。ベースの休みと復帰は AUTO MODE の基本動作です。ベースのパッドや NEW RIFF を操作すると手動リフを優先してオフになります。
- `HOLD RIFF`：BASS RAND の新リフ生成と HOOK の自動選択を固定。AUTO MODE のベースの休みと復帰は続きます。手動編集もできます。
- `GO MAD!`：次の小節を強いスクラッチにします。音程の往復に短い帯域ノイズを重ねます。停止中なら再生開始。AUTO MODE がオフなら1小節で通常演奏に戻ります。
- `METAL!`：独立した金属パーカッションを追加。通常はカンカン、AUTO MODEではシャカシャカと短いキュッキュッも混ざります。もう一度押すと金属音だけをミュートします。
- `WILD SPEED`：元のBPMを保ったまま、小節ごとに0.85／1／1.12／1.25倍の速さへ変化。演奏テンポはパネル下のBPM表示で確認できます。
- `RUSH!`：灰色の待機ボタン。押すとオレンジで予約を示し、次の小節からピンクで1/4〜4/4と実際のBPMを表示します。1.12→1.28→1.5→1倍で戻ります（60〜240 BPM）。
- `HOOK AUTO`：短いフレーズのON/OFFを兼ねます。AUTO MODE中は10種類から4小節ごとに自動選択し、現在の番号をボタン内に表示します。
- `SYNTH ARRANGE`：OFF／PARADE／NIGHT／ARCADEを切り替えます。既存曲のメロディーを使わない、2小節のオリジナルなシンセフレーズをHOOKに重ねます。WAV書き出しにも反映されます。
- `ROBOT VOX`：意味のある言葉を使わず、合成した母音と息に似た音を短く鳴らします。8小節周期で登場し、ON/OFF と `VOX LEVEL` で音量を調整できます。録音や外部音声ファイルは使いません。
- `ANIMAL VOICE`：押すたびに、カラス・ニワトリ・牛など8種類の動物または男性「はい」風／女性「イエス」風の合成音をランダムに1回鳴らします。直前と同じ音は続きません。実際の鳴き声や発話の録音は使いません。
- `SFX PAD`：最初の一押しは車の急ブレーキ「キュー・ドン」。その後は10種類の合成効果音をランダムに1回鳴らします。両パッドとも初期状態は無音で、押したときだけ鳴り、自動演奏や WAV 書き出しには入りません。
- `INCREASE ACID`：押すと5つの音色設定を4小節かけて徐々に強めます。停止中に押した場合は次の再生から始まります。
- `RESET ALL`：再生を止め、BPM・音量・音色・パターン・自動設定・手動優先状態を初期設定に戻します。

自動モードのオン・オフと CHAOS は次の小節から反映します。ノブ、BASS、ベースパッド、ドラムのトラック・ステップ・プリセットを手で操作するとその項目を優先し、AUTO MODE はオンのまま他の自動演奏を続けます。手動のベースやドラム設定と優先状態はブラウザ内に保存されます。BPM を手で変えると WILD SPEED と RUSH は止まります。AUTO MODE・BASS RAND・CHAOS・HOLD・WILD SPEED・RUSHは再読み込みで初期状態に戻ります。ただし手動で作ったリフは BASS RAND の自動再開から保護されます。COLOR POPとCOLOR LOCKは非表示で、自動配色変更も行いません。`STOP IT` / Escape で停止でき、画面を離れたときの自動停止も有効です。

`SAVE WAV` は現在のベース、ドラム、HOOK、SYNTH ARRANGE、ROBOT VOX、ノブ設定と元のBPMによる通常演奏を4小節書き出します。METALがオンなら通常のカンカン音も含みます。AUTO MODEのスクラッチや展開、速度変化を録音する機能ではありません。

追加のブラウザ検証は、既存の Playwright（Node.js版）と Chromium がある環境で `node tests/jam.browser.cjs <Chromium実行ファイル>` を実行できます。

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
| **NEW RIFF / BASS RAND** | ベースをすぐガチャ / 4小節ごとに自動生成 |
| **HOOK AUTO** | 短いフレーズをON/OFF、AUTO MODE中は4小節ごとに選ぶ |
| **SYNTH ARRANGE** | 3種類のシンセフレーズを切り替える |
| **ROBOT VOX / VOX LEVEL** | 言葉にならない合成音声を ON/OFF / 音量調整 |
| **INCREASE ACID / RESET ALL** | 4小節かけて音色を強める / 全設定を初期値へ戻す |
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
- **INCREASE ACID はマスター音量の設定を変更しませんが、音色によって体感音量は変わります。** 出力にはコンプレッサーと振幅制限を入れていますが、耳の安全を保証するものではありません。
- **WAV はライブ録音ではありません。** 書き出しボタンを押した時点のパターン・音色・音量を固定して4小節を生成します。44.1 kHz / 16-bit PCM / 2チャンネル（左右同じ内容）。端のクリックを抑える短いフェードを付けます。
- 設定はブラウザ内の `localStorage` に保存します。保存を許可しない環境では、そのセッション内だけ保持します。端末や別ブラウザとの同期はしません。

## 実装

`index.html` / `style.css` / `compact.css` / `engine.js` / `app.js` / `ui-controls.js` の6ファイルで動きます。
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

## GitHub Pages の公開設定

公開用のビルドは不要です。**Settings → Pages → Deploy from a branch → main / (root)** で公開しています。

参考：
[GitHub Pages の公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) / 
[MDN: Audio scheduling](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) / 
[MDN: OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)
