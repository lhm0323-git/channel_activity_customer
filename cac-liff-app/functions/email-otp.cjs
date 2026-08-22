const crypto = require("crypto");

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function phoneLastFour(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.slice(-4);
}

function randomOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function digest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("base64url");
}

function verifyDigest(value, expected) {
  const actual = Buffer.from(digest(value));
  const saved = Buffer.from(String(expected || ""));
  return actual.length === saved.length && crypto.timingSafeEqual(actual, saved);
}

function randomAccessToken() {
  return crypto.randomBytes(32).toString("base64url");
}

module.exports = { normalizeEmail, phoneLastFour, randomOtp, digest, verifyDigest, randomAccessToken };
