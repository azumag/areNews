# areNews — 政経ニュースコーナー

配信内の政経ニュースコーナーを、ニュース選定からスライド・台本・読み上げまで一つのリポジトリで管理するための作業場です。

## 目的

- 国際情勢・国内政治・経済ニュースを配信用に選定する
- 決定したニュースをMarkdownで保存する
- スライド原稿・スライド仕様を保存する
- AI二人分の掛け合い台本を保存する
- TauriアプリからVOICEVOX連携で手動読み上げする

## 番組フォーマット

出演者は3人です。

- 司会・コメンテーター: あずまぐ
- 中華AI: 共産主義者として、階級、再分配、公共性、反帝国主義などを見るAIアシスタント
- メリケンAI: 資本主義の申し子として、市場、企業、競争、安全保障などを見る、少しひねくれたAIアシスタント

ニュースは、重大トピック2〜3本と、周辺こぼれ話を複数扱います。

AI二人の正式な話し方と禁止事項は、次を正本とします。

- `docs/personas.md`
- `prompts/personas/china-ai.md`
- `prompts/personas/america-ai.md`

## ディレクトリ

```text
docs/                 番組設計・運用ルール・ペルソナ仕様
prompts/              台本生成用プロンプトとAI個別ペルソナ
episodes/             各回のニュース選定・出典・台本・スライド仕様
slides/               スライド生成物・スライド仕様の置き場
templates/            ニュース選定、台本、スライドのテンプレート
schemas/              JSON/YAMLの構造定義
apps/controller/      Tauri + VOICEVOX手動読み上げアプリ
```

## 基本フロー

1. ニュース候補を集める
2. あずまぐと壁打ちして採用ニュースを決める
3. `episodes/YYYY-MM-DD-episode-name/selection.md` に保存する
4. 情報源と確認状況を `sources.md` に保存する
5. `slides.md` または `slide-spec.json` を作る
6. `prompts/script-generation.md` と各ペルソナを使って `script.json` を作る
7. Tauriアプリで台本を開き、手動ボタンでVOICEVOX読み上げする
8. 収録後の改善点を `notes.md` に残す

## 台本生成の重要ルール

- 質問やニュースの核心を先に述べる
- 事実と思想的評価を分ける
- AI一人の各発話へ、内容に合った小さなウィットを一つ入れる
- 中華AIがあずまぐを呼ぶ場合は、必ず「あずまぐ同志」または「同志」とする
- 中華AIはステレオタイプな「アル」語尾を使わない
- メリケンAIの一人称は必ず「僕」とする
- メリケンAIは日本語の「です・ます」調で話す
- 被害者を笑いの対象にせず、政策、制度、権力者の矛盾へウィットを向ける

詳細は `docs/personas.md` と `prompts/script-generation.md` を参照してください。

## 最初のMVP

- ニュース選定は手動壁打ち
- スライドはMarkdown / JSON仕様で保存
- 台本は `script.json` で保存
- 読み上げはVOICEVOX EngineのローカルHTTP APIへ送る
- Google Slidesへの自動展開は次段階
