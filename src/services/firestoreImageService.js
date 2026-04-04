import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { compressImageToBase64 } from '../utils/imageCompressor';

export async function uploadFirestoreImage(file, options = {}) {
  const {
    maxSize = 600,
    quality = 0.7,
    metadata = {},
  } = options;

  const base64DataUrl = await compressImageToBase64(file, maxSize, quality);
  const imageDocRef = await addDoc(collection(db, 'images'), {
    data: base64DataUrl,
    createdAt: serverTimestamp(),
    ...metadata,
  });

  return {
    imageId: imageDocRef.id,
    data: base64DataUrl,
  };
}

export async function getFirestoreImageData(imageId) {
  if (!imageId) return null;

  try {
    const imgSnap = await getDoc(doc(db, 'images', imageId));
    if (!imgSnap.exists()) return null;
    return imgSnap.data().data ?? null;
  } catch (error) {
    console.warn(`Failed to load Firestore image ${imageId}:`, error);
    return null;
  }
}

export async function resolveItemsWithFirestoreImages(items, idField = 'imageId', targetField = 'image') {
  return Promise.all(items.map(async (item) => {
    const image = await getFirestoreImageData(item[idField]);
    if (!image) return item;
    return { ...item, [targetField]: image };
  }));
}

export async function deleteFirestoreImage(imageId) {
  if (!imageId) return;

  try {
    await deleteDoc(doc(db, 'images', imageId));
  } catch (error) {
    console.warn(`Failed to delete Firestore image ${imageId}:`, error);
  }
}
