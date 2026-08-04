export type Speaker = "china_ai" | "america_ai" | "human_cue";

export type ScriptLine = {
  id: string;
  speaker: Speaker;
  voicevoxSpeakerId?: number;
  text: string;
  note?: string;
};

export type ScriptSlide = {
  slideId: string;
  title: string;
  visual?: {
    type?: string;
    imagePrompt?: string;
    notes?: string;
  };
  lines: ScriptLine[];
};

export type EpisodeScript = {
  episodeId: string;
  title: string;
  date: string;
  voicevox?: {
    baseUrl?: string;
    defaultSpeakers?: {
      china_ai?: number;
      america_ai?: number;
    };
  };
  slides: ScriptSlide[];
};

export type VoicevoxResponse = {
  data_url: string;
};
