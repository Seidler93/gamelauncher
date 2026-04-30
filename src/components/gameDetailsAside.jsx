import './gameDetailsAside.css';
import { useEffect, useState } from 'react';
import { sanitizeGameTitle, getGameCode } from './utils/mediaFinder';
import {
  uploadSaveState,
  listSavestates,
  downloadSaveStateToEmulator,
  scanLocalSavestates
} from './utils/firebaseHelpers';
import { getEmulatorPathByPlatform } from './utils/storageManager';
import { launchGame } from './utils/launchers';

export default function GameDetailsAside({ game, onClose }) {
  const [savestates, setSavestates] = useState([]);
  const [localSavestates, setLocalSavestates] = useState([]);
  const [isLoadingCloudSaves, setIsLoadingCloudSaves] = useState(false);

  useEffect(() => {
    if (!game) return;

    const fetchSavestates = async () => {
      const gameCode = getGameCode(game.title);

      // 🌩️ Fetch from Firebase
      setIsLoadingCloudSaves(true);

      let cloudFiles = [];
      try {
        cloudFiles = await listSavestates("user123", gameCode);
        setSavestates(cloudFiles);
      } finally {
        setIsLoadingCloudSaves(false);
      }

      // 💾 Fetch local savestates
      const localFiles = await scanLocalSavestates("H:\\PCSX2\\pcsx2-qt.exe", gameCode);
      setLocalSavestates(localFiles);

      console.log("✅ Cloud:", cloudFiles);
      console.log("✅ Local:", localFiles);
    };

    fetchSavestates();
  }, [game]);

  const handleUpload = async (saveStatePath) => {
    if (!game) return;
    const gameCode = getGameCode(game.title);

    try {
      await uploadSaveState("user123", gameCode, saveStatePath);
      alert("Save state uploaded!");
      const files = await listSavestates("user123", gameCode);
      setSavestates(files);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed.");
    }
  };

  const handleDownload = async (url, filename) => {
    if (!game) return;
    const gameCode = getGameCode(game.title);
    const emulatorPath = await getEmulatorPathByPlatform(game.platform);

    try {
      await downloadSaveStateToEmulator(url, filename, emulatorPath);
      alert("✅ Save state downloaded!");
    } catch (err) {
      console.error("❌ Download failed:", err);
      alert("Download failed.");
    }
  };

  const handleLaunch = async (savePath) => {
    try {
      const emulatorPath = await getEmulatorPathByPlatform(game.platform);
      await launchGame(emulatorPath, game, savePath);
      console.log("Game launched with savestate!");
    } catch (err) {
      console.error("Launch failed:", err);
    }
  };

  const handlePlayGame = async () => {
    try {
      const emulatorPath = await getEmulatorPathByPlatform(game.platform);
      await launchGame(emulatorPath, game);
      console.log("Game launched!");
    } catch (err) {
      console.error("Launch failed:", err);
    }
  };

  if (!game) return null;

  const coverSrc = game.coverUrl || game.coverOptions?.[0]?.imageUrl || '/ps2-game-cover-default.png';

  return (
    <aside className="game-details-aside">
      <button className="close-button" onClick={onClose}>✕</button>
      <div className="inner">
        <div className="cover-section">
          <img
            src="/ps2-game-cover-default-cropped.png"
            alt=""
            aria-hidden="true"
            className="ps2-detail-header"
          />
          <img
            src={coverSrc}
            alt={game.title}
            className="cover-image"
          />
        </div>

        <h2>{sanitizeGameTitle(game.title)}</h2>

        <div className="details-actions">
          <button className="play-game-btn" onClick={handlePlayGame}>
            Play Game
          </button>

        </div>

        {/* 🌩️ Cloud Savestates */}
        <div className="savestates cloud-savestates">
          <h4>Cloud Savestates</h4>
          {isLoadingCloudSaves ? (
            <div className="savestate-loading" role="status" aria-live="polite">
              <span className="loading-logo" aria-hidden="true">2</span>
              <span>Searching cloud saves...</span>
            </div>
          ) : savestates.length > 0 ? (
            <ul>
              {savestates.map((s, i) => (
                <li key={i}>
                  <span>{s.name}</span>
                  <button className="savestate-action" onClick={() => handleDownload(s.url, s.name)}>
                    ⬇ Download
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-saves">No cloud saves found</p>
          )}
        </div>

        {/* 💾 Local Savestates */}
        <div className="savestates local-savestates">
          <h4>Local Savestates</h4>
          {localSavestates.length > 0 ? (
            <ul>
              {localSavestates.map((s, i) => (
                <li key={i}>
                  <span>{s.name}</span>
                  <div className="savestate-actions">
                    <button className="savestate-action" onClick={() => handleUpload(s.path)}>Upload</button>
                    <button className="savestate-action primary" onClick={() => handleLaunch(s.path)}>▶ Launch</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-saves">No local saves found</p>
          )}
        </div>
      </div>
    </aside>
  );
}
