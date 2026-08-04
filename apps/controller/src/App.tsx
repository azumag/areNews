import { useCallback, useEffect, useRef } from "react";
import { useAppStore, DEFAULT_SETTINGS } from "./store/appStore";
import { usePlayback } from "./hooks/usePlayback";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useProgress } from "./hooks/useProgress";
import {
  checkVoicevox,
  describeError,
  isSerializedError,
  loadScriptFile,
  loadSettings,
  openScriptFile,
  setAlwaysOnTop
} from "./lib/tauri";
import AppHeader from "./components/AppHeader";
import SlideList from "./components/SlideList";
import SlidePreview from "./components/SlidePreview";
import LineList from "./components/LineList";
import PlaybackControls from "./components/PlaybackControls";
import SettingsDialog from "./components/SettingsDialog";
import ProgressMergePrompt from "./components/ProgressMergePrompt";
import ScriptErrorPanel from "./components/ScriptErrorPanel";
import Toasts from "./components/Toasts";

export default function App() {
  const loadScriptAction = useAppStore((s) => s.loadScript);
  const setScriptValidationError = useAppStore((s) => s.setScriptValidationError);
  const setSettings = useAppStore((s) => s.setSettings);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setVoicevoxStatus = useAppStore((s) => s.setVoicevoxStatus);
  const pushToast = useAppStore((s) => s.pushToast);
  const scriptPath = useAppStore((s) => s.scriptPath);
  const settings = useAppStore((s) => s.settings);

  const playback = usePlayback();
  useKeyboardShortcuts(playback);
  useProgress();

  const startupHandled = useRef(false);

  const loadFromPath = useCallback(
    async (path: string) => {
      try {
        const response = await loadScriptFile(path);
        loadScriptAction(response.script, response.scriptHash, response.path);
        setSettings({ ...useAppStore.getState().settings, lastOpenedScriptPath: path });
      } catch (error) {
        if (isSerializedError(error) && error.kind === "validation") {
          setScriptValidationError({ path, issues: error.details ?? [] });
        } else {
          setScriptValidationError({ path, issues: [{ path: "", message: describeError(error) }] });
        }
        pushToast("error", `台本を読み込めませんでした: ${describeError(error)}`);
      }
    },
    [loadScriptAction, setSettings, setScriptValidationError, pushToast]
  );

  const handleOpenFile = useCallback(async () => {
    try {
      const path = await openScriptFile();
      if (path) await loadFromPath(path);
    } catch (error) {
      pushToast("error", `ファイル選択に失敗しました: ${describeError(error)}`);
    }
  }, [loadFromPath, pushToast]);

  const handleReload = useCallback(() => {
    if (scriptPath) void loadFromPath(scriptPath);
  }, [scriptPath, loadFromPath]);

  // Startup: load persisted settings, optionally reopen the last script, apply always-on-top.
  useEffect(() => {
    if (startupHandled.current) return;
    startupHandled.current = true;

    (async () => {
      try {
        const saved = await loadSettings();
        const resolved = saved ?? DEFAULT_SETTINGS;
        setSettings(resolved);

        if (resolved.alwaysOnTop) {
          setAlwaysOnTop(true).catch(() => {
            /* best-effort; surfaced only on explicit user toggle */
          });
        }

        if (resolved.openLastScriptOnStartup && resolved.lastOpenedScriptPath) {
          await loadFromPath(resolved.lastOpenedScriptPath);
        }
      } catch (error) {
        pushToast("warning", `設定の読み込みに失敗しました: ${describeError(error)}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connectivity probe on mount and whenever the configured engine URL changes.
  useEffect(() => {
    let cancelled = false;
    checkVoicevox(settings.voicevoxBaseUrl).then((status) => {
      if (cancelled) return;
      setVoicevoxStatus({ reachable: status.reachable, version: status.version ?? null, error: status.error ?? null });
      if (!status.reachable) {
        pushToast("warning", "VOICEVOX Engineに接続できません。台本の閲覧・進行操作は可能です。");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [settings.voicevoxBaseUrl, setVoicevoxStatus, pushToast]);

  return (
    <main className="app">
      <AppHeader
        onOpenFile={() => void handleOpenFile()}
        onReload={handleReload}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <ScriptErrorPanel />
      <ProgressMergePrompt />

      <section className="layout">
        <SlideList />
        <SlidePreview />
        <LineList playback={playback} />
      </section>

      <PlaybackControls playback={playback} />
      <SettingsDialog />
      <Toasts />
    </main>
  );
}
