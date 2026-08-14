const crypto = require("crypto");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { hospitalStaffKey, validateHospitalTokenResponse } = require("./hospital-auth.cjs");

admin.initializeApp();

const lineChannelAccessToken = defineSecret("LINE_CHANNEL_ACCESS_TOKEN");
const mailerEncryptionKey = defineSecret("MAILER_ENCRYPTION_KEY");
const hospitalTokenApiUrl = defineString("HOSPITAL_TOKEN_API_URL", {
  default: "https://orapi.ptch.org.tw/TokenAPI/v1/api/GetToken",
});
const LIFF_ID = "2010725321-sRRkD0Le";
const MAILER_SETTINGS_PATH = "systemSettings/mailer";
const MAILER_OAUTH_CALLBACK = "https://us-central1-channel-activity-customer.cloudfunctions.net/connectMailerCallback";

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

function buildCancellationMessage(booking) {
  const date = booking.appointmentDate || "";
  const packageName = booking.packageName || "\u5065\u6aa2\u5957\u9910";
  return {
    type: "text",
    text: "\u5c4f\u57fa\u5065\u6aa2\u4e2d\u5fc3\u901a\u77e5\n\u60a8\u539f\u8a02 " + date + " \u7684\u300c" + packageName + "\u300d\u9810\u7d04\u5df2\u53d6\u6d88\u3002\n\u5982\u9700\u91cd\u65b0\u9810\u7d04\uff0c\u8acb\u7531\u5b98\u65b9\u5e33\u865f\u958b\u555f\u300c\u627e\u65b9\u6848 / \u9810\u7d04\u300d\u3002",
  };
}

function buildCancellationEmail(booking) {
  const date = booking.appointmentDate || "";
  const packageName = booking.packageName || "\u5065\u6aa2\u5957\u9910";
  return {
    subject: "\u5c4f\u57fa\u5065\u6aa2\u4e2d\u5fc3\uff1a\u9810\u7d04\u5df2\u53d6\u6d88",
    text: "\u60a8\u539f\u8a02 " + date + " \u7684\u300c" + packageName + "\u300d\u9810\u7d04\u5df2\u53d6\u6d88\u3002\n\n\u5982\u9700\u91cd\u65b0\u9810\u7d04\uff0c\u8acb\u7531\u5c4f\u57fa\u5065\u6aa2\u4e2d\u5fc3 LINE \u5b98\u65b9\u5e33\u865f\u958b\u555f\u300c\u627e\u65b9\u6848 / \u9810\u7d04\u300d\u3002",
  };
}

