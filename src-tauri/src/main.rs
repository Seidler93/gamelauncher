#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::api::process::Command;
use tauri::Manager;

#[derive(serde::Deserialize)]
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

#[derive(serde::Deserialize)]
struct IgdbGame {
    name: String,
    cover: Option<IgdbCover>,
}

#[derive(serde::Deserialize)]
struct IgdbCover {
    image_id: String,
}

#[derive(serde::Serialize)]
struct GameCoverOption {
    name: String,
    imageUrl: String,
}

#[tauri::command]
async fn fetch_game_cover(game_name: String, token: String, client_id: String) -> Result<Vec<GameCoverOption>, String> {
    let query = format!(
        "search \"{}\"; fields name, cover.image_id; limit 5;",
        game_name
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

    let games: Vec<IgdbGame> = res.json().await.map_err(|e| e.to_string())?;

    let options = games
        .into_iter()
        .filter_map(|game| {
            game.cover.map(|cover| GameCoverOption {
                name: game.name,
                imageUrl: format!("https://images.igdb.com/igdb/image/upload/t_cover_big/{}.jpg", cover.image_id),
            })
        })
        .collect();

    Ok(options)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            launch_process,
            fetch_game_cover
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
