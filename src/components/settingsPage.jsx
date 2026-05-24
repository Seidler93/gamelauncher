import './settingsPage.css'
import { useState } from 'react'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { useAppContext } from '../context/AppContext'
import { fetchAllGameCovers } from './utils/mediaFinder'
import { readData, removeGameFolderPath, updateEmulator, updateGame, writeData } from './utils/storageManager'
import { scanSteamGames } from './utils/scanners'
import { openFolderLocation } from './utils/openFolderLocation'

export default function SettingsPage({ onBack }) {
  const {
    games,
    emulators,
    gameFolders,
    igdbToken,
    openAddGamesModal,
    openAddEmulatorModal,
    setGameFolders,
    setGames,
    setEmulators,
    showToast,
    notificationPosition,
    setNotificationPosition,
    displaySettings,
    previewDisplaySettings,
    setDisplaySettings
  } = useAppContext();
  const hiddenGames = games.filter(game => game.hidden);
  const launcherTypes = getLauncherTypes(emulators, games);
  const [collapsedProfiles, setCollapsedProfiles] = useState(() => (
    Object.fromEntries(emulators.map((emulator) => [getProfileKey(emulator), true]))
  ));
  const [editingProfiles, setEditingProfiles] = useState({});
  const [displayDraft, setDisplayDraft] = useState(displaySettings);
  const [settingsSearch, setSettingsSearch] = useState("");
  const normalizedSettingsSearch = normalizeSearchText(settingsSearch);
  const isSearchingSettings = normalizedSettingsSearch.length > 0;
  const isLibraryMaintenanceMatch = matchesSettingsSearch(normalizedSettingsSearch, [
    "library maintenance",
    "games",
    "covers",
    "metadata",
    "add game folder",
    "get all game covers",
  ]);
  const isLauncherSetupMatch = matchesSettingsSearch(normalizedSettingsSearch, [
    "launcher setup",
    "add launcher",
    "emulator",
    "profiles",
  ]);
  const isEmulatorProfilesMatch = matchesSettingsSearch(normalizedSettingsSearch, [
    "emulator profiles",
    "launcher profiles",
    "exe",
    "saves",
    "save folder",
    "memory cards",
    "bios",
    "config",
    "launch args",
    "savelocker",
    "steam",
    "rescan steam games",
  ]);
  const isNotificationsMatch = matchesSettingsSearch(normalizedSettingsSearch, [
    "notifications",
    "alerts",
    "position",
    "top right",
    "bottom right",
    "bottom middle",
    "bottom left",
  ]);
  const isDisplayMatch = matchesSettingsSearch(normalizedSettingsSearch, [
    "display",
    "game names",
    "card orientation",
    "cover fit",
    "card size",
    "row gap",
    "column gap",
    "platform themes",
    "portrait",
    "square",
    "landscape",
  ]);
  const isTrackedFoldersMatch = matchesSettingsSearch(normalizedSettingsSearch, [
    "tracked folders",
    "folders",
    "library scans",
    "open",
    "remove",
  ]);
  const isHiddenGamesMatch = matchesSettingsSearch(normalizedSettingsSearch, [
    "hidden games",
    "restore",
    "hidden",
  ]);
  const searchedEmulators = filterBySettingsSearch(emulators, normalizedSettingsSearch, getEmulatorSearchFields);
  const displayedEmulators = isSearchingSettings && !isEmulatorProfilesMatch ? searchedEmulators : emulators;
  const searchedFolders = filterBySettingsSearch(gameFolders, normalizedSettingsSearch, (folder) => [folder]);
  const displayedFolders = isSearchingSettings && !isTrackedFoldersMatch ? searchedFolders : gameFolders;
  const searchedHiddenGames = filterBySettingsSearch(hiddenGames, normalizedSettingsSearch, (game) => [
    game.title,
    game.name,
    game.romPath,
    game.platform,
  ]);
  const displayedHiddenGames = isSearchingSettings && !isHiddenGamesMatch ? searchedHiddenGames : hiddenGames;
  const shouldShowLibraryMaintenance = !isSearchingSettings || isLibraryMaintenanceMatch;
  const shouldShowLauncherSetup = !isSearchingSettings || isLauncherSetupMatch;
  const shouldShowEmulatorProfiles = !isSearchingSettings || isEmulatorProfilesMatch || searchedEmulators.length > 0;
  const shouldShowNotifications = !isSearchingSettings || isNotificationsMatch;
  const shouldShowDisplay = !isSearchingSettings || isDisplayMatch;
  const shouldShowTrackedFolders = !isSearchingSettings || isTrackedFoldersMatch || searchedFolders.length > 0;
  const shouldShowHiddenGames = !isSearchingSettings || isHiddenGamesMatch || searchedHiddenGames.length > 0;
  const hasSettingsResults = [
    shouldShowLibraryMaintenance,
    shouldShowLauncherSetup,
    shouldShowEmulatorProfiles,
    shouldShowNotifications,
    shouldShowDisplay,
    shouldShowTrackedFolders,
    shouldShowHiddenGames,
  ].some(Boolean);

  const getLauncherTypeForProfile = (emulator) => (
    launcherTypes.find((launcherType) => launcherType.platform === emulator.platform?.toLowerCase())
  );
  const toggleProfileCollapsed = (emulator) => {
    const profileKey = getProfileKey(emulator);
    setCollapsedProfiles(prev => ({ ...prev, [profileKey]: !prev[profileKey] }));
  };

  const startEditingProfile = (emulator) => {
    const profileKey = getProfileKey(emulator);
    setCollapsedProfiles(prev => ({ ...prev, [profileKey]: false }));
    setEditingProfiles(prev => ({
      ...prev,
      [profileKey]: {
        path: emulator.path || "",
        saveFolderPath: emulator.saveFolderPath || "",
        memoryCardFolderPath: emulator.memoryCardFolderPath || "",
        biosConfigFolderPath: emulator.biosConfigFolderPath || "",
        launchArgs: emulator.launchArgs || "",
        saveLockerEnabled: emulator.saveLocker?.enabled ?? true,
        saveLockerSyncMode: emulator.saveLocker?.syncMode || "manual",
      },
    }));
  };

  const cancelEditingProfile = (emulator) => {
    const profileKey = getProfileKey(emulator);
    setEditingProfiles(prev => {
      const nextProfiles = { ...prev };
      delete nextProfiles[profileKey];
      return nextProfiles;
    });
  };

  const updateEditingProfile = (emulator, field, value) => {
    const profileKey = getProfileKey(emulator);
    setEditingProfiles(prev => ({
      ...prev,
      [profileKey]: {
        ...prev[profileKey],
        [field]: value,
      },
    }));
  };

  const selectProfileFile = async (emulator, field) => {
    const path = await openDialog({
      filters: [{ name: "Executables", extensions: ["exe"] }],
    });

    if (path) updateEditingProfile(emulator, field, path);
  };

  const selectProfileFolder = async (emulator, field) => {
    const path = await openDialog({
      directory: true,
      multiple: false,
    });

    if (path) updateEditingProfile(emulator, field, path);
  };

  const saveEditingProfile = async (emulator) => {
    const profileKey = getProfileKey(emulator);
    const draft = editingProfiles[profileKey];
    if (!draft?.path) {
      showToast("Launcher EXE path is required.", "warning");
      return;
    }

    try {
      const updatedEmulator = {
        ...emulator,
        path: draft.path,
        saveFolderPath: draft.saveFolderPath,
        memoryCardFolderPath: draft.memoryCardFolderPath,
        biosConfigFolderPath: draft.biosConfigFolderPath,
        launchArgs: draft.launchArgs,
        saveLocker: {
          enabled: draft.saveLockerEnabled,
          syncMode: draft.saveLockerSyncMode,
        },
      };

      setEmulators(prev => prev.map((currentEmulator) => (
        getProfileKey(currentEmulator) === profileKey ? { ...updatedEmulator, id: updatedEmulator.id || profileKey } : currentEmulator
      )));
      await updateEmulator({ ...updatedEmulator, id: updatedEmulator.id || profileKey });
      cancelEditingProfile(emulator);
      showToast("Emulator profile updated.", "success");
    } catch (err) {
      console.error("Failed to update emulator profile:", err);
      showToast("Could not update emulator profile.", "error");
    }
  };

  const handleFetchAll = async () => {
    showToast("Getting game covers...", "info", 0);

    try {
      const result = await fetchAllGameCovers({ games, igdbToken, setGames });
      showToast(`Set covers for ${result.coveredCount} game${result.coveredCount === 1 ? "" : "s"}.`, "success");

      if (result.missingCoverCount > 0) {
        showToast(
          `No art found for ${result.missingCoverCount} game${result.missingCoverCount === 1 ? "" : "s"}.`,
          "warning"
        );
      }
    } catch (err) {
      console.error("Failed to fetch all covers:", err);
      showToast("Could not get game covers. Try again.", "error");
    }
  };

  const handleOpenFolder = async (folder) => {
    try {
      await openFolderLocation(folder);
    } catch (err) {
      console.error("Failed to open folder:", err);
      showToast("Could not open that folder.", "error");
    }
  };

  const handleOpenGameFolder = async (game) => {
    try {
      await openFolderLocation(game.romPath);
    } catch (err) {
      console.error("Failed to open game folder:", err);
      showToast("Could not open that game folder.", "error");
    }
  };

  const handleRestoreGame = async (game) => {
    try {
      const updatedGame = { ...game, hidden: false };
      setGames(prev => prev.map((currentGame) => (
        getGameKey(currentGame) === getGameKey(game) ? updatedGame : currentGame
      )));
      await updateGame(updatedGame);
      showToast("Game restored to library.", "success");
    } catch (err) {
      console.error("Failed to restore hidden game:", err);
      showToast("Could not restore that game.", "error");
    }
  };

  const handleRemoveFolder = async (folder) => {
    try {
      const result = await removeGameFolderPath(folder);
      setGameFolders(result.gameFolders);
      setGames(result.games);
      showToast(
        result.removedGameCount > 0
          ? `Folder removed. Removed ${result.removedGameCount} game${result.removedGameCount === 1 ? "" : "s"} from the library.`
          : "Folder removed from tracked folders.",
        "success"
      );
    } catch (err) {
      console.error("Failed to remove folder:", err);
      showToast("Could not remove that folder.", "error");
    }
  };

  const handleRescanSteamGames = async () => {
    const steamFolders = gameFolders.filter(isLikelySteamFolder);
    if (steamFolders.length === 0) {
      showToast("No tracked Steam folders found.", "warning");
      return;
    }

    showToast("Rescanning Steam games...", "info", 0);

    try {
      const scannedSteamGames = (await Promise.all(
        steamFolders.map(async (folder) => {
          try {
            return await scanSteamGames(folder);
          } catch (err) {
            console.warn("Could not scan Steam folder:", folder, err);
            return [];
          }
        })
      )).flat();

      const scannedByPath = new Map(scannedSteamGames.map(game => [normalizePath(game.romPath), game]));
      let updatedCount = 0;
      const updatedGames = games.map((game) => {
        if (game.platform?.toLowerCase() !== "steam") return game;

        const scannedGame = scannedByPath.get(normalizePath(game.romPath));
        if (!scannedGame) return game;

        const updatedGame = {
          ...game,
          title: scannedGame.title || game.title,
          detectedTitle: scannedGame.detectedTitle || game.detectedTitle,
          steamAppId: scannedGame.steamAppId || game.steamAppId,
        };

        if (
          updatedGame.title !== game.title ||
          updatedGame.detectedTitle !== game.detectedTitle ||
          updatedGame.steamAppId !== game.steamAppId
        ) {
          updatedCount += 1;
        }

        return updatedGame;
      });

      setGames(updatedGames);
      const currentData = await readData();
      await writeData({ ...currentData, games: updatedGames });
      showToast(`Updated Steam metadata for ${updatedCount} game${updatedCount === 1 ? "" : "s"}.`, "success");
    } catch (err) {
      console.error("Failed to rescan Steam games:", err);
      showToast("Could not rescan Steam games.", "error");
    }
  };

  const handleNotificationPositionChange = async (event) => {
    try {
      await setNotificationPosition(event.target.value);
      showToast("Notification position updated.", "success");
    } catch (err) {
      console.error("Failed to update notification position:", err);
      showToast("Could not update notification position.", "error");
    }
  };

  const handleDisplaySettingChange = async (updates, { persistOnly = false } = {}) => {
    try {
      if (!persistOnly) {
        setDisplayDraft(prev => ({ ...prev, ...updates }));
      }
      await setDisplaySettings(updates);
      showToast("Display settings updated.", "success");
    } catch (err) {
      console.error("Failed to update display settings:", err);
      showToast("Could not update display settings.", "error");
    }
  };

  const handleDisplayDraftChange = (updates) => {
    setDisplayDraft(prev => ({ ...prev, ...updates }));
    previewDisplaySettings(updates);
  };

  const handleDisplayDraftCommit = async (updates) => {
    await handleDisplaySettingChange(updates, { persistOnly: true });
  };

  return (
    <main className="settings-page">
      <header className="settings-page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage folders, launchers, metadata, and library maintenance.</p>
        </div>
        <button type="button" onClick={onBack}>Back to Library</button>
      </header>

      <label className="settings-search" htmlFor="settings-search-input">
        <span>Search Settings</span>
        <input
          id="settings-search-input"
          type="search"
          value={settingsSearch}
          placeholder="Search folders, profiles, display, saves..."
          onChange={(event) => setSettingsSearch(event.target.value)}
        />
      </label>

      <section className="settings-grid">
        {!hasSettingsResults && (
          <div className="settings-card settings-no-results">
            <h2>No settings found</h2>
            <p>Try searching for display, folders, profiles, saves, notifications, or Steam.</p>
          </div>
        )}

        {shouldShowLibraryMaintenance && (
        <div className="settings-card">
          <div>
            <h2>Library Maintenance</h2>
            <p>{games.length} game{games.length === 1 ? "" : "s"} in your library.</p>
          </div>
          <div className="settings-actions">
            <button type="button" onClick={openAddGamesModal}>Add Game Folder</button>
            <button type="button" className="secondary" onClick={handleFetchAll}>Get All Game Covers</button>
          </div>
        </div>
        )}

        {shouldShowLauncherSetup && (
        <div className="settings-card">
          <div>
            <h2>Launcher Setup</h2>
            <p>{emulators.length} launcher{emulators.length === 1 ? "" : "s"} configured.</p>
          </div>
          <div className="settings-actions">
            <button type="button" onClick={openAddEmulatorModal}>Add Launcher</button>
          </div>
        </div>
        )}

        {shouldShowEmulatorProfiles && (
        <div className="settings-card emulator-profiles-card">
          <div>
            <h2>Emulator Profiles</h2>
            <p>Save paths, launch arguments, and SaveLocker rules by emulator.</p>
          </div>
          {displayedEmulators.length > 0 ? (
            <ul className="emulator-profile-list">
              {displayedEmulators.map((emulator) => {
                const profileKey = getProfileKey(emulator);
                const gameCount = getLauncherTypeForProfile(emulator)?.gameCount || 0;
                const isCollapsed = collapsedProfiles[profileKey];
                const isSteamProfile = emulator.platform?.toLowerCase() === "steam";
                const profileDraft = editingProfiles[profileKey];
                const isEditingProfile = !!profileDraft;

                return (
                  <li key={profileKey}>
                    <button
                      type="button"
                      className="emulator-profile-toggle"
                      onClick={() => toggleProfileCollapsed(emulator)}
                      aria-expanded={!isCollapsed}
                    >
                      <span className="profile-chevron" aria-hidden="true">
                        {isCollapsed ? ">" : "v"}
                      </span>
                      <span className="emulator-profile-title">
                        <strong>{emulator.name || emulator.platform || "Launcher"}</strong>
                        <span>{emulator.platform || "Custom"}</span>
                      </span>
                      <span className="emulator-profile-count">
                        {gameCount} game{gameCount === 1 ? "" : "s"}
                      </span>
                    </button>
                    <div className={`emulator-profile-collapse ${isCollapsed ? "collapsed" : "expanded"}`}>
                      <div className="emulator-profile-body">
                        {isEditingProfile ? (
                          <div className="emulator-profile-edit-form">
                            <ProfilePathEditor
                              label="EXE"
                              value={profileDraft.path}
                              onChange={(value) => updateEditingProfile(emulator, "path", value)}
                              onBrowse={() => selectProfileFile(emulator, "path")}
                            />
                            {!isSteamProfile && (
                              <>
                                <ProfilePathEditor
                                  label="Saves"
                                  value={profileDraft.saveFolderPath}
                                  onChange={(value) => updateEditingProfile(emulator, "saveFolderPath", value)}
                                  onBrowse={() => selectProfileFolder(emulator, "saveFolderPath")}
                                />
                                <ProfilePathEditor
                                  label="Memory Cards"
                                  value={profileDraft.memoryCardFolderPath}
                                  onChange={(value) => updateEditingProfile(emulator, "memoryCardFolderPath", value)}
                                  onBrowse={() => selectProfileFolder(emulator, "memoryCardFolderPath")}
                                />
                                <ProfilePathEditor
                                  label="BIOS/Config"
                                  value={profileDraft.biosConfigFolderPath}
                                  onChange={(value) => updateEditingProfile(emulator, "biosConfigFolderPath", value)}
                                  onBrowse={() => selectProfileFolder(emulator, "biosConfigFolderPath")}
                                />
                              </>
                            )}
                            <label className="profile-edit-field">
                              <span>Launch Args</span>
                              <input
                                type="text"
                                value={profileDraft.launchArgs}
                                placeholder='Optional, e.g. --fullscreen "{game}"'
                                onChange={(event) => updateEditingProfile(emulator, "launchArgs", event.target.value)}
                              />
                            </label>
                            {!isSteamProfile && (
                              <div className="profile-edit-locker">
                                <label className="profile-edit-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={profileDraft.saveLockerEnabled}
                                    onChange={(event) => updateEditingProfile(emulator, "saveLockerEnabled", event.target.checked)}
                                  />
                                  <span>Enable SaveLocker</span>
                                </label>
                                <label className="profile-edit-field">
                                  <span>Sync Mode</span>
                                  <select
                                    value={profileDraft.saveLockerSyncMode}
                                    disabled={!profileDraft.saveLockerEnabled}
                                    onChange={(event) => updateEditingProfile(emulator, "saveLockerSyncMode", event.target.value)}
                                  >
                                    <option value="manual">Manual</option>
                                    <option value="backup-before-launch">Backup before launch</option>
                                    <option value="backup-after-close">Backup after close</option>
                                    <option value="backup-before-and-after">Backup before and after</option>
                                  </select>
                                </label>
                              </div>
                            )}
                            <div className="settings-actions profile-actions compact">
                              <button type="button" onClick={() => saveEditingProfile(emulator)}>Save Profile</button>
                              <button type="button" className="secondary" onClick={() => cancelEditingProfile(emulator)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <dl>
                              <div>
                                <dt>EXE</dt>
                                <dd>{renderProfilePath(emulator.path, handleOpenFolder)}</dd>
                              </div>
                              {!isSteamProfile && (
                                <>
                                  <div>
                                    <dt>Saves</dt>
                                    <dd>{renderProfilePath(emulator.saveFolderPath, handleOpenFolder)}</dd>
                                  </div>
                                  <div>
                                    <dt>Memory Cards</dt>
                                    <dd>{renderProfilePath(emulator.memoryCardFolderPath, handleOpenFolder)}</dd>
                                  </div>
                                  <div>
                                    <dt>BIOS/Config</dt>
                                    <dd>{renderProfilePath(emulator.biosConfigFolderPath, handleOpenFolder)}</dd>
                                  </div>
                                </>
                              )}
                              {(!isSteamProfile || emulator.launchArgs) && (
                                <div>
                                  <dt>Launch Args</dt>
                                  <dd>{emulator.launchArgs || "Default"}</dd>
                                </div>
                              )}
                              {!isSteamProfile && (
                                <div>
                                  <dt>SaveLocker</dt>
                                  <dd>{formatSaveLockerRule(emulator.saveLocker)}</dd>
                                </div>
                              )}
                            </dl>
                            <div className="settings-actions profile-actions compact">
                              <button type="button" className="secondary" onClick={() => startEditingProfile(emulator)}>Edit Profile</button>
                            </div>
                          </>
                        )}
                        {isSteamProfile && !isEditingProfile && (
                          <div className="settings-actions profile-actions compact">
                            <button type="button" className="secondary" onClick={handleRescanSteamGames}>Rescan Steam Games</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="settings-empty">No emulator profiles have been added yet.</p>
          )}
        </div>
        )}

        {shouldShowNotifications && (
        <div className="settings-card">
          <div>
            <h2>Notifications</h2>
            <p>Choose where notification alerts appear on screen.</p>
          </div>
          <label className="settings-field">
            <span>Position</span>
            <select value={notificationPosition} onChange={handleNotificationPositionChange}>
              <option value="top-right">Top Right</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-middle">Bottom Middle</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </label>
        </div>
        )}

        {shouldShowDisplay && (
        <div className="settings-card display-settings-card">
          <div>
            <h2>Display</h2>
            <p>Adjust how games are shown in the library.</p>
          </div>
          <div className="display-settings-grid">
            <label className="settings-field">
              <span>Card Orientation</span>
              <select
                value={displayDraft.cardOrientation}
                onChange={(event) => handleDisplaySettingChange({ cardOrientation: event.target.value })}
              >
                <option value="portrait">Portrait</option>
                <option value="square">Square</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
            <label className="settings-range-field">
              <span>Card Size: {displayDraft.cardSize}px</span>
              <input
                type="range"
                min="120"
                max="280"
                step="10"
                value={displayDraft.cardSize}
                onChange={(event) => handleDisplayDraftChange({ cardSize: Number(event.target.value) })}
                onPointerUp={(event) => handleDisplayDraftCommit({ cardSize: Number(event.currentTarget.value) })}
                onKeyUp={(event) => handleDisplayDraftCommit({ cardSize: Number(event.currentTarget.value) })}
              />
            </label>
            <label className="settings-field">
              <span>Cover Fit</span>
              <select
                value={displayDraft.coverFit}
                onChange={(event) => handleDisplaySettingChange({ coverFit: event.target.value })}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>
            <label className="settings-range-field">
              <span>Row Gap: {displayDraft.rowGap}px</span>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={displayDraft.rowGap}
                onChange={(event) => handleDisplayDraftChange({ rowGap: Number(event.target.value) })}
                onPointerUp={(event) => handleDisplayDraftCommit({ rowGap: Number(event.currentTarget.value) })}
                onKeyUp={(event) => handleDisplayDraftCommit({ rowGap: Number(event.currentTarget.value) })}
              />
            </label>
            <label className="settings-toggle-field">
              <input
                type="checkbox"
                checked={displayDraft.showGameNames}
                onChange={(event) => handleDisplaySettingChange({ showGameNames: event.target.checked })}
              />
              <span>Show game names</span>
            </label>
            <label className="settings-range-field">
              <span>Column Gap: {displayDraft.columnGap}px</span>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={displayDraft.columnGap}
                onChange={(event) => handleDisplayDraftChange({ columnGap: Number(event.target.value) })}
                onPointerUp={(event) => handleDisplayDraftCommit({ columnGap: Number(event.currentTarget.value) })}
                onKeyUp={(event) => handleDisplayDraftCommit({ columnGap: Number(event.currentTarget.value) })}
              />
            </label>
            <label className="settings-toggle-field">
              <input
                type="checkbox"
                checked={displayDraft.platformThemes}
                onChange={(event) => handleDisplaySettingChange({ platformThemes: event.target.checked })}
              />
              <span>Platform-specific themes</span>
            </label>
          </div>
        </div>
        )}

        {shouldShowTrackedFolders && (
        <div className="settings-card folders-card">
          <div>
            <h2>Tracked Folders</h2>
            <p>{gameFolders.length} folder{gameFolders.length === 1 ? "" : "s"} tracked for library scans.</p>
          </div>

          {displayedFolders.length > 0 ? (
            <ul className="settings-list">
              {displayedFolders.map((folder) => (
                <li key={folder}>
                  <span>{folder}</span>
                  <div className="folder-actions">
                    <button type="button" onClick={() => handleOpenFolder(folder)}>Open</button>
                    <button type="button" className="danger" onClick={() => handleRemoveFolder(folder)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="settings-empty">No folders have been added yet.</p>
          )}
        </div>
        )}

        {shouldShowHiddenGames && (
        <div className="settings-card folders-card">
          <div>
            <h2>Hidden Games</h2>
            <p>{hiddenGames.length} hidden game{hiddenGames.length === 1 ? "" : "s"}.</p>
          </div>

          {displayedHiddenGames.length > 0 ? (
            <ul className="settings-list">
              {displayedHiddenGames.map((game) => (
                <li key={game.id || game.romPath}>
                  <span>{game.title || game.name || game.romPath}</span>
                  <div className="folder-actions">
                    <button type="button" onClick={() => handleOpenGameFolder(game)}>Open</button>
                    <button type="button" onClick={() => handleRestoreGame(game)}>Restore</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="settings-empty">No games are hidden.</p>
          )}
        </div>
        )}
      </section>
    </main>
  )
}

function getGameKey(game) {
  return game.id || game.romPath;
}

function getProfileKey(emulator) {
  return emulator.id || emulator.path || emulator.platform || emulator.name;
}

function getLauncherTypes(emulators, games) {
  const platforms = [
    ...emulators.map(emulator => emulator.platform),
    ...games.map(game => game.platform),
  ].reduce((launcherMap, platform) => {
    const normalizedPlatform = platform?.toLowerCase();
    if (!normalizedPlatform) return launcherMap;

    launcherMap.set(normalizedPlatform, {
      platform: normalizedPlatform,
      label: getLauncherLabel(normalizedPlatform),
      gameCount: games.filter(game => game.platform?.toLowerCase() === normalizedPlatform).length,
    });

    return launcherMap;
  }, new Map());

  return [...platforms.values()]
    .sort((a, b) => a.label.localeCompare(b.label));
}

function getLauncherLabel(platform) {
  switch (platform) {
    case "ps2":
      return "PCSX2";
    case "ps3":
      return "RPCS3";
    case "steam":
      return "Steam";
    default:
      return platform.toUpperCase();
  }
}

function formatSaveLockerRule(saveLocker) {
  if (!saveLocker?.enabled) return "Off";

  switch (saveLocker.syncMode) {
    case "backup-before-launch":
      return "Backup before launch";
    case "backup-after-close":
      return "Backup after close";
    case "backup-before-and-after":
      return "Backup before and after";
    default:
      return "Manual";
  }
}

function renderProfilePath(path, onOpen) {
  if (!path) return "Not set";

  return (
    <button type="button" className="profile-path-button" onClick={() => onOpen(path)}>
      {path}
    </button>
  );
}

function ProfilePathEditor({ label, value, onChange, onBrowse }) {
  return (
    <label className="profile-edit-field">
      <span>{label}</span>
      <div className="profile-edit-path-row">
        <input
          type="text"
          value={value}
          placeholder="Not set"
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" onClick={onBrowse}>Browse</button>
        {value && (
          <button type="button" className="secondary" onClick={() => onChange("")}>Clear</button>
        )}
      </div>
    </label>
  );
}

function isLikelySteamFolder(folder = "") {
  const normalized = normalizePath(folder);
  return normalized.includes("/steamapps") || normalized.endsWith("/steamlibrary");
}

function normalizePath(path = "") {
  return path.replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();
}

function filterBySettingsSearch(items, searchText, getFields) {
  if (!searchText) return items;
  return items.filter((item) => matchesSettingsSearch(searchText, getFields(item)));
}

function matchesSettingsSearch(searchText, values = []) {
  if (!searchText) return true;
  return values.some((value) => normalizeSearchText(value).includes(searchText));
}

function normalizeSearchText(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getEmulatorSearchFields(emulator) {
  return [
    emulator.name,
    emulator.platform,
    emulator.path,
    emulator.saveFolderPath,
    emulator.memoryCardFolderPath,
    emulator.biosConfigFolderPath,
    emulator.launchArgs,
    formatSaveLockerRule(emulator.saveLocker),
  ];
}
