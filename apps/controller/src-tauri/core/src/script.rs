use std::sync::OnceLock;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::error::CoreError;

const SCHEMA_STR: &str = include_str!("../../../../../schemas/script.schema.json");

static VALIDATOR: OnceLock<jsonschema::Validator> = OnceLock::new();

/// A single validation failure, addressed by JSON Pointer so the frontend
/// can show the streamer exactly which part of `script.json` is wrong.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone)]
pub struct LoadedScript {
    pub script: Value,
    pub script_hash: String,
}

fn validator() -> &'static jsonschema::Validator {
    VALIDATOR.get_or_init(|| {
        let schema: Value =
            serde_json::from_str(SCHEMA_STR).expect("embedded schema must be valid JSON");
        jsonschema::validator_for(&schema).expect("embedded schema must compile")
    })
}

/// Parse `bytes` as UTF-8 JSON and validate it against `schemas/script.schema.json`.
/// Returns every validation error (not just the first) with a JSON Pointer path,
/// plus a content hash used later for progress reconciliation.
pub fn parse_and_validate(bytes: &[u8]) -> Result<LoadedScript, CoreError> {
    let text = std::str::from_utf8(bytes)
        .map_err(|e| CoreError::ScriptParse(format!("UTF-8として読み込めません: {e}")))?;

    let value: Value = serde_json::from_str(text)
        .map_err(|e| CoreError::ScriptParse(format!("{}行{}列: {}", e.line(), e.column(), e)))?;

    let issues: Vec<ValidationIssue> = validator()
        .iter_errors(&value)
        .map(|error| ValidationIssue {
            path: error.instance_path().as_str().to_string(),
            message: error.to_string(),
        })
        .collect();

    if !issues.is_empty() {
        return Err(CoreError::ScriptValidation(issues));
    }

    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let script_hash = hex::encode(hasher.finalize());

    Ok(LoadedScript {
        script: value,
        script_hash,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEMPLATE_SCRIPT: &str = include_str!("../../../../../templates/script.json");

    #[test]
    fn template_script_validates() {
        let result = parse_and_validate(TEMPLATE_SCRIPT.as_bytes());
        assert!(result.is_ok(), "{:?}", result.err());
    }

    #[test]
    fn script_with_optional_fields_validates() {
        let json = r#"{
            "episodeId": "e1",
            "title": "t",
            "date": "2026-01-01",
            "presentation": {
                "googleSlidesUrl": "https://docs.google.com/presentation/d/x",
                "exportedSlidesDir": "./slides"
            },
            "slides": [{
                "slideId": "s1",
                "slideNumber": 1,
                "title": "st",
                "notes": "note",
                "previewImage": "./slides/1.png",
                "lines": [{
                    "id": "l1",
                    "speaker": "china_ai",
                    "text": "hello",
                    "spokenText": "はろー",
                    "voice": { "speedScale": 1.1, "pitchScale": 0.0, "intonationScale": 1.0, "volumeScale": 1.0 }
                }]
            }]
        }"#;
        let result = parse_and_validate(json.as_bytes());
        assert!(result.is_ok(), "{:?}", result.err());
    }

    #[test]
    fn missing_text_reports_pointer() {
        let json = r#"{
            "episodeId": "e1", "title": "t", "date": "2026-01-01",
            "slides": [{ "slideId": "s1", "title": "st", "lines": [{ "id": "l1", "speaker": "china_ai" }] }]
        }"#;
        let err = parse_and_validate(json.as_bytes()).unwrap_err();
        match err {
            CoreError::ScriptValidation(issues) => {
                assert!(issues.iter().any(|i| i.path == "/slides/0/lines/0"));
            }
            other => panic!("expected validation error, got {other:?}"),
        }
    }

    #[test]
    fn bad_speaker_reports_pointer() {
        let json = r#"{
            "episodeId": "e1", "title": "t", "date": "2026-01-01",
            "slides": [{ "slideId": "s1", "title": "st", "lines": [{ "id": "l1", "speaker": "japan_ai", "text": "x" }] }]
        }"#;
        let err = parse_and_validate(json.as_bytes()).unwrap_err();
        match err {
            CoreError::ScriptValidation(issues) => {
                assert!(issues.iter().any(|i| i.path == "/slides/0/lines/0/speaker"));
            }
            other => panic!("expected validation error, got {other:?}"),
        }
    }

    #[test]
    fn malformed_json_reports_position() {
        let err = parse_and_validate(b"{ not json").unwrap_err();
        match err {
            CoreError::ScriptParse(msg) => assert!(!msg.is_empty()),
            other => panic!("expected parse error, got {other:?}"),
        }
    }

    #[test]
    fn hash_is_deterministic_and_content_sensitive() {
        let a = parse_and_validate(TEMPLATE_SCRIPT.as_bytes()).unwrap();
        let b = parse_and_validate(TEMPLATE_SCRIPT.as_bytes()).unwrap();
        assert_eq!(a.script_hash, b.script_hash);

        let modified = TEMPLATE_SCRIPT.replace("タイトル", "タイトル2");
        assert_ne!(modified, TEMPLATE_SCRIPT);
        let c = parse_and_validate(modified.as_bytes()).unwrap();
        assert_ne!(a.script_hash, c.script_hash);
    }
}
