import { readData, writeData } from "./storageManager";
import { invoke } from "@tauri-apps/api";
import { slusMap } from "../../../slusMap";
import { ps2TitleRef } from "../../../ps2TitleRef";
import { ps3TitleRef } from "../../../ps3TitleRef";
import { getSteamGridDbCover } from "./steamGridDb";

// 🧼 Normalize and clean title
export function sanitizeGameTitle(title) {
  const cleanedTitle = title.trim().replace(/[™®©]/g, "");
  const match = cleanedTitle.match(/\b(SLUS|SCUS|SLES|SCES)[-\s]?(\d{4,5})\b/);

  if (match) {
    const code = `${match[1]}-${match[2]}`;
    if (slusMap[code]) {
      return slusMap[code];
    }
  }

  return cleanedTitle.replace(/\s*\(.*?\)/g, "").trim();
}

export function getGameCode(nameOrCode) {
  // 1. Clean the input (remove region/revision info in parentheses)
  const cleaned = nameOrCode
    .trim()
    .replace(/\s*\(.*?\)\s*$/g, "") // remove anything in (...) at the end
    .trim();

  // console.log("Cleaned:", cleaned);

  // 2. Check if it's already an SLUS/SCUS/SLES/SCES code
  const match = cleaned.match(/\b(SLUS|SCUS|SLES|SCES)[-\s]?(\d{4,5})\b/);
  if (match) {
    return `${match[1]}-${match[2]}`; // normalize format
  }

  // 3. Reverse search the slusMap for a matching game name
  const foundEntry = Object.entries(slusMap).find(
    ([code, title]) => title.toLowerCase() === cleaned.toLowerCase()
  );

  // console.log("Found:", foundEntry ? foundEntry[0] : null);

  // 4. Return SLUS code if found, otherwise null
  return foundEntry ? foundEntry[0] : null;
}

function getMetadataSearchNames(gameName) {
  const cleanName = sanitizeGameTitle(gameName);
  const fallbackMap = {
    "MLB The Show 10": "MLB 10: The Show",
    "MLB The Show 2010": "MLB 10: The Show",
    "MLB 10 The Show": "MLB 10: The Show",
    "Major League Baseball 10 The Show": "MLB 10: The Show",
  };
  const fallbackName = fallbackMap[cleanName];

  return fallbackName && fallbackName !== cleanName
    ? [cleanName, fallbackName]
    : [cleanName];
}

export function applyReferenceTitle(game) {
  const platform = game.platform?.toLowerCase();
  if (platform !== "ps2" && platform !== "ps3") return game;

  const scannedTitle = game.title || game.name;
  const titleFromCode = platform === "ps2" ? sanitizeGameTitle(scannedTitle) : scannedTitle;
  const referenceTitle = findClosestTitle(
    titleFromCode,
    platform === "ps2" ? ps2TitleRef : ps3TitleRef
  );
  if (!referenceTitle) return game;

  return {
    ...game,
    originalTitle: game.originalTitle || scannedTitle,
    mappedTitle: titleFromCode,
    title: referenceTitle,
    searchTitle: referenceTitle,
  };
}

function findClosestTitle(title, titleRef) {
  if (!title) return null;

  const normalizedTitle = normalizeTitleForMatch(title);
  if (!normalizedTitle) return null;

  let bestMatch = null;
  let bestScore = Infinity;

  for (const ref of titleRef) {
    const normalizedReferenceTitle = normalizeTitleForMatch(ref.name);
    if (normalizedReferenceTitle === normalizedTitle) {
      return ref.name;
    }

    const score = levenshteinDistance(normalizedTitle, normalizedReferenceTitle);
    if (score < bestScore) {
      bestScore = score;
      bestMatch = ref.name;
    }
  }

  const maxAllowedScore = Math.max(2, Math.floor(normalizedTitle.length * 0.28));
  return bestScore <= maxAllowedScore ? bestMatch : null;
}

