import "./settingsBtn.css";
import { useAppContext } from "../context/AppContext";
import { fetchGameCovers } from "./utils/mediaFinder";
import { scanForAllGames } from "./utils/scanners";

export default function SyncBtn() {
  const { games, setGames, addGame, igdbToken, gameFolders, showToast } = useAppContext();

  const handleScanForGames = async () => {
    if (!gameFolders.length) {
      showToast("No tracked folders to scan.", "warning");
      return;
    }

    showToast("Scanning for games...", "info", 0);

    try {
      const scannedGames = await scanForAllGames(gameFolders);
      const existingPaths = new Set(games.map(game => game.romPath));
      const uniqueNewGames = scannedGames.filter(game => !existingPaths.has(game.romPath));

      if (uniqueNewGames.length === 0) {
        showToast("No new games found.", "info");
        return;
      }

      const gamesWithCovers = await fetchGameCovers(uniqueNewGames, igdbToken);

      setGames(prev => [...prev, ...gamesWithCovers]);

      for (const game of gamesWithCovers) {
        await addGame(game);
      }

      showToast(`Added ${gamesWithCovers.length} game${gamesWithCovers.length === 1 ? "" : "s"}.`, "success");
    } catch (err) {
      console.error("Failed to scan for games:", err);
      showToast("Could not scan for games.", "error");
    }
  };

  return (
    <button
      className="dropdown-toggle nav-icon-button"
      type="button"
      aria-label="Scan for games"
      data-tooltip="Scan for games"
      onClick={handleScanForGames}
    >
      <span aria-hidden="true">⟳</span>
    </button>
  );
}
