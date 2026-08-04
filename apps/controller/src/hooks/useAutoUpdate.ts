import { useCallback, useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus = "idle" | "checking" | "available" | "installing" | "error";

/**
 * Checks for an app update once on mount and exposes a manual re-check plus
 * an explicit install action. Never installs or relaunches on its own —
 * this app can be driving a live stream, so restarting must always be a
 * deliberate click, never a side effect of a background check.
 */
export function useAutoUpdate() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [version, setVersion] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateRef = useRef<Update | null>(null);

  const checkNow = useCallback(async () => {
    setStatus("checking");
    setError(null);
    try {
      const update = await check();
      updateRef.current = update;
      if (update) {
        setVersion(update.version);
        setBody(update.body ?? null);
        setStatus("available");
      } else {
        setStatus("idle");
      }
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void checkNow();
    // Startup check only; further checks are user-triggered via checkNow().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const installAndRelaunch = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;
    setStatus("installing");
    setError(null);
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  return { status, version, body, error, checkNow, installAndRelaunch };
}

export type UseAutoUpdateResult = ReturnType<typeof useAutoUpdate>;
