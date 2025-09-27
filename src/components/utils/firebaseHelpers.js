import { ref, uploadBytes, listAll, getDownloadURL, getBytes  } from "firebase/storage";
import { readBinaryFile, writeBinaryFile, BaseDirectory, createDir, readDir } from "@tauri-apps/api/fs";
import { storage } from "../../firebase";
import { dirname, join } from "@tauri-apps/api/path";

export async function uploadSaveState(userId, gameId, filePath) {
  // Read file as binary with Tauri
  const fileBuffer = await readBinaryFile(filePath);

  const slot = getSlotFromFileName(filePath);

  // Create a reference in Storage
  const storageRef = ref(storage, `savestates/${userId}/${gameId}/slot${slot}.p2s`);

  // Upload binary
  await uploadBytes(storageRef, fileBuffer);

  console.log("Save state uploaded:", storageRef.fullPath);
}

export function getSlotFromFileName(fileName) {
  const match = fileName.match(/\.(\d{2})\.p2s$/i);
  if (match) {
    return parseInt(match[1], 10); // convert "01" → 1
  }
  return null;
} 

export async function listSavestates(userId, gameCode) {
  // console.log(userId + gameCode);
  
  const folderRef = ref(storage, `savestates/${userId}/${gameCode}/`);
  try {
    const res = await listAll(folderRef);
    const files = await Promise.all(
      res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return { name: itemRef.name, url };
      })
    );
    return files;
  } catch (err) {
    console.error("❌ Error listing savestates:", err);
    return [];
  }
}

export async function downloadSaveStateToEmulator(firebasePath, filename, emulatorExePath) {
  try {
    // 1️⃣ Get exact binary from Firebase Storage
    const fileRef = ref(storage, firebasePath);
    const buffer = await getBytes(fileRef); // ✅ no CORS, exact bytes

    // 2️⃣ Build local path
    const exeDir = await dirname(emulatorExePath);
    const sstatesDir = await join(exeDir, "sstates");
    const localPath = await join(sstatesDir, filename);

    // 3️⃣ Ensure folder exists & save
    await createDir(sstatesDir, { recursive: true });
    await writeBinaryFile(localPath, buffer);

    console.log(`✅ Saved valid .p2s to ${localPath}`);
    return localPath;
  } catch (err) {
    console.error("❌ Download failed:", err);
    throw err;
  }
}

export async function scanLocalSavestates(emulatorExePath, gameCode = null) {
  const exeDir = await dirname(emulatorExePath);
  const sstatesDir = await join(exeDir, "sstates");

  try {
    const files = await readDir(sstatesDir);

    const savestates = files
      .filter(f => f.name.endsWith(".p2s"))
      .filter(f => !gameCode || f.name.includes(gameCode))
      .map(f => ({
        name: f.name,
        path: f.path,
        slot: extractSlotFromFilename(f.name),
      }));

    return savestates;
  } catch (err) {
    console.error("❌ Failed to scan savestates:", err);
    return [];
  }
}

function extractSlotFromFilename(filename) {
  const match = filename.match(/\.0?(\d)\.p2s$/);
  return match ? parseInt(match[1], 10) : null;
}
