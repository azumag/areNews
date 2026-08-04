---
episode_id: 2026-08-04-pilot
status: generated
created_at: 2026-08-04
slide_count: 20
format: google-slides
---

# Google Slides：危機対応のツケは誰が払う？

## 編集用プレゼンテーション

- Google Slides: https://docs.google.com/presentation/d/15PaM1knoNEYrNV_1Y3dCmYI818DSQRQvnh7FgVfKNg0/edit
- Driveフォルダ: https://drive.google.com/drive/folders/1D84kBvXkFMDI4sWgTjkyooh2TqZfYj7W
- 枚数: 20枚
- 画面比率: 16:9
- 想定尺: 約30分

## 生成元

- `selection.md`: 採用ニュースと編集方針
- `sources.md`: 事実確認、確度、完全URL
- `slides.md`: 各ページの表示内容と発話の流れ
- `slide-spec.json`: 機械処理用スライド仕様
- `script.json`: VOICEVOX読み上げ台本

## デザイン方針

- 濃いチャコールを基調にしたニュース番組向けデザイン
- 中華AIを赤、メリケンAIを青、あずまぐのコメントを黄で識別
- 確認済み、推計、未確認、訂正を色とラベルで区別
- 画面下端に出典帯を固定
- OBS字幕を重ねるため、下端の主要情報を避ける
- 戦争・犯罪被害者の写真は使用せず、地図、数字カード、フロー図を使用
- 図形と文字はGoogle Slides上で編集可能

## スピーカーノート

PPTXからGoogle Slidesへ変換する際に、各ページのスピーカーノートも引き継いでいる。主要ページには、断定を避ける点、収録直前の確認事項、完全URLを記載している。

## 収録前に差し替える項目

1. 米・イラン協議とホルムズ海峡の最新状況
2. ドル円水準
3. 円買い介入の公式額
4. 食料品消費税1％案の法案・党内手続き
5. れいわ新選組の新代表・新党名
6. 「ひろゆき＆いずみ新党（仮）」の一次情報

## QA

- ローカルで全20枚をレンダリング確認済み
- スライドの文字はみ出し検査を通過
- Google Slidesへの変換後、20枚とスピーカーノートの存在を確認済み

## 注意

- `script.json` の `presentation.googleSlidesUrl` は、アプリ側の実装状況に応じて上記URLへ更新する。
- 内容を更新した場合は、`sources.md` の `verified_at` とこのファイルの状態も更新する。
