#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::thread;
use tauri::Manager;

// ========== Process Launcher ==========

#[derive(Deserialize)]
struct LaunchSpec {
    exe: String,
    args: Vec<String>,
    cwd: Option<String>,
}

#[derive(Clone, Serialize)]
struct ProcessExitPayload {
    pid: u32,
    code: Option<i32>,
}

#[tauri::command]
fn launch_process(app: tauri::AppHandle, spec: LaunchSpec) -> Result<u32, String> {
    println!(
        "[launch_process] exe='{}' args={:?} cwd={:?}",
        spec.exe, spec.args, spec.cwd
    );

    let mut command = Command::new(&spec.exe);
    command
        .args(&spec.args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    if let Some(dir) = &spec.cwd {
        command.current_dir(dir);
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to launch '{}': {}", &spec.exe, e))?;
    let pid = child.id();
    let app_handle = app.clone();

    thread::spawn(move || {
        let code = child.wait().ok().and_then(|status| status.code());
        let _ = app_handle.emit_all("game-process-exited", ProcessExitPayload { pid, code });
    });

    Ok(pid)
}

// ========== IGDB Game Metadata ==========

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Cover {
    image_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Screenshot {
    image_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Video {
    video_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Genre {
    name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GameMetadata {
    id: u64,
    name: String,
    summary: Option<String>,
    storyline: Option<String>,
    first_release_date: Option<u64>,
    genres: Option<Vec<Genre>>,
    cover: Option<Cover>,
    screenshots: Option<Vec<Screenshot>>,
    videos: Option<Vec<Video>>,
}

#[tauri::command]
async fn fetch_game_metadata(
    game_name: String,
    platform_id: i32,
    token: String,
    client_id: String,
) -> Result<Vec<GameMetadata>, String> {
    let query = format!(
        r#"
        search "{}";
        fields 
            id,
            name,
            summary,
            storyline,
            first_release_date,
            genres.name,
            cover.image_id,
            screenshots.image_id,
            videos.video_id;
        where name ~ "{0}" & platforms = ({1});
        limit 10;
        "#,
        game_name, platform_id
    );





    let client = reqwest::Client::new();
    let res = client
        .post("https://api.igdb.com/v4/games")
        .header("Client-ID", client_id)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "text/plain")
        .body(query)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let games: Vec<GameMetadata> = res.json().await.map_err(|e| e.to_string())?;

    // Filter exact match if available
    let exact_matches: Vec<GameMetadata> = games
        .iter()
        .filter(|g| g.name.eq_ignore_ascii_case(&game_name))
        .cloned()
        .collect();

    if exact_matches.is_empty() {
        Ok(games)
    } else {
        Ok(exact_matches)
    }
}

// ========== Main App ==========

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            launch_process,
            fetch_game_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
