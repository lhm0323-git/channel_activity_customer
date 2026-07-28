const crypto = require("crypto");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
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

function buildD1Email(booking) {
  const date = booking.appointmentDate || "";
  const packageName = booking.packageName || "\u5065\u6aa2\u5957\u9910";
  const serial = booking.checkInSerial || "-";
  return {
    subject: "\u5c4f\u57fa\u5065\u6aa2\u5230\u6aa2\u63d0\u9192",
    text: "\u63d0\u9192\u60a8\u660e\u65e5 " + date + " \u9810\u7d04 " + packageName + "\u3002\n\u5831\u5230\u5e8f\u865f\uff1a" + serial + "\n\u8acb\u651c\u5e36\u5065\u4fdd\u5361\u8207\u8eab\u5206\u8b49\u81f3\u5c4f\u57fa\u5065\u6aa2\u4e2d\u5fc3\u5831\u5230\u3002",
  };
}

async function queueD1Email(doc, email) {
  const booking = doc.data();
  await admin.firestore().collection("mail").add({
    to: [email],
    message: buildD1Email(booking),
  });
  await doc.ref.update({
    d1NoticeStatus: "EMAIL_QUEUED",
    d1NoticeChannel: "EMAIL",
    d1NoticeSentAt: FieldValue.serverTimestamp(),
    d1NoticeError: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
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
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function sendD1Notice(doc) {
  const booking = doc.data();
  const email = String(booking.customerEmail || booking.email || "").trim();
  if (booking.status === "CANCELLED") throw new HttpsError("failed-precondition", "Cancelled bookings cannot receive reminders");

  if (booking.lineUserId) {
    try {
      const ackToken = crypto.randomBytes(32).toString("hex");
      await pushLineMessage(lineChannelAccessToken.value(), booking.lineUserId, buildD1Message(doc.id, booking, ackToken));
      await doc.ref.update({
        d1NoticeStatus: "SENT",
        d1NoticeChannel: "LINE",
        d1AckToken: ackToken,
        d1NoticeSentAt: FieldValue.serverTimestamp(),
        d1NoticeError: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return "LINE";
    } catch (error) {
      if (!email) {
        await markD1NoticeFailed(doc, error);
        throw new HttpsError("internal", "LINE reminder could not be sent");
      }
      console.warn("LINE reminder failed; queueing email for " + doc.id, error.message);
    }
  }

  if (email) {
    await queueD1Email(doc, email);
    return "EMAIL";
  }

  const error = "Booking has no LINE user ID or email address";
  await markD1NoticeFailed(doc, error);
  throw new HttpsError("failed-precondition", error);
}


async function verifyLineAccessToken(accessToken) {
  const token = String(accessToken || "").trim();
  if (!token || token.length > 8192) throw new HttpsError("invalid-argument", "A valid LINE access token is required");
  const response = await fetch("https://api.line.me/v2/profile", { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new HttpsError("permission-denied", "LINE identity verification failed");
  const profile = await response.json();
  if (!profile || !profile.userId) throw new HttpsError("permission-denied", "LINE identity verification failed");
  return profile;
}

const STATION_MAP = {
  "\u4e00\u822c\u6aa2\u67e5": { station: "A\u7ad9 \u4e00\u822c\u6aa2\u67e5", order: 1, duration: 10 },
  "\u7406\u5b78\u6aa2\u67e5": { station: "A\u7ad9 \u4e00\u822c\u6aa2\u67e5", order: 1, duration: 15 },
  "\u8840\u6db2\u5e38\u898f": { station: "B\u7ad9 \u62bd\u8840", order: 2, duration: 5 },
  "\u809d\u81bd\u529f\u80fd": { station: "B\u7ad9 \u62bd\u8840", order: 2, duration: 0 },
  "\u814e\u529f\u80fd": { station: "B\u7ad9 \u62bd\u8840", order: 2, duration: 0 },
  "\u8840\u8102\u80aa": { station: "B\u7ad9 \u62bd\u8840", order: 2, duration: 0 },
  "\u7cd6\u5c3f\u75c5\u6aa2\u9a57": { station: "B\u7ad9 \u62bd\u8840", order: 2, duration: 0 },
  "\u7532\u72c0\u817a": { station: "B\u7ad9 \u62bd\u8840", order: 2, duration: 0 },
  "\u816b\u760d\u7be9\u6aa2": { station: "B\u7ad9 \u62bd\u8840", order: 2, duration: 0 },
  "\u5c3f\u6db2\u6aa2\u67e5": { station: "C\u7ad9 \u5c3f\u6db2/\u7cde便", order: 3, duration: 5 },
  "\u7cde便\u6aa2\u67e5": { station: "C\u7ad9 \u5c3f\u6db2/\u7cde便", order: 3, duration: 5 },
  "\u7279\u6b8a\u529f\u80fd\u6aa2\u67e5": { station: "D\u7ad9 \u529f\u80fd\u6aa2\u67e5", order: 4, duration: 20 },
  "\u5fc3\u8840\u7ba1\u6aa2\u67e5": { station: "D\u7ad9 \u529f\u80fd\u6aa2\u67e5", order: 4, duration: 15 },
  "\u8d85\u97f3\u6ce2": { station: "E\u7ad9 \u8d85\u97f3\u6ce2", order: 5, duration: 20 },
  "\u5f71\u50cf\u91ab\u5b78": { station: "F\u7ad9 \u5f71\u50cf\u91ab\u5b78", order: 6, duration: 15 },
  "\u8178\u80c3\u5167\u8996\u93e1": { station: "G\u7ad9 \u5167\u8996\u93e1", order: 7, duration: 60 },
  "\u91ab\u5e2b\u89e3\u8aaa": { station: "H\u7ad9 \u91ab\u5e2b\u89e3\u8aaa", order: 8, duration: 20 },
};

function text(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1000000 ? parsed : fallback;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function staffEmail(request) {
  const email = text(request.auth?.token?.email, 320).toLowerCase();
  if (!email) return "";
  if (email === "lhm0323@gmail.com") return email;
  const staff = await admin.firestore().doc("staffUsers/" + email).get();
  return staff.exists && staff.data().active !== false ? email : "";
}

async function assertStaff(request) {
  const email = await staffEmail(request);
  if (!email) throw new HttpsError(request.auth?.uid ? "permission-denied" : "unauthenticated", "Staff access is required");
  return email;
}

function safeItems(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw new HttpsError("invalid-argument", "At least one valid item is required");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new HttpsError("invalid-argument", "Invalid selected item");
    const name = text(item.name, 240);
    if (!name) throw new HttpsError("invalid-argument", "Each selected item needs a name");
    return {
      id: text(item.id, 160), name, enName: text(item.enName, 240), code: text(item.code, 240),
      category: text(item.category, 120), price: number(item.price), clinical: text(item.clinical, 1000),
      remark: text(item.remark, 2000), outsource: Boolean(item.outsource),
    };
  });
}

function checklistFor(items) {
  const groups = {};
  items.forEach((item) => {
    const station = STATION_MAP[item.category] || { station: "\u5176\u4ed6", order: 99, duration: 10 };
    if (!groups[station.station]) groups[station.station] = { ...station, items: [], totalMin: 0 };
    groups[station.station].items.push(item);
    groups[station.station].totalMin += station.duration;
  });
  return {
    stationGroups: Object.values(groups).sort((a, b) => a.order - b.order),
    warnings: items.filter((item) => item.remark),
    outsourceItems: items.filter((item) => item.outsource),
  };
}

function safeAnswers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpsError("invalid-argument", "Answers must be an object");
  const entries = Object.entries(value);
  if (entries.length > 100) throw new HttpsError("invalid-argument", "Too many answers");
  return Object.fromEntries(entries.map(([key, answer]) => {
    const safeKey = text(key, 120);
    if (!safeKey) throw new HttpsError("invalid-argument", "Invalid answer key");
    if (Array.isArray(answer)) {
      if (answer.length > 50) throw new HttpsError("invalid-argument", "Too many answer values");
      return [safeKey, answer.map((item) => text(item, 300))];
    }
    return [safeKey, text(answer, 2000)];
  }));
}

exports.createBooking = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "A signed-in session is required");
  const payload = request.data?.payload;
  if (!payload || typeof payload !== "object") throw new HttpsError("invalid-argument", "Booking payload is required");
  const isStaff = Boolean(await staffEmail(request));
  const customerInput = payload.customer || {};
  const bookingInput = payload.booking || {};
  const customerName = text(customerInput.name || bookingInput.customerName, 160);
  const customerPhone = text(customerInput.phone || bookingInput.customerPhone, 80);
  const customerEmail = text(customerInput.email || bookingInput.customerEmail, 320).toLowerCase();
  const appointmentDate = text(bookingInput.appointmentDate, 10);
  const selectedItems = safeItems(bookingInput.selectedItems);
  if (!customerName || !customerPhone || !validDate(appointmentDate)) throw new HttpsError("invalid-argument", "Name, phone, and appointment date are required");
  if (!isStaff && appointmentDate < taipeiDate(0)) throw new HttpsError("invalid-argument", "Appointment date must be today or later");

  let lineProfile = null;
  if (!isStaff && text(request.data?.lineAccessToken, 8192)) lineProfile = await verifyLineAccessToken(request.data.lineAccessToken);
  if (!lineProfile && !validEmail(customerEmail)) throw new HttpsError("invalid-argument", "A valid email is required when LINE is not connected");

  const db = admin.firestore();
  const bookingRef = db.collection("bookings").doc();
  const customerId = lineProfile ? lineProfile.userId : "customer-" + bookingRef.id;
  const customerRef = db.doc("customers/" + customerId);
  const blockedRef = db.doc("bookingBlockedDates/" + appointmentDate);
  const claimToken = lineProfile ? "" : crypto.randomBytes(24).toString("hex");
  const now = FieldValue.serverTimestamp();
  const status = isStaff && ["BOOKED", "CANCELLED"].includes(text(bookingInput.status, 20)) ? text(bookingInput.status, 20) : "BOOKED";
  const booking = {
    customerId, customerName, customerPhone, customerEmail,
    idNumberMasked: text(customerInput.idNumberMasked || bookingInput.idNumberMasked, 80),
    lineUserId: lineProfile?.userId || null, lineDisplayName: lineProfile?.displayName || "",
    notificationChannel: lineProfile ? "LINE" : "EMAIL", channel: text(bookingInput.channel, 120) || "GENERAL",
    appointmentDate, packageName: text(bookingInput.packageName, 200), selectedItems,
    listPrice: number(bookingInput.listPrice), discountRate: number(bookingInput.discountRate), finalPrice: number(bookingInput.finalPrice),
    status, notes: text(bookingInput.notes, 2000), ownerUid: request.auth.uid, createdAt: now, updatedAt: now,
    ...(claimToken ? { customerClaimToken: claimToken } : {}),
  };
  await db.runTransaction(async (transaction) => {
    const blocked = await transaction.get(blockedRef);
    if (blocked.exists && !isStaff) throw new HttpsError("failed-precondition", "This date is unavailable");
    transaction.set(customerRef, {
      customerId, name: customerName, phone: customerPhone, email: customerEmail,
      lineUserId: lineProfile?.userId || null, idNumberMasked: booking.idNumberMasked,
      ownerUid: request.auth.uid, createdAt: now, updatedAt: now,
    }, { merge: true });
    transaction.set(bookingRef, booking);
    transaction.set(db.doc("checklists/" + bookingRef.id), { bookingId: bookingRef.id, ...checklistFor(selectedItems), generatedAt: now, printedAt: null });
  });
  return { bookingId: bookingRef.id, claimToken };
});

exports.cancelBooking = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "A signed-in session is required");
  const bookingId = text(request.data?.bookingId, 200);
  if (!bookingId) throw new HttpsError("invalid-argument", "Booking ID is required");
  const db = admin.firestore();
  const bookingRef = db.doc("bookings/" + bookingId);
  const staff = Boolean(await staffEmail(request));
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(bookingRef);
    if (!snap.exists) throw new HttpsError("not-found", "Booking not found");
    if (!staff && snap.data().ownerUid !== request.auth.uid) throw new HttpsError("permission-denied", "You can only cancel your own booking");
    transaction.update(bookingRef, { status: "CANCELLED", cancelledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  });
  return { cancelled: true };
});

