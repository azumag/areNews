import { useAppStore } from "../store/appStore";
import { fromPseudoPath, isPseudoPath } from "../lib/githubRepo";
import VoicevoxStatus from "./VoicevoxStatus";

type Props = {
  onOpenFile: () => void;
  onOpenFromRepo: () => void;
  onReload: () => void;
  onOpenSettings: () => void;
};

function describeScriptSource(scriptPath: string | null): string {
  if (!scriptPath) return "台本未読込（サンプルを表示中）";
  if (isPseudoPath(scriptPath)) return `${fromPseudoPath(scriptPath)} (リポジトリ)`;
  return scriptPath;
}

export default function AppHeader({ onOpenFile, onOpenFromRepo, onReload, onOpenSettings }: Props) {
  const script = useAppStore((s) => s.script);
  const scriptPath = useAppStore((s) => s.scriptPath);

  return (
    <header className="header">
      <div>
        <p className="eyebrow">areNews Controller</p>
        <h1>{script.title}</h1>
        <p className="meta">
          {script.date} / {script.episodeId} / {describeScriptSource(scriptPath)}
        </p>
      </div>
      <div className="headerActions">
        <VoicevoxStatus />
        <button type="button" onClick={onOpenFile}>
          script.json を開く
        </button>
        <button type="button" onClick={onOpenFromRepo}>
          リポジトリから開く
        </button>
        <button type="button" onClick={onReload} disabled={!scriptPath}>
          再読込
        </button>
        <button type="button" onClick={onOpenSettings}>
          設定
        </button>
      </div>
    </header>
  );
}
