import { useAppStore } from "../store/appStore";
import type { UsePlaybackResult } from "../hooks/usePlayback";

type Props = {
  playback: UsePlaybackResult;
};

function playbackStatusText(playback: UsePlaybackResult): string {
  const phase = playback.playback;
  switch (phase.phase) {
    case "idle":
      return "待機中";
    case "preparing":
      return "合成中...";
    case "playing":
      return "再生中";
    case "error":
      return `エラー: ${phase.message}`;
    default:
      return "";
  }
}

export default function PlaybackControls({ playback }: Props) {
  const script = useAppStore((s) => s.script);
  const currentSlideId = useAppStore((s) => s.currentSlideId);
  const selectSlide = useAppStore((s) => s.selectSlide);
  // "次の未読台詞" can legitimately land on a human_cue (no synthesis needed),
  // so it stays enabled — only actions that always require synthesis are
  // disabled while VOICEVOX is unreachable.
  const voicevoxUnreachable = useAppStore((s) => s.voicevox?.reachable === false);

  const currentIndex = script.slides.findIndex((s) => s.slideId === currentSlideId);

  return (
    <footer className="statusBar">
      <div className="statusBarControls">
        <button type="button" onClick={playback.stop} disabled={!playback.isBusy}>
          停止
        </button>
        <button type="button" onClick={playback.playNextUnread}>
          次の未読台詞
        </button>
        <button
          type="button"
          onClick={() => playback.playNextUnreadForCharacter("china_ai")}
          disabled={voicevoxUnreachable}
        >
          中華AIの次
        </button>
        <button
          type="button"
          onClick={() => playback.playNextUnreadForCharacter("america_ai")}
          disabled={voicevoxUnreachable}
        >
          メリケンAIの次
        </button>
        <button type="button" onClick={playback.replayLast} disabled={voicevoxUnreachable}>
          直前を再読
        </button>
        <button
          type="button"
          onClick={() => currentIndex > 0 && selectSlide(script.slides[currentIndex - 1].slideId)}
          disabled={currentIndex <= 0}
        >
          前のスライド
        </button>
        <button
          type="button"
          onClick={() =>
            currentIndex < script.slides.length - 1 && selectSlide(script.slides[currentIndex + 1].slideId)
          }
          disabled={currentIndex < 0 || currentIndex >= script.slides.length - 1}
        >
          次のスライド
        </button>
      </div>
      <span className={`playbackStatus playbackStatus-${playback.playback.phase}`}>
        {playbackStatusText(playback)}
      </span>
    </footer>
  );
}
