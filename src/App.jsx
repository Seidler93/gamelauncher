import { useState } from "react";
import { flushSync } from "react-dom";
import LibraryNav from "./components/nav/libraryNav";
import GameCard from "./components/gameCard";
import LauncherCard from "./components/launcherCard";
import AddGamesModal from "./components/addGamesModal";
import AddEmulatorModal from "./components/addEmulatorModal";
import SettingsPage from "./components/settingsPage";
import { useAppContext } from "./context/AppContext";
import GameDetailsAside from "./components/gameDetailsAside";
import Ps2CubeBackground from "./components/Ps2CubeBackground";
import Ps3WaveBackground from "./components/Ps3WaveBackground";

export default function App() {
  const platformOptions = ["All", "PS2", "PS3", "Steam", "Launchers"];
  const [currentlyDisplayed, setCurrentlyDisplayed] = useState('All');
  const { games, emulators, toasts, notificationPosition, displaySettings, openAddGamesModal, openAddEmulatorModal } = useAppContext();
  const [selectedGame, setSelectedGame] = useState(null);
  const [currentView, setCurrentView] = useState("library");
  const [sortMode, setSortMode] = useState("platform");
  const activeSelectedGame = selectedGame
    ? games.find((game) => getGameKey(game) === getGameKey(selectedGame)) || selectedGame
    : null;

  // <h2>Stored Emulators</h2>
  // {Array.isArray(emulators) && emulators.length > 0 ? (
  //   <ul>
  //     {emulators.map((emu) => (
  //       <li key={emu.id || emu.name}>
  //         <strong>{emu.name}</strong> — <code>{emu.exe}</code>
  //       </li>
  //     ))}
  //   </ul>
  // ) : (
  //   <p>No emulators saved yet.</p>
  // )}

  const animateLibraryReflow = (update) => {
    const cards = Array.from(document.querySelectorAll(".library-container .game-card, .library-container .launcher-card, .library-genre-group"));
    const firstRects = new Map(cards.map((card) => [card, card.getBoundingClientRect()]));

    flushSync(update);

    requestAnimationFrame(() => {
      cards.forEach((card) => {
        const firstRect = firstRects.get(card);
        if (!firstRect || !card.isConnected) return;

        const lastRect = card.getBoundingClientRect();
        const deltaX = firstRect.left - lastRect.left;
        const deltaY = firstRect.top - lastRect.top;

        if (!deltaX && !deltaY) return;

        card.style.transition = "none";
        card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        card.style.willChange = "transform";
      });

      requestAnimationFrame(() => {
        cards.forEach((card) => {
          if (!card.isConnected || !card.style.transform) return;

          card.style.transition = "transform 240ms ease";
          card.style.transform = "";

          window.setTimeout(() => {
            card.style.transition = "";
            card.style.willChange = "";
          }, 260);
        });
      });
    });
  };

  const handleGameClick = (game) => {
    if (getGameKey(selectedGame) === getGameKey(game)) return;
    animateLibraryReflow(() => setSelectedGame(game));
  };

  const handleLibraryClick = (event) => {
    if (selectedGame && event.target === event.currentTarget) {
      animateLibraryReflow(() => setSelectedGame(null));
    }
  };

  const normalizedTab = currentlyDisplayed.toLowerCase();
  const isLaunchersTab = normalizedTab === "launchers";
  const filteredGames = Array.isArray(games)
    ? games.filter((game) => {
        if (game.hidden) return false;
        if (normalizedTab === "all") return true;
        if (isLaunchersTab) return false;

        const platform = game.platform?.toLowerCase();
        return platform === normalizedTab;
      })
    : [];
  const displayedGames = sortGames(filteredGames, sortMode);
  const displayedLaunchers = isLaunchersTab && Array.isArray(emulators) ? emulators : [];
  const getDefaultEmulatorForTab = () => {
    switch (currentlyDisplayed) {
      case "PS2":
        return "PCSX2";
      case "PS3":
        return "RPCS3";
      case "Steam":
        return "Steam";
      default:
        return "";
    }
  };

  const platformThemeClass = displaySettings.platformThemes
    ? `platform-theme-${normalizedTab}`
    : "platform-theme-default";

  return (
    <div className={`app-shell ${activeSelectedGame ? "details-open" : ""} ${platformThemeClass}`}>
      {displaySettings.platformThemes && normalizedTab === "ps2" && <Ps2CubeBackground />}
      {displaySettings.platformThemes && normalizedTab === "ps3" && <Ps3WaveBackground />}
      <LibraryNav
        currentlyDisplayed={currentlyDisplayed}
        platformOptions={platformOptions}
        setCurrentlyDisplayed={setCurrentlyDisplayed}
        sortMode={sortMode}
        setSortMode={setSortMode}
        isSettingsPage={currentView === "settings"}
        openLibraryPage={() => setCurrentView("library")}
        openSettingsPage={() => {
          setSelectedGame(null);
          setCurrentView("settings");
        }}
      />
      {currentView === "settings" ? (
        <SettingsPage onBack={() => setCurrentView("library")} />
      ) : (
      <div
        className="library-container"
        style={{
          "--library-row-gap": `${displaySettings.rowGap}px`,
          "--library-column-gap": `${displaySettings.columnGap}px`,
          "--game-card-width": `${displaySettings.cardSize}px`,
        }}
        onClick={handleLibraryClick}
      >
        {isLaunchersTab && displayedLaunchers.length > 0 ? (
          displayedLaunchers.map((launcher) => (
            <LauncherCard key={launcher.id || launcher.path} launcher={launcher} />
          ))
        ) : isLaunchersTab ? (
          <div className="empty-library">
            <h2>No launchers found</h2>
            <p>Add an emulator or launcher so it appears here for quick access.</p>
            <button type="button" onClick={openAddEmulatorModal}>Add Launcher</button>
          </div>
        ) : displayedGames.length > 0 && sortMode === "genre" ? (
          getGenreGroups(displayedGames).map((group) => (
            <section className="library-genre-group" key={group.genre}>
              <h2>{group.genre}</h2>
              <div className="library-genre-games">
                {group.games.map((game) => (
                  <GameCard key={game.id} game={game} handleGameClick={handleGameClick} />
                ))}
              </div>
            </section>
          ))
        ) : displayedGames.length > 0 ? (
          displayedGames.map((game) => (
            <GameCard key={game.id} game={game} handleGameClick={handleGameClick} />
          ))
        ) : Array.isArray(games) && games.length > 0 ? (
          <div className="empty-library">
            <h2>No {currentlyDisplayed} games found</h2>
            <p>Scan a folder for this platform or switch tabs to view another library.</p>
            <button type="button" onClick={() => openAddGamesModal(getDefaultEmulatorForTab())}>Scan Folder</button>
          </div>
        ) : (
          <div className="empty-library">
            <h2>No games found</h2>
            <p>Choose an emulator and game folder to start building your library.</p>
            <button type="button" onClick={openAddGamesModal}>Scan for Games</button>
          </div>
        )}
      </div>
      )}
      {currentView === "library" && (
        <GameDetailsAside
          game={activeSelectedGame}
          isOpen={!!activeSelectedGame}
          onClose={() => animateLibraryReflow(() => setSelectedGame(null))}
        />
      )}
      <AddGamesModal/>
      <AddEmulatorModal/>
      {toasts?.length > 0 && (
        <div className={`app-toast-stack ${notificationPosition}`} aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`app-toast ${toast.type}`} role="status">
              {toast.message}
            </div>
          ))}
        </div>
      )}
      {/* {games.map(game =>
        <li>{sanitizeGameTitle(game.title)}</li>
      )}
      {emulators.map(e =>
        <li>{e.name}</li>
      )}
      {gameFolders.map(path =>
        <li>{path}</li>
      )} */}
    </div>
  );
}

