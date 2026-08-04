# areNews Controller

政経ニュースコーナーの配信本番で使うローカル操作アプリです（Tauri v2 + React + Rust）。
`episodes/.../script.json` を読み込み、スライドと台詞を追いながら中華AI・メリケンAIの台詞を
VOICEVOXで手動読み上げします。**完全自動進行はしません。**設計・実装範囲は
[Issue #55](https://github.com/azumag/areNews/issues/55) を参照してください。

## 役割

- `script.json` のファイル選択・読込・スキーマ検証（エラー箇所をJSON Pointerで表示）
- 3ペインUI（スライド一覧 / 現在のスライド / 台詞一覧）
- 中華AI・メリケンAIの台詞を個別 / 次の未読 / キャラクター別に読み上げ
- `human_cue` の強調表示（読み上げボタンを出さず、配信者が話す箇所として明示）
- VOICEVOX疎通確認・話者一覧取得・音声キャッシュ
- 進行状態（読了・スキップ・選択位置）の自動保存とアプリ再起動後の復元
- フォーカス時のキーボード操作（Space / 1 / 2 / R / Esc / ←→ / S）

## 開発起動

VOICEVOX Engine を先に起動してから、以下を実行します。

```bash
cd apps/controller
npm install
npm run tauri:dev
```

VOICEVOX Engine の既定URLは以下です（設定画面から変更できます）。

```text
http://127.0.0.1:50021
```

VOICEVOXが未起動でもアプリは起動し、台本の閲覧・進行操作は可能です（読み上げボタンのみ無効化されます）。

## テスト

Rustのコアロジック（台本検証・キャッシュキー生成・VOICEVOXクライアント）:

```bash
cd apps/controller/src-tauri
cargo test
```

TypeScriptの純粋関数（次の未読台詞の判定・話者/パラメータ優先順位・進行状態マージ・
再生ステートマシン・キーマップ）:

```bash
cd apps/controller
npm run test
```

## Windows向けビルド手順

1. Rust toolchain（`rustup`）をインストール
2. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) をインストール
3. [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) がインストール済みであることを確認（Windows 11は標準搭載）
4. `npm install`
5. `npm run tauri:build`

`src-tauri/tauri.conf.json` の `bundle.active` は `true` になっており、ローカルの
`npm run tauri:build` でもインストーラ（MSI/NSIS）が生成されます。

### 自動リリース（GitHub Actions）

`.github/workflows/release-controller.yml` が `main` への push（`apps/controller/**` /
`schemas/script.schema.json` 変更時）で `windows-latest` ランナー上でビルドし、
GitHub Releasesにドラフトとして公開します。タグは `controller-v<tauri.conf.jsonのversion>`。

- Windows限定です（Issueの「MVPの配布・動作確認はWindowsを優先する」に合わせています）。
  Linux/macOS向けは別途ランナー・依存パッケージの追加が必要です。
- **ドラフト公開**にしています。誰でも見える形で公開する前に、GitHub上で内容を確認して
  「Publish release」を押す運用を想定しています。即時公開にしたい場合は
  ワークフローの `releaseDraft: true` を `false` に変更してください。
- コード署名はしていません。未署名のためWindowsのSmartScreenで警告が出ます。
  署名証明書を用意できる場合は別途署名ステップの追加を検討してください。
- アプリアイコン（`src-tauri/icons/`）は暫定のプレースホルダーです。正式なブランド素材が
  用意でき次第、`npx tauri icon <画像パス>` で差し替えてください。

### 自動アップデート

アプリ起動時にバックグラウンドでアップデート確認を行い、新しいバージョンがあれば
画面上部にバナー、設定画面にも状態を表示します。**自動ではインストール・再起動しません**
（配信中に勝手に再起動すると事故になるため）。「インストールして再起動」を押した時だけ
ダウンロード・適用・再起動します。

- `tauri-plugin-updater` / `tauri-plugin-process`（`relaunch`用）を使用
- アップデート先は `https://github.com/azumag/areNews/releases/latest/download/latest.json`。
  GitHubの「latest release」はドラフトを含まないため、**ドラフトを公開するまで
  ユーザーには配信されません**（上記のドラフト公開運用とそのまま噛み合います）
