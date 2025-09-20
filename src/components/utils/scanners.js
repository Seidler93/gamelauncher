import { readDir } from "@tauri-apps/api/fs";
import { join } from "@tauri-apps/api/path";

export async function scanPS2Games(folderPath) {
  
  const files = await readDir(folderPath);
  
  const isos = files.filter((f) => f.name?.endsWith(".iso"));
  console.log(isos, folderPath);

  return isos.map((file) => ({
    title: file.name.replace(".iso", ""),
    romPath: file.path,
    platform: "PS2",
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  }));
}

export async function scanPS3Games(folderPath) {
  const folders = await readDir(folderPath, { recursive: true });

  const games = [];

  for (const item of folders) {
    if (item.name === "USRDIR") {
      const ebootPath = await join(item.path, "EBOOT.BIN");
      games.push({
        title: item.path.split("\\").slice(-3, -2)[0], // parent folder as title
        romPath: ebootPath,
        platform: "PS3",
      });
    }
  }

  return games;
}

export async function scanSteamGames(folderPath) {
  const dirs = await readDir(folderPath, { recursive: true });

  const steamExes = dirs.filter((f) => f.name?.endsWith(".exe"));

  return steamExes.map((file) => ({
    title: file.name.replace(".exe", ""),
    romPath: file.path,
    platform: "steam",
  }));
}

export async function scanForGames(emulator, folderPath) {
  switch (emulator) {
    case "RPCS3":
      return await scanPS3Games(folderPath);
    case "PCSX2":
      return await scanPS2Games(folderPath);
    case "Steam":
      return await scanSteamGames(folderPath);
    default:
      console.warn(`Unknown emulator type: ${emulator}`);
      return [];
  }
}

export async function scanForAllGames(folderPaths) {
  // normalize: accept single path or array of paths
  if (!Array.isArray(folderPaths)) {
    folderPaths = [folderPaths];
  }

  const results = await Promise.all(
    folderPaths.map(async folder => {
      const [ps2Games, ps3Games] = await Promise.all([
        scanPS2Games(folder),
        scanPS3Games(folder)
      ]);
      return [...ps2Games, ...ps3Games];
    })
  );

  // results is an array of arrays → flatten
  return results.flat();
}

