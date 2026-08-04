import { useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { sampleEpisode } from "./sampleEpisode";
import type { EpisodeScript, ScriptLine, VoicevoxResponse } from "./types";

const speakerLabel: Record<string, string> = {
  china_ai: "中華AI",
  america_ai: "メリケンAI",
  human_cue: "人間コメント"
};

function getLineClass(line: ScriptLine): string {
  return `line line-${line.speaker}`;
}

function getSpeakerId(script: EpisodeScript, line: ScriptLine): number | null {
  if (line.speaker === "human_cue") return null;
  if (typeof line.voicevoxSpeakerId === "number") return line.voicevoxSpeakerId;
  return script.voicevox?.defaultSpeakers?.[line.speaker] ?? null;
}

export default function App() {
  const [script, setScript] = useState<EpisodeScript>(sampleEpisode);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [status, setStatus] = useState("サンプル台本を読み込み済み");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentSlide = script.slides[currentSlideIndex];
  const voicevoxBaseUrl = useMemo(
    () => script.voicevox?.baseUrl ?? "http://127.0.0.1:50021",
    [script]
  );

  async function loadScriptFile(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as EpisodeScript;
    if (!parsed.slides || !Array.isArray(parsed.slides)) {
      throw new Error("slides が見つかりません");
    }
    setScript(parsed);
    setCurrentSlideIndex(0);
    setStatus(`${parsed.title} を読み込みました`);
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setStatus("停止しました");
  }

  async function playLine(line: ScriptLine) {
    const speaker = getSpeakerId(script, line);
    if (speaker === null) {
      setStatus("人間コメントは読み上げません");
      return;
    }

    stopAudio();
    setIsPlaying(true);
    setStatus(`${speakerLabel[line.speaker]} を合成中...`);

    try {
      const response = await invoke<VoicevoxResponse>("synthesize_voicevox", {
        req: {
          base_url: voicevoxBaseUrl,
          text: line.text,
          speaker
        }
      });

      const audio = new Audio(response.data_url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        setStatus("再生完了");
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setStatus("音声再生に失敗しました");
      };
      await audio.play();
      setStatus(`${speakerLabel[line.speaker]} を再生中`);
    } catch (error) {
      setIsPlaying(false);
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function moveSlide(diff: number) {
    stopAudio();
    setCurrentSlideIndex((index) => {
      const next = index + diff;
      return Math.min(Math.max(next, 0), script.slides.length - 1);
    });
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">areNews Controller</p>
          <h1>{script.title}</h1>
          <p className="meta">{script.date} / {script.episodeId}</p>
        </div>
        <label className="fileButton">
          script.json を読み込む
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              loadScriptFile(file).catch((error) => {
                setStatus(error instanceof Error ? error.message : String(error));
              });
            }}
          />
        </label>
      </header>

      <section className="layout">
        <aside className="slides">
          <h2>スライド</h2>
          {script.slides.map((slide, index) => (
            <button
              key={slide.slideId}
              className={index === currentSlideIndex ? "slideButton active" : "slideButton"}
              onClick={() => {
                stopAudio();
                setCurrentSlideIndex(index);
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {slide.title}
            </button>
          ))}
        </aside>

        <section className="stage">
          <div className="stageHeader">
            <div>
              <p className="eyebrow">現在のスライド</p>
              <h2>{currentSlide.title}</h2>
            </div>
            <div className="slideControls">
              <button onClick={() => moveSlide(-1)} disabled={currentSlideIndex === 0}>前へ</button>
              <button onClick={() => moveSlide(1)} disabled={currentSlideIndex === script.slides.length - 1}>次へ</button>
              <button onClick={stopAudio} disabled={!isPlaying}>停止</button>
            </div>
          </div>

          {currentSlide.visual?.notes && (
            <p className="visualNote">画面メモ: {currentSlide.visual.notes}</p>
          )}

          <div className="lines">
            {currentSlide.lines.map((line) => (
              <article key={line.id} className={getLineClass(line)}>
                <div className="lineTop">
                  <span className="speaker">{speakerLabel[line.speaker]}</span>
                  {getSpeakerId(script, line) !== null && (
                    <span className="speakerId">VOICEVOX: {getSpeakerId(script, line)}</span>
                  )}
                </div>
                <p>{line.text}</p>
                {line.note && <small>{line.note}</small>}
                <div className="lineActions">
                  {line.speaker === "human_cue" ? (
                    <span className="humanCue">ここで人間が話す</span>
                  ) : (
                    <button onClick={() => playLine(line)}>このセリフを読む</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <footer className="statusBar">
        <span>{status}</span>
        <span>VOICEVOX: {voicevoxBaseUrl}</span>
      </footer>
    </main>
  );
}
