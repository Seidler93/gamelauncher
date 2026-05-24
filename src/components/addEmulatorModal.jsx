import "./modal.css";
import { useAppContext } from "../context/AppContext";
import { open } from "@tauri-apps/api/dialog";
import { useState } from "react";
import { addEmulator } from "./utils/storageManager";

export default function AddEmulatorModal() {
  const { isAddEmulatorModalOpen, closeAddEmulatorModal, setEmulators } = useAppContext();
  const [emulatorName, setEmulatorName] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [saveFolderPath, setSaveFolderPath] = useState("");
  const [memoryCardFolderPath, setMemoryCardFolderPath] = useState("");
  const [biosConfigFolderPath, setBiosConfigFolderPath] = useState("");
  const [launchArgs, setLaunchArgs] = useState("");
  const [saveLockerEnabled, setSaveLockerEnabled] = useState(true);
  const [saveLockerSyncMode, setSaveLockerSyncMode] = useState("manual");

  const emulatorNames = ["PCSX2", "RPCS3", "Steam", "Dolphin", "Custom"];

  const getPlatform = (emuName) => {
    switch (emuName) {
      case "RPCS3":
        return 'PS3';
      case "PCSX2":
        return 'PS2';
      case "Steam":
        return 'Steam';
      case "Dolphin":
        return 'GameCube';
      case "Custom":
        return 'Custom';
      default:
        return emuName || 'Custom';
    }
  }

  if (!isAddEmulatorModalOpen) return null;

  const handleSelectFile = async () => {
    const path = await open({
      filters: [{ name: "Executables", extensions: ["exe"] }],
    });

    if (path) {
      setSelectedPath(path);
    }
  };

  const handleSelectFolder = async (setPath) => {
    const path = await open({
      directory: true,
      multiple: false,
    });

    if (path) {
      setPath(path);
    }
  };

  const handleSubmit = async () => {
    if (!emulatorName || !selectedPath) return;

    const newEmulator = {
      path: selectedPath,
      name: emulatorName,
      platform: getPlatform(emulatorName),
      saveFolderPath,
      memoryCardFolderPath,
      biosConfigFolderPath,
      launchArgs,
      saveLocker: {
        enabled: saveLockerEnabled,
        syncMode: saveLockerSyncMode,
      },
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
    };

    console.log("Selected EXE:", newEmulator);

    setEmulators((prev) => [...prev, newEmulator]);
    await addEmulator(newEmulator);

    setEmulatorName("");
    setSelectedPath("");
    setSaveFolderPath("");
    setMemoryCardFolderPath("");
    setBiosConfigFolderPath("");
    setLaunchArgs("");
    setSaveLockerEnabled(true);
    setSaveLockerSyncMode("manual");
    closeAddEmulatorModal();
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setEmulatorName(value);
  };

  return (
    <div className="modal-overlay" onClick={closeAddEmulatorModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeAddEmulatorModal}>
          ✖
        </button>
        <h3 className="modal-title">Add Launcher</h3>
        <div className="emulator-select">
          <label htmlFor="emulator-dropdown">Select Emulator:</label>
          <select
            id="emulator-dropdown"
            value={emulatorName}
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
          <label htmlFor="launcher-path">Launcher executable:</label>
          <div className="file-select-row">
            <input
              id="launcher-path"
              type="text"
              value={selectedPath}
              placeholder="No EXE selected"
              readOnly
            />
            <button type="button" onClick={handleSelectFile}>
              Choose EXE
            </button>
          </div>
        </div>
        <div className="file-select">
          <label htmlFor="save-folder-path">Save folder path:</label>
          <div className="file-select-row">
            <input
              id="save-folder-path"
              type="text"
              value={saveFolderPath}
              placeholder="Optional"
              readOnly
            />
            <button type="button" onClick={() => handleSelectFolder(setSaveFolderPath)}>
              Choose Folder
            </button>
          </div>
        </div>
        <div className="file-select">
          <label htmlFor="memory-card-folder-path">Memory card folder path:</label>
          <div className="file-select-row">
            <input
              id="memory-card-folder-path"
              type="text"
              value={memoryCardFolderPath}
              placeholder="Optional"
              readOnly
            />
            <button type="button" onClick={() => handleSelectFolder(setMemoryCardFolderPath)}>
              Choose Folder
            </button>
          </div>
        </div>
        <div className="file-select">
          <label htmlFor="bios-config-folder-path">BIOS/config folder path:</label>
          <div className="file-select-row">
            <input
              id="bios-config-folder-path"
              type="text"
              value={biosConfigFolderPath}
              placeholder="Optional"
              readOnly
            />
            <button type="button" onClick={() => handleSelectFolder(setBiosConfigFolderPath)}>
              Choose Folder
            </button>
          </div>
        </div>
        <div className="file-select">
          <label htmlFor="launch-args">Launch arguments:</label>
          <input
            id="launch-args"
            type="text"
            value={launchArgs}
            placeholder='Optional, e.g. --fullscreen "{game}"'
            onChange={(event) => setLaunchArgs(event.target.value)}
          />
        </div>
        <fieldset className="profile-options">
          <legend>SaveLocker sync rules</legend>
          <label className="profile-checkbox">
            <input
              type="checkbox"
              checked={saveLockerEnabled}
              onChange={(event) => setSaveLockerEnabled(event.target.checked)}
            />
            <span>Enable SaveLocker for this emulator</span>
          </label>
          <label className="profile-field">
            <span>Sync mode</span>
            <select
              value={saveLockerSyncMode}
              onChange={(event) => setSaveLockerSyncMode(event.target.value)}
              disabled={!saveLockerEnabled}
            >
              <option value="manual">Manual</option>
              <option value="backup-before-launch">Backup before launch</option>
              <option value="backup-after-close">Backup after close</option>
              <option value="backup-before-and-after">Backup before and after</option>
            </select>
          </label>
        </fieldset>
        <button
          type="button"
          className="modal-submit"
          onClick={handleSubmit}
          disabled={!emulatorName || !selectedPath}
        >
          Add Launcher
        </button>
      </div>
    </div>
  );
}
