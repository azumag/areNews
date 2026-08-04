import type { EpisodeScript } from "./types";

export const sampleEpisode: EpisodeScript = {
  episodeId: "sample",
  title: "政経ニュースコーナー サンプル",
  date: "2026-08-04",
  voicevox: {
    baseUrl: "http://127.0.0.1:50021",
    defaultSpeakers: {
      china_ai: 8,
      america_ai: 13
    }
  },
  slides: [
    {
      slideId: "s001",
      title: "オープニング",
      visual: {
        type: "title",
        notes: "タイトルスライド"
      },
      lines: [
        {
          id: "s001-l001",
          speaker: "china_ai",
          voicevoxSpeakerId: 8,
          text: "今日も世界は、だいたい揉めているアル。まずは事実を確認するヨ。"
        },
        {
          id: "s001-l002",
          speaker: "america_ai",
          voicevoxSpeakerId: 13,
          text: "混乱はリスクであり、同時にチャンスでもある。今日の政経ニュースを見ていこう。"
        },
        {
          id: "s001-l003",
          speaker: "human_cue",
          text: "ここで人間が、今日扱うテーマを一言で説明する。"
        }
      ]
    },
    {
      slideId: "s002",
      title: "見方の対立",
      visual: {
        type: "two-perspectives",
        notes: "左右に中華AI・メリケンAIの見方を置く"
      },
      lines: [
        {
          id: "s002-l001",
          speaker: "china_ai",
          voicevoxSpeakerId: 8,
          text: "これは市場の問題ではなく、誰が負担を押しつけられているかの問題アル。"
        },
        {
          id: "s002-l002",
          speaker: "america_ai",
          voicevoxSpeakerId: 13,
          text: "いや、制度設計が悪いと投資も消費も冷える。持続可能性を見ない議論は危険だ。"
        },
        {
          id: "s002-l003",
          speaker: "human_cue",
          text: "ここで人間が、生活費・税金・仕事への影響に引き寄せて話す。"
        }
      ]
    }
  ]
};
