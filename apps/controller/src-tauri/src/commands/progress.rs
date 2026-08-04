use std::fs;
use std::path::PathBuf;

use are_news_controller_core::{CoreError, SerializedError};
use serde_json::Value;
use tauri::{AppHandle, Manager};

/// Progress files are keyed by episode id, which is attacker-free but still
/// arbitrary text from a JSON file the user picked — restrict it to a safe
/// filename character set instead of trusting it as a path segment.
fn sanitize_episode_id(episode_id: &str) -> String {
    let cleaned: String = episode_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    if cleaned.is_empty() {
        "episode".to_string()
    } else {
        cleaned
    }
}

fn progress_dir(app: &AppHandle) -> Result<PathBuf, SerializedError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CoreError::Io(format!("アプリデータディレクトリを取得できません: {e}")))?
        .join("progress");
    fs::create_dir_all(&dir)
        .map_err(|e| CoreError::Io(format!("進行状態ディレクトリを作成できません: {e}")))?;
    Ok(dir)
}

/// Persists the frontend-owned progress document verbatim; this crate does
/// not interpret its shape, only where it lives on disk.
#[tauri::command]
pub fn save_progress(
    app: AppHandle,
    episode_id: String,
    progress: Value,
) -> Result<(), SerializedError> {
    let path = progress_dir(&app)?.join(format!("{}.json", sanitize_episode_id(&episode_id)));
    let text = serde_json::to_string_pretty(&progress)
        .map_err(|e| CoreError::Io(format!("進行状態のシリアライズに失敗しました: {e}")))?;
    fs::write(&path, text)
        .map_err(|e| CoreError::Io(format!("進行状態を保存できません: {e}")))?;
    Ok(())
}

#[tauri::command]
pub fn load_progress(app: AppHandle, episode_id: String) -> Result<Option<Value>, SerializedError> {
    let path = progress_dir(&app)?.join(format!("{}.json", sanitize_episode_id(&episode_id)));
    if !path.exists() {
        return Ok(None);
    }
    let text = fs::read_to_string(&path)
        .map_err(|e| CoreError::Io(format!("進行状態を読み込めません: {e}")))?;
    let value: Value = serde_json::from_str(&text)
        .map_err(|e| CoreError::Io(format!("進行状態の解析に失敗しました: {e}")))?;
    Ok(Some(value))
}
