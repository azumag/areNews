import { describe, expect, it } from "vitest";
import {
  fromPseudoPath,
  isPseudoPath,
  parseEpisodeScriptEntries,
  toPseudoPath,
  type GitTreeEntry
} from "./githubRepo";

describe("parseEpisodeScriptEntries", () => {
  it("extracts episode dir and path for each episodes/*/script.json blob", () => {
    const tree: GitTreeEntry[] = [
      { path: "episodes/2026-08-04-pilot/script.json", type: "blob" },
      { path: "episodes/2026-07-01-first/script.json", type: "blob" }
    ];
    const result = parseEpisodeScriptEntries(tree);
    expect(result).toEqual([
      { episodeDir: "2026-08-04-pilot", scriptPath: "episodes/2026-08-04-pilot/script.json" },
      { episodeDir: "2026-07-01-first", scriptPath: "episodes/2026-07-01-first/script.json" }
    ]);
  });

  it("sorts newest-looking episode slug first", () => {
    const tree: GitTreeEntry[] = [
      { path: "episodes/2026-01-01-old/script.json", type: "blob" },
      { path: "episodes/2026-08-04-new/script.json", type: "blob" }
    ];
    const result = parseEpisodeScriptEntries(tree);
    expect(result.map((e) => e.episodeDir)).toEqual(["2026-08-04-new", "2026-01-01-old"]);
  });

  it("ignores non-blob entries and files that are not episodes/*/script.json", () => {
    const tree: GitTreeEntry[] = [
      { path: "episodes", type: "tree" },
      { path: "episodes/2026-08-04-pilot", type: "tree" },
      { path: "episodes/2026-08-04-pilot/selection.md", type: "blob" },
      { path: "episodes/2026-08-04-pilot/notes/script.json", type: "blob" },
      { path: "templates/script.json", type: "blob" }
    ];
    expect(parseEpisodeScriptEntries(tree)).toEqual([]);
  });
});

describe("pseudo-path helpers", () => {
  it("round-trips a repo-relative path through the pseudo-path prefix", () => {
    const scriptPath = "episodes/2026-08-04-pilot/script.json";
    const pseudo = toPseudoPath(scriptPath);
    expect(isPseudoPath(pseudo)).toBe(true);
    expect(fromPseudoPath(pseudo)).toBe(scriptPath);
  });

  it("does not treat an ordinary local path as a pseudo-path", () => {
    expect(isPseudoPath("C:\\Users\\me\\script.json")).toBe(false);
    expect(isPseudoPath(null)).toBe(false);
    expect(isPseudoPath(undefined)).toBe(false);
  });
});