- 更新パッケージの署名検証用に、公開鍵を `src-tauri/tauri.conf.json` の
  `plugins.updater.pubkey` に埋め込み済みです
- 署名用の秘密鍵はリポジトリには含めていません。GitHub Actionsのシークレットとして
  以下を登録してください（値は別途お渡しします）。未設定でもビルド・公開自体は動きますが、
  署名付きアップデート成果物（`latest.json`含む）が生成されないため、アプリ側の
  アップデート確認は「更新なし」または失敗になります。
  - `TAURI_SIGNING_PRIVATE_KEY`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（今回はパスワードなしで鍵を生成したため空文字を設定、
    またはシークレット自体を未設定のままでも構いません）
- 秘密鍵を紛失した場合は新しい鍵を生成し直し、`pubkey`とGitHub Secretsの両方を更新してください
  （旧鍵で署名した過去のリリースは検証できなくなります）。

## 読み込む台本

`episodes/.../script.json` または `templates/script.json` と同じ形式のJSONを読み込みます。
スキーマは `schemas/script.schema.json`（このリポジトリのルート）です。

まずはサンプル台本が内蔵されているため、ファイルを選ばなくても起動確認できます。

### スキーマの追加フィールド（すべて任意・後方互換）

既存の `script.json` は変更なしでそのまま読み込めます。以下は追加で使える任意フィールドです。

- `presentation.googleSlidesUrl` / `presentation.exportedSlidesDir`
- `slides[].slideNumber` / `notes` / `previewImage`
- `lines[].spokenText`（読み上げ専用テキスト。指定時は読み上げに使い、画面には常に `text` を表示）
- `lines[].voice.{speedScale,pitchScale,intonationScale,volumeScale,prePhonemeLength,postPhonemeLength}`

話者・音声パラメータの優先順位は「台詞単位 > エピソードの `voicevox.defaultSpeakers` /
アプリ設定の既定値」です（話者IDのみ、台詞単位 > エピソード既定 > アプリ設定の3段）。

## 挙動として決めた点（Issueの記述からの補足・解釈）

- 「次の未読台詞」が `human_cue` に到達した場合は選択のみ行い待機します。もう一度押すと
  その `human_cue` を「済」にして次に進みます（1操作=1押下）。
- 中華AI/メリケンAIの「キャラクター別 次の未読」ボタン・キーは、`human_cue` の待機ルールを
  無視して該当キャラクターの次の未読台詞を探します（配信者の明示的な選択を優先）。
- 台詞は「未読 / 済 / スキップ」のみを永続化し、「選択中」「再生中」はカーソル・再生状態から
  都度算出します（Issueの状態一覧では選択もライン状態として並記されていますが、単一カーソル
  として扱う方が実装上一貫します）。
- 停止した台詞は「未読」のまま残るため、「次の未読台詞」で再度対象になります。
- 個別再生ボタンは「読む」「読み直す」の両方を1つのボタンで兼ねています（状態に関わらず
  いつでも押して再生できます）。
- Google Slides URLの「ブラウザで開く」は、このMVPでは「URLをコピー」に置き換えています
  （Webview外のブラウザを開く権限まわりは実機で検証できないため、次のIssueに送ります）。
- 台本の `voicevox.baseUrl` が指定されている場合、台本読込時にアプリ設定のVOICEVOX URLを
  その値へ自動的に上書きします（エピソードごとに異なるVOICEVOX Engineを想定して収録された
  台本を開くたびに手動で設定し直さずに済むようにするため）。上書きされたことはトーストで
  通知します。
- VOICEVOX未接続時は、台詞単位の個別再生ボタンと、キャラクター別「次の未読」「直前を再読」
  ボタンを無効化します。「次の未読台詞」ボタン自体は `human_cue` へ到達する場合に読み上げなしで
  機能するため無効化していません。

## このセッションで検証できたこと / できなかったこと

開発環境がLinuxコンテナで、GTK/WebKitのヘッダーが取得できず、かつ実VOICEVOX Engineも
Windows実機も利用できないため、検証範囲を明示します。

