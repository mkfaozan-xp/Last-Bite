import {
  collection,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  Timestamp,
  addDoc
} from "firebase/firestore"
import { db } from "../firebase"
import { compressImageToBase64 } from "../utils/imageCompressor"

const COL = "restaurants"

function mapDoc(id, data) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date()
  }
}

async function resolveLogo(item) {
  if (item.logoImageId) {
    try {
      const imgSnap = await getDoc(doc(db, "images", item.logoImageId));
      if (imgSnap.exists()) {
        return { ...item, logo: imgSnap.data().data };
      }
    } catch (err) {
      console.warn(`Failed to load logo for ${item.id}:`, err);
    }
  }
  return item;
}

export async function getRestaurant(id) {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  const restaurant = mapDoc(snap.id, snap.data())
  return resolveLogo(restaurant);
}

export async function updateRestaurant(id, updates) {
  await updateDoc(doc(db, COL, id), {
    ...updates,
    updatedAt: serverTimestamp()
  })
}

export async function uploadRestaurantLogo(id, file) {
  const base64DataUrl = await compressImageToBase64(file, 600, 0.7);
  const imageDocRef = await addDoc(collection(db, "images"), {
    data: base64DataUrl,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, COL, id), { 
    logoImageId: imageDocRef.id, 
    updatedAt: serverTimestamp() 
  })
  return base64DataUrl
}

export async function getAllRestaurants() {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("isActive", "==", true),
      orderBy("rating", "desc")
    )
  )
  const items = snap.docs.map(d => mapDoc(d.id, d.data()))
  return Promise.all(items.map(resolveLogo));
}

export async function incrementRestaurantOrderCount(id) {
  await updateDoc(doc(db, COL, id), {
    totalOrders: increment(1),
    updatedAt: serverTimestamp()
  })
}

export async function getRestaurantDashboardStats(restaurantId) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [ordersSnap, itemsSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "orders"),
        where("restaurantId", "==", restaurantId),
        where("createdAt", ">=", Timestamp.fromDate(monthStart))
      )
    ),
    getDocs(
      query(
        collection(db, "foodItems"),
        where("restaurantId", "==", restaurantId),
        where("isAvailable", "==", true)
      )
    )
  ])

  const orders = ordersSnap.docs.map(d => d.data())
  const todayTs = Timestamp.fromDate(todayStart)
  const todayEarnings = orders
    .filter(o => o.createdAt >= todayTs && o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0)
  const monthlyEarnings = orders
    .filter(o => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0)
  const pendingOrders = orders.filter(o => o.status === "pending").length

  return {
    todayEarnings,
    monthlyEarnings,
    pendingOrders,
    totalItems: itemsSnap.size
  }
}