exports.requestBookingChange = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "A signed-in session is required");
  const change = request.data?.change || {};
  const bookingId = text(change.bookingId, 200);
  const requestedAppointmentDate = text(change.requestedAppointmentDate, 10);
  if (!bookingId || !validDate(requestedAppointmentDate)) throw new HttpsError("invalid-argument", "Booking ID and requested date are required");
  const db = admin.firestore();
  const bookingRef = db.doc("bookings/" + bookingId);
  const requestRef = db.collection("bookingChangeRequests").doc();
  await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
    const booking = bookingSnap.data();
    if (booking.ownerUid !== request.auth.uid) throw new HttpsError("permission-denied", "You can only change your own booking");
    if (booking.status === "CANCELLED") throw new HttpsError("failed-precondition", "Cancelled bookings cannot be changed");
    transaction.set(requestRef, {
      bookingId, customerName: booking.customerName || "", packageName: booking.packageName || "",
      currentAppointmentDate: booking.appointmentDate || "", requestedAppointmentDate,
      notes: text(change.notes, 2000), status: "pending", ownerUid: request.auth.uid,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { requestId: requestRef.id };
});

exports.saveMyQuestionnaireResponse = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "A signed-in session is required");
  const bookingId = text(request.data?.bookingId, 200);
  const questionnaireId = text(request.data?.questionnaireId, 160);
  if (!bookingId || !questionnaireId) throw new HttpsError("invalid-argument", "Booking ID and questionnaire ID are required");
  const answers = safeAnswers(request.data?.answers);
  const db = admin.firestore();
  const bookingRef = db.doc("bookings/" + bookingId);
  const responseRef = db.doc("customerQuestionnaireResponses/" + bookingId + "_" + questionnaireId);
  await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
    const booking = bookingSnap.data();
    if (booking.ownerUid !== request.auth.uid) throw new HttpsError("permission-denied", "You can only update your own questionnaire");
    transaction.set(responseRef, {
      bookingId, customerId: booking.customerId || "", questionnaireId, answers,
      ownerUid: request.auth.uid, updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return { responseId: responseRef.id };
});
exports.claimMyLineBookings = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "A signed-in session is required");
  const profile = await verifyLineAccessToken(request.data?.accessToken);
  const snapshot = await admin.firestore().collection("bookings").where("lineUserId", "==", profile.userId).get();
  const batch = admin.firestore().batch();
  snapshot.docs.forEach((booking) => batch.update(booking.ref, { ownerUid: request.auth.uid, updatedAt: FieldValue.serverTimestamp() }));
  if (!snapshot.empty) await batch.commit();
  return { claimed: snapshot.size };
});
exports.claimBookingWithLine = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "A signed-in session is required");
  const bookingId = String(request.data?.bookingId || "").trim();
  const claimToken = String(request.data?.claimToken || "").trim();
  if (!bookingId || !claimToken || claimToken.length !== 48) throw new HttpsError("invalid-argument", "A valid booking claim link is required");
  const profile = await verifyLineAccessToken(request.data?.accessToken);
  const bookingRef = admin.firestore().doc("bookings/" + bookingId);
  await admin.firestore().runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
    const booking = bookingSnap.data();
    const savedToken = String(booking.customerClaimToken || "");
    if (savedToken.length !== claimToken.length || !crypto.timingSafeEqual(Buffer.from(savedToken), Buffer.from(claimToken))) {
      throw new HttpsError("permission-denied", "This booking claim link is invalid or has already been used");
    }
    transaction.update(bookingRef, {
      ownerUid: request.auth.uid,
      customerId: profile.userId,
      lineUserId: profile.userId,
      lineDisplayName: profile.displayName || "",
      notificationChannel: "LINE",
      customerClaimToken: FieldValue.delete(),
      lineClaimedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(admin.firestore().doc("customers/" + profile.userId), {
      customerId: profile.userId,
      name: booking.customerName || profile.displayName || "",
      phone: booking.customerPhone || "",
      email: booking.customerEmail || booking.email || "",
      lineUserId: profile.userId,
      ownerUid: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return { claimed: true };
});

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
    d1AcknowledgedAt: FieldValue.serverTimestamp(),
    d1AckToken: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
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
    if (!booking.lineUserId && !String(booking.customerEmail || booking.email || "").trim()) return "missingContact";
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
    transaction.set(counterRef, { nextSerial: sequence + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.update(bookingRef, { status: "CONFIRMED", confirmedAt: FieldValue.serverTimestamp(), checkInSerial, checkInSequence: sequence, updatedAt: FieldValue.serverTimestamp() });
    return { checkInSerial };
  });
  return result;
});