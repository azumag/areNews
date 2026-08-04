# areNews Controller

政経ニュースコーナー用のローカル操作アプリです。

## 役割

- `script.json` を読み込む
- スライド単位でセリフを表示する
- 中華AI / メリケンAI のセリフを手動ボタンで VOICEVOX 読み上げする
- 人間コメントのタイミングを `human_cue` として表示する

## 開発起動

VOICEVOX Engine を先に起動してから、以下を実行します。

```bash
cd apps/controller
npm install
npm run tauri:dev
```

VOICEVOX Engine の既定URLは以下です。

```text
http://127.0.0.1:50021
```

## 読み込む台本

`episodes/.../script.json` または `templates/script.json` と同じ形式のJSONを読み込みます。

まずはサンプル台本が内蔵されているため、ファイルを選ばなくても起動確認できます。
