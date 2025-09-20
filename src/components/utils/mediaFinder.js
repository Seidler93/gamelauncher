import { readData, writeData } from "./storageManager";
import { invoke } from "@tauri-apps/api";
import { slusMap } from "../../../slusMap";

// 🧼 Normalize and clean title
export function sanitizeGameTitle(title) {
  const cleanedTitle = title.trim();
  const match = cleanedTitle.match(/\b(SLUS|SCUS|SLES|SCES)[-\s]?(\d{4,5})\b/);

  if (match) {
    const code = `${match[1]}-${match[2]}`;
    if (slusMap[code]) {
      return slusMap[code];
    }
  }

  return title.replace(/\s*\(.*?\)/g, "").trim();
}

// 📦 Get all media + metadata
export async function getGameMetadata(gameName, platformId, token) {
  const cleanName = sanitizeGameTitle(gameName);

  try {
    const metadataResults = await invoke("fetch_game_metadata", {
      gameName: cleanName,
      platformId: platformId,
      token: token,
      clientId: import.meta.env.VITE_TWITCH_CLIENT_ID
    });

    console.log(cleanName);
    console.log(metadataResults);
    if (!Array.isArray(metadataResults)) return [];
    
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
    return [];
  }
}

// 🧠 Update games list with metadata & covers
export async function fetchAllGameCovers({ games, igdbToken, setGames }) {
  const updatedGames = await Promise.all(
    games.map(async (game) => {
      const metadata = await getGameMetadata(game.title || game.name, getPlatformId(game.platform), igdbToken);

      if (metadata.length === 0) return game;

      const firstMatch = metadata[0];

      return {
        ...game,
        coverOptions: metadata.map(m => ({ name: m.name, imageUrl: m.coverUrl })).filter(c => !!c.imageUrl),
        coverUrl: firstMatch.coverUrl,
        summary: firstMatch.summary,
        genres: firstMatch.genres,
        releaseDate: firstMatch.releaseDate,
        screenshots: firstMatch.screenshots,
        videos: firstMatch.videos,
      };
    })
  );

  setGames(prev => [...prev, ...updatedGames]);

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
      // 🔍 Query IGDB for metadata using the game title and platform ID
      const metadata = await getGameMetadata(
        game.title || game.name,   // fall back to "name" if "title" isn't set
        getPlatformId(game.platform), // map our platform string to IGDB's platform ID
        igdbToken
      );

      // 🛑 If no metadata was returned, just return the original game unchanged
      if (!metadata || metadata.length === 0) {
        return game;
      }

      // ✅ Take the first match (IGDB might return multiple results)
      const firstMatch = metadata[0];

      // 🎨 Build the enriched game object
      return {
        ...game, // preserve all original fields

        // Cover options: keep all matches that have a coverUrl
        coverOptions: metadata
          .map(m => ({ name: m.name, imageUrl: m.coverUrl }))
          .filter(c => !!c.imageUrl),

        // Default cover is from the first match
        coverUrl: firstMatch.coverUrl,

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
    PC: 6,
    Mac: 14,
    Linux: 3,
    Android: 34,
    iOS: 39,
  };

  return platformMap[platformName] || null; // return null if not found
}

