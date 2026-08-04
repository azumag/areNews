use std::fs;
use std::path::PathBuf;

use are_news_controller_core::{CoreError, SerializedError};
use serde_json::Value;
use tauri::{AppHandle, Manager, WebviewWindow};

fn settings_path(app: &AppHandle) -> Result<PathBuf, SerializedError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CoreError::Io(format!("アプリデータディレクトリを取得できません: {e}")))?;
    fs::create_dir_all(&dir)
        .map_err(|e| CoreError::Io(format!("アプリデータディレクトリを作成できません: {e}")))?;
    Ok(dir.join("settings.json"))
}

/// Persists the frontend-owned settings document verbatim; the frontend
/// applies defaults for any missing field when `load_settings` returns `None`.
#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Value) -> Result<(), SerializedError> {
    let path = settings_path(&app)?;
    let text = serde_json::to_string_pretty(&settings)
        .map_err(|e| CoreError::Io(format!("設定のシリアライズに失敗しました: {e}")))?;
    fs::write(&path, text).map_err(|e| CoreError::Io(format!("設定を保存できません: {e}")))?;
    Ok(())
}

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<Option<Value>, SerializedError> {
    let path = settings_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let text =
        fs::read_to_string(&path).map_err(|e| CoreError::Io(format!("設定を読み込めません: {e}")))?;
    let value: Value = serde_json::from_str(&text)
        .map_err(|e| CoreError::Io(format!("設定の解析に失敗しました: {e}")))?;
    Ok(Some(value))
}

/// Implemented as our own command (rather than the frontend calling the
/// `@tauri-apps/api/window` plugin command directly) so no extra capability
/// permission needs to be granted to the webview.
#[tauri::command]
pub fn set_always_on_top(
    window: WebviewWindow,
    always_on_top: bool,
) -> Result<(), SerializedError> {
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| CoreError::Other(format!("常に手前に表示の設定に失敗しました: {e}")))?;
    Ok(())
}
