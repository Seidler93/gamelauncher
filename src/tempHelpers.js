export const sampleGames = [
  {
    id: "g-ps3-madden25",
    title: "Madden NFL 25",
    appId: "app-rpcs3",                 // RPCS3
    platform: "ps3",
    romPath: "D:\\PS3\\Madden NFL 25\\PS3_GAME\\USRDIR\\EBOOT.BIN",
    coverUrl: "",
    favorite: true,
    stats: { totalMin: 120, launches: 4, lastPlayed: "2025-09-05T23:10:00Z" },
    // extraArgs: ["--no-gui"]         // optional per-game overrides if you support them
  },
  {
    id: "g-ps2-gt4",
    title: "Gran Turismo 4",
    appId: "app-pcsx2",                 // PCSX2
    platform: "ps2",
    romPath: "D:\\PS2\\Gran Turismo 4.iso",
    coverUrl: "",
    favorite: false,
    stats: { totalMin: 45, launches: 2, lastPlayed: "2025-09-04T03:21:00Z" }
  },
  {
    id: "g-steam-hades",
    title: "Hades",
    appId: "app-steam",                 // Steam client
    platform: "steam",
    steamAppId: "1145360",
    coverUrl: "",
    favorite: false,
    stats: { totalMin: 300, launches: 10, lastPlayed: "2025-08-28T19:10:00Z" }
  },
  {
    id: "g-gba-emerald",
    title: "Pokémon Emerald",
    appId: "app-mgba",                  // mGBA or your chosen GBA emulator
    platform: "gba",
    romPath: "D:\\GBA\\Pokemon Emerald.gba",
    coverUrl: "",
    favorite: true,
    stats: { totalMin: 15, launches: 1, lastPlayed: "2025-09-01T16:00:00Z" }
  }
];
