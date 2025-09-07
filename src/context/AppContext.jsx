import { createContext, useContext, useState } from "react";

const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

export function AppProvider({ children }) {
  // 📦 Modal State
  const [isAddGamesModalOpen, setIsAddGamesModalOpen] = useState(false);
  const openAddGamesModal = () => setIsAddGamesModalOpen(true);
  const closeAddGamesModal = () => setIsAddGamesModalOpen(false);

  // 🕹 Game Library
  const [games, setGames] = useState([]);
  const addGame = (game) => setGames(prev => [...prev, game]);

  // 🎨 Theme
  const [theme, setTheme] = useState("light");
  const toggleTheme = () => setTheme(t => (t === "light" ? "dark" : "light"));

  return (
    <AppContext.Provider
      value={{
        // modal
        isAddGamesModalOpen,
        openAddGamesModal,
        closeAddGamesModal,

        // games
        games,
        setGames,
        addGame,

        // theme
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
