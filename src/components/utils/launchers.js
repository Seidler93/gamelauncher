import { Command } from '@tauri-apps/api/shell';

export async function launchPCSX2(pcsx2Path, romPath, args = []) {
  try {
    const command = new Command(pcsx2Path, [romPath, ...args]);

    await command.spawn();
    console.log("PCSX2 launched with:", romPath);
  } catch (error) {
    console.error("Failed to launch PCSX2:", error);
  }
}

// export async function launchGame(game) {
//   switch (emulator) {
//     case "RPCS3":
//       return await scanPS3Games(folderPath);
//     case "PCSX2":
//       return await launchGame(game.path);
//     case "Steam":
//       return await scanSteamGames(folderPath);
//     default:
//       console.warn(`Unknown emulator type: ${emulator}`);
//       return [];
//   }
// }

import { invoke } from "@tauri-apps/api/tauri";
import { dirname } from "@tauri-apps/api/path";

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
