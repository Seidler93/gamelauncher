import { invoke } from "@tauri-apps/api/tauri";
import { dirname } from "@tauri-apps/api/path";
import { writeTextFile } from "@tauri-apps/api/fs";

export async function launchGame(emuPath, game, savePath = null) {
  switch (game.platform) {
    case "PS2":
      return await launchRomWithState(emuPath, game.romPath, savePath);
    case "PS3":
      // TBD if you want to support state-like features for RPCS3
      break;
    case "Steam":
      // Steam usually uses Steam protocol or exe
      break;
    default:
      console.warn(`Unknown platform: ${game.platform}`);
  }
}

export async function launchRom(emulatorPath, gamePath, savePath = null) {
  const exe = emulatorPath;
  const cwd = await dirname(exe);

  // Build args dynamically
  const args = [];
  if (savePath) {
    args.push("--state", savePath); // ✅ separate args
  }
  args.push(gamePath);

  console.log("Launching:", exe);
  console.log("Args:", args);
  console.log("CWD:", cwd);

  await invoke("launch_process", {
    spec: {
      exe,
      args,
      cwd
    }
  });
}

export async function launchRomWithState(emulatorPath, romPath, saveStatePath) {
  const cwd = await dirname(emulatorPath);
  const args = [
    romPath, // game ISO
    "-statefile", saveStatePath // ✅ correct argument
  ];

  console.log("Launching PCSX2:", emulatorPath, args);

  await invoke("launch_process", {
    spec: {
      exe: emulatorPath,
      args,
      cwd
    }
  });
}



