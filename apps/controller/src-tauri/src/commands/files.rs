use std::fs;

use are_news_controller_core::{parse_and_validate, CoreError, SerializedError};
use serde::Serialize;
use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadScriptResponse {
    pub script: Value,
    pub script_hash: String,
    pub path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidatedScript {
    pub script: Value,
    pub script_hash: String,
}

/// Opens a native "open file" dialog filtered to `.json`. Must be an async
/// command: `blocking_pick_file()` blocks its calling thread until the
/// dialog resolves, and tauri-plugin-dialog's own docs warn it must not run
/// on the main thread — an async command runs on the async runtime's worker
/// pool instead, leaving the main thread free to pump the dialog's own
/// native event loop. Returns `Ok(None)` if the user cancels.
#[tauri::command]
pub async fn open_script_file(app: AppHandle) -> Result<Option<String>, SerializedError> {
    let picked = app
        .dialog()
        .file()
        .add_filter("script.json", &["json"])
        .set_title("台本ファイル (script.json) を選択")
        .blocking_pick_file();

    match picked {
        Some(file_path) => {
            let path = file_path
                .into_path()
                .map_err(|e| CoreError::Io(format!("選択したファイルのパスを解決できません: {e}")))?;
            Ok(Some(path.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

/// Reads and validates a script.json file against `schemas/script.schema.json`.
/// On validation failure, `SerializedError.details` carries every issue with
/// a JSON Pointer path so the UI can point at the exact offending field.
#[tauri::command]
pub fn load_script(path: String) -> Result<LoadScriptResponse, SerializedError> {
    let bytes =
        fs::read(&path).map_err(|e| CoreError::Io(format!("{path} を読み込めません: {e}")))?;
    let loaded = parse_and_validate(&bytes)?;
    Ok(LoadScriptResponse {
        script: loaded.script,
        script_hash: loaded.script_hash,
        path,
    })
}

/// Same validation as `load_script`, but for content the frontend already
/// has in memory (e.g. fetched from the repository over HTTPS) rather than
/// a local file — no path, no disk read.
#[tauri::command]
pub fn validate_script_content(content: String) -> Result<ValidatedScript, SerializedError> {
    let loaded = parse_and_validate(content.as_bytes())?;
    Ok(ValidatedScript {
        script: loaded.script,
        script_hash: loaded.script_hash,
    })
}
