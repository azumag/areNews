export type Speaker = "china_ai" | "america_ai" | "human_cue";
export type AiSpeaker = Exclude<Speaker, "human_cue">;

export type VoiceParams = {
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  volumeScale?: number;
  prePhonemeLength?: number;
  postPhonemeLength?: number;
};

export type ScriptLine = {
  id: string;
  speaker: Speaker;
  voicevoxSpeakerId?: number;
  text: string;
  spokenText?: string;
  note?: string;
  voice?: VoiceParams;
};

export type ScriptSlide = {
  slideId: string;
  slideNumber?: number;
  title: string;
  notes?: string;
  previewImage?: string;
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
  presentation?: {
    googleSlidesUrl?: string;
    exportedSlidesDir?: string;
  };
  voicevox?: {
    baseUrl?: string;
    defaultSpeakers?: Partial<Record<AiSpeaker, number>>;
  };
  slides: ScriptSlide[];
};

/** Persisted per-line state. Anything not listed here (selected/playing/error)
 * is ephemeral UI state derived from the playback machine, not stored. */
export type LineStatus = "unread" | "played" | "skipped";

export type Progress = {
  version: 1;
  episodeId: string;
  scriptPath: string;
  scriptHash: string;
  currentSlideId: string | null;
  selectedLineId: string | null;
  lineStates: Record<string, LineStatus>;
  updatedAt: string;
};

export type Settings = {
  voicevoxBaseUrl: string;
  defaultSpeakers: Partial<Record<AiSpeaker, number>>;
  voice: VoiceParams;
  openLastScriptOnStartup: boolean;
  alwaysOnTop: boolean;
  lastOpenedScriptPath: string | null;
};

export type SpeakerStyle = {
  id: number;
  name: string;
};

export type VoicevoxSpeakerInfo = {
  name: string;
  speakerUuid: string;
  styles: SpeakerStyle[];
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type SerializedError = {
  kind: string;
  message: string;
  details?: ValidationIssue[];
};

export type LoadScriptResponse = {
  script: EpisodeScript;
  scriptHash: string;
  path: string;
};

export type CheckVoicevoxResponse = {
  reachable: boolean;
  version?: string | null;
  error?: string | null;
};

export type SynthesizeLineResponse = {
  dataUrl: string;
  cacheHit: boolean;
};

export type ClearCacheResponse = {
  deletedFiles: number;
  freedBytes: number;
};
