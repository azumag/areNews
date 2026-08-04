use are_news_controller_core::{
    synthesis_cache_key, SerializedError, SpeakerInfo, VoiceParams, VoicevoxClient,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::audio_cache;
use crate::audio_player::AudioPlayer;

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VoiceParamsDto {
    pub speed_scale: Option<f64>,
    pub pitch_scale: Option<f64>,
    pub intonation_scale: Option<f64>,
    pub volume_scale: Option<f64>,
    pub pre_phoneme_length: Option<f64>,
    pub post_phoneme_length: Option<f64>,
}

impl From<VoiceParamsDto> for VoiceParams {
    fn from(dto: VoiceParamsDto) -> Self {
        VoiceParams {
            speed_scale: dto.speed_scale,
            pitch_scale: dto.pitch_scale,
            intonation_scale: dto.intonation_scale,
            volume_scale: dto.volume_scale,
            pre_phoneme_length: dto.pre_phoneme_length,
            post_phoneme_length: dto.post_phoneme_length,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckVoicevoxResponse {
    pub reachable: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

/// Connectivity probe. Deliberately never returns `Err` — an unreachable
/// engine is a normal, expected state the UI must render, not a failure.
#[tauri::command]
pub async fn check_voicevox(base_url: String) -> Result<CheckVoicevoxResponse, SerializedError> {
    let client = VoicevoxClient::new(base_url);
    match client.version().await {
        Ok(version) => Ok(CheckVoicevoxResponse {
            reachable: true,
            version: Some(version),
            error: None,
        }),
        Err(err) => Ok(CheckVoicevoxResponse {
            reachable: false,
            version: None,
            error: Some(err.to_string()),
        }),
    }
}

#[tauri::command]
pub async fn list_voicevox_speakers(
    base_url: String,
) -> Result<Vec<SpeakerInfo>, SerializedError> {
    let client = VoicevoxClient::new(base_url);
    Ok(client.speakers().await?)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthesizeLineRequest {
    pub base_url: String,
    pub text: String,
    pub speaker_id: u32,
    #[serde(default)]
    pub params: VoiceParamsDto,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayLineResponse {
    pub cache_hit: bool,
}

/// Synthesizes (or serves from cache) a single line's audio and plays it
/// natively from this process (see `audio_player`) rather than handing WAV
/// bytes back to the WebView — that's what lets OBS's application audio
/// capture pick it up. The engine version is fetched fresh on every call —
/// a cheap localhost round trip — so the cache key always reflects
/// whichever engine build is actually running, even if it was swapped out
/// mid-session.
#[tauri::command]
pub async fn play_line(
    app: AppHandle,
    player: State<'_, AudioPlayer>,
    token: u64,
    req: SynthesizeLineRequest,
) -> Result<PlayLineResponse, SerializedError> {
    player.prepare(token);

    let client = VoicevoxClient::new(req.base_url);
    let engine_version = client.version().await?;
    let params: VoiceParams = req.params.into();

    let key = synthesis_cache_key(&engine_version, req.speaker_id, &req.text, &params);
    let cache_path = audio_cache::cached_path(&app, &key)?;

    let (wav, cache_hit) = if let Some(cached) = audio_cache::read_cached(&cache_path) {
        (cached, true)
    } else {
        let wav = client
            .synthesize(req.speaker_id, &req.text, &params)
            .await?;
        audio_cache::write_cache(&cache_path, &wav)?;
        (wav, false)
    };

    player.play(token, wav);
    Ok(PlayLineResponse { cache_hit })
}

#[tauri::command]
pub fn stop_playback(player: State<'_, AudioPlayer>) {
    player.stop();
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearCacheResponse {
    pub deleted_files: u64,
    pub freed_bytes: u64,
}

#[tauri::command]
pub fn clear_audio_cache(app: AppHandle) -> Result<ClearCacheResponse, SerializedError> {
    let cleared = audio_cache::clear_all(&app)?;
    Ok(ClearCacheResponse {
        deleted_files: cleared.deleted_files,
        freed_bytes: cleared.freed_bytes,
    })
}