function normalizeTitleForMatch(title = "") {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bthe\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function isSteamGame(game) {
  return game.platform?.toLowerCase() === "steam";
}

function getSearchTitle(game) {
  return game.searchTitle || game.title || game.name;
}

async function getSteamGridCoverForGame(game) {
  if (!isSteamGame(game)) return null;

  try {
    return await getSteamGridDbCover(getSearchTitle(game), game.steamAppId);
  } catch (err) {
    console.error(`Failed to fetch SteamGridDB cover for "${getSearchTitle(game)}":`, err);
    return null;
  }
}


// 📦 Get all media + metadata
export async function getGameMetadata(gameName, platformId, token) {
  const searchNames = getMetadataSearchNames(gameName);

  for (const cleanName of searchNames) {
  try {
    const metadataResults = await invoke("fetch_game_metadata", {
      gameName: cleanName,
      platformId: platformId,
      token: token,
      clientId: import.meta.env.VITE_TWITCH_CLIENT_ID
    });

    console.log(cleanName);
    console.log(metadataResults);
    if (!Array.isArray(metadataResults) || metadataResults.length === 0) continue;
    
    return metadataResults.map(game => {
      return {
        name: game.name,
        summary: game.summary,
        releaseDate: game.first_release_date,
        genres: game.genres?.map(g => g.name),
        coverUrl: game.cover
          ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
          : null,
        screenshots: game.screenshots?.map(s =>
          `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`
        ) || [],
        videos: game.videos?.map(v =>
          `https://www.youtube.com/watch?v=${v.video_id}`
        ) || [],
      };
    });
  } catch (err) {
    console.error(`❌ Failed to fetch metadata for "${cleanName}":`, err);
  }
  }

  return [];
}

// 🧠 Update games list with metadata & covers
export async function fetchAllGameCovers({ games, igdbToken, setGames }) {
  const updatedGames = await Promise.all(
    games.map(async (game) => {
      const gameWithReferenceTitle = applyReferenceTitle(game);
      const steamGridCoverUrl = await getSteamGridCoverForGame(gameWithReferenceTitle);
      const metadata = await getGameMetadata(
        getSearchTitle(gameWithReferenceTitle),
        getPlatformId(gameWithReferenceTitle.platform),
        igdbToken
      );

      if (metadata.length === 0) {
        return steamGridCoverUrl
          ? { ...gameWithReferenceTitle, coverUrl: steamGridCoverUrl, steamGridDbCoverUrl: steamGridCoverUrl }
          : gameWithReferenceTitle;
      }

      const firstMatch = metadata[0];

      return {
        ...gameWithReferenceTitle,
        coverOptions: [
          steamGridCoverUrl ? { name: `${getSearchTitle(gameWithReferenceTitle)} (SteamGridDB)`, imageUrl: steamGridCoverUrl } : null,
          ...metadata.map(m => ({ name: m.name, imageUrl: m.coverUrl })),
        ].filter(c => !!c?.imageUrl),
        coverUrl: steamGridCoverUrl || firstMatch.coverUrl,
        steamGridDbCoverUrl: steamGridCoverUrl,
        summary: firstMatch.summary,
        genres: firstMatch.genres,
        releaseDate: firstMatch.releaseDate,
        screenshots: firstMatch.screenshots,
        videos: firstMatch.videos,
      };
    })
  );

  setGames(updatedGames);

  try {
    const currentData = await readData();
    await writeData({
      ...currentData,
      games: updatedGames
    });
    console.log("✔️ Game metadata & covers updated.");
  } catch (err) {
    console.error("❌ Failed to write updated game data:", err);
  }

  const coveredCount = updatedGames.filter(game => !!game.coverUrl).length;

  return {
    coveredCount,
    missingCoverCount: updatedGames.length - coveredCount,
  };
}

/**
 * Fetches metadata (covers, genres, summary, etc.) for an array of games
 * and returns a new array of enriched game objects.
 *
 * @param {Array} games - The list of game objects you want to enrich.
 * @param {string} igdbToken - The IGDB API token for authentication.
 * @returns {Promise<Array>} - A new array of games with extra fields (coverUrl, summary, genres, etc.)
 */
export async function fetchGameCovers(games, igdbToken) {
  return Promise.all(
    games.map(async (game) => {
      const gameWithReferenceTitle = applyReferenceTitle(game);
      const steamGridCoverUrl = await getSteamGridCoverForGame(gameWithReferenceTitle);
      // 🔍 Query IGDB for metadata using the game title and platform ID
      const metadata = await getGameMetadata(
        getSearchTitle(gameWithReferenceTitle),
        getPlatformId(gameWithReferenceTitle.platform),
        igdbToken
      );

      // 🛑 If no metadata was returned, just return the original game unchanged
      if (!metadata || metadata.length === 0) {
        return steamGridCoverUrl
          ? { ...gameWithReferenceTitle, coverUrl: steamGridCoverUrl, steamGridDbCoverUrl: steamGridCoverUrl }
          : gameWithReferenceTitle;
      }

      // ✅ Take the first match (IGDB might return multiple results)
      const firstMatch = metadata[0];

      // 🎨 Build the enriched game object
      return {
        ...gameWithReferenceTitle, // preserve all original fields

        // Cover options: keep all matches that have a coverUrl
        coverOptions: [
          steamGridCoverUrl ? { name: `${getSearchTitle(gameWithReferenceTitle)} (SteamGridDB)`, imageUrl: steamGridCoverUrl } : null,
          ...metadata.map(m => ({ name: m.name, imageUrl: m.coverUrl })),
        ].filter(c => !!c?.imageUrl),

        // Default cover is from the first match
        coverUrl: steamGridCoverUrl || firstMatch.coverUrl,
        steamGridDbCoverUrl: steamGridCoverUrl,

        // Additional metadata from IGDB
        summary: firstMatch.summary,
        genres: firstMatch.genres,
        releaseDate: firstMatch.releaseDate,
        screenshots: firstMatch.screenshots,
        videos: firstMatch.videos,
      };
    })
  );
}



export function getPlatformId(platformName) {
  const platformMap = {
    PS1: 7,          // PlayStation
    PS2: 8,          // PlayStation 2
    PS3: 9,          // PlayStation 3
    PS4: 48,         // PlayStation 4
    PS5: 167,        // PlayStation 5
    PSP: 38,         // PlayStation Portable
    PSVita: 46,      // PlayStation Vita
    Xbox: 11,        // Xbox
    Xbox360: 12,     // Xbox 360
    XboxOne: 49,     // Xbox One
    XboxSeriesX: 169,// Xbox Series X|S
    GameCube: 21,
    Wii: 5,
    WiiU: 41,
    Switch: 130,
    N64: 4,
    SNES: 19,
    NES: 18,
    Dreamcast: 23,
    Saturn: 32,
    Genesis: 29,
    Steam: 6,
    steam: 6,
    PC: 6,
    Mac: 14,
    Linux: 3,
    Android: 34,
    iOS: 39,
  };

  return platformMap[platformName] || null; // return null if not found
}
