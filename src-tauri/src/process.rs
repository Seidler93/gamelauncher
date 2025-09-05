use std::process::{Command, Stdio};
use tauri::command;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct LaunchSpec {
  pub exe: String,
  pub args: Vec<String>,
  pub cwd: Option<String>,
}

#[command]
pub fn launch_process(spec: LaunchSpec) -> Result<u32, String> {
  println!("[launch_process] exe='{}' args={:?} cwd={:?}", spec.exe, spec.args, spec.cwd);
  let mut cmd = Command::new(&spec.exe);
  if let Some(dir) = &spec.cwd {
    cmd.current_dir(dir);
  }
  let child = cmd
    .args(&spec.args)
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .spawn()
    .map_err(|e| format!("Failed to launch '{}': {}", &spec.exe, e))?;
  Ok(child.id())
}
