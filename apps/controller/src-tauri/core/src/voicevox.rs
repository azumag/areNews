use reqwest::Response;
use serde::Serialize;
use serde_json::Value;

use crate::cache_key::VoiceParams;
use crate::error::CoreError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeakerStyle {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeakerInfo {
    pub name: String,
    pub speaker_uuid: String,
    pub styles: Vec<SpeakerStyle>,
}

/// Thin client over the local VOICEVOX Engine HTTP API. The frontend never
/// talks to the engine directly; every request goes through this client so
/// keys, retries, and error messages stay in one tested place.
pub struct VoicevoxClient {
    http: reqwest::Client,
    base_url: String,
}

impl VoicevoxClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            http: reqwest::Client::new(),
            base_url: base_url.into().trim_end_matches('/').to_string(),
        }
    }

    pub async fn version(&self) -> Result<String, CoreError> {
        let url = format!("{}/version", self.base_url);
        let resp = self
            .http
            .get(url)
            .send()
            .await
            .map_err(|e| CoreError::VoicevoxConnect(e.to_string()))?;
        let resp = ensure_success("version", resp).await?;
        let text = resp
            .text()
            .await
            .map_err(|e| CoreError::VoicevoxResponse(format!("version: {e}")))?;
        // /version normally returns a bare JSON string, e.g. "0.14.0".
        let version: String = serde_json::from_str(&text).unwrap_or(text);
        Ok(version)
    }

    pub async fn speakers(&self) -> Result<Vec<SpeakerInfo>, CoreError> {
        let url = format!("{}/speakers", self.base_url);
        let resp = self
            .http
            .get(url)
            .send()
            .await
            .map_err(|e| CoreError::VoicevoxConnect(e.to_string()))?;
        let resp = ensure_success("speakers", resp).await?;
        let raw: Value = resp
            .json()
            .await
            .map_err(|e| CoreError::VoicevoxResponse(format!("speakers: {e}")))?;
        parse_speakers(&raw)
    }

    /// Runs `/audio_query` then `/synthesis`, overriding only the parameters
    /// present in `params` so any field left `None` keeps the engine's
    /// default from the query step. Returns raw WAV bytes.
    pub async fn synthesize(
        &self,
        speaker_id: u32,
        text: &str,
        params: &VoiceParams,
    ) -> Result<Vec<u8>, CoreError> {
        if text.trim().is_empty() {
            return Err(CoreError::Other("読み上げテキストが空です".to_string()));
        }
        let speaker = speaker_id.to_string();

        let query_url = format!("{}/audio_query", self.base_url);
        let query_resp = self
            .http
            .post(query_url)
            .query(&[("text", text), ("speaker", speaker.as_str())])
            .send()
            .await
            .map_err(|e| CoreError::VoicevoxConnect(format!("audio_query: {e}")))?;
        let query_resp = ensure_success("audio_query", query_resp).await?;
        let mut audio_query: Value = query_resp
            .json()
            .await
            .map_err(|e| CoreError::VoicevoxResponse(format!("audio_queryの解析に失敗: {e}")))?;

        apply_params(&mut audio_query, params);

        let synth_url = format!("{}/synthesis", self.base_url);
        let synth_resp = self
            .http
            .post(synth_url)
            .query(&[("speaker", speaker.as_str())])
            .json(&audio_query)
            .send()
            .await
            .map_err(|e| CoreError::VoicevoxConnect(format!("synthesis: {e}")))?;
        let synth_resp = ensure_success("synthesis", synth_resp).await?;
        let wav = synth_resp
            .bytes()
            .await
            .map_err(|e| CoreError::VoicevoxResponse(format!("synthesisの取得に失敗: {e}")))?;

        Ok(wav.to_vec())
    }
}

