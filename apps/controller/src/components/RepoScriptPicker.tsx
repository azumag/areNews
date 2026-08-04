import { useEffect, useState } from "react";
import { describeError } from "../lib/tauri";
import { listRepoEpisodeScripts, type RepoEpisode } from "../lib/githubRepo";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (episode: RepoEpisode) => void;
};

export default function RepoScriptPicker({ isOpen, onClose, onSelect }: Props) {
  const [episodes, setEpisodes] = useState<RepoEpisode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listRepoEpisodeScripts()
      .then((list) => {
        if (!cancelled) setEpisodes(list);
      })
      .catch((e) => {
        if (!cancelled) setError(describeError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="dialogOverlay" role="dialog" aria-modal="true">
      <div className="dialog">
        <div className="dialogHeader">
          <h2>リポジトリから台本を開く</h2>
          <button type="button" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="dialogBody">
          {loading && <p>読み込み中...</p>}
          {error && <p className="fieldNote fieldNote-warning">{error}</p>}
          {episodes && episodes.length === 0 && !loading && (
            <p className="fieldNote">episodes/ に script.json が見つかりませんでした。</p>
          )}
          {episodes && episodes.length > 0 && (
            <div className="repoEpisodeList">
              {episodes.map((episode) => (
                <button
                  key={episode.scriptPath}
                  type="button"
                  className="repoEpisodeItem"
                  onClick={() => onSelect(episode)}
                >
                  {episode.episodeDir}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
