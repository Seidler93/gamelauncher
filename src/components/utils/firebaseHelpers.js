import { getStorage, ref, uploadBytes } from "firebase/storage";
import fs from "fs";
import { storage } from "../../firebase";


export async function uploadSaveState(userId, gameName, platform) {
  // Get SLUS name

  // Get platform path to find the sstates folder and get actual state file



  // Read the local save state
  const fileBuffer = fs.readFileSync(filePath);

  // Create a reference in Storage
  const storageRef = ref(storage, `savestates/${userId}/${gameId}/slot${slot}.p2s`);

  // Upload binary
  await uploadBytes(storageRef, fileBuffer);

  console.log("Save state uploaded:", storageRef.fullPath);
}
