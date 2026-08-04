import { useAppStore } from "../store/appStore";

export default function VoicevoxStatus() {
  const voicevox = useAppStore((s) => s.voicevox);
  const baseUrl = useAppStore((s) => s.settings.voicevoxBaseUrl);

  if (!voicevox) {
    return <span className="voicevoxStatus voicevoxStatus-pending">VOICEVOX: 確認中...</span>;
  }

  if (voicevox.reachable) {
    return (
      <span className="voicevoxStatus voicevoxStatus-ok" title={baseUrl}>
        VOICEVOX: 接続中{voicevox.version ? ` (v${voicevox.version})` : ""}
      </span>
    );
  }

  return (
    <span className="voicevoxStatus voicevoxStatus-error" title={voicevox.error ?? undefined}>
      VOICEVOX: 未接続 — {baseUrl} を確認してください
    </span>
  );
}
