mod audio_cache;
mod commands;

use commands::{files, progress, settings, voicevox};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            files::open_script_file,
            files::load_script,
            voicevox::check_voicevox,
            voicevox::list_voicevox_speakers,
            voicevox::synthesize_line,
            voicevox::clear_audio_cache,
            progress::save_progress,
            progress::load_progress,
            settings::save_settings,
            settings::load_settings,
            settings::set_always_on_top,
        ])
        .run(tauri::generate_context!())
        .expect("error while running areNews Controller");
}
