const assert = require("node:assert/strict");
const { normalizeEmail, phoneLastFour, randomOtp, digest, verifyDigest, randomAccessToken } = require("../functions/email-otp.cjs");

assert.equal(normalizeEmail(" User@Example.COM "), "user@example.com");
assert.equal(phoneLastFour("0912-345-678"), "5678");
assert.match(randomOtp(), /^\d{6}$/);
assert.ok(verifyDigest("123456", digest("123456")));
assert.equal(verifyDigest("123457", digest("123456")), false);
assert.match(randomAccessToken(), /^[A-Za-z0-9_-]{40,}$/);
console.log("ok - email OTP helpers normalize and verify safely");