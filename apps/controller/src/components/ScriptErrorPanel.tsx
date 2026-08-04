import { useAppStore } from "../store/appStore";

export default function ScriptErrorPanel() {
  const error = useAppStore((s) => s.scriptValidationError);
  const setScriptValidationError = useAppStore((s) => s.setScriptValidationError);

  if (!error) return null;

  return (
    <div className="scriptErrorPanel" role="alert">
      <div className="scriptErrorHeader">
        <h2>台本を読み込めません</h2>
        <button type="button" onClick={() => setScriptValidationError(null)} aria-label="閉じる">
          ×
        </button>
      </div>
      <p className="scriptErrorPath">{error.path}</p>
      <ul>
        {error.issues.map((issue, index) => (
          <li key={index}>
            <code>{issue.path || "(root)"}</code>: {issue.message}
          </li>
        ))}
      </ul>
      <p className="fieldNote">ファイルを修正してから「再読込」してください。表示中の台本はそのまま維持されます。</p>
    </div>
  );
}
