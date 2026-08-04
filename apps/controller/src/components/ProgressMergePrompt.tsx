import { useAppStore } from "../store/appStore";

export default function ProgressMergePrompt() {
  const pendingMerge = useAppStore((s) => s.pendingMerge);
  const resolveKeep = useAppStore((s) => s.resolvePendingMergeKeep);
  const resolveReset = useAppStore((s) => s.resolvePendingMergeReset);

  if (!pendingMerge) return null;

  const { stats } = pendingMerge;

  return (
    <div className="mergePrompt" role="alertdialog">
      <p>
        台本が大きく変わっています（継続 {stats.kept} / 新規 {stats.added} / 破棄 {stats.dropped}）。
        前回の進行状態を引き継ぎますか？
      </p>
      <div className="mergePromptActions">
        <button type="button" onClick={resolveKeep}>
          前回状態を引き継ぐ
        </button>
        <button type="button" onClick={resolveReset}>
          リセット
        </button>
      </div>
    </div>
  );
}
