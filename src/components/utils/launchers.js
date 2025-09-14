import { Command } from '@tauri-apps/api/shell';
import { invoke } from "@tauri-apps/api/tauri";
import { dirname } from "@tauri-apps/api/path";

export async function launchGame(emuPath, game) {
  switch (game.platform) {
    case "PS3":
      return await scanPS3Games(folderPath);
    case "PS2":      
      return await launchRom(emuPath, game.romPath);
    case "Steam":
      return await scanSteamGames(folderPath);
    default:
      console.warn(`Unknown emulator type: ${game.platform}`);
      return [];
  }
}

export async function launchRom(emulatorPath, gamePath) {
  const exe = emulatorPath;
  const rom = gamePath;

  const args = [rom]; // or your emulator-specific format
  const cwd = await dirname(exe);

  console.log("Attempting to run:", exe);

  await invoke("launch_process", {
    spec: {
      exe,
      args,
      cwd
    }
  });
}
