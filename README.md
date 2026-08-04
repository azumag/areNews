# areNews — 政経ニュースコーナー

配信内の政経ニュースコーナーを、ニュース選定からスライド・台本・読み上げまで一つのリポジトリで管理するための作業場です。

## 目的

- 国際情勢・国内政治・経済ニュースを配信用に選定する
- 決定したニュースを Markdown で保存する
- スライド原稿・スライド仕様を保存する
- AI 2人分の掛け合い台本を保存する
- Tauri アプリから VOICEVOX 連携で手動読み上げする

## 番組フォーマット

出演者は3人です。

- 司会・コメンテーター: 人間
- 中華AI: 国家・階級・再分配・反帝国主義寄りの視点
- メリケンAI: 市場・企業・安全保障・自由競争寄りの視点

ニュースは、重大トピック 2〜3 本と、周辺こぼれ話を複数扱います。

## ディレクトリ

```text
docs/                 設計・運用ルール
episodes/             各回のニュース選定・台本・スライド仕様
slides/               スライド生成物・スライド仕様の置き場
templates/            ニュース選定、台本、スライドのテンプレート
schemas/              JSON/YAML の構造メモ
apps/controller/      Tauri + VOICEVOX 手動読み上げアプリ
```

## 基本フロー

1. ニュース候補を集める
2. 人間と壁打ちして採用ニュースを決める
3. `episodes/YYYY-MM-DD-episode-name/selection.md` に保存する
4. `slides.md` または `slide-spec.json` を作る
5. `script.json` にスライド単位のセリフを保存する
6. Tauri アプリで台本を開き、手動ボタンで VOICEVOX 読み上げする

## 最初のMVP

- ニュース選定は手動壁打ち
- スライドは Markdown / JSON 仕様で保存
- 台本は `script.json` で保存
- 読み上げは VOICEVOX Engine のローカルHTTP APIへ送る
- Google Slides への自動展開は次段階
