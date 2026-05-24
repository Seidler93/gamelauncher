import { invoke } from "@tauri-apps/api/tauri";
import { dirname } from "@tauri-apps/api/path";

export async function launchGame(emuPath, game, savePath = null) {
  switch (game.platform?.toLowerCase()) {
    case "ps2":
      return savePath
        ? await launchRomWithState(emuPath, game.romPath, savePath)
        : await launchRom(emuPath, game.romPath);
    case "ps3":
      return await launchRom(emuPath, game.romPath);
    case "steam":
      return await launchSteamGame(emuPath, game);
    default:
      throw new Error(`Unknown platform: ${game.platform || "none"}`);
  }
}

export async function launchRom(emulator, gamePath, savePath = null) {
  const emulatorPath = getExecutablePath(emulator);

  if (!emulatorPath) {
    throw new Error("Cannot launch game without an emulator path.");
  }

  if (!gamePath) {
    throw new Error("Cannot launch game without a game path.");
  }

  const exe = emulatorPath;
  const cwd = await dirname(exe);

  const args = buildLaunchArgs(emulator, gamePath, savePath);

  console.log("Launching:", exe);
  console.log("Args:", args);
  console.log("CWD:", cwd);

  return await invoke("launch_process", {
    spec: {
      exe,
      args,
      cwd
    }
  });
}

export async function launchRomWithState(emulator, romPath, saveStatePath) {
  const emulatorPath = getExecutablePath(emulator);

  if (!emulatorPath) {
    throw new Error("Cannot launch game without an emulator path.");
  }

  if (!romPath) {
    throw new Error("Cannot launch game without a game path.");
  }

  const cwd = await dirname(emulatorPath);
  const args = typeof emulator === "string" || !emulator?.launchArgs?.trim()
    ? [romPath, "-statefile", saveStatePath]
    : buildLaunchArgs(emulator, romPath, saveStatePath);

  console.log("Launching PCSX2:", emulatorPath, args);

  return await invoke("launch_process", {
    spec: {
      exe: emulatorPath,
      args,
      cwd
    }
  });
}

export async function launchExecutable(executablePath, args = []) {
  if (!executablePath) {
    throw new Error("Cannot launch without an executable path.");
  }

  const cwd = await dirname(executablePath);

  console.log("Launching executable:", executablePath);
  console.log("Args:", args);
  console.log("CWD:", cwd);

  return await invoke("launch_process", {
    spec: {
      exe: executablePath,
      args,
      cwd
    }
  });
}

export async function launchSteamGame(steamPath, game) {
  steamPath = getExecutablePath(steamPath);
  const steamAppId = game.steamAppId || game.appId;

  if (!steamAppId) {
    throw new Error(`Cannot launch Steam game without a Steam app ID: ${game.title || game.name || game.romPath}`);
  }

  if (steamPath) {
    const cwd = await dirname(steamPath);

    console.log("Launching Steam game:", steamAppId);

    return await invoke("launch_process", {
      spec: {
        exe: steamPath,
        args: ["-applaunch", String(steamAppId)],
        cwd
      }
    });
  }

  console.log("Launching Steam game by protocol:", steamAppId);

  return await invoke("launch_process", {
    spec: {
      exe: "cmd.exe",
      args: ["/c", "start", "", `steam://rungameid/${steamAppId}`],
      cwd: null
    }
  });
}

function getExecutablePath(emulator) {
  return typeof emulator === "string" ? emulator : emulator?.path;
}

function buildLaunchArgs(emulator, gamePath, savePath = null) {
  const launchArgs = typeof emulator === "string" ? "" : emulator?.launchArgs?.trim();

  if (!launchArgs) {
    const args = [];
    if (savePath) {
      args.push("--state", savePath);
    }
    args.push(gamePath);
    return args;
  }

  const args = parseCommandLineArgs(launchArgs).map((arg) => (
    arg
      .replaceAll("{game}", gamePath)
      .replaceAll("{rom}", gamePath)
      .replaceAll("{save}", savePath || "")
  )).filter(Boolean);

  if (!args.some(arg => arg.includes(gamePath))) {
    args.push(gamePath);
  }

  return args;
}

function parseCommandLineArgs(value = "") {
  const args = [];
  const pattern = /"([^"]*)"|'([^']*)'|[^\s]+/g;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    args.push(match[1] ?? match[2] ?? match[0]);
  }

  return args;
}
