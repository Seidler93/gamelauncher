import { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";
import { listen } from "@tauri-apps/api/event";
import { getEmulatorByPlatform, readData, writeData } from "../components/utils/storageManager";
import { fetchGameCovers } from "../components/utils/mediaFinder";
import { launchGame } from "../components/utils/launchers";
import { scanForAllGames } from "../components/utils/scanners";

const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

const defaultDisplaySettings = {
  showGameNames: false,
  rowGap: 5,
  columnGap: 15,
  cardSize: 200,
  cardOrientation: "portrait",
  coverFit: "cover",
  platformThemes: false,
};

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
  const [addGamesDefaultEmulator, setAddGamesDefaultEmulator] = useState("");
  const [isAddEmulatorModalOpen, setIsAddEmulatorModalOpen] = useState(false);

  // 🎨 Theme
  const [theme, setTheme] = useState("light");
  const toggleTheme = () => setTheme(t => (t === "light" ? "dark" : "light"));

  const addGame = (game) => setGames(prev => [...prev, game]);

  // Twitch token
  const [igdbToken, setIgdbToken] = useState("");

  const [gameFolders, setGameFolders] = useState([])
  const [toasts, setToasts] = useState([]);
  const [notificationPosition, setNotificationPosition] = useState("top-right");
  const [displaySettings, setDisplaySettings] = useState(defaultDisplaySettings);
  const [gameLaunchStatus, setGameLaunchStatus] = useState({});
  const gameLaunchStatusRef = useRef({});
  const gamesRef = useRef([]);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextToast = { id, message, type };

    setToasts(prev => {
      const withoutPersistent = duration ? prev.filter(toast => toast.duration !== 0) : prev;
      return [...withoutPersistent, { ...nextToast, duration }];
    });

    if (duration) {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    }
  }, []);

  const showErrorToast = useCallback((fallbackMessage, err = null) => {
    const rawMessage = err?.message || (typeof err === "string" ? err : "");
    const message = rawMessage && rawMessage.length < 120 ? rawMessage : fallbackMessage;
    showToast(message, "error");
  }, [showToast]);

  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  // 🔄 Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await readData();
        const token = await getToken();
        let loadedGames = data.games || [];
        const loadedGameFolders = data.gameFolders || [];
        setEmulators(data.emulators || []);
        setGameFolders(loadedGameFolders);
        setNotificationPosition(data.settings?.notificationPosition || "top-right");
        setDisplaySettings({ ...defaultDisplaySettings, ...(data.settings?.display || {}) });
        setIgdbToken(token || "")
        if (loadedGameFolders.length > 0) {
          try {
            const scannedGames = await scanForAllGames(loadedGameFolders);
            const existingPaths = new Set(loadedGames.map(game => game.romPath));
            const uniqueNewGames = scannedGames.filter(game => !existingPaths.has(game.romPath));

            if (uniqueNewGames.length > 0) {
              const gamesWithCovers = await fetchGameCovers(uniqueNewGames, token || "");
              loadedGames = [...loadedGames, ...gamesWithCovers];
              await writeData({ ...data, games: loadedGames });
              showToast(`Added ${gamesWithCovers.length} new game${gamesWithCovers.length === 1 ? "" : "s"} from tracked folders.`, "success");
            }
          } catch (scanErr) {
            console.error("Startup game scan failed:", scanErr);
            showErrorToast("Could not scan for new games on startup.", scanErr);
          }
        }
        setGames(loadedGames);
      } catch (err) {
        console.error("Failed to load data:", err);
        showErrorToast("Failed to load app data.", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [showErrorToast, showToast]);

  useEffect(() => {
    const handleError = (event) => {
      console.error("Unhandled app error:", event.error || event.message);
      showErrorToast("Something went wrong.", event.error || event.message);
    };

    const handleUnhandledRejection = (event) => {
      console.error("Unhandled promise rejection:", event.reason);
      showErrorToast("Something went wrong.", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [showErrorToast]);

  const updateNotificationPosition = async (position) => {
    setNotificationPosition(position);

    const data = await readData();
    await writeData({
      ...data,
      settings: {
        ...(data.settings || {}),
        notificationPosition: position,
      },
    });
  };

  const updateDisplaySettings = async (updates) => {
    const nextDisplaySettings = { ...displaySettings, ...updates };
    setDisplaySettings(nextDisplaySettings);

    const data = await readData();
    await writeData({
      ...data,
      settings: {
        ...(data.settings || {}),
        display: nextDisplaySettings,
      },
    });
  };

  const getGameKey = useCallback((game) => game?.id || game?.romPath, []);

  const isGameLaunching = (game) => gameLaunchStatus[getGameKey(game)]?.state === "launching";
  const isGameRunning = (game) => gameLaunchStatus[getGameKey(game)]?.state === "running";
  const isGameBusy = (game) => !!gameLaunchStatus[getGameKey(game)];

  const updateGamePlayStats = useCallback(async (gameKey, updates = {}) => {
    if (!gameKey) return;

    const applyStatsUpdate = (game) => {
      const currentStats = game.stats || {};
      const sessionSeconds = Number(updates.sessionSeconds || 0);
      const totalSeconds = Number(currentStats.totalSeconds || currentStats.totalMin * 60 || 0) + sessionSeconds;
      const launches = Number(currentStats.launches || 0) + Number(updates.launchIncrement || 0);

      return {
        ...game,
        stats: {
          ...currentStats,
          totalSeconds,
          totalMin: Math.floor(totalSeconds / 60),
          launches,
          lastPlayed: updates.lastPlayed || currentStats.lastPlayed || null,
          lastLaunchedAt: updates.lastLaunchedAt || currentStats.lastLaunchedAt || null,
          lastSessionSeconds: sessionSeconds || currentStats.lastSessionSeconds || 0,
          lastSessionEndedAt: updates.lastSessionEndedAt || currentStats.lastSessionEndedAt || null,
        },
      };
    };

    const updateGames = (currentGames) => currentGames.map((game) => (
      getGameKey(game) === gameKey ? applyStatsUpdate(game) : game
    ));

    setGames(prev => {
      const updatedGames = updateGames(prev);
      gamesRef.current = updatedGames;
      return updatedGames;
    });

    try {
      const data = await readData();
      await writeData({
        ...data,
        games: updateGames(data.games || []),
      });
    } catch (err) {
      console.error("Failed to save playtime stats:", err);
      showErrorToast("Could not save playtime stats.", err);
    }
  }, [getGameKey, showErrorToast]);

  useEffect(() => {
    let unlisten = null;

    listen("game-process-exited", (event) => {
      const pid = event.payload?.pid;
      if (!pid) return;

      setGameLaunchStatus(prev => {
        const nextStatus = { ...prev };
        let finishedGameKey = null;
        let finishedStatus = null;

        Object.entries(nextStatus).forEach(([gameKey, status]) => {
          if (status.pid === pid) {
            finishedGameKey = gameKey;
            finishedStatus = status;
            delete nextStatus[gameKey];
          }
        });

        gameLaunchStatusRef.current = nextStatus;

        if (finishedGameKey && finishedStatus?.startedAt && finishedStatus.platform !== "steam") {
          const sessionSeconds = Math.max(0, Math.round((Date.now() - finishedStatus.startedAt) / 1000));
          void updateGamePlayStats(finishedGameKey, {
            sessionSeconds,
            lastSessionEndedAt: new Date().toISOString(),
          });
        }

        return nextStatus;
      });
    }).then((listener) => {
      unlisten = listener;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [updateGamePlayStats]);

  const launchTrackedGame = async (game, emulatorPath = null, savePath = null) => {
    const gameKey = getGameKey(game);
    if (!gameKey || gameLaunchStatusRef.current[gameKey]) return null;
    const launchedAt = Date.now();

    gameLaunchStatusRef.current = {
      ...gameLaunchStatusRef.current,
      [gameKey]: { state: "launching", startedAt: launchedAt, platform: game.platform?.toLowerCase() },
    };

    setGameLaunchStatus(prev => ({
      ...prev,
      [gameKey]: { state: "launching", startedAt: launchedAt, platform: game.platform?.toLowerCase() },
    }));

    try {
      const emulatorProfile = emulatorPath
        ? { path: emulatorPath }
        : await getEmulatorByPlatform(game.platform);
      const pid = await launchGame(emulatorProfile, game, savePath);

      gameLaunchStatusRef.current = {
        ...gameLaunchStatusRef.current,
        [gameKey]: { state: "running", pid, startedAt: launchedAt, platform: game.platform?.toLowerCase() },
      };

      setGameLaunchStatus(prev => ({
        ...prev,
        [gameKey]: { state: "running", pid, startedAt: launchedAt, platform: game.platform?.toLowerCase() },
      }));

      void updateGamePlayStats(gameKey, {
        launchIncrement: 1,
        lastPlayed: new Date(launchedAt).toISOString(),
        lastLaunchedAt: new Date(launchedAt).toISOString(),
      });

      if (game.platform?.toLowerCase() === "steam") {
        setTimeout(() => {
          setGameLaunchStatus(prev => {
            if (prev[gameKey]?.pid !== pid) return prev;
            const nextStatus = { ...prev };
            delete nextStatus[gameKey];
            gameLaunchStatusRef.current = nextStatus;
            return nextStatus;
          });
        }, 10000);
      }

      return pid;
    } catch (err) {
      setGameLaunchStatus(prev => {
        const nextStatus = { ...prev };
        delete nextStatus[gameKey];
        gameLaunchStatusRef.current = nextStatus;
        return nextStatus;
      });
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        // loading state
        loading,

        // games modal
        isAddGamesModalOpen,
        addGamesDefaultEmulator,
        openAddGamesModal: (defaultEmulator = "") => {
          setAddGamesDefaultEmulator(defaultEmulator);
          setIsAddGamesModalOpen(true);
        },
        closeAddGamesModal: () => {
          setIsAddGamesModalOpen(false);
          setAddGamesDefaultEmulator("");
        },

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

        // toast
        toast: toasts[0] || null,
        toasts,
        showToast,
        showErrorToast,
        clearToast: () => setToasts([]),
        notificationPosition,
        setNotificationPosition: updateNotificationPosition,
        displaySettings,
        previewDisplaySettings: (updates) => setDisplaySettings(prev => ({ ...prev, ...updates })),
        setDisplaySettings: updateDisplaySettings,
        gameLaunchStatus,
        isGameLaunching,
        isGameRunning,
        isGameBusy,
        launchTrackedGame,

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
