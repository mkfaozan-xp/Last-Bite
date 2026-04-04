import { initializeApp, getApps } from 'firebase/app';
import { getAuth }      from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage }   from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey:            "AIzaSyAeWUUlhuO-1nh6TfAY2CgMNzoonylA9k8",
  authDomain:        "last-bite-179b2.firebaseapp.com",
  projectId:         "last-bite-179b2",
  storageBucket:     "last-bite-179b2.firebasestorage.app",
  messagingSenderId: "510963435427",
  appId:             "1:510963435427:web:bc7a30c293118c5de33c16",
  measurementId:     "G-P22BFP80WH"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const storage   = getStorage(app);
export const functions = getFunctions(app, 'asia-south1');

export default app;
