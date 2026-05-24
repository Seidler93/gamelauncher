import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './gameCard.css'
import { useAppContext } from '../context/AppContext'
import { getCoverHeaderLabel, getCoverHeaderSrc } from './utils/coverHeaders'
import { fetchGameCovers } from './utils/mediaFinder'
import { readData, updateGame, writeData } from './utils/storageManager'
import { openFolderLocation } from './utils/openFolderLocation'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { convertFileSrc } from '@tauri-apps/api/tauri'

export default function GameCard({ game, handleGameClick }) {
  const {
    games,
    setGames,
    igdbToken,
    showToast,
    isGameBusy,
    isGameLaunching,
    isGameRunning,
    launchTrackedGame,
    displaySettings
  } = useAppContext();
  const [currentCover] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);
  const coverSrc = game.customCoverPath
    ? convertFileSrc(game.customCoverPath)
    : game.coverUrl || game.coverOptions?.[currentCover]?.imageUrl;
  const coverHeaderSrc = getCoverHeaderSrc(game.platform);
  const coverHeaderLabel = getCoverHeaderLabel(game.platform);
  const gameTitle = game.title || game.name;
  const isBusy = isGameBusy(game);
  const launchLabel = isGameLaunching(game) ? "Launching" : isGameRunning(game) ? "Running" : "Play Game";
  const cardClasses = [
    "game-card",
    `orientation-${displaySettings.cardOrientation}`,
    displaySettings.showGameNames ? "with-title" : "",
  ].filter(Boolean).join(" ");

  useEffect(() => {
    if (!contextMenu) return;

    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    window.addEventListener("close-game-context-menus", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
      window.removeEventListener("close-game-context-menus", closeMenu);
    };
  }, [contextMenu]);

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;

    const menuRect = contextMenuRef.current.getBoundingClientRect();
    const padding = 8;
    const nextX = Math.min(contextMenu.x, window.innerWidth - menuRect.width - padding);
    const nextY = Math.min(contextMenu.y, window.innerHeight - menuRect.height - padding);
    const clampedX = Math.max(padding, nextX);
    const clampedY = Math.max(padding, nextY);

    if (clampedX !== contextMenu.x || clampedY !== contextMenu.y) {
      setContextMenu({ x: clampedX, y: clampedY });
    }
  }, [contextMenu]);

  const handleContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent("close-game-context-menus"));
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const handlePlayGame = async () => {
    if (isBusy) return;

    setContextMenu(null);

    try {
      await launchTrackedGame(game);
    } catch (err) {
      console.error("Failed to launch game:", err);
      showToast("Could not launch that game.", "error");
    }
  };

  const handleOpenFolder = async () => {
    setContextMenu(null);

    try {
      await openFolderLocation(game.romPath);
    } catch (err) {
      console.error("Failed to open game folder:", err);
      showToast("Could not open that game folder.", "error");
    }
  };

  const handleGetGameArt = async () => {
    setContextMenu(null);
    showToast(`Getting art for ${gameTitle}...`, "info", 0);

    try {
      const [updatedGame] = await fetchGameCovers([game], igdbToken);
      const updatedGames = games.map((currentGame) => (
        getGameKey(currentGame) === getGameKey(game) ? updatedGame : currentGame
      ));

      setGames(updatedGames);
      const currentData = await readData();
      await writeData({ ...currentData, games: updatedGames });

      if (hasCoverArt(updatedGame)) {
        showToast(`Set art for ${gameTitle}.`, "success");
      } else {
        showToast(`No art found for ${gameTitle}.`, "warning");
      }
    } catch (err) {
      console.error("Failed to fetch game art:", err);
      showToast("Could not get game art. Try again.", "error");
    }
  };

  const handleAddCustomCover = async () => {
    setContextMenu(null);

    try {
      const selectedPath = await openDialog({
        multiple: false,
        filters: [{
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp"],
        }],
      });

      if (!selectedPath) return;

      const customCoverPath = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
      const updatedGame = {
        ...game,
        customCoverPath,
        coverUrl: convertFileSrc(customCoverPath),
      };

      setGames(prev => prev.map((currentGame) => (
        getGameKey(currentGame) === getGameKey(game) ? updatedGame : currentGame
      )));
      await updateGame(updatedGame);
      showToast(`Set custom cover for ${gameTitle}.`, "success");
    } catch (err) {
      console.error("Failed to set custom cover:", err);
      showToast("Could not set that custom cover.", "error");
    }
  };

  const handleToggleHidden = async () => {
    setContextMenu(null);

    try {
      const updatedGame = { ...game, hidden: !game.hidden };
      setGames(prev => prev.map((currentGame) => (
        getGameKey(currentGame) === getGameKey(game) ? updatedGame : currentGame
      )));
      await updateGame(updatedGame);
      showToast(updatedGame.hidden ? "Game hidden." : "Game restored.", "success");
    } catch (err) {
      console.error("Failed to update hidden game:", err);
      showToast("Could not update that game.", "error");
    }
  };

  return (
    <div
      key={game.id}
      className={cardClasses}
      onClick={() => handleGameClick(game)}
      onDoubleClick={handlePlayGame}
      onContextMenu={handleContextMenu}
    >
      {coverHeaderSrc ? (
        <img
          className="game-cover-header"
          src={coverHeaderSrc}
          alt=""
          aria-hidden="true"
        />
      ) : (
        <div className="game-cover-header game-cover-header-fallback">{coverHeaderLabel}</div>
      )}
      {coverSrc ? (
        <img
          className="game-cover"
          style={{ objectFit: displaySettings.coverFit }}
          src={coverSrc}
          alt={gameTitle}
        />
      ) : (
        <div className="game-cover game-cover-placeholder">
          <span>{gameTitle}</span>
        </div>
      )}
      {displaySettings.showGameNames && (
        <div className="game-card-title" title={gameTitle}>{gameTitle}</div>
      )}
      {contextMenu && createPortal(
        <ul
          ref={contextMenuRef}
          className="game-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <li className={isBusy ? "disabled" : ""} onClick={handlePlayGame}>
            {launchLabel}
          </li>
          <li onClick={handleOpenFolder}>Open Folder Location</li>
          <li onClick={handleGetGameArt}>Get Game Art</li>
          <li onClick={handleAddCustomCover}>Add Custom Cover</li>
          <li onClick={handleToggleHidden}>{game.hidden ? "Unhide Game" : "Hide Game"}</li>
        </ul>,
        document.body
      )}
    </div>
  )
}

function getGameKey(game) {
  return game.id || game.romPath;
}

function hasCoverArt(game) {
  return !!game.coverUrl || game.coverOptions?.some(option => !!option.imageUrl);
}
