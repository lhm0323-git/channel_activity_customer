const crypto = require("crypto");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();

const lineChannelAccessToken = defineSecret("LINE_CHANNEL_ACCESS_TOKEN");
const LIFF_ID = "2010725321-sRRkD0Le";

function taipeiDate(offsetDays = 0) {
  const now = new Date();
  const taipei = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  taipei.setDate(taipei.getDate() + offsetDays);
  return taipei.toISOString().slice(0, 10);
}

function buildD1Message(bookingId, booking, ackToken) {
  const date = booking.appointmentDate || "";
  const packageName = booking.packageName || "\u5065\u6aa2\u5957\u9910";
  const serial = booking.checkInSerial || "-";
  return {
    type: "template",
    altText: "\u5c4f\u57fa\u5065\u6aa2\u63d0\u9192\uff1a\u60a8\u9810\u7d04 " + date + " " + packageName,
    template: {
      type: "buttons",
      title: "\u5c4f\u57fa\u5065\u6aa2\u5230\u6aa2\u63d0\u9192",
      text: "\u63d0\u9192\u60a8\u660e\u65e5 " + date + " \u9810\u7d04 " + packageName + "\u3002\u5831\u5230\u5e8f\u865f\uff1a" + serial + "\u3002",
      actions: [
        { type: "uri", label: "\u5831\u5230\u5e8f\u865f\uff0f\u4f86\u6aa2\u9808\u77e5", uri: "https://liff.line.me/" + LIFF_ID + "?view=checkin" },
        { type: "uri", label: "\u6211\u5df2\u6536\u5230\u901a\u77e5", uri: "https://liff.line.me/" + LIFF_ID + "?view=my-bookings&ackBooking=" + encodeURIComponent(bookingId) + "&ackToken=" + encodeURIComponent(ackToken) },
      ],
    },
  };
}

async function pushLineMessage(token, to, message) {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ to, messages: [message] }),
  });
  if (!response.ok) throw new Error(String(response.status) + " " + await response.text());
}

