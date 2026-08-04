export type ShortcutAction =
  | "TOGGLE_PLAY_NEXT_UNREAD_OR_STOP"
  | "NEXT_UNREAD_CHINA"
  | "NEXT_UNREAD_AMERICA"
  | "REPLAY_LAST"
  | "STOP"
  | "PREV_SLIDE"
  | "NEXT_SLIDE"
  | "SKIP_SELECTED";

const KEY_TO_ACTION: Record<string, ShortcutAction> = {
  " ": "TOGGLE_PLAY_NEXT_UNREAD_OR_STOP",
  "1": "NEXT_UNREAD_CHINA",
  "2": "NEXT_UNREAD_AMERICA",
  r: "REPLAY_LAST",
  R: "REPLAY_LAST",
  Escape: "STOP",
  ArrowLeft: "PREV_SLIDE",
  ArrowRight: "NEXT_SLIDE",
  s: "SKIP_SELECTED",
  S: "SKIP_SELECTED"
};

/** `event.key` -> app action, or null for any key we don't bind. */
export function actionForKey(key: string): ShortcutAction | null {
  return KEY_TO_ACTION[key] ?? null;
}

/** `Space` doubles as "play the next unread line" and "stop" depending on
 * whether playback is currently busy (preparing counts as busy, same as
 * playing, since a synthesis request is already in flight by then). */
export function resolveToggleAction(playbackIsBusy: boolean): "STOP" | "PLAY_NEXT_UNREAD" {
  return playbackIsBusy ? "STOP" : "PLAY_NEXT_UNREAD";
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export type ShortcutTargetInfo = {
  tagName: string;
  isContentEditable: boolean;
};

/**
 * True when a shortcut keypress should be ignored: focus is in a text field
 * or contentEditable element, or a modal dialog (e.g. settings) is open.
 * Takes a plain descriptor rather than a DOM node so it stays framework- and
 * environment-free — the keyboard hook adapts `event.target` into this shape.
 */
export function shouldSuppressShortcut(
  target: ShortcutTargetInfo | null,
  isDialogOpen: boolean
): boolean {
  if (isDialogOpen) return true;
  if (!target) return false;
  if (EDITABLE_TAGS.has(target.tagName)) return true;
  return target.isContentEditable;
}
