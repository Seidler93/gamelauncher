import './gameDetailsAside.css';
import { useEffect, useState } from 'react';
import { sanitizeGameTitle, getGameCode } from './utils/mediaFinder';
import { uploadSaveState, listSavestates } from './utils/firebaseHelpers';
import { getEmulatorPathByPlatform, findSaveStateFile } from './utils/storageManager';

export default function GameDetailsAside({ game, onClose }) {
  const [savestates, setSavestates] = useState([]);

  // ✅ Hooks always run
  useEffect(() => {
    if (!game) return; // bail inside hook, not before
    const fetchSavestates = async () => {
      const gameCode = getGameCode(game.title);
      const files = await listSavestates("user123", gameCode);
      setSavestates(files);
    };
    fetchSavestates();
  }, [game]);

  const handleUpload = async () => {
    if (!game) return;
    const gameCode = getGameCode(game.title);
    const emulatorPath = await getEmulatorPathByPlatform(game.platform);
    const saveStatePath = await findSaveStateFile(emulatorPath, gameCode);

    try {
      await uploadSaveState("user123", gameCode, saveStatePath);
      alert("Save state uploaded!");
      const files = await listSavestates("user123", gameCode);
      setSavestates(files);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed.");
    }
  };

  // ✅ Safe early return here
  if (!game) return null;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  return (
    <aside className="game-details-aside">
      <button className="close-button" onClick={onClose}>✕</button>
      <div className="inner">
        {/* Cover */}
        <div className="cover-section">
          <img
            src={game.coverUrl || '/ps2-game-cover-default.png'}
            alt={game.title}
            className="cover-image"
          />
        </div>

        <h2>{sanitizeGameTitle(game.title)}</h2>

        <button className="upload-btn" onClick={handleUpload}>
          Upload Save State
        </button>

        {/* Savestates */}
        {savestates.length > 0 ? (
          <div className="savestates">
            <h4>Available Savestates</h4>
            <ul>
              {savestates.map((s, i) => (
                <li key={i}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No savestates available.</p>
        )}

        {/* Other sections (summary, genres, screenshots, etc.) */}
      </div>
    </aside>
  );
}
