import type { UseAutoUpdateResult } from "../hooks/useAutoUpdate";

type Props = {
  updater: UseAutoUpdateResult;
  dismissed: boolean;
  onDismiss: () => void;
};

export default function UpdateBanner({ updater, dismissed, onDismiss }: Props) {
  const { status, version, error, installAndRelaunch } = updater;

  if (status === "idle" || status === "checking") return null;
  if (dismissed && status !== "installing") return null;

  if (status === "error") {
    return (
      <div className="updateBanner updateBanner-error" role="status">
        <span>アップデート確認に失敗しました: {error}</span>
        <button type="button" onClick={onDismiss}>
          閉じる
        </button>
      </div>
    );
  }

  return (
    <div className="updateBanner" role="status">
      <span>
        {status === "installing"
          ? "アップデートをインストール中... 完了後に自動で再起動します"
          : `新しいバージョン v${version} が利用可能です`}
      </span>
      {status === "available" && (
        <div className="updateBannerActions">
          <button type="button" onClick={() => void installAndRelaunch()}>
            インストールして再起動
          </button>
          <button type="button" onClick={onDismiss}>
            後で
          </button>
        </div>
      )}
    </div>
  );
}
