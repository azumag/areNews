import { useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";
import { clearAudioCache, describeError, listVoicevoxSpeakers, saveSettings, setAlwaysOnTop } from "../lib/tauri";
import type { UseAutoUpdateResult } from "../hooks/useAutoUpdate";
import type { AiSpeaker, VoiceParams } from "../types";

// `min` guards against values that crash the VOICEVOX Engine (a negative
// silence length triggered a real 500 in production) — HTML's `min`
// attribute alone doesn't stop typed input, so it's enforced again in the
// onChange handler below. `pitchScale` legitimately goes negative (it's a
// pitch shift), so it's left unclamped.
const VOICE_FIELD_LABELS: { key: keyof VoiceParams; label: string; step: number; min?: number }[] = [
  { key: "speedScale", label: "速度", step: 0.1, min: 0.1 },
  { key: "pitchScale", label: "音高", step: 0.1 },
  { key: "intonationScale", label: "抑揚", step: 0.1, min: 0 },
  { key: "volumeScale", label: "音量", step: 0.1, min: 0 },
  { key: "prePhonemeLength", label: "文頭の無音長 (秒)", step: 0.05, min: 0 },
  { key: "postPhonemeLength", label: "文末の無音長 (秒)", step: 0.05, min: 0 }
];

const CHARACTERS: { key: AiSpeaker; label: string }[] = [
  { key: "china_ai", label: "中華AI" },
  { key: "america_ai", label: "メリケンAI" }
];

type Props = {
  updater: UseAutoUpdateResult;
};

export default function SettingsDialog({ updater }: Props) {
  const isOpen = useAppStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const speakers = useAppStore((s) => s.speakers);
  const setSpeakers = useAppStore((s) => s.setSpeakers);
  const pushToast = useAppStore((s) => s.pushToast);
  const [speakerFetchError, setSpeakerFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listVoicevoxSpeakers(settings.voicevoxBaseUrl)
      .then((list) => {
        if (!cancelled) {
          setSpeakers(list);
          setSpeakerFetchError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setSpeakerFetchError(describeError(error));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, settings.voicevoxBaseUrl]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSettingsOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, setSettingsOpen]);

  if (!isOpen) return null;

  function persist(next: typeof settings) {
    setSettings(next);
    saveSettings(next).catch((error) => pushToast("warning", `設定の保存に失敗しました: ${describeError(error)}`));
  }

  async function handleClearCache() {
    try {
      const result = await clearAudioCache();
      pushToast("info", `音声キャッシュを削除しました（${result.deletedFiles}件）`);
    } catch (error) {
      pushToast("error", `キャッシュ削除に失敗しました: ${describeError(error)}`);
    }
  }

  async function handleAlwaysOnTopChange(checked: boolean) {
    persist({ ...settings, alwaysOnTop: checked });
    try {
      await setAlwaysOnTop(checked);
    } catch (error) {
      pushToast("warning", `常に手前に表示の切り替えに失敗しました: ${describeError(error)}`);
    }
  }

  return (
    <div className="dialogOverlay" role="dialog" aria-modal="true">
      <div className="dialog">
        <div className="dialogHeader">
          <h2>設定</h2>
          <button type="button" onClick={() => setSettingsOpen(false)} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="dialogBody">
          <label className="field">
            <span>VOICEVOX Engine URL</span>
            <input
              type="text"
              value={settings.voicevoxBaseUrl}
              onChange={(e) => persist({ ...settings, voicevoxBaseUrl: e.target.value })}
            />
          </label>

          {speakerFetchError && (
            <p className="fieldNote fieldNote-warning">
              話者一覧を取得できません（{speakerFetchError}）。数値IDを直接入力してください。
            </p>
          )}

          {CHARACTERS.map((character) => (
            <label className="field" key={character.key}>
              <span>{character.label}の既定話者</span>
              {speakers ? (
                <select
                  value={settings.defaultSpeakers[character.key] ?? ""}
                  onChange={(e) =>
                    persist({
                      ...settings,
                      defaultSpeakers: {
                        ...settings.defaultSpeakers,
                        [character.key]: e.target.value === "" ? undefined : Number(e.target.value)
                      }
                    })
                  }
                >
                  <option value="">未設定</option>
                  {speakers.map((speaker) =>
                    speaker.styles.map((style) => (
                      <option key={style.id} value={style.id}>
                        {speaker.name} - {style.name} ({style.id})
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <input
                  type="number"
                  value={settings.defaultSpeakers[character.key] ?? ""}
                  onChange={(e) =>
                    persist({
                      ...settings,
                      defaultSpeakers: {
                        ...settings.defaultSpeakers,
                        [character.key]: e.target.value === "" ? undefined : Number(e.target.value)
                      }
                    })
                  }
                />
              )}
            </label>
          ))}

          <label className="fieldCheckbox">
            <input
              type="checkbox"
              checked={settings.overrideScriptSpeakers}
              onChange={(e) => persist({ ...settings, overrideScriptSpeakers: e.target.checked })}
            />
            <span>
              上の既定話者を台本の指定より優先する（台本が話者を指定していても、ここで設定した声を使う）
            </span>
          </label>

          {VOICE_FIELD_LABELS.map(({ key, label, step, min }) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                type="number"
                step={step}
                min={min}
                value={settings.voice[key] ?? ""}
                onChange={(e) => {
                  if (e.target.value === "") {
                    persist({ ...settings, voice: { ...settings.voice, [key]: undefined } });
                    return;
                  }
                  const parsed = Number(e.target.value);
                  const clamped = min !== undefined && Number.isFinite(parsed) ? Math.max(parsed, min) : parsed;
                  persist({ ...settings, voice: { ...settings.voice, [key]: clamped } });
                }}
              />
            </label>
          ))}

          <label className="fieldCheckbox">
            <input
              type="checkbox"
              checked={settings.openLastScriptOnStartup}
              onChange={(e) => persist({ ...settings, openLastScriptOnStartup: e.target.checked })}
            />
            <span>前回開いた台本を起動時に開く</span>
          </label>

          <label className="fieldCheckbox">
            <input
              type="checkbox"
              checked={settings.alwaysOnTop}
              onChange={(e) => void handleAlwaysOnTopChange(e.target.checked)}
            />
            <span>常に手前に表示する</span>
          </label>

          <button type="button" onClick={handleClearCache}>
            音声キャッシュを削除
          </button>

          <div className="field">
            <span>アプリのアップデート</span>
            <div className="updateCheckRow">
              <button
                type="button"
                onClick={() => void updater.checkNow()}
                disabled={updater.status === "checking" || updater.status === "installing"}
              >
                {updater.status === "checking" ? "確認中..." : "今すぐ確認"}
              </button>
              <span className="fieldNote">
                {updater.status === "available" && `v${updater.version} が利用可能です`}
                {updater.status === "idle" && "最新バージョンです"}
                {updater.status === "installing" && "インストール中..."}
                {updater.status === "error" && `確認に失敗しました: ${updater.error}`}
              </span>
            </div>
            {updater.status === "available" && (
              <button type="button" onClick={() => void updater.installAndRelaunch()}>
                インストールして再起動
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
