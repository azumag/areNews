import type { EpisodeScript } from "../types";

/** Shared fixture for lib unit tests: two slides, china/america/human_cue mixed. */
export function buildScript(): EpisodeScript {
  return {
    episodeId: "ep-1",
    title: "テスト",
    date: "2026-01-01",
    voicevox: {
      baseUrl: "http://127.0.0.1:50021",
      defaultSpeakers: { china_ai: 8, america_ai: 13 }
    },
    slides: [
      {
        slideId: "s1",
        title: "スライド1",
        lines: [
          { id: "s1-l1", speaker: "china_ai", text: "中華1" },
          { id: "s1-l2", speaker: "america_ai", text: "米国1" },
          { id: "s1-l3", speaker: "human_cue", text: "人間1" }
        ]
      },
      {
        slideId: "s2",
        title: "スライド2",
        lines: [
          { id: "s2-l1", speaker: "china_ai", text: "中華2" },
          { id: "s2-l2", speaker: "america_ai", text: "米国2" }
        ]
      }
    ]
  };
}
