import React from "react";
import "./modal.css";
import { useAppContext } from "../context/AppContext";
import { open } from "@tauri-apps/api/dialog";
import { useState } from "react";
import { scanForGames } from "./utils/scanners";
import { platform } from "@tauri-apps/api/os";

export default function AddEmulatorModal() {
  const { isAddEmulatorModalOpen, openAddGamesModal, closeAddEmulatorModal, games, setGames, emulators, setEmulators } = useAppContext();
  const [selectedEmulator, setSelectedEmulator] = useState("");
  const [emulatorName, setEmulatorname] = useState("");

  const emulatorNames = ["PCSX2", "RPCS3", "Dolphin", "Custom"];

  const getPlatform = (emuName) => {
    switch (emuName) {
      case "RPCS3":
        return 'PS3'
      case "PCSX2":
        return 'PS2'
      case "Steam":
        return 'Steam'
      default:
      console.warn(`Unknown emulator type: ${emuName}`);
        return [];
    }
  }

  if (!isAddEmulatorModalOpen) return null;

  const handleClick = async () => {
    const selectedPath = await open({
      filters: [{ name: "Executables", extensions: ["exe"] }],
    });

    if (selectedPath) {
      const newEmulator = {
        path: selectedPath,
        name: emulatorName,
        platform: getPlatform(emulatorName),
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
      };

      console.log("Selected EXE:", newEmulator);

      // 1. Save new emulator
      setEmulators((prev) => [...prev, newEmulator]);

      // 2. Update games that match the platform
      setGames((prevGames) =>
        prevGames.map((game) =>
          game.platform === "ps2"
            ? { ...game, emulatorPath: selectedPath }
            : game
        )
      );
    }
  };


  const handleChange = (e) => {
    const value = e.target.value;
    setSelectedEmulator(value);
  };

  return (
    <div className="modal-overlay" onClick={closeAddEmulatorModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeAddEmulatorModal}>
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
        <button onClick={handleClick}>Select Emulator EXE</button>;
      </div>
    </div>
  );
}
