import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const testEnv = await initializeTestEnvironment({
  projectId: "cac-p0-rules",
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
});

try {
  const patient = testEnv.authenticatedContext("patient-uid", { email: "patient@example.com" }).firestore();
  const stranger = testEnv.authenticatedContext("stranger-uid", { email: "stranger@example.com" }).firestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "bookings", "owned-booking"), { ownerUid: "patient-uid", customerName: "Patient" });
    await setDoc(doc(db, "bookings", "staff-edit"), { ownerUid: "patient-uid", customerName: "Patient" });
    await setDoc(doc(db, "staffUsers", "staff@example.com"), { email: "staff@example.com", active: true });
    await setDoc(doc(db, "staffUsers", "disabled@example.com"), { email: "disabled@example.com", active: false });
    await setDoc(doc(db, "auditLogs", "booking-update"), { bookingId: "staff-edit", action: "UPDATE" });
    await setDoc(doc(db, "managedPackages", "internal-package"), { name: "Internal package", visibility: "INTERNAL" });
  });

  await assertSucceeds(getDoc(doc(patient, "bookings", "owned-booking")));
  await assertFails(getDoc(doc(stranger, "bookings", "owned-booking")));
  await assertFails(setDoc(doc(patient, "bookings", "forged-booking"), { ownerUid: "patient-uid" }));
  await assertFails(setDoc(doc(patient, "customers", "forged-customer"), { ownerUid: "patient-uid" }));
  await assertFails(setDoc(doc(patient, "checklists", "owned-booking"), { bookingId: "owned-booking" }));
  await assertFails(setDoc(doc(patient, "customerQuestionnaireResponses", "owned-booking_general"), { ownerUid: "patient-uid" }));

  const staff = testEnv.authenticatedContext("staff-uid", { email: "staff@example.com" }).firestore();
  const disabledStaff = testEnv.authenticatedContext("disabled-uid", { email: "disabled@example.com" }).firestore();
  const bootstrapAdmin = testEnv.authenticatedContext("admin-uid", { email: "lhm0323@gmail.com" }).firestore();
  await assertFails(updateDoc(doc(staff, "bookings", "staff-edit"), { notes: "staff correction" }));
  await assertFails(updateDoc(doc(disabledStaff, "bookings", "staff-edit"), { notes: "should fail" }));
  await assertSucceeds(getDoc(doc(bootstrapAdmin, "auditLogs", "booking-update")));
  await assertFails(getDoc(doc(staff, "auditLogs", "booking-update")));
  await assertFails(getDoc(doc(patient, "managedPackages", "internal-package")));
  await assertSucceeds(getDoc(doc(staff, "managedPackages", "internal-package")));

  console.log("ok - Firestore rules block direct booking writes, restrict audit logs, and hide managed packages from the public");
} finally {
  await testEnv.cleanup();
}