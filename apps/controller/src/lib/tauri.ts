import { invoke } from "@tauri-apps/api/core";
import type {
  CheckVoicevoxResponse,
  ClearCacheResponse,
  LoadScriptResponse,
  Progress,
  SerializedError,
  Settings,
  SynthesizeLineResponse,
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

export async function checkVoicevox(baseUrl: string): Promise<CheckVoicevoxResponse> {
  return invoke<CheckVoicevoxResponse>("check_voicevox", { baseUrl });
}

export async function listVoicevoxSpeakers(baseUrl: string): Promise<VoicevoxSpeakerInfo[]> {
  return invoke<VoicevoxSpeakerInfo[]>("list_voicevox_speakers", { baseUrl });
}

export type SynthesizeLineArgs = {
  baseUrl: string;
  text: string;
  speakerId: number;
  params: VoiceParams;
};

export async function synthesizeLine(args: SynthesizeLineArgs): Promise<SynthesizeLineResponse> {
  return invoke<SynthesizeLineResponse>("synthesize_line", { req: args });
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
