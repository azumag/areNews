import { useEffect } from "react";
import { useAppStore } from "../store/appStore";
import { actionForKey, resolveToggleAction, shouldSuppressShortcut } from "../lib/keymap";
import type { UsePlaybackResult } from "./usePlayback";

/** Wires the footer/global shortcuts (Space/1/2/R/Esc/arrows/S) to the same
 * actions the footer buttons trigger. Suppressed while a text field or the
 * settings dialog has focus. */
export function useKeyboardShortcuts(playback: UsePlaybackResult) {
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target =
        event.target instanceof HTMLElement
          ? { tagName: event.target.tagName, isContentEditable: event.target.isContentEditable }
          : null;
      if (shouldSuppressShortcut(target, isSettingsOpen)) return;

      const action = actionForKey(event.key);
      if (!action) return;

      event.preventDefault();

      const state = useAppStore.getState();

      switch (action) {
        case "TOGGLE_PLAY_NEXT_UNREAD_OR_STOP":
          if (resolveToggleAction(playback.isBusy) === "STOP") playback.stop();
          else playback.playNextUnread();
          break;
        case "NEXT_UNREAD_CHINA":
          playback.playNextUnreadForCharacter("china_ai");
          break;
        case "NEXT_UNREAD_AMERICA":
          playback.playNextUnreadForCharacter("america_ai");
          break;
        case "REPLAY_LAST":
          playback.replayLast();
          break;
        case "STOP":
          playback.stop();
          break;
        case "PREV_SLIDE":
        case "NEXT_SLIDE": {
          const slides = state.script.slides;
          const currentIndex = slides.findIndex((slide) => slide.slideId === state.currentSlideId);
          const nextIndex = action === "PREV_SLIDE" ? currentIndex - 1 : currentIndex + 1;
          if (nextIndex >= 0 && nextIndex < slides.length) {
            state.selectSlide(slides[nextIndex].slideId);
          }
          break;
        }
        case "SKIP_SELECTED":
          if (state.selectedLineId) playback.skipLine(state.selectedLineId);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playback, isSettingsOpen]);
}
