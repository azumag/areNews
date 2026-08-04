import { describe, expect, it } from "vitest";
import { applyPlaybackEvent, isBusy, type PlaybackPhase } from "./playbackState";

describe("applyPlaybackEvent", () => {
  it("PLAY_REQUESTED always starts a new preparing phase, even from error", () => {
    const errorState: PlaybackPhase = { phase: "error", message: "oops", lineId: "l1" };
    const result = applyPlaybackEvent(errorState, { type: "PLAY_REQUESTED", lineId: "l2", token: 5 });
    expect(result.accepted).toBe(true);
    expect(result.next).toEqual({ phase: "preparing", token: 5, lineId: "l2" });
  });

  it("a stale SYNTH_DONE token is ignored and does not change phase", () => {
    const state: PlaybackPhase = { phase: "preparing", token: 2, lineId: "l1" };
    const result = applyPlaybackEvent(state, { type: "SYNTH_DONE", token: 1 });
    expect(result.accepted).toBe(false);
    expect(result.next).toBe(state);
  });

  it("a current SYNTH_DONE token is accepted without changing phase", () => {
    const state: PlaybackPhase = { phase: "preparing", token: 2, lineId: "l1" };
    const result = applyPlaybackEvent(state, { type: "SYNTH_DONE", token: 2 });
    expect(result.accepted).toBe(true);
    expect(result.next).toEqual(state);
  });

  it("AUDIO_STARTED transitions preparing to playing for a matching token", () => {
    const state: PlaybackPhase = { phase: "preparing", token: 3, lineId: "l1" };
    const result = applyPlaybackEvent(state, { type: "AUDIO_STARTED", token: 3 });
    expect(result.next).toEqual({ phase: "playing", token: 3, lineId: "l1" });
  });

  it("only AUDIO_ENDED marks a line played, never STOP", () => {
    const playing: PlaybackPhase = { phase: "playing", token: 4, lineId: "l1" };

    const ended = applyPlaybackEvent(playing, { type: "AUDIO_ENDED", token: 4 });
    expect(ended.markPlayedLineId).toBe("l1");
    expect(ended.next).toEqual({ phase: "idle" });

    const stopped = applyPlaybackEvent(playing, { type: "STOP" });
    expect(stopped.markPlayedLineId).toBeUndefined();
    expect(stopped.next).toEqual({ phase: "idle" });
  });

  it("STOP during preparing returns to idle and a late AUDIO_ENDED for that token is then ignored", () => {
    const preparing: PlaybackPhase = { phase: "preparing", token: 7, lineId: "l1" };
    const afterStop = applyPlaybackEvent(preparing, { type: "STOP" });
    expect(afterStop.next).toEqual({ phase: "idle" });

    const lateEnd = applyPlaybackEvent(afterStop.next, { type: "AUDIO_ENDED", token: 7 });
    expect(lateEnd.accepted).toBe(false);
    expect(lateEnd.markPlayedLineId).toBeUndefined();
  });

  it("FAIL transitions to error for a matching token and is retryable via PLAY_REQUESTED", () => {
    const preparing: PlaybackPhase = { phase: "preparing", token: 9, lineId: "l1" };
    const failed = applyPlaybackEvent(preparing, { type: "FAIL", token: 9, message: "network error" });
    expect(failed.next).toEqual({ phase: "error", message: "network error", lineId: "l1" });

    const retried = applyPlaybackEvent(failed.next, { type: "PLAY_REQUESTED", lineId: "l1", token: 10 });
    expect(retried.next).toEqual({ phase: "preparing", token: 10, lineId: "l1" });
  });

  it("a stale FAIL token is ignored", () => {
    const state: PlaybackPhase = { phase: "playing", token: 11, lineId: "l1" };
    const result = applyPlaybackEvent(state, { type: "FAIL", token: 10, message: "late error" });
    expect(result.accepted).toBe(false);
    expect(result.next).toBe(state);
  });
});

describe("isBusy", () => {
  it("is true for preparing and playing, false otherwise", () => {
    expect(isBusy({ phase: "idle" })).toBe(false);
    expect(isBusy({ phase: "preparing", token: 1, lineId: "l1" })).toBe(true);
    expect(isBusy({ phase: "playing", token: 1, lineId: "l1" })).toBe(true);
    expect(isBusy({ phase: "error", message: "x", lineId: "l1" })).toBe(false);
  });
});
