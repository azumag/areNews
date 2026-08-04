use sha2::{Digest, Sha256};

/// Synthesis parameters that affect the VOICEVOX output audio.
/// `None` means "use the engine's default for this field" and must hash
/// differently from any explicit value (including a value equal to the
/// engine's own default), so a cache entry synthesized before a default
/// changes upstream is never mistaken for one synthesized after.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct VoiceParams {
    pub speed_scale: Option<f64>,
    pub pitch_scale: Option<f64>,
    pub intonation_scale: Option<f64>,
    pub volume_scale: Option<f64>,
    pub pre_phoneme_length: Option<f64>,
    pub post_phoneme_length: Option<f64>,
}

fn fmt_opt(value: Option<f64>) -> String {
    match value {
        None => "-".to_string(),
        Some(v) => format!("{v:.6}"),
    }
}

/// Derives a stable cache key for a synthesized line. Every input that can
/// change the resulting WAV bytes must be included, or a stale cache entry
/// could be served for content that has since changed.
pub fn synthesis_cache_key(
    engine_version: &str,
    speaker_id: u32,
    text: &str,
    params: &VoiceParams,
) -> String {
    let canonical = format!(
        "v1|{}|{}|{}|{}|{}|{}|{}|{}|{}",
        engine_version,
        speaker_id,
        text,
        fmt_opt(params.speed_scale),
        fmt_opt(params.pitch_scale),
        fmt_opt(params.intonation_scale),
        fmt_opt(params.volume_scale),
        fmt_opt(params.pre_phoneme_length),
        fmt_opt(params.post_phoneme_length),
    );
    let mut hasher = Sha256::new();
    hasher.update(canonical.as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn params() -> VoiceParams {
        VoiceParams {
            speed_scale: Some(1.0),
            pitch_scale: Some(0.0),
            intonation_scale: Some(1.0),
            volume_scale: Some(1.0),
            pre_phoneme_length: None,
            post_phoneme_length: None,
        }
    }

    #[test]
    fn deterministic() {
        let a = synthesis_cache_key("0.14.0", 1, "hello", &params());
        let b = synthesis_cache_key("0.14.0", 1, "hello", &params());
        assert_eq!(a, b);
    }

    #[test]
    fn changes_with_engine_version() {
        let base = synthesis_cache_key("0.14.0", 1, "hello", &params());
        assert_ne!(base, synthesis_cache_key("0.14.1", 1, "hello", &params()));
    }

    #[test]
    fn changes_with_speaker() {
        let base = synthesis_cache_key("0.14.0", 1, "hello", &params());
        assert_ne!(base, synthesis_cache_key("0.14.0", 2, "hello", &params()));
    }

    #[test]
    fn changes_with_text() {
        let base = synthesis_cache_key("0.14.0", 1, "hello", &params());
        assert_ne!(base, synthesis_cache_key("0.14.0", 1, "world", &params()));
    }

    #[test]
    fn changes_with_each_voice_param() {
        let base = synthesis_cache_key("0.14.0", 1, "hello", &params());

        let mut p = params();
        p.speed_scale = Some(1.1);
        assert_ne!(base, synthesis_cache_key("0.14.0", 1, "hello", &p));

        let mut p = params();
        p.pitch_scale = Some(0.1);
        assert_ne!(base, synthesis_cache_key("0.14.0", 1, "hello", &p));

        let mut p = params();
        p.intonation_scale = Some(1.1);
        assert_ne!(base, synthesis_cache_key("0.14.0", 1, "hello", &p));

        let mut p = params();
        p.volume_scale = Some(1.1);
        assert_ne!(base, synthesis_cache_key("0.14.0", 1, "hello", &p));

        let mut p = params();
        p.pre_phoneme_length = Some(0.1);
        assert_ne!(base, synthesis_cache_key("0.14.0", 1, "hello", &p));

        let mut p = params();
        p.post_phoneme_length = Some(0.1);
        assert_ne!(base, synthesis_cache_key("0.14.0", 1, "hello", &p));
    }

    #[test]
    fn none_is_distinct_from_any_explicit_value() {
        let mut p = params();
        p.pre_phoneme_length = None;
        let a = synthesis_cache_key("0.14.0", 1, "hello", &p);
        p.pre_phoneme_length = Some(0.0);
        let b = synthesis_cache_key("0.14.0", 1, "hello", &p);
        assert_ne!(a, b);
    }
}