/// Turns a non-2xx response into a `CoreError` that includes the engine's
/// own error body, not just the status code — VOICEVOX's FastAPI backend
/// returns a JSON `{"detail": ...}` (or a plain-text message) explaining
/// *why* a request was rejected, and that detail is the only way to
/// diagnose e.g. a 500 from `/synthesis` without reproducing it locally.
async fn ensure_success(context: &str, response: Response) -> Result<Response, CoreError> {
    let status = response.status();
    if status.is_success() {
        return Ok(response);
    }
    let body = response.text().await.unwrap_or_default();
    let body = body.trim();
    if body.is_empty() {
        Err(CoreError::VoicevoxResponse(format!(
            "{context}: HTTPステータス {status}"
        )))
    } else {
        Err(CoreError::VoicevoxResponse(format!(
            "{context}: HTTPステータス {status} — {}",
            truncate(body, 500)
        )))
    }
}

fn truncate(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        s.to_string()
    } else {
        let head: String = s.chars().take(max_chars).collect();
        format!("{head}...")
    }
}

fn apply_params(audio_query: &mut Value, params: &VoiceParams) {
    let Some(obj) = audio_query.as_object_mut() else {
        return;
    };
    if let Some(v) = params.speed_scale {
        obj.insert("speedScale".to_string(), serde_json::json!(v));
    }
    if let Some(v) = params.pitch_scale {
        obj.insert("pitchScale".to_string(), serde_json::json!(v));
    }
    if let Some(v) = params.intonation_scale {
        obj.insert("intonationScale".to_string(), serde_json::json!(v));
    }
    if let Some(v) = params.volume_scale {
        obj.insert("volumeScale".to_string(), serde_json::json!(v));
    }
    if let Some(v) = params.pre_phoneme_length {
        obj.insert("prePhonemeLength".to_string(), serde_json::json!(v));
    }
    if let Some(v) = params.post_phoneme_length {
        obj.insert("postPhonemeLength".to_string(), serde_json::json!(v));
    }
}

fn parse_speakers(raw: &Value) -> Result<Vec<SpeakerInfo>, CoreError> {
    let arr = raw
        .as_array()
        .ok_or_else(|| CoreError::VoicevoxResponse("speakers応答の形式が不正です".to_string()))?;
    let mut speakers = Vec::with_capacity(arr.len());
    for item in arr {
        let name = item
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        let speaker_uuid = item
            .get("speaker_uuid")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        let styles = item
            .get("styles")
            .and_then(Value::as_array)
            .map(|styles| {
                styles
                    .iter()
                    .filter_map(|s| {
                        let id = s.get("id").and_then(Value::as_i64)?;
                        let name = s.get("name").and_then(Value::as_str)?.to_string();
                        Some(SpeakerStyle { id, name })
                    })
                    .collect()
            })
            .unwrap_or_default();
        speakers.push(SpeakerInfo {
            name,
            speaker_uuid,
            styles,
        });
    }
    Ok(speakers)
}

#[cfg(test)]
mod tests {
    use super::*;
    use httpmock::MockServer;

    fn params() -> VoiceParams {
        VoiceParams {
            speed_scale: Some(1.2),
            pitch_scale: None,
            intonation_scale: None,
            volume_scale: None,
            pre_phoneme_length: None,
            post_phoneme_length: None,
        }
    }

    #[tokio::test]
    async fn version_parses_bare_json_string() {
        let server = MockServer::start();
        let mock = server.mock(|when, then| {
            when.method(httpmock::Method::GET).path("/version");
            then.status(200).body("\"0.14.0\"");
        });
        let client = VoicevoxClient::new(server.base_url());
        let version = client.version().await.unwrap();
        mock.assert();
        assert_eq!(version, "0.14.0");
    }

