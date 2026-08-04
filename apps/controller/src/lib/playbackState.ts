export type PlaybackPhase =
  | { phase: "idle" }
  | { phase: "preparing"; token: number; lineId: string }
  | { phase: "playing"; token: number; lineId: string }
  | { phase: "error"; message: string; lineId: string };

export type PlaybackEvent =
  | { type: "PLAY_REQUESTED"; lineId: string; token: number }
  | { type: "SYNTH_DONE"; token: number }
  | { type: "AUDIO_STARTED"; token: number }
  | { type: "AUDIO_ENDED"; token: number }
  | { type: "STOP" }
  | { type: "FAIL"; token: number; message: string };

export type PlaybackResult = {
  next: PlaybackPhase;
  /** False when the event was guarded away because its token no longer
   * matches the in-flight request (e.g. a synthesis result for a request
   * that was superseded by a newer one, or completing after STOP). */
  accepted: boolean;
  /** Set only when AUDIO_ENDED is accepted — the single event allowed to
   * mark a line played. Stopping mid-playback never sets this. */
  markPlayedLineId?: string;
};

function tokenMatches(state: PlaybackPhase, token: number): boolean {
  return (state.phase === "preparing" || state.phase === "playing") && state.token === token;
}

export function applyPlaybackEvent(state: PlaybackPhase, event: PlaybackEvent): PlaybackResult {
  switch (event.type) {
    case "PLAY_REQUESTED":
      return {
        next: { phase: "preparing", token: event.token, lineId: event.lineId },
        accepted: true
      };

    case "SYNTH_DONE":
      // No phase change: this is the checkpoint the caller uses to decide
      // whether to actually build and play the Audio element, or discard a
      // stale result whose token was superseded.
      return { next: state, accepted: tokenMatches(state, event.token) };

    case "AUDIO_STARTED": {
      if (state.phase !== "preparing" || state.token !== event.token) {
        return { next: state, accepted: false };
      }
      return {
        next: { phase: "playing", token: state.token, lineId: state.lineId },
        accepted: true
      };
    }

    case "AUDIO_ENDED": {
      if (!tokenMatches(state, event.token)) {
        return { next: state, accepted: false };
      }
      const lineId = state.phase === "preparing" || state.phase === "playing" ? state.lineId : undefined;
      return { next: { phase: "idle" }, accepted: true, markPlayedLineId: lineId };
    }

    case "STOP":
      // Always accepted, from any phase, and never marks a line played —
      // even if synthesis or playback was mid-flight.
      return { next: { phase: "idle" }, accepted: true };

    case "FAIL": {
      if (!tokenMatches(state, event.token)) {
        return { next: state, accepted: false };
      }
      const lineId = state.phase === "preparing" || state.phase === "playing" ? state.lineId : "";
      return { next: { phase: "error", message: event.message, lineId }, accepted: true };
    }

    default:
      return { next: state, accepted: false };
  }
}

export function isBusy(state: PlaybackPhase): boolean {
  return state.phase === "preparing" || state.phase === "playing";
}
