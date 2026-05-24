import "./modal.css";
import { useAppContext } from "../context/AppContext";
import { open } from "@tauri-apps/api/dialog";
import { useEffect, useState } from "react";
import { scanForGames } from "./utils/scanners";
import { addGame, addGameFolderPath } from "./utils/storageManager";
import { fetchGameCovers } from "./utils/mediaFinder";

export default function AddGamesModal() {
  const { isAddGamesModalOpen, addGamesDefaultEmulator, closeAddGamesModal, games, setGames, gameFolders, setGameFolders, igdbToken} = useAppContext();
  const [selectedEmulator, setSelectedEmulator] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (isAddGamesModalOpen) {
      setSelectedEmulator(addGamesDefaultEmulator || "");
    }
  }, [isAddGamesModalOpen, addGamesDefaultEmulator]);
  
  if (!isAddGamesModalOpen) return null;

  const handleClose = () => {
    setSelectedEmulator("");
    setSelectedFolder("");
    setIsScanning(false);
    setToast(null);
    closeAddGamesModal();
  };

  const handleSelectFolder = async () => {
    const folder = await open({
      directory: true,
      multiple: false,
    });

    if (folder) {
      setSelectedFolder(folder);
      setToast(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmulator || !selectedFolder || isScanning) return;

    setIsScanning(true);
    setToast(null);

    try {
      const folder = selectedFolder;
      const results = await scanForGames(selectedEmulator, folder) || [];

      // flatten into one array
      const scannedGames = results.flat();

      // get existing IDs from state
      const existingIds = new Set(games.map(g => g.romPath));

      // only keep ones that aren't already in games
      const uniqueNewGames = scannedGames.filter(g => !existingIds.has(g.romPath));

      // Enrich new games with IGDB fields
      const gamesWithCovers = uniqueNewGames.length > 0
        ? await fetchGameCovers(uniqueNewGames, igdbToken)
        : [];
      
      // Update state
      if (gamesWithCovers.length > 0) {
        setGames(prev => [...prev, ...gamesWithCovers]);

        // Loop through and add each game to persistent storage
        for (const game of gamesWithCovers) {
          await addGame(game);
        }
      }

      // Only add the folder if it's not already in the list
      if (!gameFolders.includes(folder)) {
        setGameFolders(prev => [...prev, folder]);
        await addGameFolderPath(folder); // persist
      }
      
      console.log("All scanned games:", uniqueNewGames);
      console.log("Selected folder:", folder);

      if (gamesWithCovers.length > 0) {
        setToast({ type: "success", message: `${gamesWithCovers.length} game${gamesWithCovers.length === 1 ? "" : "s"} added to your library.` });
      } else if (scannedGames.length > 0) {
        setToast({ type: "info", message: "No new games added. Everything in that folder is already in your library." });
      } else {
        setToast({ type: "info", message: `No ${selectedEmulator} games found in that folder.` });
      }
    } catch (err) {
      console.error("Failed to scan folder:", err);
      setToast({ type: "error", message: "Could not scan that folder. Check the folder structure and try again." });
    } finally {
      setIsScanning(false);
    }
  };


  const emulatorNames = ["PCSX2", "RPCS3", "Steam"];

  const handleChange = (e) => {
    const value = e.target.value;
    setSelectedEmulator(value);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>
          ✖
        </button>
        <h3 className="modal-title">Add Game Folder</h3>
        <div className="emulator-select">
          <label htmlFor="emulator-dropdown">Select Emulator:</label>
          <select
            id="emulator-dropdown"
            value={selectedEmulator}
            onChange={handleChange}
          >
            <option value="">-- Choose Emulator --</option>
            {emulatorNames.map((emu) => (
              <option key={emu} value={emu}>
                {emu}
              </option>
            ))}
          </select>
        </div>
        <div className="file-select">
          <label htmlFor="game-folder-path">Game folder:</label>
          <div className="file-select-row">
            <input
              id="game-folder-path"
              type="text"
              value={selectedFolder}
              placeholder="No folder selected"
              readOnly
            />
            <button type="button" onClick={handleSelectFolder}>
              Choose Folder
            </button>
          </div>
        </div>
        <button
          type="button"
          className="modal-submit"
          onClick={handleSubmit}
          disabled={!selectedEmulator || !selectedFolder || isScanning}
        >
          {isScanning ? "Scanning..." : "Scan and Add Games"}
        </button>
        {toast && (
          <div className={`modal-toast ${toast.type}`} role="status" aria-live="polite">
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