    #[tokio::test]
    async fn version_connection_refused_is_friendly() {
        // Port 0 is never listening; the connection attempt fails fast.
        let client = VoicevoxClient::new("http://127.0.0.1:1");
        let err = client.version().await.unwrap_err();
        match err {
            CoreError::VoicevoxConnect(_) => {}
            other => panic!("expected VoicevoxConnect, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn synthesize_overrides_requested_params_and_keeps_others() {
        let server = MockServer::start();
        let query_mock = server.mock(|when, then| {
            when.method(httpmock::Method::POST)
                .path("/audio_query")
                .query_param("text", "hello")
                .query_param("speaker", "3");
            then.status(200).json_body(serde_json::json!({
                "speedScale": 1.0,
                "pitchScale": 0.0,
                "intonationScale": 1.0,
                "volumeScale": 1.0,
                "outputSamplingRate": 24000
            }));
        });
        let synth_mock = server.mock(|when, then| {
            when.method(httpmock::Method::POST)
                .path("/synthesis")
                .query_param("speaker", "3")
                .json_body(serde_json::json!({
                    "speedScale": 1.2,
                    "pitchScale": 0.0,
                    "intonationScale": 1.0,
                    "volumeScale": 1.0,
                    "outputSamplingRate": 24000
                }));
            then.status(200).body(b"RIFF....WAVEfmt ".to_vec());
        });

        let client = VoicevoxClient::new(server.base_url());
        let wav = client.synthesize(3, "hello", &params()).await.unwrap();
        query_mock.assert();
        synth_mock.assert();
        assert!(!wav.is_empty());
    }

    #[tokio::test]
    async fn audio_query_non_200_maps_to_response_error() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(httpmock::Method::POST).path("/audio_query");
            then.status(422).body("invalid speaker");
        });
        let client = VoicevoxClient::new(server.base_url());
        let err = client.synthesize(3, "hello", &params()).await.unwrap_err();
        match err {
            CoreError::VoicevoxResponse(_) => {}
            other => panic!("expected VoicevoxResponse, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn error_response_body_is_surfaced_in_the_message() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(httpmock::Method::POST).path("/audio_query");
            then.status(422)
                .json_body(serde_json::json!({ "detail": "speaker not found" }));
        });
        let client = VoicevoxClient::new(server.base_url());
        let err = client.synthesize(3, "hello", &params()).await.unwrap_err();
        match err {
            CoreError::VoicevoxResponse(message) => {
                assert!(message.contains("422"), "message was: {message}");
                assert!(message.contains("speaker not found"), "message was: {message}");
            }
            other => panic!("expected VoicevoxResponse, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn synthesis_500_surfaces_engine_error_detail() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(httpmock::Method::POST).path("/audio_query");
            then.status(200).json_body(serde_json::json!({
                "speedScale": 1.0,
                "outputSamplingRate": 24000
            }));
        });
        server.mock(|when, then| {
            when.method(httpmock::Method::POST).path("/synthesis");
            then.status(500)
                .json_body(serde_json::json!({ "detail": "internal engine error" }));
        });
        let client = VoicevoxClient::new(server.base_url());
        let err = client.synthesize(8, "hello", &params()).await.unwrap_err();
        match err {
            CoreError::VoicevoxResponse(message) => {
                assert!(message.starts_with("synthesis:"), "message was: {message}");
                assert!(message.contains("500"), "message was: {message}");
                assert!(message.contains("internal engine error"), "message was: {message}");
            }
            other => panic!("expected VoicevoxResponse, got {other:?}"),
        }
    }

    #[test]
    fn speakers_parses_nested_styles() {
        let raw = serde_json::json!([
            {
                "name": "サンプル話者",
                "speaker_uuid": "uuid-1",
                "styles": [{ "id": 3, "name": "ノーマル" }, { "id": 1, "name": "あまあま" }]
            }
        ]);
        let speakers = parse_speakers(&raw).unwrap();
        assert_eq!(speakers.len(), 1);
        assert_eq!(speakers[0].name, "サンプル話者");
        assert_eq!(speakers[0].styles.len(), 2);
        assert_eq!(speakers[0].styles[0].id, 3);
    }
}
