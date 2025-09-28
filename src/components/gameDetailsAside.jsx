import './gameDetailsAside.css';
import { useEffect, useState } from 'react';
import { sanitizeGameTitle, getGameCode } from './utils/mediaFinder';
import {
  uploadSaveState,
  listSavestates,
  downloadSaveStateToEmulator,
  scanLocalSavestates
} from './utils/firebaseHelpers';
import { getEmulatorPathByPlatform, findSaveStateFile } from './utils/storageManager';
import { launchGame } from './utils/launchers';

export default function GameDetailsAside({ game, onClose }) {
  const [savestates, setSavestates] = useState([]);
  const [localSavestates, setLocalSavestates] = useState([]);

  useEffect(() => {
    if (!game) return;

    const fetchSavestates = async () => {
      const gameCode = getGameCode(game.title);

      // 🌩️ Fetch from Firebase
      const cloudFiles = await listSavestates("user123", gameCode);
      setSavestates(cloudFiles);

      // 💾 Fetch local savestates
      const localFiles = await scanLocalSavestates("H:\\PCSX2\\pcsx2-qt.exe", gameCode);
      setLocalSavestates(localFiles);

      console.log("✅ Cloud:", cloudFiles);
      console.log("✅ Local:", localFiles);
      console.log(game)
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

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  if (!game) return null;

  return (
    <aside className="game-details-aside">
      <button className="close-button" onClick={onClose}>✕</button>
      <div className="inner">
        <div className="cover-section">
          <img
            src={game.coverUrl || '/ps2-game-cover-default.png'}
            alt={game.title}
            className="cover-image"
          />
        </div>

        {/* Title */}
        <h2>{sanitizeGameTitle(game.title)}</h2>

        <button className="upload-btn" onClick={handleUpload}>
          Upload Save State
        </button>

        {/* 🌩️ Cloud Savestates */}
        <div className="savestates">
          <h4>Cloud Savestates</h4>
          {savestates.length > 0 ? (
            <ul>
              {savestates.map((s, i) => (
                <li key={i}>
                  <span>{s.name}</span>
                  <button onClick={() => handleDownload(s.url, s.name)}>
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
        <div className="savestates">
          <h4>Local Savestates</h4>
          {localSavestates.length > 0 ? (
            <ul>
              {localSavestates.map((s, i) => (
                <li key={i}>
                  <span>{s.name}</span>
                  <button onClick={() => handleLaunch(s.path)}>▶ Launch</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-saves">No local saves found</p>
          )}
        </div>

        {/* Summary */}
        {game.summary && (
          <p className="summary">{game.summary}</p>
        )}

        {/* Release Date */}
        {game.releaseDate && (
          <p><strong>Release:</strong> {formatDate(game.releaseDate)}</p>
        )}

        {/* Genres */}
        {game.genres?.length > 0 && (
          <p><strong>Genres:</strong> {game.genres.join(', ')}</p>
        )}

        {/* Screenshots */}
        {game.screenshots?.length > 0 && (
          <div className="screenshots">
            <h4>Screenshots</h4>
            <div className="screenshot-list">
              {game.screenshots.map((url, i) => (
                <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="screenshot" />
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {game.videos?.length > 0 && (
          <div className="videos">
            <h4>Videos</h4>
            {game.videos.map((vid, i) => {
              // Extract video ID if it's a full URL
              let videoId = vid;
              const match = vid.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
              if (match) videoId = match[1];

              return (
                <iframe
                  key={i}
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`}
                  title={`Video ${i + 1}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
