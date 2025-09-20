import { useEffect, useState, createContext, useContext } from "react";
import { readData } from "../components/utils/storageManager";

const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

async function getToken() {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: import.meta.env.VITE_TWITCH_CLIENT_ID,
      client_secret: import.meta.env.VITE_TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials"
    }),
  });

  const data = await res.json();
  // console.log(data.access_token);

  return data.access_token;
}

export function AppProvider({ children }) {
  // 🔁 Async load state
  const [games, setGames] = useState([]);
  const [emulators, setEmulators] = useState([]);
  const [loading, setLoading] = useState(true);

  // 📦 Modal state
  const [isAddGamesModalOpen, setIsAddGamesModalOpen] = useState(false);
  const [isAddEmulatorModalOpen, setIsAddEmulatorModalOpen] = useState(false);

  // 🎨 Theme
  const [theme, setTheme] = useState("light");
  const toggleTheme = () => setTheme(t => (t === "light" ? "dark" : "light"));

  const addGame = (game) => setGames(prev => [...prev, game]);

  // Twitch token
  const [igdbToken, setIgdbToken] = useState("");

  const [gameFolders, setGameFolders] = useState([])

  // 🔄 Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await readData();
        const token = await getToken();
        setGames(data.games || []);
        setEmulators(data.emulators || []);
        setGameFolders(data.gameFolders || []);
        setIgdbToken(token || "")
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <AppContext.Provider
      value={{
        // loading state
        loading,

        // games modal
        isAddGamesModalOpen,
        openAddGamesModal: () => setIsAddGamesModalOpen(true),
        closeAddGamesModal: () => setIsAddGamesModalOpen(false),

        // emulator modal
        isAddEmulatorModalOpen,
        openAddEmulatorModal: () => setIsAddEmulatorModalOpen(true),
        closeAddEmulatorModal: () => setIsAddEmulatorModalOpen(false),

        // games
        games, setGames,
        addGame,

        // emulators
        emulators, setEmulators,

        // game folders
        gameFolders, setGameFolders,

        // theme
        theme,
        toggleTheme,

        // twitch token
        igdbToken, setIgdbToken
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
