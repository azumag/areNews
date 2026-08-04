import { useAppStore } from "../store/appStore";
import { statusOf } from "../lib/navigation";
import { speakerLabel, lineStatusLabel } from "../lib/labels";
import type { ScriptLine } from "../types";
import type { UsePlaybackResult } from "../hooks/usePlayback";

type Props = {
  playback: UsePlaybackResult;
};

export default function LineList({ playback }: Props) {
  const script = useAppStore((s) => s.script);
  const currentSlideId = useAppStore((s) => s.currentSlideId);
  const selectedLineId = useAppStore((s) => s.selectedLineId);
  const lineStates = useAppStore((s) => s.lineStates);
  const selectLine = useAppStore((s) => s.selectLine);

  const slide = script.slides.find((s) => s.slideId === currentSlideId) ?? script.slides[0];

  if (!slide) {
    return (
      <section className="lines-pane">
        <p>台詞がありません。</p>
      </section>
    );
  }

  function renderStatus(line: ScriptLine): string {
    const busyPhase = playback.playback.phase;
    if ((busyPhase === "preparing" || busyPhase === "playing") && playback.playback.lineId === line.id) {
      return busyPhase === "preparing" ? "合成中" : "再生中";
    }
    return lineStatusLabel[statusOf(lineStates, line.id)];
  }

  return (
    <section className="lines-pane">
      <h2>台詞</h2>
      <div className="lines">
        {slide.lines.map((line) => {
          const isSelected = line.id === selectedLineId;
          const status = statusOf(lineStates, line.id);
          const isHuman = line.speaker === "human_cue";

          return (
            <article
              key={line.id}
              className={`line line-${line.speaker} line-status-${status}${isSelected ? " selected" : ""}`}
              onClick={() => selectLine(line.id)}
            >
              <div className="lineTop">
                <span className="speaker">{speakerLabel[line.speaker]}</span>
                <span className="lineStatusBadge">{renderStatus(line)}</span>
              </div>
              <p>{line.text}</p>
              {line.note && <small>{line.note}</small>}
              <div className="lineActions">
                {isHuman ? (
                  <>
                    <span className="humanCue">ここで人間が話す</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        useAppStore.getState().setLineStatus(line.id, "played");
                      }}
                      disabled={status !== "unread"}
                    >
                      済にする
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playback.playLineById(line.id);
                      }}
                    >
                      {status === "unread" ? "読む" : "読み直す"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playback.skipLine(line.id);
                      }}
                      disabled={status !== "unread"}
                    >
                      スキップ
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
