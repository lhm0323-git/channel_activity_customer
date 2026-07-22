import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
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
  signInAnonymously,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { filterBookingsByChannel } from "./core.js";

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

async function ensurePublicUser() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

export function watchStaffAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInStaff() {
  if (!auth) throw new Error("Firebase 尚未設定，無法登入員工帳號");
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutStaff() {
  if (auth) await signOut(auth);
}

export async function saveBooking(payload) {
  if (!db) return saveLocalBooking(payload);

  const user = await ensurePublicUser();
  const now = serverTimestamp();
  await setDoc(
    doc(db, "customers", payload.customer.customerId),
    { ...payload.customer, ownerUid: user.uid, createdAt: now, updatedAt: now },
    { merge: true }
  );

  const bookingRef = await addDoc(collection(db, "bookings"), {
    ...payload.booking,
    ownerUid: user.uid,
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

function bookingCreatedAtMs(booking) {
  const value = booking.createdAt;
  if (value?.toMillis) return value.toMillis();
  return Date.parse(value || "") || 0;
}

function sortBookings(bookings) {
  return [...bookings].sort((a, b) => bookingCreatedAtMs(a) - bookingCreatedAtMs(b));
}

export async function listBookingsByRange(startDate, endDate, channel = "ALL") {
  if (!startDate || !endDate) return [];
  if (!db) {
    const bookings = JSON.parse(localStorage.getItem("cac_local_bookings") || "[]").filter(
      (booking) => booking.appointmentDate >= startDate && booking.appointmentDate <= endDate
    );
    return sortBookings(filterBookingsByChannel(bookings, channel));
  }

  const q = query(collection(db, "bookings"), where("appointmentDate", ">=", startDate), where("appointmentDate", "<=", endDate));
  const snapshot = await getDocs(q);
  const bookings = snapshot.docs.map((docSnap) => ({ bookingId: docSnap.id, ...docSnap.data() }));
  return sortBookings(filterBookingsByChannel(bookings, channel));
}

export async function listBookingsByDate(appointmentDate, channel = "ALL") {
  if (!appointmentDate) return [];
  if (!db) {
    const bookings = JSON.parse(localStorage.getItem("cac_local_bookings") || "[]").filter(
      (booking) => booking.appointmentDate === appointmentDate
    );
    return sortBookings(filterBookingsByChannel(bookings, channel));
  }

  const q = query(collection(db, "bookings"), where("appointmentDate", "==", appointmentDate));
  const snapshot = await getDocs(q);
  const bookings = snapshot.docs.map((docSnap) => ({ bookingId: docSnap.id, ...docSnap.data() }));
  return sortBookings(filterBookingsByChannel(bookings, channel));
}

export async function listMyBookings() {
  if (!db) return JSON.parse(localStorage.getItem("cac_local_bookings") || "[]");
  const user = await ensurePublicUser();
  const q = query(collection(db, "bookings"), where("ownerUid", "==", user.uid));
  const snapshot = await getDocs(q);
  return sortBookings(snapshot.docs.map((docSnap) => ({ bookingId: docSnap.id, ...docSnap.data() })));
}

export async function requestBookingChange(change) {
  if (!db) return { localOnly: true };
  const user = await ensurePublicUser();
  const bookingRef = doc(db, "bookings", change.bookingId);
  const bookingSnap = await getDoc(bookingRef);
  if (!bookingSnap.exists()) throw new Error("Booking not found");
  const booking = bookingSnap.data();
  if (booking.ownerUid !== user.uid) throw new Error("You can only change your own booking");
  const requestRef = await addDoc(collection(db, "bookingChangeRequests"), {
    ...change,
    ownerUid: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { requestId: requestRef.id, localOnly: false };
}

export async function listPendingChangeRequests() {
  if (!db) return [];
  const q = query(collection(db, "bookingChangeRequests"), where("status", "==", "pending"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ requestId: docSnap.id, ...docSnap.data() }));
}

export function watchPendingChangeRequests(callback) {
  if (!db) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, "bookingChangeRequests"), where("status", "==", "pending"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => ({ requestId: docSnap.id, ...docSnap.data() })));
  });
}

export async function updateBooking(bookingId, fields) {
  if (!db) return { localOnly: true };
  await updateDoc(doc(db, "bookings", bookingId), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
  return { localOnly: false };
}

export async function cancelBooking(bookingId) {
  if (!db) {
    const saved = JSON.parse(localStorage.getItem("cac_local_bookings") || "[]");
    const next = saved.map((booking) =>
      booking.bookingId === bookingId
        ? { ...booking, status: "CANCELLED", cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : booking
    );
    localStorage.setItem("cac_local_bookings", JSON.stringify(next));
    return { localOnly: true };
  }
  await updateDoc(doc(db, "bookings", bookingId), {
    status: "CANCELLED",
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { localOnly: false };
}
export async function confirmBooking(bookingId) {
  if (!db) return;
  await updateDoc(doc(db, "bookings", bookingId), {
    status: "CONFIRMED",
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function approveChangeRequest(request) {
  if (!db) return;
  const now = serverTimestamp();
  await updateDoc(doc(db, "bookings", request.bookingId), {
    appointmentDate: request.requestedAppointmentDate,
    status: "CONFIRMED",
    updatedAt: now,
  });
  await updateDoc(doc(db, "bookingChangeRequests", request.requestId), {
    status: "approved",
    approvedAt: now,
    updatedAt: now,
  });
}

export async function listManagedPackages() {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "managedPackages"));
  return snapshot.docs.map((docSnap) => ({ docId: docSnap.id, ...docSnap.data() }));
}

export async function saveManagedPackage({ name, itemIds, audience, bodyParts = [], finalPrice }) {
  if (!db) return { localOnly: true };
  await setDoc(doc(db, "managedPackages", packageDocId(name)), {
    name,
    itemIds,
    audience,
    bodyParts,
    finalPrice: Number(finalPrice) || 0,
    deleted: false,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { localOnly: false };
}

export async function getStaffUser(email) {
  if (!db || !email) return null;
  const cleanEmail = String(email).trim().toLowerCase();
  const snap = await getDoc(doc(db, "staffUsers", cleanEmail));
  return snap.exists() ? { email: cleanEmail, ...snap.data() } : null;
}

export async function listStaffUsers() {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "staffUsers"));
  return snapshot.docs.map((docSnap) => ({ email: docSnap.id, ...docSnap.data() }));
}

export async function saveStaffUser(email) {
  if (!db) return { localOnly: true };
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Invalid email");
  await setDoc(doc(db, "staffUsers", cleanEmail), {
    email: cleanEmail,
    active: true,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { email: cleanEmail, localOnly: false };
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
