//! Tauri-independent logic for the areNews controller: script validation,
//! VOICEVOX cache-key derivation, and the VOICEVOX HTTP client. Kept free of
//! any `tauri` dependency so it builds and tests on machines without the
//! GTK/WebKit headers the Tauri shell crate requires.

pub mod cache_key;
pub mod error;
pub mod script;
pub mod voicevox;

pub use cache_key::{synthesis_cache_key, VoiceParams};
pub use error::{CoreError, SerializedError};
pub use script::{parse_and_validate, LoadedScript, ValidationIssue};
pub use voicevox::{SpeakerInfo, SpeakerStyle, VoicevoxClient};
