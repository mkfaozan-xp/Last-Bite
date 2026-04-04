import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, increment, arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'donations';

function mapDoc(id, data) {
  return {
    id, ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

export async function createDonation(
  donation
) {
  const docRef = await addDoc(collection(db, COL), {
    ...donation, ngoId: null, status: 'pending',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function acceptDonation(donationId, ngoId) {
  const docRef = doc(db, COL, donationId);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    throw new Error('Donation request does not exist.');
  }

  const donation = snap.data();
  if (donation.status !== 'pending') {
    throw new Error('This donation has already been claimed by another NGO.');
  }

  await updateDoc(docRef, {
    ngoId, 
    status: 'accepted', 
    updatedAt: serverTimestamp(),
  });
  
  await updateDoc(doc(db, 'ngos', ngoId), {
    totalDonationsReceived: increment(1),
    mealsServed:            increment(donation.estimatedServings ?? 0),
  });
}

export async function rejectDonation(donationId, ngoId) {
  if (!ngoId) return;
  await updateDoc(doc(db, COL, donationId), {
    declinedBy: arrayUnion(ngoId),
    updatedAt: serverTimestamp(),
  });
}

export async function markDonationPickedUp(donationId) {
  await updateDoc(doc(db, COL, donationId), {
    status: 'picked_up', updatedAt: serverTimestamp(),
  });
}

import { getDoc } from 'firebase/firestore';

export async function getPendingDonations() {
  const snap = await getDocs(
    query(collection(db, COL), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
  );
  let docs = snap.docs.map(d => mapDoc(d.id, d.data()));
  return Promise.all(docs.map(enrichAddress));
}

export async function getRestaurantDonations(restaurantId) {
  const snap = await getDocs(
    query(collection(db, COL), where('restaurantId', '==', restaurantId), orderBy('createdAt', 'desc'))
  );
  let docs = snap.docs.map(d => mapDoc(d.id, d.data()));
  return Promise.all(docs.map(enrichAddress));
}

export async function getNgoDonations(ngoId) {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where('ngoId',  '==', ngoId),
      where('status', 'in', ['accepted', 'picked_up']),
      orderBy('createdAt', 'desc')
    )
  );
  let docs = snap.docs.map(d => mapDoc(d.id, d.data()));
  return Promise.all(docs.map(enrichAddress));
}

async function enrichAddress(docData) {
  if (docData.restaurantId) {
    try {
      const uSnap = await getDoc(doc(db, 'users', docData.restaurantId));
      if (uSnap.exists()) {
        const data = uSnap.data();
        return { 
          ...docData, 
          restaurantAddress: docData.restaurantAddress || data.address || '120 Market St (Default Area)',
          restaurantEmail: data.email || ''
        };
      }
    } catch (e) {
      console.warn("Failed to lookup restaurant details", e);
    }
  }
  return { ...docData, restaurantAddress: docData.restaurantAddress || '120 Market St (Default Area)' };
}

export function listenToPendingDonations(ngoId, cb) {
  return onSnapshot(
    query(collection(db, COL), where('status', '==', 'pending'), orderBy('createdAt', 'desc')),
    async (snap) => {
      let docs = snap.docs.map(d => mapDoc(d.id, d.data()));
      if (ngoId) {
        docs = docs.filter(d => !(d.declinedBy || []).includes(ngoId));
      }
      const enriched = await Promise.all(docs.map(enrichAddress));
      cb(enriched);
    }
  );
}

export function listenToNgoDonations(ngoId, cb) {
  return onSnapshot(
    query(
      collection(db, COL),
      where('ngoId',  '==', ngoId),
      where('status', 'in', ['accepted', 'picked_up']),
      orderBy('createdAt', 'desc')
    ),
    async (snap) => {
      let docs = snap.docs.map(d => mapDoc(d.id, d.data()));
      const enriched = await Promise.all(docs.map(enrichAddress));
      cb(enriched);
    }
  );
}
