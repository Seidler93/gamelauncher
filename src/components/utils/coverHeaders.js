export function getCoverHeaderSrc(platform) {
  switch (platform?.toLowerCase()) {
    case "steam":
      return "/steam-game-cover-default-cropped.jpg";
    case "ps3":
      return "/ps3-game-cover-default-cropped.png";
    case "ps2":
      return "/ps2-game-cover-default-cropped.png";
    default:
      return null;
  }
}

export function getCoverHeaderLabel(platform) {
  switch (platform?.toLowerCase()) {
    case "steam":
      return "STEAM";
    case "ps3":
      return "PlayStation 3";
    case "ps2":
      return "PlayStation 2";
    default:
      return platform || "Launcher";
  }
}
