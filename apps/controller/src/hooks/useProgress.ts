import { useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";
import { freshProgress, mergeProgress } from "../lib/progress";
import { describeError, loadProgress, saveProgress } from "../lib/tauri";

const AUTOSAVE_DEBOUNCE_MS = 500;

/** Loads + reconciles saved progress whenever a new script is loaded, and
 * autosaves (debounced) whenever progress-relevant state changes. */
export function useProgress() {
  const script = useAppStore((s) => s.script);
  const scriptHash = useAppStore((s) => s.scriptHash);
  const scriptPath = useAppStore((s) => s.scriptPath);
  const currentSlideId = useAppStore((s) => s.currentSlideId);
  const selectedLineId = useAppStore((s) => s.selectedLineId);
  const lineStates = useAppStore((s) => s.lineStates);
  const progressReady = useAppStore((s) => s.progressReady);
  const applyProgress = useAppStore((s) => s.applyProgress);
  const setPendingMerge = useAppStore((s) => s.setPendingMerge);
  const pushToast = useAppStore((s) => s.pushToast);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!scriptHash || !scriptPath) return;
    const key = `${script.episodeId}:${scriptHash}`;
    if (lastLoadedKeyRef.current === key) return;
    lastLoadedKeyRef.current = key;

    let cancelled = false;
    (async () => {
      try {
        const saved = await loadProgress(script.episodeId);
        if (cancelled) return;
        const now = new Date().toISOString();
        const result = mergeProgress(saved, script, scriptHash, scriptPath, now);
        if (result.needsPrompt) {
          const fresh = mergeProgress(null, script, scriptHash, scriptPath, now).progress;
          setPendingMerge({ merged: result.progress, fresh, stats: result.stats });
        } else {
          applyProgress(result.progress);
          if (result.stats.dropped > 0 || result.stats.added > 0) {
            pushToast(
              "info",
              `進行状態を引き継ぎました（継続 ${result.stats.kept} / 新規 ${result.stats.added} / 破棄 ${result.stats.dropped}）`
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          pushToast("warning", `進行状態の読み込みに失敗しました: ${describeError(error)}`);
          // Fall back to a fresh progress document so autosave can resume —
          // otherwise progressReady would stay false for this script forever.
          applyProgress(freshProgress(script, scriptHash, scriptPath, new Date().toISOString()));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [script, scriptHash, scriptPath, applyProgress, setPendingMerge, pushToast]);

  useEffect(() => {
    if (!scriptHash || !scriptPath || !progressReady) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const progress = {
        version: 1 as const,
        episodeId: script.episodeId,
        scriptPath,
        scriptHash,
        currentSlideId,
        selectedLineId,
        lineStates,
        updatedAt: new Date().toISOString()
      };
      saveProgress(script.episodeId, progress).catch((error: unknown) => {
        pushToast("warning", `進行状態の保存に失敗しました: ${describeError(error)}`);
      });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    script.episodeId,
    scriptHash,
    scriptPath,
    progressReady,
    currentSlideId,
    selectedLineId,
    lineStates,
    pushToast
  ]);
}
