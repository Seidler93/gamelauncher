#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::api::process::Command;
use tauri::Manager;

// Bring in the command we’ll define below
#[tauri::command]
async fn launch_process(spec: LaunchSpec) -> Result<(), String> {
    Command::new(spec.exe)
        .args(spec.args)
        .current_dir(spec.cwd.into())
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn fetch_game_cover(game_name: String, token: String, client_id: String) -> Result<String, String> {
    use reqwest::Client;

    let query = format!("search \"{}\"; fields name, cover.image_id; limit 1;", game_name);

    let client = Client::new();
    let res = client
        .post("https://api.igdb.com/v4/games")
        .header("Client-ID", client_id)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "text/plain")
        .body(query)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    
    if let Some(cover_id) = json.get(0).and_then(|g| g.get("cover")).and_then(|c| c.get("image_id")).and_then(|id| id.as_str()) {
        Ok(format!("https://images.igdb.com/igdb/image/upload/t_cover_big/{}.jpg", cover_id))
    } else {
        Err("No cover found".into())
    }
}


#[derive(serde::Deserialize)]
struct LaunchSpec {
    exe: String,
    args: Vec<String>,
    cwd: String,
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![launch_process])
        .invoke_handler(tauri::generate_handler![fetch_game_cover])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
