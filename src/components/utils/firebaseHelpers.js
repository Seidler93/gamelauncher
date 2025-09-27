import { ref, uploadBytes, listAll, getDownloadURL  } from "firebase/storage";
import { readBinaryFile, writeBinaryFile, BaseDirectory, createDir } from "@tauri-apps/api/fs";
import { storage } from "../../firebase";

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
  console.log(userId + gameCode);
  
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
    // 1. Get Firebase URL
    const fileRef = ref(storage, firebasePath);
    const url = await getDownloadURL(fileRef);

    // 2. Fetch file as binary
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch save state");
    const buffer = await response.arrayBuffer();

    // 3. Build emulator sstates path
    const exeDir = path.dirname(emulatorExePath);       // folder containing exe
    const sstatesDir = path.join(exeDir, "sstates");   // .../sstates
    const localPath = path.join(sstatesDir, filename);

    // 4. Ensure sstates folder exists
    await createDir(sstatesDir, { recursive: true });

    // 5. Write the save file into emulator sstates
    await writeBinaryFile(localPath, buffer);

    return localPath;
  } catch (err) {
    console.error("Download failed:", err);
    throw err;
  }
}
