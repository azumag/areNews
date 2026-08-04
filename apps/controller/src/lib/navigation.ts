import type { AiSpeaker, EpisodeScript, LineStatus, ScriptLine, ScriptSlide } from "../types";

export type FlatLine = {
  line: ScriptLine;
  slideId: string;
  slideIndex: number;
  flatIndex: number;
};

export function flattenLines(script: EpisodeScript): FlatLine[] {
  const flat: FlatLine[] = [];
  script.slides.forEach((slide, slideIndex) => {
    slide.lines.forEach((line) => {
      flat.push({ line, slideId: slide.slideId, slideIndex, flatIndex: flat.length });
    });
  });
  return flat;
}

export function statusOf(lineStates: Record<string, LineStatus>, lineId: string): LineStatus {
  return lineStates[lineId] ?? "unread";
}

export function findLine(script: EpisodeScript, lineId: string): FlatLine | null {
  return flattenLines(script).find((f) => f.line.id === lineId) ?? null;
}

/** Finds the next unread line strictly after `afterLineId` (or from the very
 * start when `afterLineId` is null). There is no wrap-around: reaching the
 * end of the script returns null rather than looping back to the top. */
export function findNextUnread(
  script: EpisodeScript,
  lineStates: Record<string, LineStatus>,
  afterLineId: string | null
): FlatLine | null {
  const flat = flattenLines(script);
  const afterIndex = afterLineId ? flat.findIndex((f) => f.line.id === afterLineId) : -1;
  const startIndex = afterIndex + 1;
  for (let i = startIndex; i < flat.length; i++) {
    if (statusOf(lineStates, flat[i].line.id) === "unread") {
      return flat[i];
    }
  }
  return null;
}

/** Finds the next unread line for one AI character, skipping over the other
 * character's lines and every `human_cue`. An explicit per-character request
 * intentionally bypasses the human_cue "wait" rule that `findNextUnread`
 * enforces — the streamer chose this character on purpose. */
export function findNextUnreadForSpeaker(
  script: EpisodeScript,
  lineStates: Record<string, LineStatus>,
  afterLineId: string | null,
  speaker: AiSpeaker
): FlatLine | null {
  const flat = flattenLines(script);
  const afterIndex = afterLineId ? flat.findIndex((f) => f.line.id === afterLineId) : -1;
  const startIndex = afterIndex + 1;
  for (let i = startIndex; i < flat.length; i++) {
    const candidate = flat[i];
    if (
      candidate.line.speaker === speaker &&
      statusOf(lineStates, candidate.line.id) === "unread"
    ) {
      return candidate;
    }
  }
  return null;
}

export type NextUnreadAction =
  | { kind: "none" }
  | { kind: "select_and_wait"; line: FlatLine }
  | { kind: "play"; line: FlatLine }
  | { kind: "acknowledge_human_cue"; line: FlatLine };

/**
 * Single-step resolution of the "next unread line" action.
 *
 * If the currently selected line is an unread `human_cue`, the caller is
 * expected to be pressing "next unread" a second time to move past it: this
 * returns `acknowledge_human_cue` so the caller marks it `played` and calls
 * this function again (now that the line states reflect the acknowledgement)
 * to learn what happens after it. This function never mutates or chains
 * internally — it always describes exactly one step from the given state.
 */
export function resolveNextUnreadAction(
  script: EpisodeScript,
  lineStates: Record<string, LineStatus>,
  selectedLineId: string | null
): NextUnreadAction {
  if (selectedLineId) {
    const selected = findLine(script, selectedLineId);
    if (
      selected &&
      selected.line.speaker === "human_cue" &&
      statusOf(lineStates, selected.line.id) === "unread"
    ) {
      return { kind: "acknowledge_human_cue", line: selected };
    }
  }

  const next = findNextUnread(script, lineStates, selectedLineId);
  if (!next) return { kind: "none" };
  if (next.line.speaker === "human_cue") {
    return { kind: "select_and_wait", line: next };
  }
  return { kind: "play", line: next };
}

export type SlideStatus = "unread" | "in_progress" | "done" | "skipped";

/** Slide status is always derived from its lines' statuses, never stored. */
export function slideStatus(slide: ScriptSlide, lineStates: Record<string, LineStatus>): SlideStatus {
  if (slide.lines.length === 0) return "done";
  const statuses = slide.lines.map((line) => statusOf(lineStates, line.id));
  if (statuses.every((s) => s === "unread")) return "unread";
  if (statuses.every((s) => s === "played" || s === "skipped")) {
    return statuses.every((s) => s === "skipped") ? "skipped" : "done";
  }
  return "in_progress";
}
