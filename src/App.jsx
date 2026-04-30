import { useState, useEffect } from "react";
import LibraryNav from "./components/nav/libraryNav";
import GameCard from "./components/gameCard";
import AddGamesModal from "./components/addGamesModal";
import AddEmulatorModal from "./components/addEmulatorModal";
import { useAppContext } from "./context/AppContext";
import GameDetailsAside from "./components/gameDetailsAside";
import { sanitizeGameTitle } from "./components/utils/mediaFinder";

export default function App() {
  const platformOptions = ["All", "PS2", "PS3", "Steam", "Launchers"];
  const [currentlyDisplayed, setCurrentlyDisplayed] = useState('All');
  const { games, setGames, emulators, gameFolders } = useAppContext();
  const [selectedGame, setSelectedGame] = useState(null);

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

  const handleGameClick = (game) => {   
    setSelectedGame(game);
  };

  const handleLibraryClick = (event) => {
    if (selectedGame && event.target === event.currentTarget) {
      setSelectedGame(null);
    }
  };

  const normalizedTab = currentlyDisplayed.toLowerCase();
  const displayedGames = Array.isArray(games)
    ? games.filter((game) => {
        if (normalizedTab === "all") return true;

        const platform = game.platform?.toLowerCase();
        if (normalizedTab === "launchers") {
          return ["launcher", "launchers", "custom", "epic", "gog", "battle.net", "ubisoft", "ea"].includes(platform);
        }

        return platform === normalizedTab;
      })
    : [];

  return (
    <div className={`app-shell ${selectedGame ? "details-open" : ""}`}>
      <LibraryNav currentlyDisplayed={currentlyDisplayed} platformOptions={platformOptions} setCurrentlyDisplayed={setCurrentlyDisplayed}/>
      <div className="library-container" onClick={handleLibraryClick}>
        {displayedGames.length > 0 ? (
          displayedGames.map((game) => (
            <GameCard key={game.id} game={game} handleGameClick={handleGameClick} />
          ))
        ) : Array.isArray(games) && games.length > 0 ? (
          <p>No {currentlyDisplayed} games found.</p>
        ) : (
          <p>No games found. <button >Scan for Games</button></p>
        )}
      </div>
      <GameDetailsAside game={selectedGame} onClose={() => setSelectedGame(null)} />
      <AddGamesModal/>
      <AddEmulatorModal/>
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
