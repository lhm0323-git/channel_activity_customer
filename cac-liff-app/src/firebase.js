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

function saveLocalBooking(payload) {
  const bookingId = `local-${Date.now()}`;
  const saved = JSON.parse(localStorage.getItem("cac_local_bookings") || "[]");
  const booking = { ...payload.booking, bookingId, localOnly: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  saved.push(booking);
  localStorage.setItem("cac_local_bookings", JSON.stringify(saved));
  return { bookingId, localOnly: true };
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
