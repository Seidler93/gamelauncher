import { createContext, useContext, useState } from "react";

const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

export function AppProvider({ children }) {
  // 📦 Games modal State
  const [isAddGamesModalOpen, setIsAddGamesModalOpen] = useState(false);
  const openAddGamesModal = () => setIsAddGamesModalOpen(true);
  const closeAddGamesModal = () => setIsAddGamesModalOpen(false);

  // 📦 Emulator modal State
  const [isAddEmulatorModalOpen, setIsAddEmulatorModalOpen] = useState(false);
  const openAddEmulatorModal = () => setIsAddEmulatorModalOpen(true);
  const closeAddEmulatorModal = () => setIsAddEmulatorModalOpen(false);

  // 🕹 Game Library
  const [games, setGames] = useState([]);
  const addGame = (game) => setGames(prev => [...prev, game]);

  // 🎨 Theme
  const [theme, setTheme] = useState("light");
  const toggleTheme = () => setTheme(t => (t === "light" ? "dark" : "light"));

  // Emulators
  const [emulators, setEmulators] = useState([]);

  return (
    <AppContext.Provider
      value={{
        // games modal
        isAddGamesModalOpen,
        openAddGamesModal,
        closeAddGamesModal,

        // emulator modal
        isAddEmulatorModalOpen,
        openAddEmulatorModal,
        closeAddEmulatorModal,

        // games
        games,
        setGames,
        addGame,

        // theme
        theme,
        toggleTheme,

        // emulators
        emulators,
        setEmulators
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
