import React from "react";
import "./addGamesModal.css";
import { useAppContext } from "../context/AppContext";
import { open } from "@tauri-apps/api/dialog";
import { useState } from "react";
import { scanForGames } from "./utils/scanners";

export default function AddGamesModal() {
  const { isAddGamesModalOpen, openAddGamesModal, closeAddGamesModal, games, setGames} = useAppContext();
  const [selectedEmulator, setSelectedEmulator] = useState("");
  
  if (!isAddGamesModalOpen) return null;

  const handleClick = async () => {    
    const folder = await open({
      directory: true,
      multiple: false,
    });

    if (folder) {
      const newGames = await scanForGames(selectedEmulator, folder) || [];
      
      setGames([...games, ...newGames]);
      console.log("All scanned games:", newGames);
    }
  };

  const emulators = ["PCSX2", "RPCS3", "Dolphin", "Custom"];

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
            {emulators.map((emu) => (
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
