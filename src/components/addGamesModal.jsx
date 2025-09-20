import React from "react";
import "./modal.css";
import { useAppContext } from "../context/AppContext";
import { open } from "@tauri-apps/api/dialog";
import { useState } from "react";
import { scanForGames } from "./utils/scanners";
import { addGame, addGameFolderPath } from "./utils/storageManager";

export default function AddGamesModal() {
  const { isAddGamesModalOpen, openAddGamesModal, closeAddGamesModal, games, setGames, gameFolders, setGameFolders} = useAppContext();
  const [selectedEmulator, setSelectedEmulator] = useState("");
  
  if (!isAddGamesModalOpen) return null;

  const handleClick = async () => {    
    const folder = await open({
      directory: true,
      multiple: false,
    });

    if (folder) {
      const newGames = await scanForGames(selectedEmulator, folder) || [];

      // Update state immediately
      setGames([...games, ...newGames]);
      setGameFolders([...gameFolders, folder]);
      console.log("All scanned games:", newGames);
      console.log(folder);

      // Loop through and add each game to persistent storage
      for (const game of newGames) {
        await addGame(game);
      }
    
      await addGameFolderPath(folder);

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
