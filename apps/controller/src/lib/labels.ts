import type { Speaker } from "../types";

export const speakerLabel: Record<Speaker, string> = {
  china_ai: "中華AI",
  america_ai: "メリケンAI",
  human_cue: "人間コメント"
};

export const lineStatusLabel: Record<string, string> = {
  unread: "未読",
  played: "済",
  skipped: "スキップ",
  error: "エラー"
};

export const slideStatusLabel: Record<string, string> = {
  unread: "未読",
  in_progress: "進行中",
  done: "完了",
  skipped: "スキップ"
};
