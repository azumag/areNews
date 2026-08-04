import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";
import { applyPlaybackEvent, isBusy } from "../lib/playbackState";
import { findLine, findNextUnreadForSpeaker, resolveNextUnreadAction, type FlatLine } from "../lib/navigation";
import { resolveSpeakerId, resolveVoiceParams, textToSpeak } from "../lib/voice";
import { describeError, synthesizeLine } from "../lib/tauri";
import type { AiSpeaker } from "../types";

let tokenCounter = 0;

export function usePlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const script = useAppStore((s) => s.script);
  const settings = useAppStore((s) => s.settings);
  const playback = useAppStore((s) => s.playback);
  const setPlayback = useAppStore((s) => s.setPlayback);
  const setLineStatus = useAppStore((s) => s.setLineStatus);
  const selectLine = useAppStore((s) => s.selectLine);
  const setLastPlayedLineId = useAppStore((s) => s.setLastPlayedLineId);
  const pushToast = useAppStore((s) => s.pushToast);

  const stopAudioElement = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopAudioElement();
    const result = applyPlaybackEvent(useAppStore.getState().playback, { type: "STOP" });
    setPlayback(result.next);
  }, [setPlayback, stopAudioElement]);

  const playFlatLine = useCallback(
    async (flat: FlatLine) => {
      const speakerId = resolveSpeakerId(script, flat.line, settings);
      if (speakerId === null) return;

      stopAudioElement();
      const token = ++tokenCounter;
      selectLine(flat.line.id);
      const started = applyPlaybackEvent(useAppStore.getState().playback, {
        type: "PLAY_REQUESTED",
        lineId: flat.line.id,
        token
      });
      setPlayback(started.next);

      try {
        const response = await synthesizeLine({
          baseUrl: settings.voicevoxBaseUrl,
          text: textToSpeak(flat.line),
          speakerId,
          params: resolveVoiceParams(flat.line, settings)
        });

        const synthResult = applyPlaybackEvent(useAppStore.getState().playback, {
          type: "SYNTH_DONE",
          token
        });
        if (!synthResult.accepted) {
          // A newer request (or a stop) superseded this one; drop the result.
          return;
        }

        const audio = new Audio(response.dataUrl);
        audioRef.current = audio;
        audio.onended = () => {
          const ended = applyPlaybackEvent(useAppStore.getState().playback, {
            type: "AUDIO_ENDED",
            token
          });
          setPlayback(ended.next);
          if (ended.markPlayedLineId) {
            setLineStatus(ended.markPlayedLineId, "played");
            setLastPlayedLineId(ended.markPlayedLineId);
          }
        };
        audio.onerror = () => {
          const failed = applyPlaybackEvent(useAppStore.getState().playback, {
            type: "FAIL",
            token,
            message: "音声の再生に失敗しました"
          });
          setPlayback(failed.next);
          pushToast("error", "音声の再生に失敗しました");
        };

        await audio.play();
        const playing = applyPlaybackEvent(useAppStore.getState().playback, {
          type: "AUDIO_STARTED",
          token
        });
        setPlayback(playing.next);
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
    [script, settings, stopAudioElement, selectLine, setPlayback, setLineStatus, setLastPlayedLineId, pushToast]
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
      else if (followUp.kind === "select_and_wait") selectLine(followUp.line.line.id);
      else if (followUp.kind === "none") pushToast("info", "未読の台詞はありません");
      return;
    }

    if (action.kind === "select_and_wait") {
      selectLine(action.line.line.id);
      return;
    }

    void playFlatLine(action.line);
  }, [playFlatLine, selectLine, setLineStatus, pushToast]);

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

  useEffect(() => stopAudioElement, [stopAudioElement]);

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
