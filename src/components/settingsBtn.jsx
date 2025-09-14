import React, { useState, useRef, useEffect } from "react";
import './settingsBtn.css';
import { useAppContext } from "../context/AppContext";
import { readData, writeData } from "./utils/storageManager";
import { invoke } from "@tauri-apps/api";

export default function SettingsBtn() {
  const {
    openAddGamesModal,
    openAddEmulatorModal,
    games,
    setGames,
    igdbToken
  } = useAppContext();

  const [open, setOpen] = useState(false);
  const ref = useRef();

  // ❗ Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function sanitizeGameTitle(title) {
    return title.replace(/\s*\(.*?\)/g, "").trim(); // removes anything in parentheses
  }

  async function getCoverImage(gameName) {
    const cleanName = sanitizeGameTitle(gameName);

    try {
      const coverUrl = await invoke("fetch_game_cover", {
        gameName: cleanName,
        token: igdbToken,
        clientId: import.meta.env.VITE_TWITCH_CLIENT_ID
      });

      return coverUrl || null;
    } catch (err) {
      console.error(`Failed to fetch cover for "${cleanName}":`, err);
      return null;
    }
  }

  // ✅ Update all games with cover images
  async function fetchAllGameCovers() {
    const updatedGames = await Promise.all(
      games.map(async (game) => {
        if (game.coverUrl) return game; // skip if already has a cover
        const coverUrl = await getCoverImage(game.title || game.name);
        return coverUrl ? { ...game, coverUrl } : game;
      })
    );

    setGames(updatedGames);

    try {
      const currentData = await readData(); // read full data
      await writeData({
        ...currentData,
        games: updatedGames
      });
      console.log("✔️ Game covers updated.");
    } catch (err) {
      console.error("❌ Failed to write updated game data:", err);
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
          <li onClick={openAddEmulatorModal}>Add Emulator</li>
          <li onClick={fetchAllGameCovers}>Get All Game Covers</li>
        </ul>
      )}
    </div>
  );
}
