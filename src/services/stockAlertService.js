import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore"
import { db } from "../firebase"

const COL = "stockAlerts"

function mapDoc(id, data) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    triggeredAt: data.triggeredAt?.toDate?.()
  }
}

export async function createStockAlert(alert) {
  const docRef = await addDoc(collection(db, COL), {
    ...alert,
    status: "active",
    createdAt: serverTimestamp()
  })
  return docRef.id
}

export async function updateAlertStatus(id, status) {
  const payload = { status }
  if (status === "triggered") payload.triggeredAt = serverTimestamp()
  await updateDoc(doc(db, COL, id), payload)
}

export async function deleteStockAlert(id) {
  await deleteDoc(doc(db, COL, id))
}

export async function getUserAlerts(userId) {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("userId", "==", userId),
      where("status", "==", "active")
    )
  )
  return snap.docs.map(d => mapDoc(d.id, d.data()))
}

export function listenToUserAlerts(userId, cb) {
  return onSnapshot(
    query(collection(db, COL), where("userId", "==", userId)),
    snap => cb(snap.docs.map(d => mapDoc(d.id, d.data())))
  )
}
