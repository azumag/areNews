import { describe, expect, it } from "vitest";
import type { LineStatus } from "../types";
import { buildScript } from "./testFixtures";
import {
  findNextUnread,
  findNextUnreadForSpeaker,
  resolveNextUnreadAction,
  slideStatus
} from "./navigation";

describe("findNextUnread", () => {
  it("finds the first unread line from the start", () => {
    const script = buildScript();
    const next = findNextUnread(script, {}, null);
    expect(next?.line.id).toBe("s1-l1");
  });

  it("continues across slide boundaries", () => {
    const script = buildScript();
    const lineStates: Record<string, LineStatus> = {
      "s1-l1": "played",
      "s1-l2": "played",
      "s1-l3": "played"
    };
    const next = findNextUnread(script, lineStates, "s1-l3");
    expect(next?.line.id).toBe("s2-l1");
  });

  it("stops at the human_cue line rather than skipping it", () => {
    const script = buildScript();
    const lineStates: Record<string, LineStatus> = { "s1-l1": "played", "s1-l2": "played" };
    const next = findNextUnread(script, lineStates, "s1-l2");
    expect(next?.line.id).toBe("s1-l3");
  });

  it("does not wrap around at the end of the script", () => {
    const script = buildScript();
    const next = findNextUnread(script, {}, "s2-l2");
    expect(next).toBeNull();
  });
});

describe("findNextUnreadForSpeaker", () => {
  it("skips human_cue and the other character's lines", () => {
    const script = buildScript();
    const next = findNextUnreadForSpeaker(script, {}, null, "america_ai");
    expect(next?.line.id).toBe("s1-l2");
  });

  it("finds the character's next line across slides, ignoring an unread human_cue in between", () => {
    const script = buildScript();
    const lineStates: Record<string, LineStatus> = { "s1-l1": "played" };
    const next = findNextUnreadForSpeaker(script, lineStates, "s1-l1", "china_ai");
    expect(next?.line.id).toBe("s2-l1");
  });

  it("returns null when the character has no remaining unread lines", () => {
    const script = buildScript();
    const next = findNextUnreadForSpeaker(script, {}, "s2-l1", "china_ai");
    expect(next).toBeNull();
  });
});

describe("resolveNextUnreadAction", () => {
  it("returns play for the first AI line", () => {
    const script = buildScript();
    const action = resolveNextUnreadAction(script, {}, null);
    expect(action.kind).toBe("play");
    expect(action.kind === "play" && action.line.line.id).toBe("s1-l1");
  });

  it("waits at an unread human_cue instead of playing it", () => {
    const script = buildScript();
    const lineStates: Record<string, LineStatus> = { "s1-l1": "played", "s1-l2": "played" };
    const action = resolveNextUnreadAction(script, lineStates, "s1-l2");
    expect(action.kind).toBe("select_and_wait");
    expect(action.kind === "select_and_wait" && action.line.line.id).toBe("s1-l3");
  });

  it("a second call while selection sits on the unread human_cue asks the caller to acknowledge it", () => {
    const script = buildScript();
    const lineStates: Record<string, LineStatus> = { "s1-l1": "played", "s1-l2": "played" };
    const action = resolveNextUnreadAction(script, lineStates, "s1-l3");
    expect(action.kind).toBe("acknowledge_human_cue");
    expect(action.kind === "acknowledge_human_cue" && action.line.line.id).toBe("s1-l3");
  });

  it("after acknowledging the human_cue, the follow-up call resumes forward search", () => {
    const script = buildScript();
    const lineStates: Record<string, LineStatus> = {
      "s1-l1": "played",
      "s1-l2": "played",
      "s1-l3": "played" // simulates the caller having applied the acknowledgement
    };
    const action = resolveNextUnreadAction(script, lineStates, "s1-l3");
    expect(action.kind).toBe("play");
    expect(action.kind === "play" && action.line.line.id).toBe("s2-l1");
  });

  it("returns none once every line is resolved", () => {
    const script = buildScript();
    const lineStates: Record<string, LineStatus> = {
      "s1-l1": "played",
      "s1-l2": "played",
      "s1-l3": "played",
      "s2-l1": "played",
      "s2-l2": "skipped"
    };
    const action = resolveNextUnreadAction(script, lineStates, "s2-l2");
    expect(action.kind).toBe("none");
  });
});

describe("slideStatus", () => {
  it("is unread when no line has been touched", () => {
    const script = buildScript();
    expect(slideStatus(script.slides[0], {})).toBe("unread");
  });

  it("is in_progress when some lines are resolved and others are not", () => {
    const script = buildScript();
    expect(slideStatus(script.slides[0], { "s1-l1": "played" })).toBe("in_progress");
  });

  it("is done when every line is played or a mix of played/skipped", () => {
    const script = buildScript();
    const states: Record<string, LineStatus> = {
      "s1-l1": "played",
      "s1-l2": "skipped",
      "s1-l3": "played"
    };
    expect(slideStatus(script.slides[0], states)).toBe("done");
  });

  it("is skipped when every line was skipped", () => {
    const script = buildScript();
    const states: Record<string, LineStatus> = {
      "s2-l1": "skipped",
      "s2-l2": "skipped"
    };
    expect(slideStatus(script.slides[1], states)).toBe("skipped");
  });
});