### 検証済み（このリポジトリでテスト・ビルドを実行して確認）

- Rustのコアロジック（`src-tauri/core`、tauri非依存）: `cargo test` で17件が緑
  （台本スキーマ検証とJSON Pointerエラー、キャッシュキー生成、VOICEVOXクライアントの
  モックHTTPテストを含む）
- TypeScriptの純粋関数: `npm run test`（vitest）で63件が緑
  （次の未読台詞判定、話者/パラメータ優先順位、進行状態マージ、再生ステートマシンの
  トークンガード、キーマップ）
- フロントエンド全体の型検査: `npx tsc --noEmit` がエラーなしで完了
- フロントエンドのビルド: `npm run build`（`vite build`）が成功
- `schemas/script.schema.json` の後方互換性: 既存の `templates/script.json` が
  拡張後のスキーマでもそのまま検証を通過

### 未検証（実装はしたが、この環境では確認できなかった）

- **Tauriシェルクレート（`src-tauri/src`）のコンパイル**: このコンテナには
  `libwebkit2gtk-4.1-dev` / `libgtk-3-dev` が無く、`apt-get install` も
  パッケージ404で失敗するため、`cargo check` / `cargo build` を一度も実行できていません。
  Rust API（`tauri::Manager::path()`、`WebviewWindow::set_always_on_top`、
  `tauri_plugin_dialog` の `blocking_pick_file()` など）はcrates.ioから取得した実際の
  ソースコードを直接読んで型・メソッド名を確認していますが、実コンパイルによる保証では
  ありません。
- **Windows起動・ビルド**（完了条件の必須項目）: Windows実機がないため未確認です。
- **実VOICEVOX Engineとの疎通・音声合成・再生**: モックHTTPサーバでのテストのみで、
  実Engineとの通信は未確認です。
- **ネイティブファイルダイアログ、常に手前に表示、キーボードショートカット、
  トースト表示など実ウィンドウでのUI動作**: ディスプレイのない環境のため未確認です。
- **アプリ再起動をまたいだ進行状態の復元**: ロジック（マージ）は単体テスト済みですが、
  実アプリでの保存・復元往復は未確認です。

### 今回見送った項目（Issueには含まれるが未実装）

- CSP（`security.csp: null` のまま）の変更 — 実機で動作確認できない状態での変更は
  リスクが高いため見送りました。
- 音声キャッシュのLRU/日数ベースの自動削除 — `clear_audio_cache`（全削除）のみ実装。
  キャッシュキー設計はLRU拡張を妨げません。
- 先読み合成（次の台詞のバックグラウンド合成）— Issueでも「MVP必須ではない」とされている
  範囲です。`synthesize_line` がキャッシュファーストなので、後から追加コマンドとして
  積みやすい構造にはしています。
- Google Slides URLを実際のブラウザで開く機能 — 上記の通り「URLをコピー」に置き換え。

Windows実機・実VOICEVOX Engineでの動作確認は別途必要です。上記の「未検証」の項目を
中心に確認してください。

## 手動テストチェックリスト（Windows + VOICEVOX Engine 起動後）

Issueの完了条件に対応します。

- [ ] `npm run tauri:dev` でアプリが起動する
- [ ] `episodes/.../script.json` をGUIから読み込める
- [ ] 不正な台本（存在しない話者名など）を読み込むと、JSON Pointer付きでエラー表示される
- [ ] スライドと台詞の現在位置が一目で分かる
- [ ] 中華AI・メリケンAIの任意の台詞をVOICEVOXで読める
- [ ] `human_cue` では自動再生せず、選択のみで待機する
- [ ] 再生中に停止操作を行うと即座に音声が止まる
- [ ] 同じ台詞を連続で再生しても音声が重ならない（多重再生防止）
- [ ] 再読・スキップ・前後スライド移動ができる
- [ ] アプリを再起動すると進行位置が復元される
- [ ] VOICEVOX未起動時に原因と対処が表示され、台本閲覧・進行操作はできる
- [ ] キーボード操作（Space/1/2/R/Esc/←→/S）がフォーカス時のみ機能する
- [ ] テキスト入力欄にフォーカスがある間はキーボードショートカットが発火しない
