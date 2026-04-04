import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { db, auth } from "../firebase"
import {
  getFirestoreImageData,
  uploadFirestoreImage,
} from "./firestoreImageService"

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) return null
  const data = snap.data()
  
  let avatar = data.avatar;
  if (data.avatarImageId) {
    avatar = await getFirestoreImageData(data.avatarImageId) || avatar;
  }

  return {
    uid,
    ...data,
    avatar, 
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
  const { imageId, data } = await uploadFirestoreImage(file, {
    maxSize: 400,
    quality: 0.7,
    metadata: {
      ownerType: 'user',
      ownerId: uid,
      kind: 'avatar',
    },
  })
  await updateDoc(doc(db, "users", uid), {
    avatarImageId: imageId,
    updatedAt: serverTimestamp()
  })
  return data
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
