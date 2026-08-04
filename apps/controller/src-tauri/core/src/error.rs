use serde::Serialize;

use crate::script::ValidationIssue;

#[derive(Debug, thiserror::Error)]
pub enum CoreError {
    #[error("台本のJSON解析に失敗しました: {0}")]
    ScriptParse(String),
    #[error("台本の検証に失敗しました")]
    ScriptValidation(Vec<ValidationIssue>),
    #[error("ファイル操作に失敗しました: {0}")]
    Io(String),
    #[error("VOICEVOXへ接続できません: {0}")]
    VoicevoxConnect(String),
    #[error("VOICEVOXがエラーを返しました: {0}")]
    VoicevoxResponse(String),
    #[error("{0}")]
    Other(String),
}

/// Wire-format error surfaced to the frontend over the Tauri IPC boundary.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SerializedError {
    pub kind: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Vec<ValidationIssue>>,
}

impl From<&CoreError> for SerializedError {
    fn from(err: &CoreError) -> Self {
        let (kind, message, details) = match err {
            CoreError::ScriptParse(msg) => ("parse", msg.clone(), None),
            CoreError::ScriptValidation(issues) => (
                "validation",
                "台本の検証に失敗しました".to_string(),
                Some(issues.clone()),
            ),
            CoreError::Io(msg) => ("io", msg.clone(), None),
            CoreError::VoicevoxConnect(msg) => ("voicevox_connect", msg.clone(), None),
            CoreError::VoicevoxResponse(msg) => ("voicevox_response", msg.clone(), None),
            CoreError::Other(msg) => ("other", msg.clone(), None),
        };
        SerializedError {
            kind: kind.to_string(),
            message,
            details,
        }
    }
}

impl From<CoreError> for SerializedError {
    fn from(err: CoreError) -> Self {
        SerializedError::from(&err)
    }
}
