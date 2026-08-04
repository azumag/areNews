import { describe, expect, it } from "vitest";
import type { Progress } from "../types";
import { buildScript } from "./testFixtures";
import { mergeProgress } from "./progress";

const NOW = "2026-01-01T00:00:00.000Z";

function baseProgress(overrides: Partial<Progress> = {}): Progress {
  return {
    version: 1,
    episodeId: "ep-1",
    scriptPath: "/tmp/script.json",
    scriptHash: "old-hash",
    currentSlideId: "s1",
    selectedLineId: "s1-l2",
    lineStates: { "s1-l1": "played", "s1-l2": "played" },
    updatedAt: "2025-12-31T00:00:00.000Z",
    ...overrides
  };
}

describe("mergeProgress", () => {
  it("creates fresh progress when nothing was saved", () => {
    const script = buildScript();
    const result = mergeProgress(null, script, "hash-1", "/tmp/script.json", NOW);
    expect(result.progress.lineStates).toEqual({});
    expect(result.progress.currentSlideId).toBe("s1");
    expect(result.needsPrompt).toBe(false);
    expect(result.stats).toEqual({ kept: 0, dropped: 0, added: 5 });
  });

  it("passes through verbatim when the script hash is unchanged", () => {
    const script = buildScript();
    const saved = baseProgress({ scriptHash: "hash-1" });
    const result = mergeProgress(saved, script, "hash-1", "/tmp/script.json", NOW);
    expect(result.progress).toEqual(saved);
    expect(result.needsPrompt).toBe(false);
  });

  it("keeps status for surviving line ids and marks new ids implicitly unread", () => {
    const script = buildScript();
    const saved = baseProgress({ scriptHash: "old-hash" });
    const result = mergeProgress(saved, script, "new-hash", "/tmp/script.json", NOW);
    expect(result.progress.lineStates).toEqual({ "s1-l1": "played", "s1-l2": "played" });
    expect(result.stats).toEqual({ kept: 2, dropped: 0, added: 3 });
    expect(result.needsPrompt).toBe(false);
  });

  it("drops statuses for line ids that no longer exist", () => {
    const script = buildScript();
    const saved = baseProgress({
      lineStates: { "s1-l1": "played", "ghost-line": "played" }
    });
    const result = mergeProgress(saved, script, "new-hash", "/tmp/script.json", NOW);
    expect(result.progress.lineStates).toEqual({ "s1-l1": "played" });
    expect(result.stats).toEqual({ kept: 1, dropped: 1, added: 4 });
  });

  it("requests a prompt when at least half of previously tracked lines were dropped", () => {
    const script = buildScript();
    const saved = baseProgress({
      lineStates: { "ghost-1": "played", "ghost-2": "played", "s1-l1": "played" }
    });
    const result = mergeProgress(saved, script, "new-hash", "/tmp/script.json", NOW);
    expect(result.stats.dropped).toBe(2);
    expect(result.needsPrompt).toBe(true);
  });

  it("requests a prompt when the saved current slide no longer exists, even with low drop ratio", () => {
    const script = buildScript();
    const saved = baseProgress({ currentSlideId: "s99", lineStates: { "s1-l1": "played" } });
    const result = mergeProgress(saved, script, "new-hash", "/tmp/script.json", NOW);
    expect(result.needsPrompt).toBe(true);
    expect(result.progress.currentSlideId).toBe("s1");
  });

  it("clears the selected line when it no longer exists", () => {
    const script = buildScript();
    const saved = baseProgress({ selectedLineId: "ghost-line" });
    const result = mergeProgress(saved, script, "new-hash", "/tmp/script.json", NOW);
    expect(result.progress.selectedLineId).toBeNull();
  });

  it("does not prompt when nothing had been tracked yet", () => {
    const script = buildScript();
    const saved = baseProgress({ lineStates: {} });
    const result = mergeProgress(saved, script, "new-hash", "/tmp/script.json", NOW);
    expect(result.needsPrompt).toBe(false);
  });
});
