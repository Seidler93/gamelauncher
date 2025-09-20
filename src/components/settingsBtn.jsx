import React, { useState, useRef, useEffect } from "react";
import './settingsBtn.css';
import { useAppContext } from "../context/AppContext";
import { fetchAllGameCovers } from "./utils/mediaFinder";
import { scanForAllGames } from "./utils/scanners";
import { open } from "@tauri-apps/api/dialog";

export default function SettingsBtn() {
  const {
    openAddGamesModal,
    openAddEmulatorModal,
    games,
    setGames,
    igdbToken,
    gameFolders
  } = useAppContext();

  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFetchAll = () => {
    fetchAllGameCovers({ games, igdbToken, setGames });
  };

  const handleScanForGames = async () => {
    let newGames = [];
    
    for (const folder of gameFolders) {
      const games = await scanForAllGames(folder) || [];
      newGames = [...newGames, ...games]
    }

    setGames([...newGames]);

    for (const game of newGames) {
      await addGame(game);
    }
  }


  return (
    <div className="dropdown" ref={ref}>
      <button className="dropdown-toggle" onClick={() => setOpen(!open)}>
        <span role="img" aria-label="settings">⚙️</span>
      </button>
      {open && (
        <ul className="dropdown-menu">
          <li onClick={openAddGamesModal}>Add Game Folder</li> 
          <li>Scan For Games</li>
          <li onClick={openAddEmulatorModal}>Add Emulator</li>
          <li onClick={handleFetchAll}>Get All Game Covers</li>
        </ul>
      )}
    </div>
  );
}
