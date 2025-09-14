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

#[derive(serde::Deserialize)]
struct LaunchSpec {
    exe: String,
    args: Vec<String>,
    cwd: String,
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![launch_process])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
