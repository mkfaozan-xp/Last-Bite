import { initializeApp, getApps } from 'firebase/app';
import { getAuth }      from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCbZQmOWOPLR1H_eCEIllFZajuDkQ-l6hs",
  authDomain: "surplus-food-4cc9f.firebaseapp.com",
  projectId: "surplus-food-4cc9f",
  storageBucket: "surplus-food-4cc9f.firebasestorage.app",
  messagingSenderId: "916375810203",
  appId: "1:916375810203:web:5ef31e64ea85a18dec963e",
  measurementId: "G-07KDH874G8"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const functions = getFunctions(app, 'asia-south1');

export default app;
