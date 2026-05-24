import { readTextFile, writeFile, writeTextFile, createDir, readDir } from "@tauri-apps/api/fs";
import { appDataDir, join, dirname } from "@tauri-apps/api/path";

const getFilePath = async () => await join(await appDataDir(), "launcher-data.json");

const ensureFolderExists = async () => {
  const filePath = await getFilePath();
  const dir = await dirname(filePath);
  await createDir(dir, { recursive: true }); // ✅ creates the folder if missing
};

export const readData = async () => {
  try {
    const filePath = await getFilePath();
    const raw = await readTextFile(filePath);
    let data = JSON.parse(raw);

    // ✅ Ensure all keys exist, even in older files
    if (!Array.isArray(data.emulators)) data.emulators = [];
    if (!Array.isArray(data.games)) data.games = [];
    if (!Array.isArray(data.gameFolders)) data.gameFolders = [];
    if (!data.settings || typeof data.settings !== "object") data.settings = {};
    if (!data.settings.notificationPosition) data.settings.notificationPosition = "top-right";

    return data;
  } catch {
    // File might not exist — create it with default structure
    const defaultData = { emulators: [], games: [], gameFolders: [], settings: { notificationPosition: "top-right" } };
    try {
      await ensureFolderExists();
      const filePath = await getFilePath();
      await writeTextFile(filePath, JSON.stringify(defaultData, null, 2));
    } catch (writeErr) {
      console.error("❌ Failed to create launcher-data.json:", writeErr);
    }
    return defaultData;
  }
};

export const writeData = async (data) => {
  await ensureFolderExists(); // ✅ make sure folder exists before writing
  const filePath = await getFilePath();
  await writeFile({ path: filePath, contents: JSON.stringify(data, null, 2) });
};

const mergeOrReplace = (existing, incoming, key = "id") => {
  const map = new Map(existing.map((item) => [item[key], item]));
  incoming.forEach((item) => map.set(item[key], item));
  return Array.from(map.values());
};

export const addGame = async (game) => {
  const data = await readData();
  data.games = mergeOrReplace(data.games, [game]);
  await writeData(data);
};

export const addGameFolderPath = async (path) => {
  const data = await readData();

  // Only add the path if it doesn't already exist
  if (!data.gameFolders.includes(path)) {
    data.gameFolders.push(path);
    await writeData(data);
  }
};

export const removeGameFolderPath = async (path) => {
  const data = await readData();
  data.gameFolders = data.gameFolders.filter((folder) => folder !== path);
  const originalGameCount = data.games.length;
  data.games = data.games.filter((game) => !isPathInsideFolder(game.romPath, path));
  await writeData(data);
  return {
    gameFolders: data.gameFolders,
    games: data.games,
    removedGameCount: originalGameCount - data.games.length,
  };
};

function isPathInsideFolder(path, folder) {
  const normalizedPath = normalizePath(path);
  const normalizedFolder = normalizePath(folder);

  return normalizedPath === normalizedFolder || normalizedPath.startsWith(`${normalizedFolder}/`);
}

function normalizePath(path = "") {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "")
    .toLowerCase();
}

export const addEmulator = async (emulator) => {
  const data = await readData();
  data.emulators = mergeOrReplace(data.emulators, [emulator]);
  await writeData(data);
};

export const updateGame = async (updatedGame) => {
  const data = await readData();
  data.games = data.games.map((g) => (g.id === updatedGame.id ? { ...g, ...updatedGame } : g));
  await writeData(data);
};

export const updateEmulator = async (updatedEmulator) => {
  const data = await readData();
  data.emulators = data.emulators.map((e) => (
    getEmulatorKey(e) === getEmulatorKey(updatedEmulator) ? { ...e, ...updatedEmulator } : e
  ));
  await writeData(data);
};

function getEmulatorKey(emulator) {
  return emulator.id || emulator.path || `${emulator.platform || ""}:${emulator.name || ""}`;
}

export const getEmulatorPathByPlatform = async (platform) => {
  const data = await readData();

  const emulator = data.emulators.find((e) => e.platform?.toLowerCase() === platform?.toLowerCase());

  // Return the path if found, else null
  return emulator ? emulator.path : null;
};

export const getEmulatorByPlatform = async (platform) => {
  const data = await readData();
  return data.emulators.find((e) => e.platform?.toLowerCase() === platform?.toLowerCase()) || null;
};

export const findSaveStateFile = async (emulatorPath, gameCode) => {
  // console.log(emulatorPath, gameCode);
  

  // 1. Emulator folder
  const emuDir = await dirname(emulatorPath);

  // 2. sstates folder
  const sstatesDir = await join(emuDir, "sstates");
  
  // 3. Read all files in sstates
  const files = await readDir(sstatesDir);
  console.log(files, gameCode);

  // 4. Filter files that include the gameCode
  const matchingFiles = files.filter(f => f.name && f.name.includes(gameCode));

  if (matchingFiles.length === 0) return null;

  // 5. Pick the most recent one
  let latestFile = matchingFiles[0];
  for (const f of matchingFiles) {
    if (f.metadata?.modifiedAt > latestFile.metadata?.modifiedAt) {
      latestFile = f;
    }
  }

  return await join(sstatesDir, latestFile.name);
};
