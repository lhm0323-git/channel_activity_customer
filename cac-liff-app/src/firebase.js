import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const app = isConfigured ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;
const provider = new GoogleAuthProvider();

export const isFirebaseConfigured = isConfigured;

function packageDocId(name) {
  return encodeURIComponent(name).replace(/\./g, "%2E");
}

function saveLocalBooking(payload) {
  const bookingId = `local-${Date.now()}`;
  const saved = JSON.parse(localStorage.getItem("cac_local_bookings") || "[]");
  const booking = { ...payload.booking, bookingId, localOnly: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  saved.push(booking);
  localStorage.setItem("cac_local_bookings", JSON.stringify(saved));
  return { bookingId, localOnly: true };
}

export function watchStaffAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInStaff() {
  if (!auth) throw new Error("Firebase 尚未設定，無法登入內部工具");
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutStaff() {
  if (auth) await signOut(auth);
}

export async function saveBooking(payload) {
  if (!db) return saveLocalBooking(payload);

  const now = serverTimestamp();
  await setDoc(
    doc(db, "customers", payload.customer.customerId),
    { ...payload.customer, createdAt: now, updatedAt: now },
    { merge: true }
  );

  const bookingRef = await addDoc(collection(db, "bookings"), {
    ...payload.booking,
    createdAt: now,
    updatedAt: now,
  });

  return { bookingId: bookingRef.id, localOnly: false };
}

export async function saveChecklist(bookingId, checklist) {
  if (!db) return;
  await setDoc(
    doc(db, "checklists", bookingId),
    {
      ...checklist,
      bookingId,
      generatedAt: serverTimestamp(),
      printedAt: null,
    },
    { merge: true }
  );
}

export async function markChecklistPrinted(bookingId) {
  if (!db) return;
  await updateDoc(doc(db, "checklists", bookingId), { printedAt: serverTimestamp() });
}

export async function listBookingsByDate(appointmentDate) {
  if (!appointmentDate) return [];
  if (!db) {
    return JSON.parse(localStorage.getItem("cac_local_bookings") || "[]").filter(
      (booking) => booking.appointmentDate === appointmentDate
    );
  }

  const q = query(collection(db, "bookings"), where("appointmentDate", "==", appointmentDate), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ bookingId: docSnap.id, ...docSnap.data() }));
}

export async function listManagedPackages() {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "managedPackages"));
  return snapshot.docs.map((docSnap) => ({ docId: docSnap.id, ...docSnap.data() }));
}

export async function saveManagedPackage({ name, itemIds, audience, finalPrice }) {
  if (!db) return { localOnly: true };
  await setDoc(doc(db, "managedPackages", packageDocId(name)), {
    name,
    itemIds,
    audience,
    finalPrice: Number(finalPrice) || 0,
    deleted: false,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { localOnly: false };
}

export async function deleteManagedPackage(name, itemIds = []) {
  if (!db) return { localOnly: true };
  await setDoc(doc(db, "managedPackages", packageDocId(name)), {
    name,
    itemIds,
    deleted: true,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { localOnly: false };
}