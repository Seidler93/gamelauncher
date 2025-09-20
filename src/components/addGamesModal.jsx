import React from "react";
import "./modal.css";
import { useAppContext } from "../context/AppContext";
import { open } from "@tauri-apps/api/dialog";
import { useState } from "react";
import { scanForGames } from "./utils/scanners";
import { addGame, addGameFolderPath } from "./utils/storageManager";
import { fetchGameCovers } from "./utils/mediaFinder";

export default function AddGamesModal() {
  const { isAddGamesModalOpen, openAddGamesModal, closeAddGamesModal, games, setGames, gameFolders, setGameFolders, igdbToken} = useAppContext();
  const [selectedEmulator, setSelectedEmulator] = useState("");
  
  if (!isAddGamesModalOpen) return null;

  const handleClick = async () => {
    const folder = await open({
      directory: true,
      multiple: false,
    });

    if (folder) {
      const results = await scanForGames(selectedEmulator, folder) || [];

      // flatten into one array
      const scannedGames = results.flat();

      // get existing IDs from state
      const existingIds = new Set(games.map(g => g.romPath));

      // only keep ones that aren't already in games
      const uniqueNewGames = scannedGames.filter(g => !existingIds.has(g.romPath));

      // Enrich new games with IGDB fields
      const gamesWithCovers = await fetchGameCovers(uniqueNewGames, igdbToken);
      
      // Update state
      setGames(prev => [...prev, ...gamesWithCovers]);

      // Only add the folder if it's not already in the list
      if (!gameFolders.includes(folder)) {
        setGameFolders(prev => [...prev, folder]);
        await addGameFolderPath(folder); // persist
      }
      
      console.log("All scanned games:", uniqueNewGames);
      console.log("Selected folder:", folder);
      
      // Loop through and add each game to persistent storage
      for (const game of gamesWithCovers) {
        await addGame(game);
      }
      
      closeAddGamesModal();
    }
  };


  const emulatorNames = ["PCSX2", "RPCS3", "Dolphin", "Custom"];

  const handleChange = (e) => {
    const value = e.target.value;
    setSelectedEmulator(value);
  };

  return (
    <div className="modal-overlay" onClick={closeAddGamesModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeAddGamesModal}>
          ✖
        </button>
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
        {selectedEmulator && <button onClick={handleClick} className="scan-btn">
          Scan Folder for Games
        </button>}
      </div>
    </div>
  );
}