function getGameKey(game) {
  return game?.id || game?.romPath;
}

function getGenreGroups(games) {
  const groups = games.reduce((genreMap, game) => {
    const genres = game.genres?.length ? game.genres : ["Unknown Genre"];

    genres.forEach((genre) => {
      if (!genreMap.has(genre)) genreMap.set(genre, []);
      genreMap.get(genre).push(game);
    });

    return genreMap;
  }, new Map());

  return [...groups.entries()].map(([genre, groupedGames]) => ({
    genre,
    games: groupedGames,
  }));
}

function sortGames(games, sortMode) {
  const sortedGames = [...games];
  const getTitle = (game) => (game.title || game.name || "").toLowerCase();
  const getPlatform = (game) => (game.platform || "").toLowerCase();
  const getGenre = (game) => (game.genres?.[0] || "").toLowerCase();
  const getReleaseDate = (game) => Number(game.releaseDate || 0);
  const getPlaytime = (game) => Number(game.stats?.totalSeconds || game.stats?.totalMin * 60 || 0);
  const getLastPlayed = (game) => {
    const value = game.stats?.lastPlayed || game.stats?.lastLaunchedAt || 0;
    const date = value ? new Date(value).getTime() : 0;
    return Number.isNaN(date) ? 0 : date;
  };

  switch (sortMode) {
    case "title-desc":
      return sortedGames.sort((a, b) => getTitle(b).localeCompare(getTitle(a)));
    case "platform":
      return sortedGames.sort((a, b) => (
        getPlatform(a).localeCompare(getPlatform(b)) || getTitle(a).localeCompare(getTitle(b))
      ));
    case "genre":
      return sortedGames.sort((a, b) => (
        getGenre(a).localeCompare(getGenre(b)) || getTitle(a).localeCompare(getTitle(b))
      ));
    case "recently-added":
      return sortedGames.reverse();
    case "last-played":
      return sortedGames.sort((a, b) => getLastPlayed(b) - getLastPlayed(a) || getTitle(a).localeCompare(getTitle(b)));
    case "playtime-desc":
      return sortedGames.sort((a, b) => getPlaytime(b) - getPlaytime(a) || getTitle(a).localeCompare(getTitle(b)));
    case "release-date-desc":
      return sortedGames.sort((a, b) => getReleaseDate(b) - getReleaseDate(a) || getTitle(a).localeCompare(getTitle(b)));
    case "release-date-asc":
      return sortedGames.sort((a, b) => getReleaseDate(a) - getReleaseDate(b) || getTitle(a).localeCompare(getTitle(b)));
    case "title-asc":
    default:
      return sortedGames.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
  }
}
