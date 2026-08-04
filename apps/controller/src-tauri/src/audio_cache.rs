use std::fs;
use std::path::{Path, PathBuf};

use are_news_controller_core::{CoreError, SerializedError};
use tauri::{AppHandle, Manager};

pub fn audio_cache_dir(app: &AppHandle) -> Result<PathBuf, SerializedError> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| CoreError::Io(format!("キャッシュディレクトリを取得できません: {e}")))?
        .join("audio");
    fs::create_dir_all(&dir)
        .map_err(|e| CoreError::Io(format!("キャッシュディレクトリを作成できません: {e}")))?;
    Ok(dir)
}

pub fn cached_path(app: &AppHandle, key: &str) -> Result<PathBuf, SerializedError> {
    Ok(audio_cache_dir(app)?.join(format!("{key}.wav")))
}

pub fn read_cached(path: &Path) -> Option<Vec<u8>> {
    fs::read(path).ok()
}

pub fn write_cache(path: &Path, bytes: &[u8]) -> Result<(), SerializedError> {
    fs::write(path, bytes)
        .map_err(|e| CoreError::Io(format!("音声キャッシュの保存に失敗しました: {e}")).into())
}

pub struct ClearedCache {
    pub deleted_files: u64,
    pub freed_bytes: u64,
}

pub fn clear_all(app: &AppHandle) -> Result<ClearedCache, SerializedError> {
    let dir = audio_cache_dir(app)?;
    let mut deleted_files = 0u64;
    let mut freed_bytes = 0u64;

    let entries = fs::read_dir(&dir)
        .map_err(|e| CoreError::Io(format!("キャッシュディレクトリを読み込めません: {e}")))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if let Ok(meta) = entry.metadata() {
            freed_bytes += meta.len();
        }
        if fs::remove_file(&path).is_ok() {
            deleted_files += 1;
        }
    }

    Ok(ClearedCache {
        deleted_files,
        freed_bytes,
    })
}
