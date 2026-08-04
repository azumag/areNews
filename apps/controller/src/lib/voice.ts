import type { AiSpeaker, EpisodeScript, ScriptLine, Settings, VoiceParams } from "../types";

/** Speaker id priority: line-level override > episode's `voicevox.defaultSpeakers`
 * > app settings' per-character default. `human_cue` never has a speaker. */
export function resolveSpeakerId(
  script: EpisodeScript,
  line: ScriptLine,
  settings: Settings
): number | null {
  if (line.speaker === "human_cue") return null;

  if (typeof line.voicevoxSpeakerId === "number") return line.voicevoxSpeakerId;

  const speaker = line.speaker as AiSpeaker;
  const scriptDefault = script.voicevox?.defaultSpeakers?.[speaker];
  if (typeof scriptDefault === "number") return scriptDefault;

  const appDefault = settings.defaultSpeakers[speaker];
  return typeof appDefault === "number" ? appDefault : null;
}

const VOICE_FIELDS: (keyof VoiceParams)[] = [
  "speedScale",
  "pitchScale",
  "intonationScale",
  "volumeScale",
  "prePhonemeLength",
  "postPhonemeLength"
];

// A negative silence length (or a zero/negative speed) crashes the
// VOICEVOX Engine with an opaque 500. Clamp here — the single place every
// voice param passes through on its way to synthesis — so this is
// enforced regardless of source: a stale settings.json written before the
// Settings dialog itself started clamping, or a hand-authored script's
// `lines[].voice.*`. `pitchScale` is intentionally not in this map; it's a
// pitch shift and negative values are valid.
const VOICE_FIELD_MIN: Partial<Record<keyof VoiceParams, number>> = {
  speedScale: 0.1,
  intonationScale: 0,
  volumeScale: 0,
  prePhonemeLength: 0,
  postPhonemeLength: 0
};

/** Per-field priority: line-level `voice.*` > app settings' voice defaults >
 * left unset entirely, so the VOICEVOX engine's own default applies. */
export function resolveVoiceParams(line: ScriptLine, settings: Settings): VoiceParams {
  const resolved: VoiceParams = {};
  for (const field of VOICE_FIELDS) {
    const value = line.voice?.[field] ?? settings.voice[field];
    if (typeof value === "number") {
      const min = VOICE_FIELD_MIN[field];
      resolved[field] = min !== undefined ? Math.max(value, min) : value;
    }
  }
  return resolved;
}

/** VOICEVOX reads `spokenText` when present (for pronunciation fixes on
 * proper nouns, numbers, URLs); the UI always displays `text`. */
export function textToSpeak(line: ScriptLine): string {
  return line.spokenText ?? line.text;
}