async function sendCancellationNotice(bookingRef, booking) {
  const email = String(booking.customerEmail || booking.email || "").trim().toLowerCase();
  let deliveryError = null;

  if (booking.lineUserId) {
    try {
      await pushLineMessage(lineChannelAccessToken.value(), booking.lineUserId, buildCancellationMessage(booking));
      await bookingRef.update({
        cancelNoticeStatus: "SENT",
        cancelNoticeChannel: "LINE",
        cancelNoticeSentAt: FieldValue.serverTimestamp(),
        cancelNoticeError: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return "LINE";
    } catch (error) {
      deliveryError = error;
      console.warn("Cancellation LINE notice failed for " + bookingRef.id + ": " + error.message);
    }
  }

  if (validEmail(email)) {
    try {
      const settings = await getMailerSettings(true);
      const message = buildCancellationEmail(booking);
      await sendGmailMessage(settings, email, message.subject, message.text);
      await bookingRef.update({
        cancelNoticeStatus: "SENT",
        cancelNoticeChannel: "EMAIL",
        cancelNoticeSentAt: FieldValue.serverTimestamp(),
        cancelNoticeError: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return "EMAIL";
    } catch (error) {
      console.warn("Cancellation email notice failed for " + bookingRef.id + ": " + error.message);
      deliveryError = deliveryError || error;
    }
  }

  const error = deliveryError || new Error("Booking has no LINE user ID or valid email address");
  await bookingRef.update({
    cancelNoticeStatus: "FAILED",
    cancelNoticeChannel: "NONE",
    cancelNoticeError: String(error && error.message || error).slice(0, 500),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return "FAILED";
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

function mailerCipherKey() {
  const value = mailerEncryptionKey.value();
  if (!value) throw new HttpsError("failed-precondition", "Mailer encryption is not configured");
  return crypto.createHash("sha256").update(value).digest();
}

function encryptMailerValue(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", mailerCipherKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptMailerValue(value) {
  const [ivValue, tagValue, encryptedValue] = String(value || "").split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new HttpsError("failed-precondition", "Mailer credentials are incomplete");
  const decipher = crypto.createDecipheriv("aes-256-gcm", mailerCipherKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

function cleanHeader(value, max = 240) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

function encodeMimeHeader(value) {
  const header = cleanHeader(value);
  return /[^\x20-\x7E]/.test(header)
    ? "=?UTF-8?B?" + Buffer.from(header, "utf8").toString("base64") + "?="
    : header;
}

function claimExpiryDate(appointmentDate) {
  if (!validDate(appointmentDate)) return "";
  const date = new Date(appointmentDate + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() - 2);
  return date.toISOString().slice(0, 10);
}

function customerLineClaimUrl(claimToken) {
  return "https://liff.line.me/" + LIFF_ID + "?view=my-bookings&claimToken=" + encodeURIComponent(claimToken);
}

function buildClaimEmail(bookingId, booking) {
  const claimUrl = customerLineClaimUrl(booking.customerClaimToken);
  const name = cleanHeader(booking.customerName || "");
  const packageName = cleanHeader(booking.packageName || "健檢套餐");
  const date = cleanHeader(booking.appointmentDate || "");
  return {
    subject: "屏基健檢中心：預約確認與 LINE 綁定",
    text: [
      name ? name + " 您好：" : "您好：",
      "您的健檢預約已建立。",
      "套餐：" + packageName,
      "暫定日期：" + date,
      "請開啟下列連結，於 LINE 完成綁定後即可查詢預約、提出改期並接收提醒：",
      claimUrl,
      "若無法開啟，請聯繫屏基健檢中心。",
    ].join("\n"),
  };
}

async function getMailerSettings(requireConnected = true) {
  const snap = await admin.firestore().doc(MAILER_SETTINGS_PATH).get();
  if (!snap.exists) throw new HttpsError("failed-precondition", "Gmail sender has not been configured");
  const data = snap.data();
  if (!data.clientId || !data.clientSecretEncrypted || !data.senderEmail) throw new HttpsError("failed-precondition", "Gmail sender has not been configured");
  if (requireConnected && !data.refreshTokenEncrypted) throw new HttpsError("failed-precondition", "Gmail sender has not been connected");
  return {
    ...data,
    clientSecret: decryptMailerValue(data.clientSecretEncrypted),
    refreshToken: data.refreshTokenEncrypted ? decryptMailerValue(data.refreshTokenEncrypted) : "",
  };
}

async function sendGmailMessage(settings, recipient, subject, textBody) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      refresh_token: settings.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokenJson = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenJson.access_token) throw new Error("Gmail token refresh failed: " + (tokenJson.error || tokenResponse.status));
  const raw = Buffer.from([
    "From: " + encodeMimeHeader("屏基健檢中心") + " <" + cleanHeader(settings.senderEmail) + ">",
    "To: " + cleanHeader(recipient),
    "Subject: " + encodeMimeHeader(subject),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    String(textBody || ""),
  ].join("\r\n"), "utf8").toString("base64url");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: "Bearer " + tokenJson.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) throw new Error("Gmail send failed: " + response.status);
}

async function sendBookingClaimEmail(bookingRef, actor = { role: "SYSTEM" }) {
  const snap = await bookingRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Booking not found");
  const booking = snap.data();
  const email = String(booking.customerEmail || "").trim().toLowerCase();
  if (!validEmail(email)) throw new HttpsError("failed-precondition", "Booking has no valid email address");
  if (!booking.customerClaimToken) throw new HttpsError("failed-precondition", "Booking has no LINE claim link");
  try {
    const settings = await getMailerSettings(true);
    const message = buildClaimEmail(bookingRef.id, booking);
    await sendGmailMessage(settings, email, message.subject, message.text);
    await bookingRef.update({
      claimEmailStatus: "SENT",
      claimEmailSentAt: FieldValue.serverTimestamp(),
      claimEmailError: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (actor?.email) await writeBookingAuditRecord({ action: "SEND_CLAIM_EMAIL", bookingId: bookingRef.id, actor });
    return "SENT";
  } catch (error) {
    await bookingRef.update({
      claimEmailStatus: "FAILED",
      claimEmailError: String(error && error.message || error).slice(0, 300),
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw error;
  }
}
async function markD1NoticeFailed(doc, error) {
  await doc.ref.update({
    d1NoticeStatus: "FAILED",
    d1NoticeError: String(error && error.message || error).slice(0, 500),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function sendD1Notice(doc, actor = { role: "SYSTEM" }) {
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
      if (actor?.email) await writeBookingAuditRecord({ action: "SEND_D1_NOTICE", bookingId: doc.id, actor });
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
    if (actor?.email) await writeBookingAuditRecord({ action: "SEND_D1_NOTICE", bookingId: doc.id, actor });
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

const BOOTSTRAP_ADMIN_EMAIL = "lhm0323@gmail.com";

async function staffProfile(request) {
  const email = text(request.auth?.token?.email, 320).toLowerCase();
  const staffKey = text(request.auth?.token?.staffKey, 128);
  const empid = text(request.auth?.token?.empid, 64);
  const uid = text(request.auth?.uid, 200);
  const key = staffKey || email;
  if (!key || !uid) return null;
  if (email === BOOTSTRAP_ADMIN_EMAIL) return { email, staffKey: email, uid, role: "ADMIN" };
  const staff = await admin.firestore().doc("staffUsers/" + key).get();
  if (!staff.exists || staff.data().active === false) return null;
  return {
    email,
    empid: empid || text(staff.data().empid, 64),
    staffKey: key,
    uid,
    role: staff.data().role === "ADMIN" ? "ADMIN" : "STAFF",
  };
}

async function staffEmail(request) {
  const profile = await staffProfile(request);
  return profile?.email || profile?.empid || "";
}
async function assertStaff(request) {
  const profile = await staffProfile(request);
  if (!profile) throw new HttpsError(request.auth?.uid ? "permission-denied" : "unauthenticated", "Staff access is required");
  return profile;
}

async function assertAdmin(request) {
  const profile = await assertStaff(request);
  if (profile.role !== "ADMIN") throw new HttpsError("permission-denied", "Administrator access is required");
  return profile;
}

function writeBookingAudit(transaction, db, { action, bookingId, actor }) {
  transaction.set(db.collection("auditLogs").doc(), {
    resourceType: "BOOKING", bookingId, action,
    actorEmail: actor?.email || "", actorUid: actor?.uid || "", actorRole: actor?.role || "CUSTOMER",
    createdAt: FieldValue.serverTimestamp(),
  });
}
async function writeBookingAuditRecord({ action, bookingId, actor }) {
  await admin.firestore().collection("auditLogs").add({
    resourceType: "BOOKING", bookingId, action,
    actorEmail: actor?.email || "", actorUid: actor?.uid || "", actorRole: actor?.role || "SYSTEM",
    createdAt: FieldValue.serverTimestamp(),
  });
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

function managedPackageId(name) {
  return encodeURIComponent(text(name, 200)).replace(/\./g, "%2E");
}

function packageVisibility(value) {
  return ["PUBLIC", "INTERNAL", "INVITE_ONLY"].includes(value) ? value : "PUBLIC";
}

function inviteIsActive(invite, packageName) {
  return invite && invite.active !== false && invite.packageName === packageName &&
    (!invite.expiresOn || invite.expiresOn >= taipeiDate(0));
}

async function assertPackageBookingAccess(transaction, db, bookingInput, isStaff) {
  const packageName = text(bookingInput.packageName, 200);
  const packageSnap = await transaction.get(db.doc("managedPackages/" + managedPackageId(packageName)));
  if (!packageSnap.exists || packageSnap.data().deleted) return;
  const visibility = packageVisibility(packageSnap.data().visibility);
  if (visibility === "INTERNAL" && !isStaff) throw new HttpsError("permission-denied", "This package is only available through the health center");
  if (visibility === "INVITE_ONLY" && !isStaff) {
    const inviteToken = text(bookingInput.inviteToken, 160);
    const inviteSnap = inviteToken ? await transaction.get(db.doc("packageInvites/" + inviteToken)) : null;
    if (!inviteSnap?.exists || !inviteIsActive(inviteSnap.data(), packageName)) throw new HttpsError("permission-denied", "This invitation link is invalid or expired");
  }
}
function hospitalAttemptRef(request, userId) {
  const ip = text(request.rawRequest?.headers?.["x-forwarded-for"], 256).split(",")[0].trim() || text(request.rawRequest?.ip, 128);
  const key = crypto.createHash("sha256").update(ip + "|" + userId).digest("hex");
  return admin.firestore().doc("hospitalLoginAttempts/" + key);
}

async function recordHospitalLoginAttempt(request, userId) {
  const ref = hospitalAttemptRef(request, userId);
  const now = Date.now();
  await admin.firestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const startedAt = snap.data()?.windowStartedAt?.toMillis?.() || 0;
    const previousCount = startedAt && now - startedAt < 15 * 60 * 1000 ? Number(snap.data()?.count || 0) : 0;
    if (previousCount >= 5) throw new HttpsError("resource-exhausted", "Too many sign-in attempts. Try again in 15 minutes.");
    transaction.set(ref, { count: previousCount + 1, windowStartedAt: new Date(now), updatedAt: FieldValue.serverTimestamp() });
  });
  return ref;
}

async function authenticateWithHospitalAccount(request, userId, password) {
  const staffKey = hospitalStaffKey(userId);
  const staffRef = admin.firestore().doc("staffUsers/" + staffKey);
  const staffSnap = await staffRef.get();
  if (!staffSnap.exists || staffSnap.data().active === false) {
    throw new HttpsError("permission-denied", "This employee account is not authorized for CAC.");
  }
  const attemptRef = await recordHospitalLoginAttempt(request, userId);
  let response;
  try {
    response = await fetch(hospitalTokenApiUrl.value(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ userId, pwd: password }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    logger.error("Hospital Token API connection failed", {
      endpoint: hospitalTokenApiUrl.value(),
      name: error?.name || "Error",
      message: error?.message || "Unknown error",
      causeCode: error?.cause?.code || null,
      causeMessage: error?.cause?.message || null,
    });
    throw new HttpsError("unavailable", "Hospital sign-in service is temporarily unavailable.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new HttpsError("unauthenticated", "Employee ID or password is incorrect.");
  try {
    validateHospitalTokenResponse(body);
  } catch {
    throw new HttpsError("unavailable", "Hospital sign-in service returned an invalid response.");
  }
  await attemptRef.delete();
  return { staffKey, staff: staffSnap.data() };
}

exports.signInWithHospitalAccount = onCall(async (request) => {
  const userId = text(request.data?.userId, 64);
  const password = String(request.data?.password || "");
  if (!userId || !password || password.length > 256) {
    throw new HttpsError("invalid-argument", "Employee ID and password are required.");
  }
  const { staffKey, staff } = await authenticateWithHospitalAccount(request, userId, password);
  const uid = "ptch:" + userId;
  const profile = { displayName: text(staff.name, 160) || "PTCH " + userId, disabled: false };
  try {
    await admin.auth().updateUser(uid, profile);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      logger.error("Unable to update hospital staff Firebase session", {
        code: error?.code || null,
        message: error?.message || "Unknown Firebase Auth error",
      });
      throw new HttpsError("internal", "Unable to create CAC session.");
    }
    await admin.auth().createUser({ uid, ...profile });
  }
  const staffRole = staff.role === "ADMIN" ? "ADMIN" : "STAFF";
  const customToken = await admin.auth().createCustomToken(uid, {
    staffKey,
    empid: userId,
    staffRole,
    authSource: "PTCH",
  });
  return { customToken, staffKey, empid: userId, role: staffRole };
});
async function issueBookingClaim(bookingRef, actor = { role: "SYSTEM" }, { reissue = false } = {}) {
  const db = admin.firestore();
  return db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
    const booking = bookingSnap.data();
    if (booking.status === "CANCELLED") throw new HttpsError("failed-precondition", "Cancelled bookings cannot be claimed");
    if (booking.lineUserId) throw new HttpsError("failed-precondition", "Booking is already linked to LINE");
    const expiresOn = claimExpiryDate(booking.appointmentDate);
    if (!expiresOn || expiresOn < taipeiDate(0)) throw new HttpsError("failed-precondition", "Claim link has expired");
    const existingToken = String(booking.customerClaimToken || "");
    if (existingToken && !reissue) {
      const existingRef = db.doc("bookingClaims/" + existingToken);
      const existingSnap = await transaction.get(existingRef);
      if (!existingSnap.exists || existingSnap.data().active !== false) {
        transaction.set(existingRef, { bookingId: bookingRef.id, expiresOn, active: true, createdAt: FieldValue.serverTimestamp(), createdBy: actor.email || actor.uid || actor.role || "SYSTEM" }, { merge: true });
        transaction.update(bookingRef, { claimStatus: "PENDING", claimExpiresOn: expiresOn, updatedAt: FieldValue.serverTimestamp() });
        return { claimToken: existingToken, expiresOn };
      }
    }
    if (existingToken) transaction.set(db.doc("bookingClaims/" + existingToken), { active: false, revokedAt: FieldValue.serverTimestamp() }, { merge: true });
    const claimToken = crypto.randomBytes(24).toString("hex");
    transaction.set(db.doc("bookingClaims/" + claimToken), { bookingId: bookingRef.id, expiresOn, active: true, createdAt: FieldValue.serverTimestamp(), createdBy: actor.email || actor.uid || actor.role || "SYSTEM" });
    transaction.update(bookingRef, { customerClaimToken: claimToken, claimStatus: "PENDING", claimExpiresOn: expiresOn, updatedAt: FieldValue.serverTimestamp() });
    return { claimToken, expiresOn };
  });
}
exports.createBooking = onCall({ secrets: [mailerEncryptionKey] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "A signed-in session is required");
  const payload = request.data?.payload;
  if (!payload || typeof payload !== "object") throw new HttpsError("invalid-argument", "Booking payload is required");
  const customerInput = payload.customer || {};
  const bookingInput = payload.booking || {};
  const isStaffImport = bookingInput.source === "STAFF_CSV";
  const actor = isStaffImport
    ? await assertStaff(request)
    : await staffProfile(request) || { uid: request.auth.uid, role: "CUSTOMER" };
  const isStaff = Boolean(actor.email);
  const customerName = text(customerInput.name || bookingInput.customerName, 160);
  const customerPhone = text(customerInput.phone || bookingInput.customerPhone, 80);
  const customerEmail = text(customerInput.email || bookingInput.customerEmail, 320).toLowerCase();
  const appointmentDate = text(bookingInput.appointmentDate, 10);
  const selectedItems = safeItems(bookingInput.selectedItems);
  if (!customerName || !customerPhone || !validDate(appointmentDate)) throw new HttpsError("invalid-argument", "Name, phone, and appointment date are required");
  if (!isStaff && appointmentDate < taipeiDate(0)) throw new HttpsError("invalid-argument", "Appointment date must be today or later");

  let lineProfile = null;
  if (!isStaff && text(request.data?.lineAccessToken, 8192)) lineProfile = await verifyLineAccessToken(request.data.lineAccessToken);
  if (!isStaff && !lineProfile && !validEmail(customerEmail)) throw new HttpsError("invalid-argument", "A valid email is required when LINE is not connected");

  const db = admin.firestore();
  const bookingRef = db.collection("bookings").doc();
  const customerId = lineProfile ? lineProfile.userId : "customer-" + bookingRef.id;
  const customerRef = db.doc("customers/" + customerId);
  const blockedRef = db.doc("bookingBlockedDates/" + appointmentDate);
  const claimToken = lineProfile ? "" : crypto.randomBytes(24).toString("hex");
  const claimExpiresOn = claimToken ? claimExpiryDate(appointmentDate) : "";
  const claimRef = claimToken ? db.doc("bookingClaims/" + claimToken) : null;
  const now = FieldValue.serverTimestamp();
  const requestedStatus = text(bookingInput.status, 20).toUpperCase();
  const status = isStaff && STAFF_BOOKING_STATUSES.has(requestedStatus) ? requestedStatus : "BOOKED";
  const booking = {
    customerId, customerName, customerPhone, customerEmail,
    idNumberMasked: text(customerInput.idNumberMasked || bookingInput.idNumberMasked, 80),
    lineUserId: lineProfile?.userId || null, lineDisplayName: lineProfile?.displayName || "",
    notificationChannel: lineProfile ? "LINE" : customerEmail ? "EMAIL" : "NONE", channel: text(bookingInput.channel, 120) || "GENERAL",
    appointmentDate, packageName: text(bookingInput.packageName, 200), selectedItems,
    listPrice: number(bookingInput.listPrice), discountRate: number(bookingInput.discountRate), finalPrice: number(bookingInput.finalPrice),
    status, notes: text(bookingInput.notes, 2000), employeeNumber: text(bookingInput.employeeNumber, 120), ownerUid: request.auth.uid, createdAt: now, updatedAt: now,
    ...(claimToken ? { customerClaimToken: claimToken, claimStatus: "PENDING", claimExpiresOn } : {}),
  };
  await db.runTransaction(async (transaction) => {
    const blocked = await transaction.get(blockedRef);
    await assertPackageBookingAccess(transaction, db, bookingInput, isStaff);
    if (blocked.exists && !isStaff) throw new HttpsError("failed-precondition", "This date is unavailable");
    transaction.set(customerRef, {
      customerId, name: customerName, phone: customerPhone, email: customerEmail,
      lineUserId: lineProfile?.userId || null, idNumberMasked: booking.idNumberMasked,
      ownerUid: request.auth.uid, createdAt: now, updatedAt: now,
    }, { merge: true });
    transaction.set(bookingRef, booking);
    if (claimRef) transaction.set(claimRef, { bookingId: bookingRef.id, expiresOn: claimExpiresOn, active: true, createdAt: now, createdBy: actor.email || actor.uid || actor.role || "SYSTEM" });
    transaction.set(db.doc("checklists/" + bookingRef.id), { bookingId: bookingRef.id, ...checklistFor(selectedItems), generatedAt: now, printedAt: null });
  });
  let claimEmailStatus = "NOT_REQUESTED";
  if (isStaff && customerEmail && claimToken) {
    try {
      claimEmailStatus = await sendBookingClaimEmail(bookingRef, actor);
    } catch (error) {
      claimEmailStatus = "FAILED";
      console.warn("Claim email was not sent for " + bookingRef.id + ": " + error.message);
    }
  }
  return { bookingId: bookingRef.id, claimToken, claimEmailStatus };
});

exports.cancelBooking = onCall({ secrets: [lineChannelAccessToken, mailerEncryptionKey] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "A signed-in session is required");
  const bookingId = text(request.data?.bookingId, 200);
  if (!bookingId) throw new HttpsError("invalid-argument", "Booking ID is required");
  const db = admin.firestore();
  const bookingRef = db.doc("bookings/" + bookingId);
  const actor = await staffProfile(request) || { uid: request.auth.uid, role: "CUSTOMER" };
  let cancelledBooking = null;
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(bookingRef);
    if (!snap.exists) throw new HttpsError("not-found", "Booking not found");
    const booking = snap.data();
    if (!actor.email && booking.ownerUid !== request.auth.uid) throw new HttpsError("permission-denied", "You can only cancel your own booking");
    if (booking.status === "CANCELLED") return;
    const patch = { status: "CANCELLED", cancelledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
    transaction.update(bookingRef, patch);
    writeBookingAudit(transaction, db, { action: "CANCEL", bookingId, actor, before: booking, after: { ...booking, ...patch } });
    cancelledBooking = { ...booking, status: "CANCELLED" };
  });
  const cancelNoticeStatus = cancelledBooking ? await sendCancellationNotice(bookingRef, cancelledBooking) : "ALREADY_CANCELLED";
  return { cancelled: true, cancelNoticeStatus };
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
exports.getBookingQuestionnaireResponseAsStaff = onCall(async (request) => {
  await assertStaff(request);
  const bookingId = text(request.data?.bookingId, 200);
  const questionnaireId = text(request.data?.questionnaireId, 160);
  if (!bookingId || !questionnaireId) throw new HttpsError("invalid-argument", "Booking ID and questionnaire ID are required");
  const db = admin.firestore();
  const [bookingSnap, responseSnap] = await Promise.all([
    db.doc("bookings/" + bookingId).get(),
    db.doc("customerQuestionnaireResponses/" + bookingId + "_" + questionnaireId).get(),
  ]);
  if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
  if (!responseSnap.exists) return { response: null };
  const response = responseSnap.data();
  return {
    response: {
      responseId: responseSnap.id,
      bookingId,
      questionnaireId,
      answers: safeAnswers(response.answers),
      staffEditedBy: text(response.staffEditedBy, 320),
    },
  };
});

exports.saveBookingQuestionnaireResponseAsStaff = onCall(async (request) => {
  const actor = await assertStaff(request);
  const bookingId = text(request.data?.bookingId, 200);
  const questionnaireId = text(request.data?.questionnaireId, 160);
  if (!bookingId || !questionnaireId) throw new HttpsError("invalid-argument", "Booking ID and questionnaire ID are required");
  const answers = safeAnswers(request.data?.answers);
  const db = admin.firestore();
  const bookingRef = db.doc("bookings/" + bookingId);
  const responseRef = db.doc("customerQuestionnaireResponses/" + bookingId + "_" + questionnaireId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
  const booking = bookingSnap.data();
  await responseRef.set({
    bookingId,
    customerId: booking.customerId || "",
    questionnaireId,
    answers,
    ownerUid: booking.ownerUid || "",
    staffEditedAt: FieldValue.serverTimestamp(),
    staffEditedBy: actor.email,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await writeBookingAuditRecord({ action: "UPDATE_QUESTIONNAIRE", bookingId, actor });
  return { responseId: responseRef.id };
});

exports.getLineCustomerProfile = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "A signed-in session is required");
  const profile = await verifyLineAccessToken(request.data?.accessToken);
  const customerSnap = await admin.firestore().doc("customers/" + profile.userId).get();
  if (!customerSnap.exists) return { profile: null };
  const customer = customerSnap.data();
  return {
    profile: {
      name: text(customer.name, 160),
      phone: text(customer.phone, 80),
      email: text(customer.email, 320).toLowerCase(),
      idNumberMasked: text(customer.idNumberMasked, 80),
    },
  };
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
  const claimToken = String(request.data?.claimToken || "").trim();
  const legacyBookingId = String(request.data?.bookingId || "").trim();
  if (!claimToken || claimToken.length !== 48) throw new HttpsError("invalid-argument", "A valid booking claim link is required");
  const profile = await verifyLineAccessToken(request.data?.accessToken);
  const db = admin.firestore();
  await db.runTransaction(async (transaction) => {
    let bookingRef = null;
    let claimRef = null;
    const protectedClaimRef = db.doc("bookingClaims/" + claimToken);
    const protectedClaimSnap = await transaction.get(protectedClaimRef);
    if (protectedClaimSnap.exists) {
      const claim = protectedClaimSnap.data();
      if (claim.active === false || !claim.bookingId || (claim.expiresOn && claim.expiresOn < taipeiDate(0))) {
        throw new HttpsError("permission-denied", "This booking claim link is invalid or has expired");
      }
      bookingRef = db.doc("bookings/" + claim.bookingId);
      claimRef = protectedClaimRef;
    } else if (legacyBookingId) {
      bookingRef = db.doc("bookings/" + legacyBookingId);
    } else {
      throw new HttpsError("permission-denied", "This booking claim link is invalid or has expired");
    }
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
    const booking = bookingSnap.data();
    const savedToken = String(booking.customerClaimToken || "");
    if (savedToken.length !== claimToken.length || !crypto.timingSafeEqual(Buffer.from(savedToken), Buffer.from(claimToken))) {
      throw new HttpsError("permission-denied", "This booking claim link is invalid or has already been used");
    }
    if (booking.status === "CANCELLED" || booking.lineUserId) throw new HttpsError("failed-precondition", "This booking can no longer be claimed");
    transaction.update(bookingRef, {
      ownerUid: request.auth.uid,
      customerId: profile.userId,
      lineUserId: profile.userId,
      lineDisplayName: profile.displayName || "",
      notificationChannel: "LINE",
      customerClaimToken: FieldValue.delete(),
      claimStatus: "CLAIMED",
      lineClaimedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (claimRef) transaction.update(claimRef, { active: false, claimedAt: FieldValue.serverTimestamp() });
    transaction.set(db.doc("customers/" + profile.userId), {
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
exports.getPublicManagedPackages = onCall(async (request) => {
  const inviteToken = text(request.data?.inviteToken, 160);
  const db = admin.firestore();
  const [packageSnapshot, inviteSnapshot] = await Promise.all([
    db.collection("managedPackages").get(),
    inviteToken ? db.doc("packageInvites/" + inviteToken).get() : Promise.resolve(null),
  ]);
  const allPackages = packageSnapshot.docs.map((snap) => ({ docId: snap.id, ...snap.data() }));
  const packages = allPackages.filter((pkg) => pkg.name && !pkg.deleted && packageVisibility(pkg.visibility) === "PUBLIC");
  const restrictedPackageIds = allPackages.filter((pkg) => pkg.name && !pkg.deleted && packageVisibility(pkg.visibility) !== "PUBLIC").map((pkg) => pkg.docId);
  if (inviteSnapshot?.exists && inviteIsActive(inviteSnapshot.data(), inviteSnapshot.data().packageName)) {
    const invitePackage = await db.doc("managedPackages/" + managedPackageId(inviteSnapshot.data().packageName)).get();
    if (invitePackage.exists && !invitePackage.data().deleted) {
      packages.push({ docId: invitePackage.id, ...invitePackage.data(), inviteOnlyGranted: true });
      const index = restrictedPackageIds.indexOf(invitePackage.id);
      if (index >= 0) restrictedPackageIds.splice(index, 1);
    }
  }
  return { packages, restrictedPackageIds };
});

exports.createPackageInvite = onCall(async (request) => {
  const actor = await assertStaff(request);
  const packageName = text(request.data?.packageName, 200);
  const expiresOn = text(request.data?.expiresOn, 10);
  if (!packageName || (expiresOn && !validDate(expiresOn))) throw new HttpsError("invalid-argument", "Package name and valid expiry date are required");
  const db = admin.firestore();
  const packageSnap = await db.doc("managedPackages/" + managedPackageId(packageName)).get();
  if (!packageSnap.exists || packageSnap.data().deleted) throw new HttpsError("not-found", "Package not found");
  const token = crypto.randomBytes(18).toString("hex");
  await db.doc("packageInvites/" + token).set({ packageName, active: true, expiresOn: expiresOn || "", createdBy: actor.email, createdAt: FieldValue.serverTimestamp() });
  return { token, packageName, expiresOn };
});

exports.revokePackageInvite = onCall(async (request) => {
  const actor = await assertStaff(request);
  const token = text(request.data?.token, 160);
  if (!token) throw new HttpsError("invalid-argument", "Invitation token is required");
  await admin.firestore().doc("packageInvites/" + token).set({ active: false, revokedBy: actor.email, revokedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { revoked: true };
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
  const actor = await assertStaff(request);
  const bookingId = String(request.data && request.data.bookingId || "").trim();
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required");
  const booking = await admin.firestore().doc("bookings/" + bookingId).get();
  if (!booking.exists) throw new HttpsError("not-found", "Booking not found");
  if (booking.data().appointmentDate !== taipeiDate(1)) throw new HttpsError("failed-precondition", "Only tomorrow bookings can receive a D-1 reminder");
  if (booking.data().status !== "CONFIRMED" || !booking.data().checkInSerial) throw new HttpsError("failed-precondition", "Confirm booking and assign a check-in serial first");
  const channel = await sendD1Notice(booking, actor);
  return { status: channel };
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

const STAFF_BOOKING_STATUSES = new Set(["BOOKED", "CONFIRMED", "RESCHEDULED", "CANCELLED"]);
const REPORT_STATUSES = new Set(["PENDING", "READY_FOR_PICKUP", "MAILED", "FOLLOW_UP_REQUIRED"]);

function hasOwn(input, key) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function safeStaffBookingPatch(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new HttpsError("invalid-argument", "Booking fields are required");
  const patch = {};
  if (hasOwn(input, "customerName")) patch.customerName = text(input.customerName, 160);
  if (hasOwn(input, "customerPhone")) patch.customerPhone = text(input.customerPhone, 80);
  if (hasOwn(input, "medicalRecordNumber")) patch.medicalRecordNumber = text(input.medicalRecordNumber, 80);
  if (hasOwn(input, "customerEmail")) {
    const email = text(input.customerEmail, 320).toLowerCase();
    if (email && !validEmail(email)) throw new HttpsError("invalid-argument", "Invalid customer email");
    patch.customerEmail = email;
  }
  if (hasOwn(input, "appointmentDate")) {
    const date = text(input.appointmentDate, 10);
    if (!validDate(date)) throw new HttpsError("invalid-argument", "Invalid appointment date");
    patch.appointmentDate = date;
  }
  if (hasOwn(input, "channel")) patch.channel = text(input.channel, 120) || "GENERAL";
  if (hasOwn(input, "packageName")) patch.packageName = text(input.packageName, 200);
  if (hasOwn(input, "status")) {
    const status = text(input.status, 20);
    if (!STAFF_BOOKING_STATUSES.has(status)) throw new HttpsError("invalid-argument", "Invalid booking status");
    patch.status = status;
  }
  if (hasOwn(input, "notes")) patch.notes = text(input.notes, 2000);
  if (hasOwn(input, "finalPrice")) patch.finalPrice = number(input.finalPrice);
  if (hasOwn(input, "listPrice")) patch.listPrice = number(input.listPrice);
  if (hasOwn(input, "discountRate")) patch.discountRate = number(input.discountRate);
  if (hasOwn(input, "selectedItems")) patch.selectedItems = safeItems(input.selectedItems);
  if (hasOwn(input, "reportStatus")) {
    const status = text(input.reportStatus, 40);
    if (!REPORT_STATUSES.has(status)) throw new HttpsError("invalid-argument", "Invalid report status");
    patch.reportStatus = status;
  }
  if (hasOwn(input, "reportInternalNote")) patch.reportInternalNote = text(input.reportInternalNote, 4000);
  if (!Object.keys(patch).length) throw new HttpsError("invalid-argument", "No editable booking fields supplied");
  return patch;
}

exports.updateBookingAsStaff = onCall({ invoker: "public" }, async (request) => {
  const actor = await assertStaff(request);
  const bookingId = text(request.data?.bookingId, 200);
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required");
  const patch = safeStaffBookingPatch(request.data?.fields);
  const db = admin.firestore();
  const bookingRef = db.doc("bookings/" + bookingId);
  await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
    const booking = bookingSnap.data();
    if (booking.status === "CANCELLED" && patch.status !== "CANCELLED") throw new HttpsError("failed-precondition", "Cancelled bookings cannot be edited");
    const dateChanged = patch.appointmentDate && patch.appointmentDate !== booking.appointmentDate;
    const nextPatch = {
      ...patch,
      ...(dateChanged ? { status: "BOOKED", checkInSerial: null, checkInSequence: null, d1NoticeSentAt: null, d1AcknowledgedAt: null, d1NoticeStatus: null } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.update(bookingRef, nextPatch);
    if (nextPatch.selectedItems) transaction.set(db.doc("checklists/" + bookingId), { bookingId, ...checklistFor(nextPatch.selectedItems), generatedAt: FieldValue.serverTimestamp(), printedAt: null }, { merge: true });
    if (booking.customerId) transaction.set(db.doc("customers/" + booking.customerId), {
      name: nextPatch.customerName ?? booking.customerName ?? "", phone: nextPatch.customerPhone ?? booking.customerPhone ?? "",
      email: nextPatch.customerEmail ?? booking.customerEmail ?? "", updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    writeBookingAudit(transaction, db, { action: "UPDATE", bookingId, actor, before: booking, after: { ...booking, ...nextPatch } });
  });
  return { updated: true };
});
exports.approveBookingChangeAsStaff = onCall(async (request) => {
  const actor = await assertStaff(request);
  const requestId = text(request.data?.requestId, 200);
  if (!requestId) throw new HttpsError("invalid-argument", "requestId is required");
  const db = admin.firestore();
  const changeRef = db.doc("bookingChangeRequests/" + requestId);
  await db.runTransaction(async (transaction) => {
    const changeSnap = await transaction.get(changeRef);
    if (!changeSnap.exists) throw new HttpsError("not-found", "Change request not found");
    const change = changeSnap.data();
    const bookingRef = db.doc("bookings/" + text(change.bookingId, 200));
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError("not-found", "Booking not found");
    const booking = bookingSnap.data();
    if (change.status !== "pending") throw new HttpsError("failed-precondition", "Change request is no longer pending");
    if (!validDate(change.requestedAppointmentDate)) throw new HttpsError("invalid-argument", "Invalid requested appointment date");
    const patch = { appointmentDate: change.requestedAppointmentDate, status: "BOOKED", checkInSerial: null, checkInSequence: null, d1NoticeSentAt: null, d1AcknowledgedAt: null, d1NoticeStatus: null, updatedAt: FieldValue.serverTimestamp() };
    transaction.update(bookingRef, patch);
    transaction.update(changeRef, { status: "approved", approvedAt: FieldValue.serverTimestamp(), approvedBy: actor.email, updatedAt: FieldValue.serverTimestamp() });
    writeBookingAudit(transaction, db, { action: "APPROVE_CHANGE", bookingId: bookingRef.id, actor, before: booking, after: { ...booking, ...patch } });
  });
  return { approved: true };
});

exports.checkInBookingAsStaff = onCall(async (request) => {
  const actor = await assertStaff(request);
  const bookingId = text(request.data?.bookingId, 200);
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required");
  const db = admin.firestore();
  const bookingRef = db.doc("bookings/" + bookingId);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(bookingRef);
    if (!snap.exists) throw new HttpsError("not-found", "Booking not found");
    const booking = snap.data();
    if (booking.status === "CANCELLED") throw new HttpsError("failed-precondition", "Cancelled booking cannot check in");
    if (booking.checkInStatus === "CHECKED_IN") return { alreadyCheckedIn: true };
    const patch = { checkInStatus: "CHECKED_IN", checkedInAt: FieldValue.serverTimestamp(), checkedInBy: actor.email, updatedAt: FieldValue.serverTimestamp() };
    transaction.update(bookingRef, patch);
    return { alreadyCheckedIn: false };
  });
});
function makeCheckInSerial(date, sequence) {
  return String(date || "").slice(5).replace("-", "") + "-" + String(sequence).padStart(3, "0");
}

exports.confirmBookingWithSerial = onCall(async (request) => {
  const actor = await assertStaff(request);
  const bookingId = String(request.data && request.data.bookingId || "").trim();
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required");
  const db = admin.firestore();
  const bookingRef = db.doc("bookings/" + bookingId);
  const result = await db.runTransaction(async (transaction) => {
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
    const patch = { status: "CONFIRMED", confirmedAt: FieldValue.serverTimestamp(), checkInSerial, checkInSequence: sequence, updatedAt: FieldValue.serverTimestamp() };
    transaction.update(bookingRef, patch);
    writeBookingAudit(transaction, db, { action: "CONFIRM", bookingId, actor, before: booking, after: { ...booking, ...patch } });
    return { checkInSerial };
  });
  return result;
});
exports.configureGmailMailer = onCall({ secrets: [mailerEncryptionKey] }, async (request) => {
  const actor = await assertAdmin(request);
  const input = request.data || {};
  const clientId = text(input.clientId, 300);
  const clientSecret = text(input.clientSecret, 500);
  const senderEmail = text(input.senderEmail, 320).toLowerCase();
  if (!clientId.endsWith(".apps.googleusercontent.com") || !clientSecret || !validEmail(senderEmail)) {
    throw new HttpsError("invalid-argument", "Valid Gmail OAuth client details and sender email are required");
  }
  const ref = admin.firestore().doc(MAILER_SETTINGS_PATH);
  const current = await ref.get();
  await ref.set({
    clientId,
    clientSecretEncrypted: encryptMailerValue(clientSecret),
    senderEmail,
    configuredAt: FieldValue.serverTimestamp(),
    configuredBy: actor.email,
    refreshTokenEncrypted: FieldValue.delete(),
    connectedAt: FieldValue.delete(),
    connectedBy: FieldValue.delete(),
  }, { merge: true });
  await writeBookingAuditRecord({ action: "CONFIGURE_GMAIL_MAILER", bookingId: "", actor });
  return { configured: true };
});

exports.getGmailMailerStatus = onCall(async (request) => {
  await assertAdmin(request);
  const snap = await admin.firestore().doc(MAILER_SETTINGS_PATH).get();
  const data = snap.exists ? snap.data() : {};
  return { configured: Boolean(data.clientId && data.clientSecretEncrypted && data.senderEmail), connected: Boolean(data.refreshTokenEncrypted), senderEmail: data.senderEmail || "", connectedAt: data.connectedAt || null };
});

exports.startGmailMailerAuthorization = onCall({ secrets: [mailerEncryptionKey] }, async (request) => {
  const actor = await assertAdmin(request);
  const settings = await getMailerSettings(false);
  const state = crypto.randomBytes(32).toString("hex");
  await admin.firestore().doc("mailerAuthorizationStates/" + state).set({
    state,
    actorUid: actor.uid,
    actorEmail: actor.email,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: FieldValue.serverTimestamp(),
  });
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", settings.clientId);
  authUrl.searchParams.set("redirect_uri", MAILER_OAUTH_CALLBACK);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.send");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  return { authorizationUrl: authUrl.toString() };
});

exports.connectMailerCallback = onRequest({ secrets: [mailerEncryptionKey] }, async (request, response) => {
  const state = text(request.query?.state, 200);
  const code = text(request.query?.code, 4096);
  const oauthError = text(request.query?.error, 200);
  const finish = (title, detail, status = 200) => response.status(status).type("html").send("<!doctype html><meta charset=\"utf-8\"><title>" + title + "</title><main style=\"font-family:system-ui;max-width:560px;margin:48px auto;padding:24px\"><h1>" + title + "</h1><p>" + detail + "</p><p>可關閉此頁並回到 CAC 後台。</p></main>");
  if (oauthError) return finish("Gmail 連結未完成", "Google 授權被取消或拒絕。", 400);
  if (!state || !code) return finish("Gmail 連結失敗", "缺少授權資料。", 400);
  const stateRef = admin.firestore().doc("mailerAuthorizationStates/" + state);
  const stateSnap = await stateRef.get();
  const expiresAt = stateSnap.exists ? stateSnap.data().expiresAt?.toDate?.() : null;
  if (!stateSnap.exists || !expiresAt || expiresAt.getTime() < Date.now()) return finish("Gmail 連結失敗", "此授權連結已過期，請回後台重新開始。", 400);
  try {
    const settings = await getMailerSettings(false);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: settings.clientId, client_secret: settings.clientSecret, redirect_uri: MAILER_OAUTH_CALLBACK, grant_type: "authorization_code" }),
    });
    const tokenJson = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenJson.refresh_token) throw new Error("Google did not return a refresh token");
    await admin.firestore().doc(MAILER_SETTINGS_PATH).set({
      refreshTokenEncrypted: encryptMailerValue(tokenJson.refresh_token),
      connectedAt: FieldValue.serverTimestamp(),
      connectedBy: stateSnap.data().actorEmail || "",
      lastConnectionError: null,
    }, { merge: true });
    await stateRef.delete();
    await writeBookingAuditRecord({ action: "CONNECT_GMAIL_MAILER", bookingId: "", actor: { uid: stateSnap.data().actorUid, email: stateSnap.data().actorEmail, role: "ADMIN" } });
    return finish("Gmail 已連結", "預約認領信將由已設定的健檢中心信箱寄出。");
  } catch (error) {
    console.error("Gmail mailer callback failed", error.message);
    return finish("Gmail 連結失敗", "無法完成授權。請回後台重新設定或重新連結。", 500);
  }
});

exports.sendBookingClaimEmailAsStaff = onCall({ secrets: [mailerEncryptionKey] }, async (request) => {
  const actor = await assertStaff(request);
  const bookingId = text(request.data?.bookingId, 200);
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required");
  const bookingRef = admin.firestore().doc("bookings/" + bookingId);
  const status = await sendBookingClaimEmail(bookingRef, actor);
  return { status };
});
exports.exportBookingClaimsAsStaff = onCall(async (request) => {
  const actor = await assertStaff(request);
  const bookingIds = Array.isArray(request.data?.bookingIds) ? request.data.bookingIds : [];
  const uniqueIds = [...new Set(bookingIds.map((value) => text(value, 200)).filter(Boolean))].slice(0, 200);
  if (!uniqueIds.length) throw new HttpsError("invalid-argument", "Select at least one booking");
  const rows = [];
  for (const bookingId of uniqueIds) {
    try {
      const bookingRef = admin.firestore().doc("bookings/" + bookingId);
      const issued = await issueBookingClaim(bookingRef, actor);
      const bookingSnap = await bookingRef.get();
      const booking = bookingSnap.data() || {};
      rows.push({
        bookingId,
        customerName: text(booking.customerName, 160),
        employeeNumber: text(booking.employeeNumber, 120),
        appointmentDate: text(booking.appointmentDate, 10),
        packageName: text(booking.packageName, 200),
        claimUrl: customerLineClaimUrl(issued.claimToken),
        claimExpiresOn: issued.expiresOn,
      });
    } catch (error) {
      rows.push({ bookingId, error: String(error?.message || error).slice(0, 240) });
    }
  }
  return { rows };
});
