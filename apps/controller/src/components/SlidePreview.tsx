import { useState } from "react";
import { useAppStore } from "../store/appStore";

export default function SlidePreview() {
  const script = useAppStore((s) => s.script);
  const currentSlideId = useAppStore((s) => s.currentSlideId);
  const pushToast = useAppStore((s) => s.pushToast);
  const [copied, setCopied] = useState(false);

  const slide = script.slides.find((s) => s.slideId === currentSlideId) ?? script.slides[0];
  const googleSlidesUrl = script.presentation?.googleSlidesUrl;

  if (!slide) {
    return (
      <section className="stage">
        <p>スライドがありません。</p>
      </section>
    );
  }

  async function copySlideUrl() {
    if (!googleSlidesUrl) return;
    try {
      await navigator.clipboard.writeText(googleSlidesUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast("warning", "URLのコピーに失敗しました");
    }
  }

  return (
    <section className="stage">
      <div className="stageHeader">
        <div>
          <p className="eyebrow">現在のスライド</p>
          <h2>{slide.title}</h2>
        </div>
      </div>

      {slide.visual?.notes && <p className="visualNote">画面メモ: {slide.visual.notes}</p>}
      {slide.visual?.type && <p className="visualMeta">種別: {slide.visual.type}</p>}
      {slide.notes && <p className="visualNote">進行メモ: {slide.notes}</p>}
      {slide.previewImage && (
        <p className="visualMeta">
          プレビュー画像: <code>{slide.previewImage}</code>（画像表示は未実装。将来のIssueで対応）
        </p>
      )}

      {googleSlidesUrl && (
        <div className="slidesLink">
          <p className="eyebrow">Google Slides</p>
          <div className="slidesLinkRow">
            <code>{googleSlidesUrl}</code>
            <button type="button" onClick={copySlideUrl}>
              {copied ? "コピーしました" : "URLをコピー"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
