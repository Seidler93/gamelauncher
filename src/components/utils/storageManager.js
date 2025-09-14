import { readTextFile, writeFile } from "@tauri-apps/api/fs";
import { appDataDir, join } from "@tauri-apps/api/path";

const getFilePath = async () => await join(await appDataDir(), "launcher-data.json");

export const readData = async () => {
  try {
    const filePath = await getFilePath();
    const raw = await readTextFile(filePath);
    return JSON.parse(raw);
  } catch {
    return { emulators: [], games: [] }; // fallback if file doesn't exist
  }
};

const writeData = async (data) => {
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
  data.emulators = data.emulators.map((e) => (e.id === updatedEmulator.id ? { ...e, ...updatedEmulator } : e));
  await writeData(data);
};
