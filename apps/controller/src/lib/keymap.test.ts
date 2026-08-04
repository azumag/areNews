import { describe, expect, it } from "vitest";
import { actionForKey, resolveToggleAction, shouldSuppressShortcut } from "./keymap";

describe("actionForKey", () => {
  it.each([
    [" ", "TOGGLE_PLAY_NEXT_UNREAD_OR_STOP"],
    ["1", "NEXT_UNREAD_CHINA"],
    ["2", "NEXT_UNREAD_AMERICA"],
    ["r", "REPLAY_LAST"],
    ["R", "REPLAY_LAST"],
    ["Escape", "STOP"],
    ["ArrowLeft", "PREV_SLIDE"],
    ["ArrowRight", "NEXT_SLIDE"],
    ["s", "SKIP_SELECTED"],
    ["S", "SKIP_SELECTED"]
  ] as const)("maps key %j to %s", (key, expected) => {
    expect(actionForKey(key)).toBe(expected);
  });

  it("returns null for unbound keys", () => {
    expect(actionForKey("q")).toBeNull();
    expect(actionForKey("Tab")).toBeNull();
  });
});

describe("resolveToggleAction", () => {
  it("stops when playback is busy (covers both preparing and playing)", () => {
    expect(resolveToggleAction(true)).toBe("STOP");
  });

  it("plays the next unread line when idle", () => {
    expect(resolveToggleAction(false)).toBe("PLAY_NEXT_UNREAD");
  });
});

describe("shouldSuppressShortcut", () => {
  it("suppresses when a dialog is open regardless of target", () => {
    expect(shouldSuppressShortcut(null, true)).toBe(true);
  });

  it("does not suppress when there is no focused element and no dialog", () => {
    expect(shouldSuppressShortcut(null, false)).toBe(false);
  });

  it.each(["INPUT", "TEXTAREA", "SELECT"])("suppresses when focus is in a %s", (tagName) => {
    expect(shouldSuppressShortcut({ tagName, isContentEditable: false }, false)).toBe(true);
  });

  it("suppresses for contentEditable elements", () => {
    expect(shouldSuppressShortcut({ tagName: "DIV", isContentEditable: true }, false)).toBe(true);
  });

  it("does not suppress for ordinary elements", () => {
    expect(shouldSuppressShortcut({ tagName: "BUTTON", isContentEditable: false }, false)).toBe(false);
  });
});
