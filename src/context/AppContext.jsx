import { useEffect, useState, createContext, useContext } from "react";
import { readData } from "../components/utils/storageManager";

const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

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

  // 🔄 Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await readData();
        setGames(data.games || []);
        setEmulators(data.emulators || []);
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
        games,
        setGames,
        addGame,

        // emulators
        emulators,
        setEmulators,

        // theme
        theme,
        toggleTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
