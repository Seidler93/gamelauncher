import { readFile, writeFile } from "node:fs/promises";

const IGDB_GAMES_URL = "https://api.igdb.com/v4/games";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const PS3_PLATFORM_ID = 9;
const PAGE_SIZE = 500;

function parseDotEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator);
        const value = line.slice(separator + 1).replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );
}

async function getAccessToken(clientId, clientSecret) {
  const response = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchPage({ clientId, token, offset }) {
  const query = `
    fields id,name,platforms;
    where platforms = (${PS3_PLATFORM_ID});
    sort name asc;
    limit ${PAGE_SIZE};
    offset ${offset};
  `;

  const response = await fetch(IGDB_GAMES_URL, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`IGDB request failed at offset ${offset}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

const env = parseDotEnv(await readFile(".env", "utf8"));
const clientId = env.VITE_TWITCH_CLIENT_ID;
const clientSecret = env.VITE_TWITCH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error("Missing VITE_TWITCH_CLIENT_ID or VITE_TWITCH_CLIENT_SECRET in .env");
}

const token = await getAccessToken(clientId, clientSecret);
const games = [];

for (let offset = 0; ; offset += PAGE_SIZE) {
  const page = await fetchPage({ clientId, token, offset });
  console.log(`Fetched ${page.length} PS3 titles at offset ${offset}`);

  if (page.length === 0) break;
  games.push(...page);
}

const deduped = Array.from(
  new Map(games.map((game) => [game.id, {
    id: game.id,
    name: game.name,
    platforms: game.platforms || [],
  }])).values()
).sort((a, b) => a.name.localeCompare(b.name));

await writeFile("ps3TitleRef.json", `${JSON.stringify(deduped, null, 2)}\n`);
await writeFile(
  "ps3TitleRef.js",
  `export const ps3TitleRef = ${JSON.stringify(deduped, null, 2)};\n`
);

console.log(`Saved ${deduped.length} PS3 titles to ps3TitleRef.json and ps3TitleRef.js`);
