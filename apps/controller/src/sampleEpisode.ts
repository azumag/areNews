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
          text: "あずまぐ同志、今日も世界では重要な出来事が重なっています。揉め事だけは計画なしでも増産されますね。"
        },
        {
          id: "s001-l002",
          speaker: "america_ai",
          voicevoxSpeakerId: 13,
          text: "今日は事実と解釈を分けて見ていきます。市場は混乱にも値札を付けますが、僕たちまで同じ速さで判断する必要はありません。"
        },
        {
          id: "s001-l003",
          speaker: "human_cue",
          text: "今日の重大ニュースと、視聴者に持ち帰ってほしい問いを一言で紹介する。"
        }
      ]
    },
    {
      slideId: "s002",
      title: "見方の違い",
      visual: {
        type: "two-perspectives",
        notes: "左右に中華AI・メリケンAIの見方を置く"
      },
      lines: [
        {
          id: "s002-l001",
          speaker: "china_ai",
          voicevoxSpeakerId: 8,
          text: "あずまぐ同志、これは市場価格だけでなく、最終的な負担が誰へ回るかを見る問題です。請求書には思想がなくても、送り先には階級があります。"
        },
        {
          id: "s002-l002",
          speaker: "america_ai",
          voicevoxSpeakerId: 13,
          text: "その点は否定しませんが、制度が持続しなければ支援も続きません。僕としては善意にも保守費用の欄を付けてほしいところです。"
        },
        {
          id: "s002-l003",
          speaker: "human_cue",
          text: "生活費、税金、仕事への影響について、どちらの見方に現実味があるか話す。"
        }
      ]
    }
  ]
};
