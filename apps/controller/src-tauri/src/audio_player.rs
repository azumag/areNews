//! Native (Rust-process) audio playback for synthesized lines.
//!
//! Audio used to play inside the WebView via an HTML `<audio>` element.
//! WebView2 (and CEF/Electron webviews in general) own their audio output
//! session on a separate OS process from the Tauri app's own executable, so
//! OBS's "Windows 10+ Application Audio Capture" — which targets a specific
//! process — could not reliably capture it. Playing the decoded WAV here,
//! from the main process, makes the app's own `.exe` the one that opens the
//! WASAPI session, so selecting it in OBS captures it correctly.
//!
//! Playback runs on a single dedicated OS thread that owns the `rodio`
//! output stream for the app's lifetime (`rodio::OutputStream` is not
//! `Send`, so it can never live inside Tauri's managed, cross-thread
//! state). Commands reach that thread over an mpsc channel; `AudioPlayer`
//! itself only holds the `Sender` half, which is what gets `.manage()`d.
use std::io::Cursor;
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::Mutex;
use std::time::Duration;

use rodio::{Decoder, OutputStream, Sink};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

enum AudioCommand {
    /// Sent the moment a new line is requested, before synthesis runs —
    /// the equivalent of the old code's synchronous `stopAudioElement()` +
    /// token bump. Immediately silences whatever is currently playing and
    /// marks `token` as the only one whose eventual `Play` will be honored,
    /// so a slow, now-superseded synthesis can never start audio late.
    Prepare {
        token: u64,
    },
    Play {
        token: u64,
        wav: Vec<u8>,
    },
    Stop,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlaybackErrorPayload {
    token: u64,
    message: String,
}

pub struct AudioPlayer {
    tx: Mutex<mpsc::Sender<AudioCommand>>,
}

impl AudioPlayer {
    pub fn spawn(app: AppHandle) -> Self {
        let (tx, rx) = mpsc::channel::<AudioCommand>();
        std::thread::spawn(move || run_audio_thread(app, rx));
        AudioPlayer { tx: Mutex::new(tx) }
    }

    pub fn prepare(&self, token: u64) {
        self.send(AudioCommand::Prepare { token });
    }

    pub fn play(&self, token: u64, wav: Vec<u8>) {
        self.send(AudioCommand::Play { token, wav });
    }

    pub fn stop(&self) {
        self.send(AudioCommand::Stop);
    }

    fn send(&self, command: AudioCommand) {
        // The receiver only goes away if the audio thread itself panicked
        // (e.g. it never had an output device to begin with); dropping the
        // command in that case is the correct behavior — there is nothing
        // left to play it.
        let _ = self.tx.lock().unwrap().send(command);
    }
}

fn run_audio_thread(app: AppHandle, rx: mpsc::Receiver<AudioCommand>) {
    let (_stream, stream_handle) = match OutputStream::try_default() {
        Ok(pair) => pair,
        Err(err) => {
            for command in rx {
                if let AudioCommand::Play { token, .. } = command {
                    let _ = app.emit(
                        "playback-error",
                        PlaybackErrorPayload {
                            token,
                            message: format!("音声出力デバイスを初期化できません: {err}"),
                        },
                    );
                }
            }
            return;
        }
    };

    let mut active_token: Option<u64> = None;
    let mut current: Option<(u64, Sink)> = None;

    loop {
        match rx.recv_timeout(Duration::from_millis(50)) {
            Ok(AudioCommand::Prepare { token }) => {
                active_token = Some(token);
                current = None;
            }
            Ok(AudioCommand::Stop) => {
                active_token = None;
                current = None;
            }
            Ok(AudioCommand::Play { token, wav }) => {
                if active_token != Some(token) {
                    // A newer request (or an explicit Stop) already
                    // superseded this one; drop it silently, same as the
                    // old frontend-side SYNTH_DONE token guard used to.
                    continue;
                }
                match Sink::try_new(&stream_handle) {
                    Ok(sink) => match Decoder::new(Cursor::new(wav)) {
                        Ok(source) => {
                            sink.append(source);
                            current = Some((token, sink));
                            let _ = app.emit("playback-started", token);
                        }
                        Err(err) => {
                            let _ = app.emit(
                                "playback-error",
                                PlaybackErrorPayload {
                                    token,
                                    message: format!("音声のデコードに失敗しました: {err}"),
                                },
                            );
                        }
                    },
                    Err(err) => {
                        let _ = app.emit(
                            "playback-error",
                            PlaybackErrorPayload {
                                token,
                                message: format!("再生シンクを初期化できません: {err}"),
                            },
                        );
                    }
                }
            }
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => break,
        }

        if let Some((token, sink)) = &current {
            if sink.empty() {
                let ended_token = *token;
                current = None;
                let _ = app.emit("playback-ended", ended_token);
            }
        }
    }
}
