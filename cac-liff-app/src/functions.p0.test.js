import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously, createUserWithEmailAndPassword, signInWithCustomToken, signOut } from "firebase/auth";
import { createRequire } from "node:module";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, terminate } from "firebase/firestore";

const app = initializeApp({ apiKey: "test", appId: "test", projectId: "channel-activity-customer" }, "p0-functions");
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

const require = createRequire(import.meta.url);
const admin = require("../functions/node_modules/firebase-admin");
const adminApp = admin.initializeApp({ projectId: "channel-activity-customer" }, "p0-admin");

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
const staffEmail = "csv-staff@example.com";
await signOut(auth);
await createUserWithEmailAndPassword(auth, staffEmail, "csv-import-test-password");
await admin.firestore(adminApp).doc("staffUsers/" + staffEmail).set({ email: staffEmail, active: true, role: "STAFF" });
const bulkClaimEmails = httpsCallable(functions, "sendBookingClaimEmailsAsStaff");
await assert.rejects(bulkClaimEmails({ bookingIds: [] }));
await assert.rejects(bulkClaimEmails({ bookingIds: Array.from({ length: 31 }, (_, index) => `booking-${index}`) }));
console.log("ok - claim-email batch rejects an empty selection");
const createStaffImport = httpsCallable(functions, "createBooking");
const imported = await createStaffImport({
  payload: {
    customer: { name: "CSV staff import", phone: "0999000000", email: "", idNumberMasked: "" },
    booking: {
      source: "STAFF_CSV", appointmentDate: "2099-01-03", channel: "GENERAL", packageName: "P0 CSV Package",
      selectedItems: [{ id: "item-2", name: "P0 CSV Item", category: "test", price: 200 }],
      listPrice: 200, discountRate: 0, finalPrice: 200, notes: "",
    },
  },
  lineAccessToken: "",
});
assert.ok(imported.data.bookingId);
const importedBooking = await getDoc(doc(db, "bookings", imported.data.bookingId));
assert.equal(importedBooking.data().customerEmail, "");
assert.equal(importedBooking.data().notificationChannel, "NONE");
console.log("ok - active staff CSV import accepts blank Email and LINE ID");

await admin.firestore(adminApp).doc("staffUsers/ptch:07911").set({ empid: "07911", active: true, role: "STAFF" });
await signOut(auth);
const hospitalToken = await admin.auth(adminApp).createCustomToken("ptch:07911", { staffKey: "ptch:07911", empid: "07911", staffRole: "STAFF", authSource: "PTCH" });
await signInWithCustomToken(auth, hospitalToken);
const createHospitalStaffImport = httpsCallable(functions, "createBooking");
const hospitalImported = await createHospitalStaffImport({
  payload: {
    customer: { name: "Hospital staff import", phone: "0999000001", email: "", idNumberMasked: "" },
    booking: { source: "STAFF_CSV", appointmentDate: "2099-01-04", channel: "GENERAL", packageName: "P0 Hospital Package", selectedItems: [{ id: "item-3", name: "P0 Hospital Item", category: "test", price: 100 }], listPrice: 100, discountRate: 0, finalPrice: 100, notes: "" },
  },
  lineAccessToken: "",
});
assert.ok(hospitalImported.data.bookingId);
console.log("ok - hospital custom-token staff CSV import accepts blank Email and LINE ID");

const saveQuestionnaireAsStaff = httpsCallable(functions, "saveBookingQuestionnaireResponseAsStaff");
const getQuestionnaireAsStaff = httpsCallable(functions, "getBookingQuestionnaireResponseAsStaff");
const staffQuestionnaire = await saveQuestionnaireAsStaff({
  bookingId: imported.data.bookingId,
  questionnaireId: "general-health",
  answers: { q1: "staff corrected", q2: ["none"] },
});
assert.equal(staffQuestionnaire.data.responseId, `${imported.data.bookingId}_general-health`);
const loadedStaffQuestionnaire = await getQuestionnaireAsStaff({
  bookingId: imported.data.bookingId,
  questionnaireId: "general-health",
});
assert.deepEqual(loadedStaffQuestionnaire.data.response.answers, { q1: "staff corrected", q2: ["none"] });
assert.equal(loadedStaffQuestionnaire.data.response.bookingId, imported.data.bookingId);
console.log("ok - staff questionnaire correction is scoped to the selected booking");
await admin.app("p0-admin").delete();
console.log("ok - P0 Functions create, questionnaire, reschedule, and cancel retain public workflow");
await terminate(db);
await deleteApp(app);


