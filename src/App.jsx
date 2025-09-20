import { useState, useEffect } from "react";
import LibraryNav from "./components/nav/libraryNav";
import GameCard from "./components/gameCard";
import AddGamesModal from "./components/addGamesModal";
import AddEmulatorModal from "./components/addEmulatorModal";
import { useAppContext } from "./context/AppContext";
import GameDetailsAside from "./components/gameDetailsAside";

export default function App() {
  const [platformOptions, setPlatformOptions] = useState(["All", "PS2", "PS3", "Steam", "Launchers"]);
  const [currentlyDisplayed, setCurrentlyDisplayed] = useState('all');
  const { games, setGames, emulators } = useAppContext();
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
    console.log('test');
     
    setSelectedGame(game);
  };

  return (
    <div>
      <LibraryNav currentlyDisplayed={currentlyDisplayed} platformOptions={platformOptions} setCurrentlyDisplayed={setCurrentlyDisplayed}/>
      <div className="library-container">
        {Array.isArray(games) && games.length > 0 ? (
          games.map((game) => (
            <GameCard key={game.id} game={game} handleGameClick={handleGameClick} />
          ))
        ) : (
          <p>No games found. <button >Scan for Games</button></p>
        )}
      </div>
      <GameDetailsAside game={selectedGame} onClose={() => setSelectedGame(null)} />
      <AddGamesModal/>
      <AddEmulatorModal/>
    </div>
  );
}
