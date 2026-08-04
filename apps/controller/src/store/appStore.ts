import { create } from "zustand";
import { sampleEpisode } from "../sampleEpisode";
import type {
  EpisodeScript,
  LineStatus,
  Progress,
  Settings,
  ValidationIssue,
  VoicevoxSpeakerInfo
} from "../types";
import type { MergeStats } from "../lib/progress";
import type { PlaybackPhase } from "../lib/playbackState";

export const DEFAULT_SETTINGS: Settings = {
  voicevoxBaseUrl: "http://127.0.0.1:50021",
  defaultSpeakers: {},
  voice: {},
  overrideScriptSpeakers: false,
  openLastScriptOnStartup: false,
  alwaysOnTop: false,
  lastOpenedScriptPath: null
};

export type Toast = {
  id: string;
  tone: "info" | "warning" | "error";
  message: string;
};

export type ScriptValidationError = {
  path: string;
  issues: ValidationIssue[];
};

export type PendingMerge = {
  merged: Progress;
  fresh: Progress;
  stats: MergeStats;
};

export type VoicevoxConnectivity = {
  reachable: boolean;
  version: string | null;
  error: string | null;
};

type AppState = {
  script: EpisodeScript;
  scriptPath: string | null;
  scriptHash: string | null;
  scriptValidationError: ScriptValidationError | null;

  currentSlideId: string | null;
  selectedLineId: string | null;
  lastPlayedLineId: string | null;
  lineStates: Record<string, LineStatus>;
  pendingMerge: PendingMerge | null;
  /** False from the moment a script loads until its saved progress has been
   * reconciled and applied (directly, or via the keep/reset prompt). Guards
   * autosave: saving before this is true would overwrite real saved
   * progress with the empty state a fresh script load starts from. */
  progressReady: boolean;

  playback: PlaybackPhase;

  settings: Settings;
  isSettingsOpen: boolean;

  speakers: VoicevoxSpeakerInfo[] | null;
  voicevox: VoicevoxConnectivity | null;

  toasts: Toast[];

  loadScript: (script: EpisodeScript, scriptHash: string, scriptPath: string) => void;
  setScriptValidationError: (error: ScriptValidationError | null) => void;
  applyProgress: (progress: Progress) => void;
  setPendingMerge: (pending: PendingMerge | null) => void;
  resolvePendingMergeKeep: () => void;
  resolvePendingMergeReset: () => void;

  selectSlide: (slideId: string) => void;
  selectLine: (lineId: string) => void;
  setLineStatus: (lineId: string, status: LineStatus) => void;
  setLastPlayedLineId: (lineId: string | null) => void;

  setPlayback: (phase: PlaybackPhase) => void;

  setSettings: (settings: Settings) => void;
  setSettingsOpen: (open: boolean) => void;

  setSpeakers: (speakers: VoicevoxSpeakerInfo[] | null) => void;
  setVoicevoxStatus: (status: VoicevoxConnectivity | null) => void;

  pushToast: (tone: Toast["tone"], message: string) => void;
  dismissToast: (id: string) => void;
};

function newToastId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useAppStore = create<AppState>((set, get) => ({
  script: sampleEpisode,
  scriptPath: null,
  scriptHash: null,
  scriptValidationError: null,

  currentSlideId: sampleEpisode.slides[0]?.slideId ?? null,
  selectedLineId: null,
  lastPlayedLineId: null,
  lineStates: {},
  pendingMerge: null,
  progressReady: true,

  playback: { phase: "idle" },

  settings: DEFAULT_SETTINGS,
  isSettingsOpen: false,

  speakers: null,
  voicevox: null,

  toasts: [],

  loadScript: (script, scriptHash, scriptPath) =>
    set({
      script,
      scriptHash,
      scriptPath,
      scriptValidationError: null,
      currentSlideId: script.slides[0]?.slideId ?? null,
      selectedLineId: null,
      lastPlayedLineId: null,
      lineStates: {},
      pendingMerge: null,
      progressReady: false,
      playback: { phase: "idle" }
    }),

  setScriptValidationError: (error) => set({ scriptValidationError: error }),

  applyProgress: (progress) =>
    set({
      currentSlideId: progress.currentSlideId,
      selectedLineId: progress.selectedLineId,
      lineStates: progress.lineStates,
      progressReady: true
    }),

  setPendingMerge: (pending) => set({ pendingMerge: pending }),

  resolvePendingMergeKeep: () => {
    const pending = get().pendingMerge;
    if (!pending) return;
    get().applyProgress(pending.merged);
    set({ pendingMerge: null });
  },

  resolvePendingMergeReset: () => {
    const pending = get().pendingMerge;
    if (!pending) return;
    get().applyProgress(pending.fresh);
    set({ pendingMerge: null });
  },

  selectSlide: (slideId) => set({ currentSlideId: slideId }),
  selectLine: (lineId) => set({ selectedLineId: lineId }),

  setLineStatus: (lineId, status) =>
    set((state) => ({ lineStates: { ...state.lineStates, [lineId]: status } })),

  setLastPlayedLineId: (lineId) => set({ lastPlayedLineId: lineId }),

  setPlayback: (phase) => set({ playback: phase }),

  setSettings: (settings) => set({ settings }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),

  setSpeakers: (speakers) => set({ speakers }),
  setVoicevoxStatus: (status) => set({ voicevox: status }),

  pushToast: (tone, message) =>
    set((state) => ({ toasts: [...state.toasts, { id: newToastId(), tone, message }] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}));
