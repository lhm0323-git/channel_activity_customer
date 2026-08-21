function hospitalStaffKey(empid) {
  const normalized = String(empid || "").trim();
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(normalized)) throw new Error("invalid employee ID");
  return `ptch:${normalized}`;
}

function validateHospitalTokenResponse(body) {
  if (!body || typeof body.access_token !== "string" || body.access_token.trim().length < 16) {
    throw new Error("missing hospital access token");
  }
  return true;
}

module.exports = { hospitalStaffKey, validateHospitalTokenResponse };