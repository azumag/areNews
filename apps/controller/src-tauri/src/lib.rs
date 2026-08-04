use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct VoicevoxRequest {
    base_url: Option<String>,
    text: String,
    speaker: u32,
}

#[derive(Debug, Serialize)]
struct VoicevoxResponse {
    data_url: String,
}

#[tauri::command]
async fn synthesize_voicevox(req: VoicevoxRequest) -> Result<VoicevoxResponse, String> {
    let base_url = req
        .base_url
        .unwrap_or_else(|| "http://127.0.0.1:50021".to_string())
        .trim_end_matches('/')
        .to_string();

    if req.text.trim().is_empty() {
        return Err("読み上げテキストが空です".to_string());
    }

    let client = reqwest::Client::new();
    let speaker = req.speaker.to_string();

    let audio_query_url = format!("{base_url}/audio_query");
    let audio_query: serde_json::Value = client
        .post(audio_query_url)
        .query(&[("text", req.text.as_str()), ("speaker", speaker.as_str())])
        .send()
        .await
        .map_err(|error| format!("VOICEVOX audio_query に接続できません: {error}"))?
        .error_for_status()
        .map_err(|error| format!("VOICEVOX audio_query がエラーを返しました: {error}"))?
        .json()
        .await
        .map_err(|error| format!("VOICEVOX audio_query のJSON解析に失敗しました: {error}"))?;

    let synthesis_url = format!("{base_url}/synthesis");
    let wav_bytes = client
        .post(synthesis_url)
        .query(&[("speaker", speaker.as_str())])
        .json(&audio_query)
        .send()
        .await
        .map_err(|error| format!("VOICEVOX synthesis に接続できません: {error}"))?
        .error_for_status()
        .map_err(|error| format!("VOICEVOX synthesis がエラーを返しました: {error}"))?
        .bytes()
        .await
        .map_err(|error| format!("VOICEVOX synthesis の音声取得に失敗しました: {error}"))?;

    let encoded = general_purpose::STANDARD.encode(wav_bytes);
    Ok(VoicevoxResponse {
        data_url: format!("data:audio/wav;base64,{encoded}"),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![synthesize_voicevox])
        .run(tauri::generate_context!())
        .expect("error while running areNews Controller");
}
