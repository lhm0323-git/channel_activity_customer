import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, terminate } from "firebase/firestore";

const app = initializeApp({ apiKey: "test", appId: "test", projectId: "channel-activity-customer" }, "p0-functions");
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

await signInAnonymously(auth);
const createBooking = httpsCallable(functions, "createBooking");
const created = await createBooking({
  payload: {
    customer: { name: "P0 Test", phone: "0912345678", email: "p0@example.com", idNumberMasked: "A1***89" },
    booking: {
      appointmentDate: "2099-01-01", channel: "GENERAL", packageName: "P0 Package",
      selectedItems: [{ id: "item-1", name: "P0 Item", category: "test", price: 100 }],
      listPrice: 100, discountRate: 0, finalPrice: 100, notes: "test",
    },
  },
  lineAccessToken: "",
});
const bookingId = created.data.bookingId;
assert.ok(bookingId);
assert.ok(created.data.claimToken);

const booking = await getDoc(doc(db, "bookings", bookingId));
assert.equal(booking.data().customerName, "P0 Test");
assert.equal(booking.data().ownerUid, auth.currentUser.uid);
await assert.rejects(setDoc(doc(db, "bookings", bookingId), { ownerUid: auth.currentUser.uid, customerName: "forged" }));

const saveQuestionnaire = httpsCallable(functions, "saveMyQuestionnaireResponse");
const questionnaire = await saveQuestionnaire({ bookingId, questionnaireId: "general-health", answers: { q1: "answer", q2: ["a", "b"] } });
assert.equal(questionnaire.data.responseId, `${bookingId}_general-health`);

const requestChange = httpsCallable(functions, "requestBookingChange");
const changed = await requestChange({ change: { bookingId, requestedAppointmentDate: "2099-01-02", notes: "reschedule" } });
assert.ok(changed.data.requestId);

const cancelBooking = httpsCallable(functions, "cancelBooking");
const cancelled = await cancelBooking({ bookingId });
assert.equal(cancelled.data.cancelled, true);
const afterCancel = await getDoc(doc(db, "bookings", bookingId));
assert.equal(afterCancel.data().status, "CANCELLED");
console.log("ok - P0 Functions create, questionnaire, reschedule, and cancel retain public workflow");
await terminate(db);
await deleteApp(app);


