import { readData, writeData } from "./storageManager";
import { invoke } from "@tauri-apps/api";
import { slusMap } from "../../../slusMap";

// 🧼 Clean and normalize title
export function sanitizeGameTitle(title) {
  const cleanedTitle = title.trim();
  const match = cleanedTitle.match(/\b(SLUS|SCUS|SLES|SCES)[-\s]?(\d{4,5})\b/);

  if (match) {
    const code = `${match[1]}-${match[2]}`;
    if (slusMap[code]) {
      return slusMap[code];
    }
  }

  return title.replace(/\s*\(.*?\)/g, "").trim(); // remove (USA) etc
}

// 📦 Get cover for a single game title
export async function getCoverImages(gameName, token) {
  const cleanName = sanitizeGameTitle(gameName);

  try {
    const coverOptions = await invoke("fetch_game_cover", {
      gameName: cleanName,
      token: token,
      clientId: import.meta.env.VITE_TWITCH_CLIENT_ID
    });
    console.log(coverOptions);

    // response should be an array of game entries with cover.image_id
    if (!Array.isArray(coverOptions)) return [];
    
    const covers = coverOptions
    .filter(game => game.imageUrl)
    .map(game => ({
      name: game.name,
      imageUrl: game.imageUrl
    }));


    return covers;
  } catch (err) {
    console.error(`❌ Failed to fetch covers for "${cleanName}":`, err);
    return [];
  }
}


// 📥 Fetch and apply cover images to all games
export async function fetchAllGameCovers({ games, igdbToken, setGames }) {
  const updatedGames = await Promise.all(
    games.map(async (game) => {
      // if (game.coverOptions && game.coverOptions.length > 0) return game;
      
      const covers = await getCoverImages(game.title || game.name, igdbToken);


      return covers.length > 0
        ? { ...game, coverOptions: covers, coverUrl: covers[0].imageUrl } // default to first one
        : game;
    })
  );

  setGames(updatedGames);

  try {
    const currentData = await readData();
    await writeData({
      ...currentData,
      games: updatedGames
    });
    console.log("✔️ Game covers (multiple) updated.");
  } catch (err) {
    console.error("❌ Failed to write updated game data:", err);
  }
}

