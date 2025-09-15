#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::api::process::Command;
use tauri::Manager;

// ========== Process Launcher ==========

#[derive(Deserialize)]
struct LaunchSpec {
    exe: String,
    args: Vec<String>,
    cwd: String,
}

#[tauri::command]
async fn launch_process(spec: LaunchSpec) -> Result<(), String> {
    Command::new(spec.exe)
        .args(spec.args)
        .current_dir(spec.cwd.into())
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ========== IGDB Game Metadata ==========

#[derive(Debug, Serialize, Deserialize)]
struct Cover {
    image_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Screenshot {
    image_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Video {
    video_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Genre {
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
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
        .into_iter()
        .filter(|g| g.name.eq_ignore_ascii_case(&game_name))
        .collect();

    Ok(exact_matches)
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
