import { invoke } from "@tauri-apps/api/tauri";
import { dirname } from "@tauri-apps/api/path";

export async function openFolderLocation(path) {
  const targetPath = isLikelyFilePath(path) ? await dirname(path) : path;

  await invoke("launch_process", {
    spec: {
      exe: "explorer.exe",
      args: [targetPath],
      cwd: "C:\\Windows",
    },
  });
}

function isLikelyFilePath(path = "") {
  const filename = path.split(/[\\/]/).pop() || "";
  return /\.[a-z0-9]{2,5}$/i.test(filename);
}
