import { getStorage, ref, uploadBytes } from "firebase/storage";
import { readBinaryFile } from "@tauri-apps/api/fs";
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

