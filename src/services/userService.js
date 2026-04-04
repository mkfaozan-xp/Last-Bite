import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  collection,
  addDoc
} from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { compressImageToBase64 } from "../utils/imageCompressor"
import { db, auth } from "../firebase"

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) return null
  const data = snap.data()
  
  let avatar = data.avatar;
  if (data.avatarImageId) {
    try {
      const imgSnap = await getDoc(doc(db, "images", data.avatarImageId));
      if (imgSnap.exists()) {
        avatar = imgSnap.data().data;
      }
    } catch (err) {
      console.warn("Failed to load avatar image:", err);
    }
  }

  return {
    uid,
    ...data,
    avatar, // use resolved avatar overriding initial mapping
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date()
  }
}

export async function updateUserProfile(uid, updates) {
  await updateDoc(doc(db, "users", uid), {
    ...updates,
    updatedAt: serverTimestamp()
  })
  if (updates.name && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: updates.name })
  }
}

export async function uploadAvatar(uid, file) {
  const base64DataUrl = await compressImageToBase64(file, 400, 0.7)
  const imageDocRef = await addDoc(collection(db, "images"), {
    data: base64DataUrl,
    createdAt: serverTimestamp()
  })
  await updateDoc(doc(db, "users", uid), {
    avatarImageId: imageDocRef.id,
    updatedAt: serverTimestamp()
  })
  return base64DataUrl
}

export async function addRewardsPoints(uid, points) {
  await updateDoc(doc(db, "users", uid), {
    rewardsPoints: increment(points),
    updatedAt: serverTimestamp()
  })
  await recomputeMembershipTier(uid)
}

export async function recomputeMembershipTier(uid) {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) return
  const pts = snap.data().rewardsPoints
  let tier = "silver"
  if (pts >= 2000) tier = "platinum"
  else if (pts >= 500) tier = "gold"
  await updateDoc(doc(db, "users", uid), { membershipTier: tier })
}

export function cashbackRate(tier) {
  return { silver: 0.03, gold: 0.05, platinum: 0.08 }[tier]
}
