import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore, DEFAULT_SETTINGS } from "./store/appStore";
import { usePlayback } from "./hooks/usePlayback";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useProgress } from "./hooks/useProgress";
import { useAutoUpdate } from "./hooks/useAutoUpdate";
import {
  checkVoicevox,
  describeError,
  isSerializedError,
  loadScriptFile,
  loadSettings,
  openScriptFile,
  saveSettings,
  setAlwaysOnTop,
  validateScriptContent
} from "./lib/tauri";
import { fetchRepoScriptContent, fromPseudoPath, isPseudoPath, toPseudoPath, type RepoEpisode } from "./lib/githubRepo";
import type { EpisodeScript } from "./types";
import AppHeader from "./components/AppHeader";
import SlideList from "./components/SlideList";
import SlidePreview from "./components/SlidePreview";
import LineList from "./components/LineList";
import PlaybackControls from "./components/PlaybackControls";
import SettingsDialog from "./components/SettingsDialog";
import ProgressMergePrompt from "./components/ProgressMergePrompt";
import ScriptErrorPanel from "./components/ScriptErrorPanel";
import UpdateBanner from "./components/UpdateBanner";
import RepoScriptPicker from "./components/RepoScriptPicker";
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
  const updater = useAutoUpdate();
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);
  const [isRepoPickerOpen, setRepoPickerOpen] = useState(false);

  const startupHandled = useRef(false);

  // Shared tail end of every load path (local file, repo fetch, startup
  // reopen): apply the script, adopt its declared VOICEVOX URL if any, and
  // persist where it came from so "reload" and "reopen on startup" work.
  const applyLoadedScript = useCallback(
    (script: EpisodeScript, scriptHash: string, storedPath: string) => {
      loadScriptAction(script, scriptHash, storedPath);

      const current = useAppStore.getState().settings;
      const episodeBaseUrl = script.voicevox?.baseUrl;
      const nextSettings = {
        ...current,
        lastOpenedScriptPath: storedPath,
        // Episode-declared VOICEVOX URL takes over the app setting on load,
        // so switching between episodes recorded against different engine
        // instances doesn't require a manual settings change each time.
        voicevoxBaseUrl: episodeBaseUrl ?? current.voicevoxBaseUrl
      };
      setSettings(nextSettings);
      saveSettings(nextSettings).catch((error) => {
        pushToast("warning", `設定の保存に失敗しました: ${describeError(error)}`);
      });
      if (episodeBaseUrl && episodeBaseUrl !== current.voicevoxBaseUrl) {
        pushToast("info", `台本の指定に合わせてVOICEVOX URLを ${episodeBaseUrl} に変更しました`);
      }
    },
    [loadScriptAction, setSettings, pushToast]
  );

  const reportLoadError = useCallback(
    (displayPath: string, error: unknown) => {
      if (isSerializedError(error) && error.kind === "validation") {
        setScriptValidationError({ path: displayPath, issues: error.details ?? [] });
      } else {
        setScriptValidationError({ path: displayPath, issues: [{ path: "", message: describeError(error) }] });
      }
      pushToast("error", `台本を読み込めませんでした: ${describeError(error)}`);
    },
    [setScriptValidationError, pushToast]
  );

  const loadFromLocalPath = useCallback(
    async (path: string) => {
      try {
        const response = await loadScriptFile(path);
        applyLoadedScript(response.script, response.scriptHash, response.path);
      } catch (error) {
        reportLoadError(path, error);
      }
    },
    [applyLoadedScript, reportLoadError]
  );

  const loadFromRepo = useCallback(
    async (episode: RepoEpisode) => {
      const displayPath = `${episode.scriptPath} (repo)`;
      try {
        const content = await fetchRepoScriptContent(episode.scriptPath);
        const validated = await validateScriptContent(content);
        applyLoadedScript(validated.script, validated.scriptHash, toPseudoPath(episode.scriptPath));
      } catch (error) {
        reportLoadError(displayPath, error);
      }
    },
    [applyLoadedScript, reportLoadError]
  );

  /** Dispatches on a stored scriptPath — local disk path or a `github:`
   * pseudo-path — used by both "reload" and "reopen last script on startup". */
  const loadFromStoredPath = useCallback(
    async (storedPath: string) => {
      if (isPseudoPath(storedPath)) {
        const scriptPath = fromPseudoPath(storedPath);
        const episodeDir = scriptPath.split("/")[1] ?? scriptPath;
        await loadFromRepo({ episodeDir, scriptPath });
      } else {
        await loadFromLocalPath(storedPath);
      }
    },
    [loadFromRepo, loadFromLocalPath]
  );

  const handleOpenFile = useCallback(async () => {
    try {
      const path = await openScriptFile();
      if (path) await loadFromLocalPath(path);
    } catch (error) {
      pushToast("error", `ファイル選択に失敗しました: ${describeError(error)}`);
    }
  }, [loadFromLocalPath, pushToast]);

  const handleSelectRepoEpisode = useCallback(
    (episode: RepoEpisode) => {
      setRepoPickerOpen(false);
      void loadFromRepo(episode);
    },
    [loadFromRepo]
  );

  const handleReload = useCallback(() => {
    if (scriptPath) void loadFromStoredPath(scriptPath);
  }, [scriptPath, loadFromStoredPath]);

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
          await loadFromStoredPath(resolved.lastOpenedScriptPath);
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
        onOpenFromRepo={() => setRepoPickerOpen(true)}
        onReload={handleReload}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <UpdateBanner
        updater={updater}
        dismissed={updateBannerDismissed}
        onDismiss={() => setUpdateBannerDismissed(true)}
      />
      <ScriptErrorPanel />
      <ProgressMergePrompt />
      <RepoScriptPicker
        isOpen={isRepoPickerOpen}
        onClose={() => setRepoPickerOpen(false)}
        onSelect={handleSelectRepoEpisode}
      />

      <section className="layout">
        <SlideList />
        <SlidePreview />
        <LineList playback={playback} />
      </section>

      <PlaybackControls playback={playback} />
      <SettingsDialog updater={updater} />
      <Toasts />
    </main>
  );
}
