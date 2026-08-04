import type { EpisodeScript, LineStatus, Progress } from "../types";
import { flattenLines } from "./navigation";

export type MergeStats = {
  kept: number;
  dropped: number;
  added: number;
};

export type MergeResult = {
  progress: Progress;
  stats: MergeStats;
  /** True when the change looks big enough that the UI should ask
   * "keep previous state / reset" instead of silently merging. */
  needsPrompt: boolean;
};

const BIG_CHANGE_DROPPED_RATIO = 0.5;

export function freshProgress(script: EpisodeScript, scriptHash: string, scriptPath: string, now: string): Progress {
  return {
    version: 1,
    episodeId: script.episodeId,
    scriptPath,
    scriptHash,
    currentSlideId: script.slides[0]?.slideId ?? null,
    selectedLineId: null,
    lineStates: {},
    updatedAt: now
  };
}

/**
 * Reconciles a previously saved progress document against a freshly loaded
 * script. `now` is injected (rather than read internally) so the function
 * stays pure and deterministic for testing.
 *
 * Rules: identical script hash reuses the saved progress verbatim. Otherwise,
 * per-line status is kept for ids that still exist, dropped for ids that
 * vanished, and new ids start unread. If at least half of the previously
 * resolved (played/skipped) lines were dropped, or the saved current slide no
 * longer exists, `needsPrompt` asks the caller to offer "keep / reset"
 * instead of merging silently.
 */
export function mergeProgress(
  saved: Progress | null,
  script: EpisodeScript,
  scriptHash: string,
  scriptPath: string,
  now: string
): MergeResult {
  const flat = flattenLines(script);

  if (!saved) {
    return {
      progress: freshProgress(script, scriptHash, scriptPath, now),
      stats: { kept: 0, dropped: 0, added: flat.length },
      needsPrompt: false
    };
  }

  if (saved.scriptHash === scriptHash) {
    return {
      progress: saved,
      stats: { kept: Object.keys(saved.lineStates).length, dropped: 0, added: 0 },
      needsPrompt: false
    };
  }

  const currentLineIds = new Set(flat.map((f) => f.line.id));
  const currentSlideIds = new Set(script.slides.map((s) => s.slideId));

  const lineStates: Record<string, LineStatus> = {};
  let kept = 0;
  let dropped = 0;
  for (const [lineId, status] of Object.entries(saved.lineStates)) {
    if (currentLineIds.has(lineId)) {
      lineStates[lineId] = status;
      kept++;
    } else {
      dropped++;
    }
  }
  const added = flat.filter((f) => !(f.line.id in saved.lineStates)).length;

  const previouslyTracked = Object.keys(saved.lineStates).length;
  const droppedRatio = previouslyTracked === 0 ? 0 : dropped / previouslyTracked;
  const currentSlideMissing =
    saved.currentSlideId !== null && !currentSlideIds.has(saved.currentSlideId);
  const needsPrompt = droppedRatio >= BIG_CHANGE_DROPPED_RATIO || currentSlideMissing;

  const currentSlideId =
    saved.currentSlideId !== null && currentSlideIds.has(saved.currentSlideId)
      ? saved.currentSlideId
      : script.slides[0]?.slideId ?? null;
  const selectedLineId =
    saved.selectedLineId !== null && currentLineIds.has(saved.selectedLineId)
      ? saved.selectedLineId
      : null;

  return {
    progress: {
      version: 1,
      episodeId: script.episodeId,
      scriptPath,
      scriptHash,
      currentSlideId,
      selectedLineId,
      lineStates,
      updatedAt: now
    },
    stats: { kept, dropped, added },
    needsPrompt
  };
}
