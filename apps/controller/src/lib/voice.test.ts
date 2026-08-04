import { describe, expect, it } from "vitest";
import type { ScriptLine, Settings } from "../types";
import { buildScript } from "./testFixtures";
import { resolveSpeakerId, resolveVoiceParams, textToSpeak } from "./voice";

function buildSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    voicevoxBaseUrl: "http://127.0.0.1:50021",
    defaultSpeakers: { china_ai: 100, america_ai: 200 },
    voice: { speedScale: 1.0, pitchScale: 0.0, intonationScale: 1.0, volumeScale: 1.0 },
    openLastScriptOnStartup: false,
    alwaysOnTop: false,
    lastOpenedScriptPath: null,
    ...overrides
  };
}

describe("resolveSpeakerId", () => {
  it("returns null for human_cue regardless of other fields", () => {
    const script = buildScript();
    const line: ScriptLine = { id: "x", speaker: "human_cue", text: "t", voicevoxSpeakerId: 5 };
    expect(resolveSpeakerId(script, line, buildSettings())).toBeNull();
  });

  it("prefers the line-level voicevoxSpeakerId over everything else", () => {
    const script = buildScript();
    const line: ScriptLine = { id: "x", speaker: "china_ai", text: "t", voicevoxSpeakerId: 42 };
    expect(resolveSpeakerId(script, line, buildSettings())).toBe(42);
  });

  it("falls back to the episode's voicevox.defaultSpeakers", () => {
    const script = buildScript();
    const line: ScriptLine = { id: "x", speaker: "china_ai", text: "t" };
    expect(resolveSpeakerId(script, line, buildSettings())).toBe(8);
  });

  it("falls back to the app settings default when the episode has none", () => {
    const script = buildScript();
    script.voicevox = undefined;
    const line: ScriptLine = { id: "x", speaker: "china_ai", text: "t" };
    expect(resolveSpeakerId(script, line, buildSettings())).toBe(100);
  });

  it("returns null when no speaker id is resolvable anywhere", () => {
    const script = buildScript();
    script.voicevox = undefined;
    const line: ScriptLine = { id: "x", speaker: "china_ai", text: "t" };
    expect(resolveSpeakerId(script, line, buildSettings({ defaultSpeakers: {} }))).toBeNull();
  });
});

describe("resolveVoiceParams", () => {
  it("uses settings values when the line specifies nothing", () => {
    const line: ScriptLine = { id: "x", speaker: "china_ai", text: "t" };
    const params = resolveVoiceParams(line, buildSettings());
    expect(params).toEqual({ speedScale: 1.0, pitchScale: 0.0, intonationScale: 1.0, volumeScale: 1.0 });
  });

  it("overrides per field when the line specifies some but not all", () => {
    const line: ScriptLine = { id: "x", speaker: "china_ai", text: "t", voice: { speedScale: 1.3 } };
    const params = resolveVoiceParams(line, buildSettings());
    expect(params.speedScale).toBe(1.3);
    expect(params.pitchScale).toBe(0.0);
  });

  it("leaves a field unset when neither line nor settings specify it", () => {
    const line: ScriptLine = { id: "x", speaker: "china_ai", text: "t" };
    const params = resolveVoiceParams(line, buildSettings({ voice: {} }));
    expect(params.speedScale).toBeUndefined();
  });
});

describe("textToSpeak", () => {
  it("uses spokenText when present", () => {
    const line: ScriptLine = { id: "x", speaker: "china_ai", text: "表示用", spokenText: "読み上げ用" };
    expect(textToSpeak(line)).toBe("読み上げ用");
  });

  it("falls back to text when spokenText is absent", () => {
    const line: ScriptLine = { id: "x", speaker: "china_ai", text: "表示用" };
    expect(textToSpeak(line)).toBe("表示用");
  });
});
