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
import { getCoverHeaderLabel, getCoverHeaderSrc } from './utils/coverHeaders';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { useAppContext } from '../context/AppContext';

export default function GameDetailsAside({ game, isOpen, onClose }) {
  const { showToast, isGameBusy, isGameLaunching, isGameRunning, launchTrackedGame } = useAppContext();
  const [renderedGame, setRenderedGame] = useState(game);
  const [savestates, setSavestates] = useState([]);
  const [localSavestates, setLocalSavestates] = useState([]);
  const [isLoadingCloudSaves, setIsLoadingCloudSaves] = useState(false);
  const activeGame = game || renderedGame;
  const isSteamGame = activeGame?.platform?.toLowerCase() === "steam";
  const isBusy = isGameBusy(activeGame);
  const launchLabel = isGameLaunching(activeGame) ? "Launching" : isGameRunning(activeGame) ? "Running" : "Play Game";
  const savestateLaunchLabel = isGameLaunching(activeGame) ? "Launching" : isGameRunning(activeGame) ? "Running" : "▶ Launch";

  useEffect(() => {
    if (game) setRenderedGame(game);
  }, [game]);

  useEffect(() => {
    if (!game) return;

    const fetchSavestates = async () => {
      if (game.platform?.toLowerCase() === "steam") {
        setSavestates([]);
        setLocalSavestates([]);
        setIsLoadingCloudSaves(false);
        return;
      }

      const gameCode = getGameCode(game.title);
      const gameTitle = game.title || game.name || "";

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
      setLocalSavestates(localFiles.filter((saveState) => saveBelongsToGame(saveState, gameCode, gameTitle)));

      console.log("✅ Cloud:", cloudFiles);
      console.log("✅ Local:", localFiles);
      console.log(game)
    };

    fetchSavestates();
  }, [game]);

  const handleUpload = async (saveStatePath) => {
    if (!activeGame) return;
    const gameCode = getGameCode(activeGame.title);

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
    if (!activeGame) return;
    const emulatorPath = await getEmulatorPathByPlatform(activeGame.platform);

    try {
      await downloadSaveStateToEmulator(url, filename, emulatorPath);
      alert("✅ Save state downloaded!");
    } catch (err) {
      console.error("❌ Download failed:", err);
      alert("Download failed.");
    }
  };

  const handleLaunch = async (savePath) => {
    if (isBusy) return;

    try {
      await launchTrackedGame(activeGame, null, savePath);
      console.log("Game launched with savestate!");
    } catch (err) {
      console.error("Launch failed:", err);
      showToast("Could not launch that game.", "error");
    }
  };

  const handlePlayGame = async () => {
    if (isBusy) return;

    try {
      await launchTrackedGame(activeGame);
      console.log("Game launched!");
    } catch (err) {
      console.error("Launch failed:", err);
      showToast("Could not launch that game.", "error");
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  if (!activeGame) {
    return <aside className="game-details-aside" aria-hidden="true" />;
  }

  const coverSrc = activeGame.customCoverPath
    ? convertFileSrc(activeGame.customCoverPath)
    : activeGame.coverUrl || activeGame.coverOptions?.[0]?.imageUrl;
  const coverHeaderSrc = getCoverHeaderSrc(activeGame.platform);
  const coverHeaderLabel = getCoverHeaderLabel(activeGame.platform);
  const gameTitle = activeGame.title || activeGame.name;
  const playStats = activeGame.stats || {};

  return (
    <aside
      className={`game-details-aside ${isOpen ? "open" : ""}`}
      aria-hidden={!isOpen}
      onTransitionEnd={(event) => {
        if (event.propertyName === "transform" && !isOpen) {
          setRenderedGame(null);
        }
      }}
    >
      <button className="close-button" onClick={onClose}>✕</button>
      <div className="inner">
        <div className="cover-section">
          {coverHeaderSrc ? (
            <img
              src={coverHeaderSrc}
              alt=""
              aria-hidden="true"
              className="detail-cover-header"
            />
          ) : (
            <div className="detail-cover-header detail-cover-header-fallback">{coverHeaderLabel}</div>
          )}
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={gameTitle}
              className="cover-image"
            />
          ) : (
            <div className="cover-image detail-cover-placeholder">
              <span>{gameTitle}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h2>{sanitizeGameTitle(gameTitle)}</h2>

        <div className="details-actions">
          <button className="play-game-btn" onClick={handlePlayGame} disabled={isBusy}>
            {launchLabel}
          </button>

        </div>

        {/* 🌩️ Cloud Savestates */}
        {!isSteamGame && (
          <>
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
                    <button className="savestate-action primary" onClick={() => handleLaunch(s.path)} disabled={isBusy}>
                      {savestateLaunchLabel}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-saves">No local saves found for this game</p>
          )}
        </div>
          </>
        )}

        {/* Summary */}
        {activeGame.summary && (
          <p className="summary">{activeGame.summary}</p>
        )}

        {/* Release Date */}
        {activeGame.releaseDate && (
          <p><strong>Release:</strong> {formatDate(activeGame.releaseDate)}</p>
        )}

        <div className="play-stats">
          <h4>Play Stats</h4>
          <p><strong>Playtime:</strong> {formatPlaytime(playStats.totalSeconds || playStats.totalMin * 60 || 0)}</p>
          <p><strong>Launches:</strong> {playStats.launches || 0}</p>
          {playStats.lastPlayed && (
            <p><strong>Last Played:</strong> {formatDateTime(playStats.lastPlayed)}</p>
          )}
          {playStats.lastSessionSeconds > 0 && (
            <p><strong>Last Session:</strong> {formatPlaytime(playStats.lastSessionSeconds)}</p>
          )}
        </div>

        {/* Genres */}
        {activeGame.genres?.length > 0 && (
          <p><strong>Genres:</strong> {activeGame.genres.join(', ')}</p>
        )}

        {/* Screenshots */}
        {activeGame.screenshots?.length > 0 && (
          <div className="screenshots">
            <h4>Screenshots</h4>
            <div className="screenshot-list">
              {activeGame.screenshots.map((url, i) => (
                <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="screenshot" />
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {activeGame.videos?.length > 0 && (
          <div className="videos">
            <h4>Videos</h4>
            {activeGame.videos.map((vid, i) => {
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

function saveBelongsToGame(saveState, gameCode, gameTitle) {
  const saveText = normalizeSaveText(`${saveState?.name || ""} ${saveState?.path || ""}`);
  const code = normalizeSaveText(gameCode);
  const title = normalizeSaveText(gameTitle);

  if (code.length >= 3 && saveText.includes(code)) return true;
  if (title.length >= 3 && saveText.includes(title)) return true;

  const titleWords = title
    .split(" ")
    .filter((word) => word.length >= 3);

  return titleWords.length >= 2 && titleWords.every((word) => saveText.includes(word));
}

function normalizeSaveText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatPlaytime(totalSeconds = 0) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "0m";
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
