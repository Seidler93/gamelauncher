import { useState, useEffect } from "react";
import { open } from "@tauri-apps/api/dialog";
import { dirname } from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api";
import LibraryNav from "./components/nav/libraryNav";
import GameCard from "./components/gameCard";
import { sampleGames } from "./tempHelpers";
import AddGamesModal from "./components/addGamesModal";
import AddEmulatorModal from "./components/addEmulatorModal";
import { useAppContext } from "./context/AppContext";
import { readData } from "./components/utils/storageManager";

export default function App() {
  const [exe, setExe] = useState("");
  const [rom, setRom] = useState("");
  const [platformOptions, setPlatformOptions] = useState(["All", "PS2", "PS3", "Steam", "Launchers"]);
  const [currentlyDisplayed, setCurrentlyDisplayed] = useState('all');
  const [addGamesModal, setaddGamesModal] = useState(false);
  const { games, setGames, emulators } = useAppContext();
  

  // useEffect(() => {
  //   if (games.length < 1 ) {
  //     setGames(readData());
  //   }
  //   console.log(emulators);
    
  // }, [games, emulators]);

  // have temporary games that i change what is in view and what is hidden

  // button to add emulator/steam app path

  // folders for launch logic

  async function pickExe() {
    const res = await open({ multiple: false, directory: false });
    if (typeof res === "string") setExe(res.replace(/^"+|"+$/g, ""));
  }

  async function pickRom() {
    const res = await open({ multiple: false, directory: false });
    if (typeof res === "string") setRom(res.replace(/^"+|"+$/g, ""));
  }

  async function launch() {
    if (!exe) return alert("Pick an emulator .exe first");
    const cwd = await dirname(exe);
    const args = rom ? ["${ROM}".replace("${ROM}", rom)] : [];
    if (!(await exists(exe))) return alert("EXE not found");
    if (rom && !(await exists(rom))) return alert("ROM not found");

    console.log("[launch]", exe, args, cwd);
    const pid = await invoke("launch_process", { spec: { exe, args, cwd } });
    alert(`Launched (pid ${pid})`);
  }

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
  return (
    <div>
      <LibraryNav currentlyDisplayed={currentlyDisplayed} platformOptions={platformOptions} setCurrentlyDisplayed={setCurrentlyDisplayed}/>
      <div className="library-container">
        {Array.isArray(games) && games.length > 0 ? (
          games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))
        ) : (
          <p>No games found. <button >Scan for Games</button></p>
        )}
      </div>
      <AddGamesModal/>
      <AddEmulatorModal/>
    </div>
  );
}
