const STEAMGRIDDB_BASE_URL = "https://www.steamgriddb.com/api/v2";

const STEAM_APP_ID_ALIASES = {
  callofduty: "1938090",
  callofdutyhq: "1938090",
  pubg: "578080",
  pubgbattlegrounds: "578080",
  playerunknownsbattlegrounds: "578080",
  callofdutymodernwarfareremastered: "393080",
  modernwarfareremastered: "393080",
};

function getSteamGridDbApiKey() {
  return import.meta.env.VITE_STEAMGRIDDB_API_KEY;
}

async function steamGridDbRequest(path) {
  const apiKey = getSteamGridDbApiKey();
  if (!apiKey) return null;

  const response = await fetch(`${STEAMGRIDDB_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`SteamGridDB request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return payload?.success ? payload.data : null;
}

export async function getSteamGridDbCover(gameName, steamAppId = null) {
  const resolvedSteamAppId = steamAppId || getSteamAppIdAlias(gameName);
  const steamGame = resolvedSteamAppId
    ? await steamGridDbRequest(`/games/steam/${encodeURIComponent(resolvedSteamAppId)}`)
    : null;
  const steamGameId = Array.isArray(steamGame) ? steamGame[0]?.id : steamGame?.id;

  if (!gameName && !steamGameId) return null;

  const searchNames = getSteamGridSearchNames(gameName);
  const matchGroups = await Promise.all(
    searchNames.map(searchName => steamGridDbRequest(`/search/autocomplete/${encodeURIComponent(searchName)}`))
  );
  const gameIds = [
    steamGameId,
    ...matchGroups.flatMap(matches => (matches || []).map(match => match.id)),
  ].filter(Boolean);
  const uniqueGameIds = [...new Set(gameIds)];

  for (const gameId of uniqueGameIds) {
    const cover = await getFirstGridCover(gameId);
    if (cover) return cover;
  }

  return resolvedSteamAppId ? getSteamLibraryCoverUrl(resolvedSteamAppId) : null;
}

function getSteamAppIdAlias(gameName = "") {
  const normalizedName = gameName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return STEAM_APP_ID_ALIASES[normalizedName] || null;
}

function getSteamGridSearchNames(gameName = "") {
  const cleanName = normalizeSteamGridTitle(gameName);
  const withoutEdition = cleanName.replace(/\s*\(.*?\)\s*$/g, "").trim();
  const shortName = withoutEdition.replace(/\b(remastered|standard edition|deluxe edition|ultimate edition)\b/gi, "").trim();

  return uniqueNonEmpty([
    gameName,
    cleanName,
    withoutEdition,
    shortName,
  ]);
}

function normalizeSteamGridTitle(title = "") {
  return title
    .replace(/[™®©]/g, "")
    .replace(/[^\w\s:'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueNonEmpty(values) {
  const seen = new Set();

  return values.filter((value) => {
    const normalizedValue = value?.trim();
    const key = normalizedValue?.toLowerCase();
    if (!normalizedValue || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getSteamLibraryCoverUrl(steamAppId) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`;
}

async function getFirstGridCover(gameId) {
  const gridRequests = [
    `/grids/game/${gameId}?dimensions=600x900&types=static`,
    `/grids/game/${gameId}?dimensions=342x482&types=static`,
    `/grids/game/${gameId}?dimensions=660x930&types=static`,
    `/grids/game/${gameId}?types=static`,
    `/grids/game/${gameId}`,
  ];

  for (const request of gridRequests) {
    const grids = await steamGridDbRequest(request);
    const cover = grids?.find(grid => grid.url)?.url;
    if (cover) return cover;
  }

  return null;
}