async function markD1NoticeFailed(doc, error) {
  await doc.ref.update({
    d1NoticeStatus: "FAILED",
    d1NoticeError: String(error && error.message || error).slice(0, 500),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function sendD1Notice(doc) {
  const booking = doc.data();
  if (!booking.lineUserId) {
    const error = "Booking has no LINE user ID";
    await markD1NoticeFailed(doc, error);
    throw new HttpsError("failed-precondition", error);
  }
  if (booking.status === "CANCELLED") throw new HttpsError("failed-precondition", "Cancelled bookings cannot receive reminders");
  try {
    const ackToken = crypto.randomBytes(32).toString("hex");
    await pushLineMessage(lineChannelAccessToken.value(), booking.lineUserId, buildD1Message(doc.id, booking, ackToken));
    await doc.ref.update({
      d1NoticeStatus: "SENT",
      d1AckToken: ackToken,
      d1NoticeSentAt: admin.firestore.FieldValue.serverTimestamp(),
      d1NoticeError: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await markD1NoticeFailed(doc, error);
    throw new HttpsError("internal", "LINE reminder could not be sent");
  }
}

async function assertStaff(request) {
  const email = String(request.auth && request.auth.token && request.auth.token.email || "").trim().toLowerCase();
  if (!email) throw new HttpsError("unauthenticated", "Staff sign-in is required");
  if (email === "lhm0323@gmail.com") return;
  const staff = await admin.firestore().doc("staffUsers/" + email).get();
  if (!staff.exists || staff.data().active === false) throw new HttpsError("permission-denied", "Staff access is required");
}

exports.acknowledgeD1LineNotice = onCall(async (request) => {
  const bookingId = String(request.data && request.data.bookingId || "").trim();
  const ackToken = String(request.data && request.data.ackToken || "").trim();
  if (!bookingId || !ackToken) throw new HttpsError("invalid-argument", "Booking ID and acknowledgement token are required");

  const bookingRef = admin.firestore().doc("bookings/" + bookingId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
  const booking = bookingSnap.data();
  const savedToken = String(booking.d1AckToken || "");
  const tokenMatches = savedToken.length === ackToken.length
    && savedToken.length > 0
    && crypto.timingSafeEqual(Buffer.from(savedToken), Buffer.from(ackToken));
  if (!tokenMatches) throw new HttpsError("permission-denied", "This acknowledgement link is no longer valid");
  if (booking.status === "CANCELLED") throw new HttpsError("failed-precondition", "Cancelled booking cannot be acknowledged");

  await bookingRef.update({
    d1NoticeStatus: "ACKNOWLEDGED",
    d1AcknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
    d1AckToken: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { status: "ACKNOWLEDGED" };
});

exports.sendD1LineNotice = onCall({ secrets: [lineChannelAccessToken] }, async (request) => {
  await assertStaff(request);
  const bookingId = String(request.data && request.data.bookingId || "").trim();
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required");
  const booking = await admin.firestore().doc("bookings/" + bookingId).get();
  if (!booking.exists) throw new HttpsError("not-found", "Booking not found");
  if (booking.data().appointmentDate !== taipeiDate(1)) throw new HttpsError("failed-precondition", "Only tomorrow bookings can receive a D-1 reminder");
  if (booking.data().status !== "CONFIRMED" || !booking.data().checkInSerial) throw new HttpsError("failed-precondition", "Confirm booking and assign a check-in serial first");
  await sendD1Notice(booking);
  return { status: "SENT" };
});

exports.sendD1LineNotices = onSchedule({ schedule: "0 9 * * *", timeZone: "Asia/Taipei", secrets: [lineChannelAccessToken] }, async () => {
  const targetDate = taipeiDate(1);
  const snapshot = await admin.firestore().collection("bookings").where("appointmentDate", "==", targetDate).get();
  const outcomes = await Promise.all(snapshot.docs.map(async (doc) => {
    const booking = doc.data();
    if (booking.status === "CANCELLED") return "cancelled";
    if (booking.status !== "CONFIRMED" || !booking.checkInSerial) return "unconfirmed";
    if (booking.d1NoticeSentAt) return "alreadySent";
    if (!booking.lineUserId) return "missingLineId";
    try {
      await sendD1Notice(doc);
      return "sent";
    } catch (error) {
      console.error("D-1 notice failed for " + doc.id, error.message);
      return "failed";
    }
  }));
  const summary = outcomes.reduce((counts, outcome) => ({ ...counts, [outcome]: (counts[outcome] || 0) + 1 }), {});
  console.info("D1 scheduler target=" + targetDate + " " + JSON.stringify(summary));
});

function makeCheckInSerial(date, sequence) {
  return String(date || "").slice(5).replace("-", "") + "-" + String(sequence).padStart(3, "0");
}

exports.confirmBookingWithSerial = onCall(async (request) => {
  await assertStaff(request);
  const bookingId = String(request.data && request.data.bookingId || "").trim();
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required");
  const bookingRef = admin.firestore().doc("bookings/" + bookingId);
  const result = await admin.firestore().runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
    const booking = bookingSnap.data();
    if (booking.status === "CANCELLED") throw new HttpsError("failed-precondition", "Cancelled bookings cannot be confirmed");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.appointmentDate || "")) throw new HttpsError("failed-precondition", "Appointment date is required");
    if (booking.status === "CONFIRMED" && booking.checkInSerial) return { checkInSerial: booking.checkInSerial };
    const counterRef = admin.firestore().doc("dailyCheckInCounters/" + booking.appointmentDate);
    const counterSnap = await transaction.get(counterRef);
    const sequence = Number(counterSnap.exists ? counterSnap.data().nextSerial : 1) || 1;
    const checkInSerial = makeCheckInSerial(booking.appointmentDate, sequence);
    transaction.set(counterRef, { nextSerial: sequence + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    transaction.update(bookingRef, { status: "CONFIRMED", confirmedAt: admin.firestore.FieldValue.serverTimestamp(), checkInSerial, checkInSequence: sequence, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { checkInSerial };
  });
  return result;
});