const assert = require("node:assert/strict");
const { buildConfirmationNotice } = require("../functions/confirmation-notice.cjs");

const booking = {
  appointmentDate: "2099-01-02",
  packageName: "測試套餐",
  checkInSerial: "0102-001",
  selectedItems: [{ name: "大腸鏡檢查", category: "腸胃內視鏡" }],
};

(async () => {
  const { getVisitInstructions } = await import("./core.js");
  const notice = buildConfirmationNotice(booking);
  assert.match(notice, /預約已確認/);
  assert.match(notice, /2099-01-02/);
  assert.match(notice, /0102-001/);
  for (const instruction of getVisitInstructions(booking.selectedItems, "zh")) {
    assert.ok(notice.includes(instruction), `Missing instruction: ${instruction}`);
  }
  for (const name of ["眼科", "ABI", "子宮頸抹片", "精液分析", "甲狀腺超音波", "運動心電圖", "MRI", "胃鏡麻醉", "大腸鏡", "無痛腸鏡"]) {
    const items = [{ name }];
    const specificNotice = buildConfirmationNotice({ ...booking, selectedItems: items });
    for (const instruction of getVisitInstructions(items, "zh")) assert.ok(specificNotice.includes(instruction), `${name}: ${instruction}`);
  }
  assert.ok(Buffer.byteLength(notice, "utf8") < 5000);
  console.log("ok - confirmation notice includes serial and matching visit instructions");
})().catch((error) => { console.error(error); process.exitCode = 1; });
