import { invoke } from "@tauri-apps/api/core";
import type {
  CheckVoicevoxResponse,
  ClearCacheResponse,
  LoadScriptResponse,
  PlayLineResponse,
  Progress,
  SerializedError,
  Settings,
  ValidatedScript,
  VoiceParams,
  VoicevoxSpeakerInfo
} from "../types";

export function isSerializedError(value: unknown): value is SerializedError {
  return typeof value === "object" && value !== null && "kind" in value && "message" in value;
}

export function describeError(value: unknown): string {
  if (isSerializedError(value)) return value.message;
  if (value instanceof Error) return value.message;
  return String(value);
}

export async function openScriptFile(): Promise<string | null> {
  return invoke<string | null>("open_script_file");
}

export async function loadScriptFile(path: string): Promise<LoadScriptResponse> {
  return invoke<LoadScriptResponse>("load_script", { path });
}

export async function validateScriptContent(content: string): Promise<ValidatedScript> {
  return invoke<ValidatedScript>("validate_script_content", { content });
}

export async function checkVoicevox(baseUrl: string): Promise<CheckVoicevoxResponse> {
  return invoke<CheckVoicevoxResponse>("check_voicevox", { baseUrl });
}

export async function listVoicevoxSpeakers(baseUrl: string): Promise<VoicevoxSpeakerInfo[]> {
  return invoke<VoicevoxSpeakerInfo[]>("list_voicevox_speakers", { baseUrl });
}

export type PlayLineArgs = {
  token: number;
  baseUrl: string;
  text: string;
  speakerId: number;
  params: VoiceParams;
};

// Synthesizes (or serves from cache) and plays the line natively in the Rust
// process. `token` must match what the caller filters `playback-*` events by.
export async function playLine(args: PlayLineArgs): Promise<PlayLineResponse> {
  const { token, ...req } = args;
  return invoke<PlayLineResponse>("play_line", { token, req });
}

export async function stopPlayback(): Promise<void> {
  await invoke("stop_playback");
}

export async function clearAudioCache(): Promise<ClearCacheResponse> {
  return invoke<ClearCacheResponse>("clear_audio_cache");
}

export async function saveProgress(episodeId: string, progress: Progress): Promise<void> {
  await invoke("save_progress", { episodeId, progress });
}

export async function loadProgress(episodeId: string): Promise<Progress | null> {
  return invoke<Progress | null>("load_progress", { episodeId });
}

export async function saveSettings(settings: Settings): Promise<void> {
  await invoke("save_settings", { settings });
}

export async function loadSettings(): Promise<Settings | null> {
  return invoke<Settings | null>("load_settings");
}

export async function setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
  await invoke("set_always_on_top", { alwaysOnTop });
}
