import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  runTransaction
} from "firebase/firestore"
import { db } from "../firebase"

const USERS = "users"
const TXNS = "transactions"

function mapTxn(id, data) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date()
  }
}

export async function topUpWallet(uid, amount) {
  if (amount <= 0) throw new Error("Amount must be positive")
  await runTransaction(db, async txn => {
    const userRef = doc(db, USERS, uid)
    const userSnap = await txn.get(userRef)
    if (!userSnap.exists()) throw new Error("User not found")
    const newBalance = userSnap.data().walletBalance + amount
    txn.update(userRef, {
      walletBalance: newBalance,
      updatedAt: serverTimestamp()
    })
    txn.set(doc(collection(db, TXNS)), {
      userId: uid,
      type: "credit",
      amount,
      description: "Wallet top-up",
      source: "topup",
      balance: newBalance,
      createdAt: serverTimestamp()
    })
  })
}

export async function creditWallet(uid, amount, description, source, orderId) {
  await updateDoc(doc(db, USERS, uid), {
    walletBalance: increment(amount),
    updatedAt: serverTimestamp()
  })
  const snap = await getDoc(doc(db, USERS, uid))
  const newBalance = snap.data()?.walletBalance
  await addDoc(collection(db, TXNS), {
    userId: uid,
    type: "credit",
    amount,
    description,
    source,
    balance: newBalance,
    orderId: orderId ?? null,
    createdAt: serverTimestamp()
  })
}

export async function debitWallet(uid, amount, description, source, orderId) {
  const userSnap = await getDoc(doc(db, USERS, uid))
  if (!userSnap.exists()) throw new Error("User not found")
  const currentBalance = userSnap.data().walletBalance
  if (currentBalance < amount) throw new Error("Insufficient wallet balance")
  const newBalance = currentBalance - amount
  await updateDoc(doc(db, USERS, uid), {
    walletBalance: newBalance,
    updatedAt: serverTimestamp()
  })
  await addDoc(collection(db, TXNS), {
    userId: uid,
    type: "debit",
    amount,
    description,
    source,
    balance: newBalance,
    orderId: orderId ?? null,
    createdAt: serverTimestamp()
  })
}

export async function sendGiftCard(senderUid, receiverEmail, amount) {
  if (amount <= 0) throw new Error("Gift card amount must be positive")
  const snap = await getDocs(
    query(collection(db, USERS), where("email", "==", receiverEmail), limit(1))
  )
  if (snap.empty) throw new Error("Recipient email not found on LastBite")
  const receiverUid = snap.docs[0].id
  if (receiverUid === senderUid)
    throw new Error("Cannot send gift card to yourself")
  await debitWallet(
    senderUid,
    amount,
    `Gift card sent to ${receiverEmail}`,
    "gift_send"
  )
  await creditWallet(receiverUid, amount, "Gift card received", "gift_receive")
}

export async function getWalletBalance(uid) {
  const snap = await getDoc(doc(db, USERS, uid))
  if (!snap.exists()) throw new Error("User not found")
  return snap.data().walletBalance
}

export async function getTransactions(uid, maxItems = 50) {
  const snap = await getDocs(
    query(
      collection(db, TXNS),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(maxItems)
    )
  )
  return snap.docs.map(d => mapTxn(d.id, d.data()))
}

export function listenToTransactions(uid, cb) {
  return onSnapshot(
    query(
      collection(db, TXNS),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(30)
    ),
    snap => cb(snap.docs.map(d => mapTxn(d.id, d.data())))
  )
}
