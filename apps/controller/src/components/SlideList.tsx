import { useAppStore } from "../store/appStore";
import { slideStatus } from "../lib/navigation";
import { slideStatusLabel } from "../lib/labels";

export default function SlideList() {
  const script = useAppStore((s) => s.script);
  const currentSlideId = useAppStore((s) => s.currentSlideId);
  const lineStates = useAppStore((s) => s.lineStates);
  const selectSlide = useAppStore((s) => s.selectSlide);

  return (
    <aside className="slides">
      <h2>スライド</h2>
      {script.slides.map((slide, index) => {
        const status = slideStatus(slide, lineStates);
        const isActive = slide.slideId === currentSlideId;
        return (
          <button
            key={slide.slideId}
            className={`slideButton slideButton-${status}${isActive ? " active" : ""}`}
            onClick={() => selectSlide(slide.slideId)}
          >
            <span className="slideNumber">{String(slide.slideNumber ?? index + 1).padStart(2, "0")}</span>
            <span className="slideTitle">{slide.title}</span>
            <span className={`slideStatusDot slideStatusDot-${status}`} aria-label={slideStatusLabel[status]} />
          </button>
        );
      })}
    </aside>
  );
}
