export function mergeScannedGames(existingGames = [], scannedGames = []) {
  const cleanExisting = dedupeGameLibrary(existingGames);
  const nextGames = [...cleanExisting.games];
  const addedGames = [];
  const skippedDuplicates = [];
  const possibleDuplicates = [];

  scannedGames.forEach((game) => {
    const exactDuplicate = nextGames.find((existingGame) => isExactDuplicate(existingGame, game));

    if (exactDuplicate) {
      skippedDuplicates.push({
        game,
        matchedGame: exactDuplicate,
        reason: getDuplicateReason(exactDuplicate, game),
      });
      return;
    }

    const duplicateCandidates = nextGames.filter((existingGame) => isPossibleDuplicate(existingGame, game));
    const gameToAdd = duplicateCandidates.length > 0
      ? {
          ...game,
          possibleDuplicateOf: duplicateCandidates.map((candidate) => candidate.id).filter(Boolean),
        }
      : game;

    if (duplicateCandidates.length > 0) {
      possibleDuplicates.push({
        game: gameToAdd,
        matches: duplicateCandidates,
      });
    }

    nextGames.push(gameToAdd);
    addedGames.push(gameToAdd);
  });

  return {
    games: nextGames,
    addedGames,
    skippedDuplicates,
    removedExistingDuplicates: cleanExisting.removedDuplicates,
    possibleDuplicates,
  };
}

export function dedupeGameLibrary(games = []) {
  const uniqueGames = [];
  const removedDuplicates = [];

  games.forEach((game) => {
    const duplicate = uniqueGames.find((existingGame) => isExactDuplicate(existingGame, game));

    if (duplicate) {
      removedDuplicates.push({
        game,
        matchedGame: duplicate,
        reason: getDuplicateReason(duplicate, game),
      });
      return;
    }

    uniqueGames.push(game);
  });

  return {
    games: uniqueGames,
    removedDuplicates,
  };
}

export function isExactDuplicate(a, b) {
  if (!a || !b) return false;

  const aPath = normalizePath(a.romPath || a.path);
  const bPath = normalizePath(b.romPath || b.path);
  if (aPath && bPath && aPath === bPath) return true;

  const aPlatform = normalizePlatform(a.platform);
  const bPlatform = normalizePlatform(b.platform);

  if (aPlatform === "steam" && bPlatform === "steam") {
    const aSteamId = normalizeId(a.steamAppId || a.appId);
    const bSteamId = normalizeId(b.steamAppId || b.appId);
    if (aSteamId && bSteamId && aSteamId === bSteamId) return true;
  }

  if (aPlatform && aPlatform === bPlatform) {
    const aTitleId = normalizeId(a.titleId || a.gameCode || a.serial);
    const bTitleId = normalizeId(b.titleId || b.gameCode || b.serial);
    if (aTitleId && bTitleId && aTitleId === bTitleId) return true;

    const aTitle = getNormalizedTitle(a);
    const bTitle = getNormalizedTitle(b);
    if (aTitle && bTitle && aTitle === bTitle) return true;
  }

  return false;
}

export function isPossibleDuplicate(a, b) {
  if (!a || !b || isExactDuplicate(a, b)) return false;

  const aTitle = getNormalizedTitle(a);
  const bTitle = getNormalizedTitle(b);
  if (!aTitle || !bTitle) return false;

  return aTitle === bTitle;
}

function getDuplicateReason(a, b) {
  const aPath = normalizePath(a.romPath || a.path);
  const bPath = normalizePath(b.romPath || b.path);
  if (aPath && bPath && aPath === bPath) return "same path";

  const aSteamId = normalizeId(a.steamAppId || a.appId);
  const bSteamId = normalizeId(b.steamAppId || b.appId);
  if (aSteamId && bSteamId && aSteamId === bSteamId) return "same Steam app ID";

  const aTitleId = normalizeId(a.titleId || a.gameCode || a.serial);
  const bTitleId = normalizeId(b.titleId || b.gameCode || b.serial);
  if (aTitleId && bTitleId && aTitleId === bTitleId) return "same game ID";

  return "same platform and title";
}

function getNormalizedTitle(game) {
  return normalizeTitle(game.title || game.name || game.detectedTitle || game.originalTitle);
}

function normalizeTitle(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(game of the year|goty|remastered|remaster|hd|definitive edition)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePath(value = "") {
  return String(value)
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "")
    .toLowerCase();
}

function normalizePlatform(value = "") {
  return String(value).toLowerCase().trim();
}

function normalizeId(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}
