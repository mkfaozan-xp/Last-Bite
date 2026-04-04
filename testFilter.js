import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAeWUUlhuO-1nh6TfAY2CgMNzoonylA9k8",
  projectId: "last-bite-179b2",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, 'foodItems'));
  snap.forEach(d => {
    const data = d.data();
    if (data.restaurantName?.includes('Faozan') || data.name?.includes('Killo') || data.name?.includes('burger')) {
      console.log(`[DB] ID:${d.id} | Name: ${data.name} | Rest: ${data.restaurantName} | Orig: ${data.originalPrice} | Disc: ${data.discountedPrice}`);
    }
  });
  process.exit(0);
}
run();
