# slides

スライド関係の保存場所です。

## 方針

Google Slides本体を直接保存するのではなく、再生成できる原稿と仕様を保存します。

- `slides.md`: 人間が読みやすいスライド原稿
- `slide-spec.json`: Google Slidesなどへ変換しやすい構造データ
- `exports/`: 将来、pptx/pdf/pngなどを書き出す場合の置き場

## スライド作成の原則

- 1スライド1論点
- 本文を詰め込みすぎない
- 重大ニュースは「事実」と「解釈」を分ける
- こぼれ話はテンポ優先
- 人間が話す余白を残す

## 次段階

`slide-spec.json` から Google Slides API へ渡す変換スクリプトを追加する予定です。
