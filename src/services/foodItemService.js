import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, increment, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  deleteFirestoreImage,
  getFirestoreImageData,
  resolveItemsWithFirestoreImages,
  uploadFirestoreImage,
} from './firestoreImageService';

const COL = 'foodItems';

function mapDoc(id, data) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const rand = (n) => {
    const x = Math.sin(hash++) * 10000;
    return (x - Math.floor(x)) * n;
  };

  return {
    id, ...data,
    distance: parseFloat((rand(14) + 1).toFixed(1)),
    totalOrders: Math.floor(rand(200) + 5),
    expiryTime: data.expiryTime?.toDate?.() ?? new Date(),
    createdAt:  data.createdAt?.toDate?.() ?? new Date(),
    updatedAt:  data.updatedAt?.toDate?.() ?? new Date(),
  };
}

async function resolveBatchImages(items, idField = 'foodImageId', targetField = 'image') {
  return resolveItemsWithFirestoreImages(items, idField, targetField);
}

export async function addFoodItem(
  item,
  imageFile
) {
  const expiryTime = new Date(Date.now() + item.expiryHours * 3600000);
  const docRef = await addDoc(collection(db, COL), {
    ...item,
    expiryTime:  Timestamp.fromDate(expiryTime),
    isAvailable: true,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });
  if (imageFile) {
    const imageId = await uploadFoodImage(docRef.id, imageFile);
    await updateDoc(docRef, { foodImageId: imageId });
  }
  return docRef.id;
}

export async function updateFoodItem(id, updates) {
  const payload = { ...updates, updatedAt: serverTimestamp() };
  if (updates.expiryHours) {
    payload.expiryTime = Timestamp.fromDate(
      new Date(Date.now() + updates.expiryHours * 3600000)
    );
  }
  await updateDoc(doc(db, COL, id), payload);
}

export async function updateItemPrice(id, newPrice) {
  await updateDoc(doc(db, COL, id), { discountedPrice: newPrice, updatedAt: serverTimestamp() });
}


export async function decreaseItemQuantity(id, qty) {
  await updateDoc(doc(db, COL, id), { quantity: increment(-qty), updatedAt: serverTimestamp() });
  const snap = await getDoc(doc(db, COL, id));
  if (snap.exists() && snap.data().quantity <= 0) {
    await updateDoc(doc(db, COL, id), { isAvailable: false });
  }
}


export async function deleteFoodItem(id) {
  const snap = await getDoc(doc(db, COL, id));
  if (snap.exists()) {
    await deleteFirestoreImage(snap.data().foodImageId);
  }
  await deleteDoc(doc(db, COL, id));
}

export async function getFoodItem(id) {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  const item = mapDoc(snap.id, snap.data());
  if (item.foodImageId) item.image = await getFirestoreImageData(item.foodImageId);
  return item;
}

export async function getAvailableFoodItems(
  category,
  maxItems = 30
) {
  let q = query(
    collection(db, COL),
    where('isAvailable', '==', true)
  );
  if (category && category !== 'other') {
    q = query(
      collection(db, COL),
      where('category',    '==', category),
      where('isAvailable', '==', true)
    );
  }
  const snap = await getDocs(q);
  const now = new Date();
  const DONATION_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  let items = snap.docs.map(d => mapDoc(d.id, d.data()));
  // Hide items with 24h or less remaining — those go to NGO donations, not customers
  items = items.filter(i => (i.expiryTime.getTime() - now.getTime()) > DONATION_THRESHOLD_MS);
  items.sort((a,b) => a.expiryTime.getTime() - b.expiryTime.getTime());
  
  const limitedItems = items.slice(0, maxItems);
  return resolveBatchImages(limitedItems);
}

export async function getRestaurantFoodItems(restaurantId) {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where('restaurantId', '==', restaurantId)
    )
  );
  const items = snap.docs.map(d => mapDoc(d.id, d.data()));
  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return resolveBatchImages(items);
}


export function listenToAvailableItems(cb) {
  const DONATION_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
  let latestDocs = []; // cache latest snapshot docs for periodic re-filter

  const filterAndEmit = async () => {
    const now = new Date();
    let items = latestDocs.map(d => mapDoc(d.id, d.data()));
    // Hide items with 24h or less remaining — those go to NGO donations, not customers
    items = items.filter(i => (i.expiryTime.getTime() - now.getTime()) > DONATION_THRESHOLD_MS);
    items.sort((a,b) => a.expiryTime.getTime() - b.expiryTime.getTime());
    const limitedItems = items.slice(0, 40);
    const resolvedItems = await resolveBatchImages(limitedItems);
    cb(resolvedItems);
  };

  const q = query(
    collection(db, COL),
    where('isAvailable', '==', true)
  );

  const unsubSnapshot = onSnapshot(q, (snap) => {
    latestDocs = snap.docs;
    filterAndEmit();
  }, error => {
    console.error("Firebase listen error:", error);
  });

  // Re-filter every 30 seconds so items crossing the 24h threshold disappear dynamically
  const intervalId = setInterval(() => {
    if (latestDocs.length > 0) filterAndEmit();
  }, 30000);

  // Return cleanup function that unsubscribes snapshot AND clears interval
  return () => {
    unsubSnapshot();
    clearInterval(intervalId);
  };
}


export async function uploadFoodImage(itemId, file) {
  const { imageId } = await uploadFirestoreImage(file, {
    maxSize: 600,
    quality: 0.6,
    metadata: {
      ownerType: 'foodItem',
      ownerId: itemId,
      kind: 'food-photo',
    },
  });
  return imageId;
}
