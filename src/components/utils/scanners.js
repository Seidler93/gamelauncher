import { readBinaryFile, readDir, readTextFile } from "@tauri-apps/api/fs";
import { join } from "@tauri-apps/api/path";
import { ps3TitleAliasMap, ps3TitleMap } from "../../../ps3TitleMap";

export async function scanPS2Games(folderPath) {
  const files = flattenFileEntries(await readDir(folderPath, { recursive: true }));
  const discImages = files.filter((f) => isPS2DiscImage(f.name));
  const seenPaths = new Set();

  console.log(discImages, folderPath);

  return discImages
    .filter((file) => {
      if (seenPaths.has(file.path)) return false;
      seenPaths.add(file.path);
      return true;
    })
    .map((file) => ({
    title: getTitleFromFilename(file.name),
    romPath: file.path,
    platform: "PS2",
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  }));
}

function isPS2DiscImage(filename = "") {
  return /\.(iso|bin|cue|chd|cso)$/i.test(filename);
}

function getTitleFromFilename(filename = "") {
  return filename.replace(/\.(iso|bin|cue|chd|cso)$/i, "");
}

export async function scanPS3Games(folderPath) {
  const entries = flattenFileEntries(await readDir(folderPath, { recursive: true }));

  const ebootFiles = entries.filter((item) => {
    const path = item.path || "";
    return item.name === "EBOOT.BIN" && /[\\/]USRDIR[\\/]EBOOT\.BIN$/i.test(path);
  });

  const seenPaths = new Set();

  const uniqueEbootFiles = ebootFiles
    .filter((file) => {
      if (seenPaths.has(file.path)) return false;
      seenPaths.add(file.path);
      return true;
    });

  return Promise.all(
    uniqueEbootFiles.map(async (file) => {
      const paramSfo = await readPS3ParamSfo(file.path);
      const titleId = paramSfo?.titleId || getPS3TitleIdFromPath(file.path);
      const detectedTitle = paramSfo?.title || getPS3TitleFromEbootPath(file.path);

      return {
        title: getPS3MappedTitle(titleId, detectedTitle),
        titleId,
        detectedTitle,
        romPath: file.path,
        platform: "PS3",
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
      };
    })
  );
}

function getPS3MappedTitle(titleId, detectedTitle) {
  const normalizedTitleId = titleId?.toUpperCase();

  if (normalizedTitleId && ps3TitleMap[normalizedTitleId]) {
    return ps3TitleMap[normalizedTitleId];
  }

  return ps3TitleAliasMap[detectedTitle] || detectedTitle;
}

function getPS3TitleFromEbootPath(ebootPath) {
  const parts = ebootPath.split(/[\\/]+/);
  const ps3GameIndex = parts.findIndex((part) => part.toUpperCase() === "PS3_GAME");

  if (ps3GameIndex > 0) {
    return parts[ps3GameIndex - 1];
  }

  const usrdirIndex = parts.findIndex((part) => part.toUpperCase() === "USRDIR");
  if (usrdirIndex > 0) {
    return parts[usrdirIndex - 1];
  }

  return parts.at(-2) || "Unknown PS3 Game";
}

function getPS3TitleIdFromPath(path = "") {
  const match = path.match(/\b([A-Z]{4}\d{5}|NP[A-Z]{2}\d{5})\b/i);
  return match ? match[1].toUpperCase() : null;
}

async function readPS3ParamSfo(ebootPath) {
  const paramSfoPath = getParamSfoPathFromEbootPath(ebootPath);
  if (!paramSfoPath) return null;

  try {
    const bytes = await readBinaryFile(paramSfoPath);
    return parseParamSfo(bytes);
  } catch (err) {
    console.warn("Could not read PARAM.SFO:", paramSfoPath, err);
    return null;
  }
}

function getParamSfoPathFromEbootPath(ebootPath = "") {
  return ebootPath.replace(/[\\/]USRDIR[\\/]EBOOT\.BIN$/i, `${getPathSeparator(ebootPath)}PARAM.SFO`);
}

function getPathSeparator(path = "") {
  return path.includes("\\") ? "\\" : "/";
}

