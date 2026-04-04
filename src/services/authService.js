import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const googleProvider = new GoogleAuthProvider();

async function ensureRoleProfile(uid, userType, name, email, orgName = '', address = '') {
  if (userType === 'restaurant') {
    await setDoc(doc(db, 'restaurants', uid), {
      ownerId: uid,
      name: orgName || name,
      email,
      address: address || '',
      isPartner: false,
      isActive: true,
      rating: 0,
      totalOrders: 0,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else if (userType === 'ngo') {
    await setDoc(doc(db, 'ngos', uid), {
      ownerId: uid,
      name: orgName || name,
      email,
      address: address || '',
      totalDonationsReceived: 0,
      mealsServed: 0,
      isVerified: false,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

export async function signUpWithEmail(
  email,
  password,
  name,
  userType,
  orgName = '',
  address = ''
) {
  const credential   = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = credential.user;
  await updateProfile(firebaseUser, { displayName: name });

  const newUser = {
    email,
    name,
    userType,
    walletBalance:  0,
    rewardsPoints:  0,
    membershipTier: 'silver',
    createdAt:      serverTimestamp(),
    updatedAt:      serverTimestamp(),
  };
  await setDoc(doc(db, 'users', firebaseUser.uid), newUser);

  await ensureRoleProfile(firebaseUser.uid, userType, name, email, orgName, address);

  return { uid: firebaseUser.uid, ...newUser, createdAt: new Date(), updatedAt: new Date() };
}

export async function signInWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile    = await getUserProfile(credential.user.uid);
  if (!profile) throw new Error('User profile not found.');
  return profile;
}

export async function signInWithGoogle(userType = 'customer') {
  const credential   = await signInWithPopup(auth, googleProvider);
  const firebaseUser = credential.user;
  const existing     = await getUserProfile(firebaseUser.uid);
  if (existing) {
    await ensureRoleProfile(
      firebaseUser.uid,
      existing.userType,
      existing.name ?? firebaseUser.displayName ?? 'User',
      existing.email ?? firebaseUser.email,
    );
    return existing;
  }

  const newUser = {
    email:          firebaseUser.email,
    name:           firebaseUser.displayName ?? 'User',
    avatar:         firebaseUser.photoURL ?? undefined,
    userType,
    walletBalance:  0,
    rewardsPoints:  0,
    membershipTier: 'silver',
    createdAt:      serverTimestamp(),
    updatedAt:      serverTimestamp(),
  };
  await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
  await ensureRoleProfile(
    firebaseUser.uid,
    userType,
    newUser.name,
    newUser.email,
  );
  return { uid: firebaseUser.uid, ...newUser, createdAt: new Date(), updatedAt: new Date() };
}

export async function logOut() {
  await signOut(auth);
}

export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}


export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}
