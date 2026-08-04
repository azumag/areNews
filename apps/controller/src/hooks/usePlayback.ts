import { useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../store/appStore";
import { applyPlaybackEvent, isBusy } from "../lib/playbackState";
import { findLine, findNextUnreadForSpeaker, resolveNextUnreadAction, type FlatLine } from "../lib/navigation";
import { resolveSpeakerId, resolveVoiceParams, textToSpeak } from "../lib/voice";
import { describeError, playLine, stopPlayback } from "../lib/tauri";
import type { AiSpeaker } from "../types";

let tokenCounter = 0;

export function usePlayback() {
  const script = useAppStore((s) => s.script);
  const settings = useAppStore((s) => s.settings);
  const playback = useAppStore((s) => s.playback);
  const setPlayback = useAppStore((s) => s.setPlayback);
  const setLineStatus = useAppStore((s) => s.setLineStatus);
  const selectLine = useAppStore((s) => s.selectLine);
  const selectSlide = useAppStore((s) => s.selectSlide);
  const setLastPlayedLineId = useAppStore((s) => s.setLastPlayedLineId);
  const pushToast = useAppStore((s) => s.pushToast);

  // Selecting a line always brings its slide into view too — otherwise
  // "next unread" crossing a slide boundary plays/selects a line that's
  // invisible in the slide list and line panes.
  const selectFlatLine = useCallback(
    (flat: FlatLine) => {
      selectSlide(flat.slideId);
      selectLine(flat.line.id);
    },
    [selectSlide, selectLine]
  );

  const stop = useCallback(() => {
    void stopPlayback();
    const result = applyPlaybackEvent(useAppStore.getState().playback, { type: "STOP" });
    setPlayback(result.next);
  }, [setPlayback]);

  // Playback itself runs natively in the Rust process (see src-tauri's
  // audio_player) so OBS's application audio capture — which targets a
  // process, not this WebView — can actually pick it up. These events are
  // how that process reports progress back; applyPlaybackEvent's token
  // check drops anything superseded by a newer request or an explicit stop.
  useEffect(() => {
    const unlistenStarted = listen<number>("playback-started", (event) => {
      const playing = applyPlaybackEvent(useAppStore.getState().playback, {
        type: "AUDIO_STARTED",
        token: event.payload
      });
      setPlayback(playing.next);
    });
    const unlistenEnded = listen<number>("playback-ended", (event) => {
      const ended = applyPlaybackEvent(useAppStore.getState().playback, {
        type: "AUDIO_ENDED",
        token: event.payload
      });
      setPlayback(ended.next);
      if (ended.markPlayedLineId) {
        setLineStatus(ended.markPlayedLineId, "played");
        setLastPlayedLineId(ended.markPlayedLineId);
      }
    });
    const unlistenError = listen<{ token: number; message: string }>("playback-error", (event) => {
      const failed = applyPlaybackEvent(useAppStore.getState().playback, {
        type: "FAIL",
        token: event.payload.token,
        message: event.payload.message
      });
      setPlayback(failed.next);
      pushToast("error", "音声の再生に失敗しました");
    });

    return () => {
      void unlistenStarted.then((unlisten) => unlisten());
      void unlistenEnded.then((unlisten) => unlisten());
      void unlistenError.then((unlisten) => unlisten());
    };
  }, [setPlayback, setLineStatus, setLastPlayedLineId, pushToast]);

  const playFlatLine = useCallback(
    async (flat: FlatLine) => {
      const speakerId = resolveSpeakerId(script, flat.line, settings);
      if (speakerId === null) {
        pushToast("warning", "話者IDが設定されていません（設定画面から既定話者を設定してください）");
        return;
      }

      const token = ++tokenCounter;
      selectFlatLine(flat);
      const started = applyPlaybackEvent(useAppStore.getState().playback, {
        type: "PLAY_REQUESTED",
        lineId: flat.line.id,
        token
      });
      setPlayback(started.next);

      try {
        await playLine({
          token,
          baseUrl: settings.voicevoxBaseUrl,
          text: textToSpeak(flat.line),
          speakerId,
          params: resolveVoiceParams(flat.line, settings)
        });
        // Actual playback start/end/error arrives asynchronously via the
        // "playback-*" events wired up above, keyed by this same token.
      } catch (error) {
        const failed = applyPlaybackEvent(useAppStore.getState().playback, {
          type: "FAIL",
          token,
          message: describeError(error)
        });
        setPlayback(failed.next);
        pushToast("error", `再生に失敗しました: ${describeError(error)}`);
      }
    },
    [script, settings, selectFlatLine, setPlayback, pushToast]
  );

  const playLineById = useCallback(
    (lineId: string) => {
      const flat = findLine(script, lineId);
      if (flat) void playFlatLine(flat);
    },
    [script, playFlatLine]
  );

  const playNextUnread = useCallback(() => {
    const state = useAppStore.getState();
    const action = resolveNextUnreadAction(state.script, state.lineStates, state.selectedLineId);

    if (action.kind === "none") {
      pushToast("info", "未読の台詞はありません");
      return;
    }

    if (action.kind === "acknowledge_human_cue") {
      setLineStatus(action.line.line.id, "played");
      const followUpStates = { ...state.lineStates, [action.line.line.id]: "played" as const };
      const followUp = resolveNextUnreadAction(state.script, followUpStates, state.selectedLineId);
      if (followUp.kind === "play") void playFlatLine(followUp.line);
      else if (followUp.kind === "select_and_wait") selectFlatLine(followUp.line);
      else if (followUp.kind === "none") pushToast("info", "未読の台詞はありません");
      return;
    }

    if (action.kind === "select_and_wait") {
      selectFlatLine(action.line);
      return;
    }

    void playFlatLine(action.line);
  }, [playFlatLine, selectFlatLine, setLineStatus, pushToast]);

  const playNextUnreadForCharacter = useCallback(
    (speaker: AiSpeaker) => {
      const state = useAppStore.getState();
      const next = findNextUnreadForSpeaker(state.script, state.lineStates, state.selectedLineId, speaker);
      if (!next) {
        pushToast("info", "このキャラクターの未読台詞はありません");
        return;
      }
      void playFlatLine(next);
    },
    [playFlatLine, pushToast]
  );

  const replayLast = useCallback(() => {
    const lastId = useAppStore.getState().lastPlayedLineId;
    if (!lastId) return;
    playLineById(lastId);
  }, [playLineById]);

  const skipLine = useCallback(
    (lineId: string) => {
      setLineStatus(lineId, "skipped");
    },
    [setLineStatus]
  );

  useEffect(() => () => void stopPlayback(), []);

  return {
    playback,
    isBusy: isBusy(playback),
    playLineById,
    playNextUnread,
    playNextUnreadForCharacter,
    replayLast,
    skipLine,
    stop
  };
}

export type UsePlaybackResult = ReturnType<typeof usePlayback>;