function parseParamSfo(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes.length < 20 || view.getUint8(1) !== 0x50 || view.getUint8(2) !== 0x53 || view.getUint8(3) !== 0x46) {
    return null;
  }

  const keyTableOffset = view.getUint32(8, true);
  const dataTableOffset = view.getUint32(12, true);
  const entryCount = view.getUint32(16, true);
  const values = {};

  for (let index = 0; index < entryCount; index++) {
    const entryOffset = 20 + index * 16;
    const keyOffset = view.getUint16(entryOffset, true);
    const dataFormat = view.getUint16(entryOffset + 2, true);
    const dataLength = view.getUint32(entryOffset + 4, true);
    const dataOffset = view.getUint32(entryOffset + 12, true);
    const key = readNullTerminatedString(bytes, keyTableOffset + keyOffset);

    if (!key) continue;

    if (dataFormat === 0x0204) {
      values[key] = readString(bytes, dataTableOffset + dataOffset, dataLength);
    }
  }

  return {
    title: values.TITLE || null,
    titleId: values.TITLE_ID || null,
  };
}

function readNullTerminatedString(bytes, offset) {
  let end = offset;
  while (end < bytes.length && bytes[end] !== 0) end++;
  return readString(bytes, offset, end - offset);
}

function readString(bytes, offset, length) {
  const slice = bytes.slice(offset, offset + length).filter(byte => byte !== 0);
  return new TextDecoder("utf-8").decode(slice).trim();
}

export async function scanSteamGames(folderPath) {
  const commonPath = getSteamCommonPath(folderPath);
  const steamAppsPath = getSteamAppsPath(folderPath);
  const dirs = await readDir(commonPath);
  const manifests = await readSteamAppManifests(steamAppsPath);

  const gameFolders = dirs.filter((f) => Array.isArray(f.children) || !/\.[^\\/]+$/.test(f.name || ""));

  return gameFolders.map((folder) => {
    const manifest = manifests.get(normalizeSteamInstallDir(folder.name));

    return {
      title: manifest?.name || folder.name,
      detectedTitle: folder.name,
      steamAppId: manifest?.appId || null,
      romPath: folder.path,
      platform: "steam",
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
    };
  });
}

function getSteamAppsPath(folderPath = "") {
  if (/[\\/]steamapps[\\/]common$/i.test(folderPath)) {
    return folderPath.replace(/[\\/]common$/i, "");
  }

  if (/[\\/]steamapps$/i.test(folderPath)) {
    return folderPath;
  }

  return `${folderPath}${getPathSeparator(folderPath)}steamapps`;
}

function getSteamCommonPath(folderPath = "") {
  if (/[\\/]steamapps[\\/]common$/i.test(folderPath)) {
    return folderPath;
  }

  if (/[\\/]steamapps$/i.test(folderPath)) {
    return `${folderPath}${getPathSeparator(folderPath)}common`;
  }

  return `${folderPath}${getPathSeparator(folderPath)}steamapps${getPathSeparator(folderPath)}common`;
}

async function readSteamAppManifests(steamAppsPath) {
  try {
    const entries = await readDir(steamAppsPath);
    const manifestFiles = entries.filter((entry) => /^appmanifest_\d+\.acf$/i.test(entry.name || ""));
    const manifests = await Promise.all(
      manifestFiles.map(async (file) => {
        try {
          return parseSteamAppManifest(await readTextFile(file.path));
        } catch (err) {
          console.warn("Could not read Steam app manifest:", file.path, err);
          return null;
        }
      })
    );

    return new Map(
      manifests
        .filter((manifest) => manifest?.installDir)
        .map((manifest) => [normalizeSteamInstallDir(manifest.installDir), manifest])
    );
  } catch (err) {
    console.warn("Could not read Steam app manifests:", steamAppsPath, err);
    return new Map();
  }
}

function parseSteamAppManifest(contents = "") {
  return {
    appId: getSteamManifestValue(contents, "appid"),
    name: getSteamManifestValue(contents, "name"),
    installDir: getSteamManifestValue(contents, "installdir"),
  };
}

function getSteamManifestValue(contents, key) {
  const match = contents.match(new RegExp(`"${key}"\\s+"([^"]+)"`, "i"));
  return match ? match[1] : null;
}

function normalizeSteamInstallDir(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function flattenFileEntries(entries = []) {
  return entries.flatMap((entry) => [
    entry,
    ...flattenFileEntries(entry.children || [])
  ]);
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
