---
episode_id: 2026-08-07-seikai-chinkei-mini
status: generated-layout-v2
created_at: 2026-08-07
updated_at: 2026-08-07
slide_count: 8
layout_version: v2-clean-broadcast
---

# Google Slides 出力

このエピソードの正本は `azumag/areNews` の以下のファイル。

- `selection.md`
- `sources.md`
- `slides.md`
- `slide-spec.json`
- `script.json`

Google Slides は配信用の生成物として扱う。

## Slides

- タイトル: 政界珍景ミニ 2026-08-07｜誰が線を引くのか
- URL: https://docs.google.com/presentation/d/1X4-YRtLhvC2Ycv0HbWvfEEFaIPTfOq2UEGUQ-Fq3GmU/edit
- レイアウトv2生成元: https://docs.google.com/presentation/d/1w57VDz7ZPuyJtHn0J1Yf0fH9htzP6YTC79FjusT3cQ8/edit
- Driveフォルダ: https://drive.google.com/drive/folders/10PN9IGsRRSN3GbQAuh9ZEI_lbTmAuFFY
- 枚数: 8

## レイアウト修正方針

初版は細かいカード分割と小さい本文が多く、配信画面で見づらかったため、v2では以下へ変更した。

- 1枚1メッセージを徹底
- カード数を減らし、余白を増やす
- 大見出し、大数字、大きな問いを中心にする
- 本文は原則18pt以上
- 論点はスピーカー音声で補い、スライド本文へ詰め込まない

## ローカル生成物

- PPTX: `seikai_chinkei_mini_2026-08-07_layout-v2.pptx`
- Montage: `seikai_chinkei_montage_v2.png`

## 実装メモ

Tauriアプリの `script.json` は既存のGoogle Slides URLを参照しているため、同じURLのデッキへv2レイアウトを反映済み。
