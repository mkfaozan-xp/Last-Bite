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
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import { decreaseItemQuantity } from './foodItemService';
import { creditWallet, debitWallet } from './walletService';
import { addRewardsPoints, cashbackRate } from './userService';
import { getUserProfile } from './userService';

const COL = 'orders';

function mapDoc(id, data) {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

export async function placeOrder(params) {
  const subtotal = params.items.reduce((s, i) => s + i.price, 0);
  const total = subtotal;
  const profile = await getUserProfile(params.customerId);
  if (!profile) throw new Error('User not found');

  const walletUsed = params.useWallet ? Math.min(profile.walletBalance, total) : 0;
  const cashbackAmt = Math.round(total * cashbackRate(profile.membershipTier));
  let orderId = '';

  await runTransaction(db, async (txn) => {
    const userRef = doc(db, 'users', params.customerId);
    const userSnap = await txn.get(userRef);
    if (!userSnap.exists()) throw new Error('User not found');
    
    const currentBalance = userSnap.data().walletBalance;
    if (walletUsed > 0 && currentBalance < walletUsed) {
      throw new Error('Insufficient wallet balance');
    }

    const orderRef = doc(collection(db, COL));
    orderId = orderRef.id;
    
    txn.set(orderRef, {
      customerId: params.customerId,
      customerName: params.customerName || "Customer",
      restaurantId: params.restaurantId,
      restaurantName: params.restaurantName,
      items: params.items,
      subtotal,
      discount: 0,
      total,
      walletUsed,
      cashback: cashbackAmt,
      status: 'pending',
      pickupTime: params.pickupTime,
      address: params.address,
      trainDelivery: params.trainDelivery ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (walletUsed > 0) {
      txn.update(userRef, { walletBalance: currentBalance - walletUsed });
    }
  });

  await Promise.all(
    params.items.map((item) => decreaseItemQuantity(item.foodItemId, item.quantity))
  );

  if (walletUsed > 0) {
    await debitWallet(params.customerId, walletUsed, `Order #${orderId}`, 'order', orderId);
  }

  await addRewardsPoints(params.customerId, Math.floor(total / 10));
  
  return orderId;
}


export async function updateOrderStatus(id, status) {
  await updateDoc(doc(db, COL, id), { 
    status, 
    updatedAt: serverTimestamp() 
  });
}

export async function rateOrder(id, rating, review) {
  await updateDoc(doc(db, COL, id), { 
    rating, 
    review: review ?? '', 
    updatedAt: serverTimestamp() 
  });
}

export async function cancelOrder(orderId) {
  const snap = await getDoc(doc(db, COL, orderId));
  if (!snap.exists()) throw new Error('Order not found');
  
  const order = snap.data();
  if (['delivered', 'picked_up'].includes(order.status)) {
    throw new Error('Cannot cancel a completed order');
  }

  await updateDoc(doc(db, COL, orderId), { 
    status: 'cancelled', 
    updatedAt: serverTimestamp() 
  });

  if (order.walletUsed > 0) {
    await creditWallet(
      order.customerId, 
      order.walletUsed, 
      `Refund for Order #${orderId}`, 
      'refund', 
      orderId
    );
  }
}

export async function getOrder(id) {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return mapDoc(snap.id, snap.id && snap.data());
}


export async function getCustomerOrders(customerId) {
  const snap = await getDocs(
    query(
      collection(db, COL), 
      where('customerId', '==', customerId)
    )
  );
  const docs = snap.docs.map((d) => mapDoc(d.id, d.data()));
  docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return docs;
}


export async function getRestaurantOrders(restaurantId) {
  const snap = await getDocs(
    query(
      collection(db, COL), 
      where('restaurantId', '==', restaurantId)
    )
  );
  const docs = snap.docs.map((d) => mapDoc(d.id, d.data()));
  docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return docs;
}


export function listenToRestaurantOrders(restaurantId, cb) {
  return onSnapshot(
    query(
      collection(db, COL),
      where('restaurantId', '==', restaurantId)
    ),
    (snap) => {
      let docs = snap.docs.map((d) => mapDoc(d.id, d.data()));
      docs = docs.filter(d => ['pending', 'confirmed', 'ready'].includes(d.status));
      docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      cb(docs);
    }
  );
}


export function listenToCustomerOrders(customerId, cb) {
  return onSnapshot(
    query(
      collection(db, COL), 
      where('customerId', '==', customerId)
    ),
    (snap) => {
      const docs = snap.docs.map((d) => mapDoc(d.id, d.data()));
      docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      cb(docs);
    }
  );
}

export function listenToAllRestaurantOrders(restaurantId, cb) {
  return onSnapshot(
    query(
      collection(db, COL), 
      where('restaurantId', '==', restaurantId)
    ),
    (snap) => {
      const docs = snap.docs.map((d) => mapDoc(d.id, d.data()));
      docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      cb(docs);
    }
  );
}
