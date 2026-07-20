import assert from "node:assert/strict";
import {
  buildBookingPayload,
  exportBookingsCsv,
  buildChecklistPayload,
  buildPublicPackageCards,
  getPublicPackageDisplayItems,
  getPublicPackageHighlights,
  getPublicPackageComparisonValue,
  inferPublicPackageTags,
  PUBLIC_COMPARISON_ROWS,
  sortPublicComparisonCards,
  calculatePricing,
  filterPublicPackageCards,
  generateChecklist,
  makeFirestoreSafeId,
  parseBookingImportCsv,
  parseCSV,
  parseHealthCsv,
} from "./core.js";
function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}
run("parseCSV handles quoted commas and newlines", () => {
  const rows = parseCSV('分類,檢查項目(中),備註,套餐\n血液常規,"CBC,DC","第一行\n第二行",v');
  assert.equal(rows[1][1], "CBC,DC");
  assert.equal(rows[1][2], "第一行\n第二行");
});

run("parseHealthCsv expands package columns into item ids", () => {
  const csv = "分類,檢查項目(中),檢查項目(英),臨床意義 (可瞭解之症狀),自費價,院碼,委外單位,備註 (檢驗天數/限制/說明),小資\n血液常規,CBC,CBC,貧血,300,612138,,,v\n尿液檢查,Urine,Urine,尿液,90,615078,,,\n";
  const parsed = parseHealthCsv(csv);
  assert.equal(parsed.items.length, 2);
  assert.deepEqual(parsed.packages["小資"], [1]);
});

run("calculatePricing applies configured thresholds", () => {
  assert.equal(calculatePricing([{ price: 8000 }]).discountRate, 10);
  assert.equal(calculatePricing([{ price: 16000 }]).discountRate, 15);
  assert.equal(calculatePricing([{ price: 24000 }]).discountRate, 20);
  assert.equal(calculatePricing([{ price: 32000 }]).discountRate, 25);
});

run("buildBookingPayload preserves selected item fields and manual final price", () => {
  const result = buildBookingPayload({
    formData: {
      name: "王小明",
      phone: "0912345678",
      idNumber: "A123456789",
      channel: "GENERAL",
      appointmentDate: "2026-08-01",
      notes: "早上",
    },
    lineProfile: { userId: "U123", displayName: "LineName" },
    packageName: "自選",
    selectedItems: [
      { id: 1, name: "CBC", enName: "CBC", code: "612138", category: "血液常規", price: 300, remark: "空腹", outsource: "" },
    ],
    listPrice: 300,
    discountRate: 5,
    finalPrice: 999,
  });

  assert.equal(result.customer.idNumberMasked, "A1***89");
  assert.equal(result.booking.customerName, "王小明");
  assert.equal(result.booking.customerPhone, "0912345678");
  assert.equal(result.booking.finalPrice, 999);
  assert.deepEqual(Object.keys(result.booking.selectedItems[0]), ["id", "name", "enName", "code", "category", "price", "remark", "outsource"]);
});

run("makeFirestoreSafeId removes Firestore path separators", () => {
  assert.equal(makeFirestoreSafeId("0987654321-1970/01/02"), "0987654321-1970-01-02");
});

run("generateChecklist groups warnings and outsource items", () => {
  const booking = {
    bookingId: "b1",
    selectedItems: [
      { name: "CBC", category: "血液常規", remark: "空腹", outsource: "" },
      { name: "FIT", category: "糞便檢查", remark: "", outsource: "外檢" },
      { name: "其他", category: "未知", remark: "", outsource: "" },
    ],
  };

  const groups = generateChecklist(booking.selectedItems);
  const checklist = buildChecklistPayload(booking);
  assert.equal(groups[0].station, "B站 抽血");
  assert.equal(checklist.warnings.length, 1);
  assert.equal(checklist.outsourceItems.length, 1);
});
run("public package cards filter by sex and body part", () => {
  const items = [
    { id: 1, category: "心血管檢查", name: "\u5fc3\u81df\u5f69\u8272\u675c\u666e\u52d2\u8d85\u97f3\u6ce2", enName: "Cardiac ultrasound", price: 1000 },
    { id: 2, category: "腫瘤篩檢", name: "PSA", enName: "PSA", price: 1000 },
    { id: 3, category: "影像醫學", name: "Brain MRI", enName: "Brain MRI", price: 10000 },
  ];
  const cards = buildPublicPackageCards({ "婚前男": [1, 2], "腦心高階": [1, 3] }, items);
  assert.equal(filterPublicPackageCards(cards, { audience: "婚前", sex: "男", bodyPart: "心血管" }).length, 1);
  assert.equal(filterPublicPackageCards(cards, { audience: "高階", sex: "不限", bodyPart: "腦部" })[0].name, "腦心高階");
});

run("public package cards hide enterprise and labor packages", () => {
  const items = [{ id: 1, category: "一般檢查", name: "一般檢查", price: 1000 }];
  const cards = buildPublicPackageCards({ "企業團檢A": [1], "勞工體檢": [1], "3500基礎": [1] }, items);
  assert.deepEqual(cards.map((card) => card.name), ["3500基礎"]);
});

run("public package cards split general and high-end by 8000 threshold", () => {
  const items = [
    { id: 1, category: "一般檢查", name: "一般檢查", price: 3500 },
    { id: 2, category: "影像醫學", name: "LowDose LungCT(non-contrast)", enName: "LowDose LungCT", price: 7200 },
    { id: 3, category: "血液常規", name: "CBC", price: 1000 },
  ];
  const cards = buildPublicPackageCards({ "3500基礎": [1], "8000馬年": [2, 3] }, items);
  assert.equal(filterPublicPackageCards(cards, { audience: "一般", sex: "不限", bodyPart: "全部" }).length, 1);
  assert.equal(filterPublicPackageCards(cards, { audience: "高階", sex: "不限", bodyPart: "全部" })[0].name, "8000馬年");
});

run("public highlights summarize categories and exclude low-value basics", () => {
  const highlights = getPublicPackageHighlights([
    { name: "一般檢查", category: "一般檢查", price: 99999 },
    { name: "血脂肪全套", category: "血脂肪", enName: "Cholesterol/TG/HDL/LDL", price: 99998 },
    { name: "飯前血糖", category: "糖尿病檢驗", enName: "Glucose AC", price: 99997 },
    { name: "胸部X光", category: "影像醫學", enName: "CXR", price: 99996 },
    { name: "LowDose LungCT(non-contrast)", category: "影像醫學", enName: "LowDose LungCT", price: 7200 },
    { name: "冠狀動脈鈣化分析(無顯影)", category: "影像醫學", enName: "Calcium Score(non-contrast)", price: 7200 },
    { name: "AFP", category: "腫瘤篩檢", price: 360 },
    { name: "CEA", category: "腫瘤篩檢", price: 480 },
    { name: "腹部超音波", category: "超音波", price: 1056 },
    { name: "心臟彩色杜普勒超音波", category: "超音波", price: 2520 },
  ]);
  assert.deepEqual(highlights.map((item) => item.label), ["CT/CTA 影像檢查（2項）", "超音波檢查（2項）", "腫瘤標記篩檢（2項）"]);
});
run("public filters include premarital packages in premarital audience", () => {
  const items = [
    { id: 1, category: "影像醫學", name: "Brain MRI", enName: "Brain MRI", price: 8000 },
    { id: 2, category: "腫瘤篩檢", name: "PSA", enName: "PSA", price: 1000 },
  ];
  const cards = buildPublicPackageCards({ "婚前男": [2], "8000婚前高階": [1] }, items);
  assert.deepEqual(filterPublicPackageCards(cards, { audience: "婚前", sex: "不限", bodyPart: "全部" }).map((card) => card.name), ["婚前男", "8000婚前高階"]);
});

run("public display items prioritize main items and exclude basic hepatitis items", () => {
  const displayItems = getPublicPackageDisplayItems([
    { name: "B、C型肝炎抗原抗體", category: "肝炎檢驗", enName: "HBsAg/Anti-HBs/Anti-HCV", price: 99999 },
    { name: "一般檢查", category: "一般檢查", price: 99998 },
    { name: "腦部MRI", category: "影像醫學", enName: "Brain MRI", price: 12000 },
    { name: "心臟彩色杜普勒超音波", category: "超音波", price: 2520 },
  ]);
  assert.deepEqual(displayItems.map((item) => item.name), ["腦部MRI", "心臟彩色杜普勒超音波"]);
});
run("public highlights do not classify Pulmonary Function Test as CT", () => {
  const highlights = getPublicPackageHighlights([
    { name: "肺功能檢查", category: "特殊功能檢查", enName: "Pulmonary Function Test", price: 1500 },
    { name: "靜態心電圖", category: "心血管檢查", enName: "EKG", price: 300 },
  ]);
  assert.deepEqual(highlights.map((item) => item.label), ["肺功能檢查"]);
});
run("public highlights exclude static EKG", () => {
  const highlights = getPublicPackageHighlights([
    { name: "靜態心電圖", category: "心血管檢查", enName: "EKG", price: 99999 },
    { name: "心臟彩色杜普勒超音波", category: "超音波", price: 2520 },
  ]);
  assert.deepEqual(highlights.map((item) => item.label), ["超音波檢查"]);
});

run("public package cards include thyroid package as general", () => {
  const items = [
    { id: 1, category: "甲狀腺功能檢驗", name: "TSH", enName: "TSH", price: 288 },
    { id: 2, category: "特殊功能檢查", name: "胃幽門螺旋桿菌", enName: "H.pylori", price: 450 },
  ];
  const cards = buildPublicPackageCards({ "甲狀腺": [1, 2], "3500基礎": [1] }, items);
  assert.deepEqual(cards.map((card) => card.name), ["甲狀腺", "3500基礎"]);
  assert.deepEqual(cards[0].tags.audience, ["一般"]);
});
run("public package cards keep civil servant packages out of general audience", () => {
  const items = [{ id: 1, category: "超音波", name: "腹部超音波", enName: "Abdomen ultrasound", price: 3500 }];
  const cards = buildPublicPackageCards({ "3500公教": [1], "3500基礎": [1] }, items);
  assert.deepEqual(filterPublicPackageCards(cards, { audience: "一般", sex: "不限", bodyPart: "全部" }).map((card) => card.name), ["3500基礎"]);
  assert.deepEqual(filterPublicPackageCards(cards, { audience: "公教", sex: "不限", bodyPart: "全部" }).map((card) => card.name), ["3500公教"]);
});

run("public package cards classify premarital packages only as premarital", () => {
  const items = [{ id: 1, category: "超音波", name: "心臟彩色杜普勒超音波", enName: "Cardiac ultrasound", price: 9000 }];
  const cards = buildPublicPackageCards({ "7000婚前女": [1] }, items);
  assert.deepEqual(cards[0].tags.audience, ["婚前"]);
  assert.equal(filterPublicPackageCards(cards, { audience: "高階", sex: "不限", bodyPart: "全部" }).length, 0);
});
run("public package cards use saved package metadata", () => {
  const items = [{ id: 1, category: "影像醫學", name: "低劑量肺部電腦斷層", enName: "LowDose LungCT", price: 7200 }];
  const cards = buildPublicPackageCards(
    { "A公司團檢": [1] },
    items,
    { "A公司團檢": { audience: "公教", finalPrice: 8000 } }
  );
  assert.equal(cards[0].price, 8000);
  assert.equal(cards[0].channel, "CORPORATE");
  assert.deepEqual(cards[0].tags.audience, ["公教"]);
});
run("public package cards derive channel from audience", () => {
  const items = [{ id: 1, category: "影像醫學", name: "低劑量肺部電腦斷層", enName: "LowDose LungCT", price: 7200 }];
  const cards = buildPublicPackageCards({ "8000馬年": [1] }, items);
  assert.deepEqual(cards[0].tags.audience, ["高階"]);
  assert.equal(cards[0].channel, "HIGH_END");
});



run("public body-part tags exclude EKG-only and CXR-only packages", () => {
  const ekgOnly = inferPublicPackageTags("EKG only", [
    { category: "\u5fc3\u8840\u7ba1\u6aa2\u67e5", name: "\u975c\u614b\u5fc3\u96fb\u5716", enName: "EKG", price: 180 },
  ], 2700);
  const cxrOnly = inferPublicPackageTags("CXR only", [
    { category: "\u5f71\u50cf\u91ab\u5b78", name: "\u80f8\u90e8 X \u5149", enName: "CXR", price: 240 },
  ], 2700);
  const cardiacUs = inferPublicPackageTags("Cardiac ultrasound", [
    { category: "\u8d85\u97f3\u6ce2", name: "\u5fc3\u81df\u5f69\u8272\u675c\u666e\u52d2\u8d85\u97f3\u6ce2", enName: "Cardiac ultrasound", price: 3600 },
  ], 8000);
  const lungCt = inferPublicPackageTags("Lung CT", [
    { category: "\u5f71\u50cf\u91ab\u5b78", name: "\u4f4e\u5291\u91cf\u80ba\u90e8\u96fb\u8166\u65b7\u5c64", enName: "LowDose LungCT", price: 7200 },
  ], 8000);

  assert(!ekgOnly.bodyParts.includes("\u5fc3\u8840\u7ba1"));
  assert(!cxrOnly.bodyParts.includes("\u80ba\u90e8"));
  assert(cardiacUs.bodyParts.includes("\u5fc3\u8840\u7ba1"));
  assert(lungCt.bodyParts.includes("\u80ba\u90e8"));
});
run("public brain body-part requires brain CT or MRI item", () => {
  const items = [
    { id: 1, category: "影像醫學", name: "低劑量肺部電腦斷層", enName: "LowDose LungCT", price: 7200 },
    { id: 2, category: "心血管功能檢驗", name: "N端B型利鈉胜肽前驅物", enName: "NT-proBNP", price: 960 },
    { id: 3, category: "影像醫學", name: "腦部磁振造影", enName: "Brain MRI", price: 7800 },
  ];
  const cards = buildPublicPackageCards({ "肺腦心肝": [1, 2], "腦部MRI": [3] }, items);
  assert.deepEqual(filterPublicPackageCards(cards, { audience: "高階", sex: "不限", bodyPart: "腦部" }).map((card) => card.name), ["腦部MRI"]);
});
run("public package comparison summarizes key categories by locale", () => {
  const card = {
    price: 12000,
    highlights: [{ label: "Brain MRI" }, { label: "Tumor markers" }],
    items: [
      { name: "\u8166\u90e8 MRI", enName: "Brain MRI", category: "Imaging" },
      { name: "\u5fc3\u81df\u8d85\u97f3\u6ce2", enName: "Cardiac ultrasound", category: "Ultrasound" },
    ],
  };
  assert.equal(getPublicPackageComparisonValue(card, "price"), "NT$ 12,000");
  assert.equal(getPublicPackageComparisonValue(card, "imaging", "zh"), "\u8166\u90e8 MRI");
  assert.equal(getPublicPackageComparisonValue(card, "imaging", "en"), "Brain MRI");
  assert.equal(getPublicPackageComparisonValue(card, "ultrasound", "zh"), "\u5fc3\u81df\u8d85\u97f3\u6ce2");
  assert.equal(getPublicPackageComparisonValue(card, "ultrasound", "en"), "Cardiac ultrasound");
  assert.equal(getPublicPackageComparisonValue(card, "endoscopy"), "-");
});

run("public comparison excludes loose imaging, cardio, and tumor markers", () => {
  const card = {
    price: 12000,
    highlights: [],
    items: [
      { name: "\u80ba\u529f\u80fd\u6aa2\u67e5", enName: "Pulmonary Function Test", category: "Special Function" },
      { name: "\u9031\u908a\u52d5\u8108\u786c\u5316\u7be9\u6aa2", enName: "ABI/PWV", category: "Vascular" },
      { name: "\u975c\u614b\u5fc3\u96fb\u5716", enName: "EKG", category: "\u5fc3\u8840\u7ba1\u6aa2\u67e5" },
      { name: "\u7532\u7a2e\u80ce\u5152\u86cb\u767d", enName: "AFP", category: "Tumor marker" },
      { name: "\u51a0\u72c0\u52d5\u8108\u9223\u5316\u5206\u6790", enName: "Calcium Score", category: "Imaging" },
    ],
  };
  assert(!PUBLIC_COMPARISON_ROWS.some((row) => row.key === "tumor"));
  assert.equal(getPublicPackageComparisonValue(card, "imaging", "en"), "Calcium Score");
  assert.equal(getPublicPackageComparisonValue(card, "cardio", "en"), "Calcium Score");
});
run("public comparison cards sort by package, price, and comparison fields", () => {
  const cards = [
    { name: "B", price: 9000, highlights: [], items: [{ name: "\u8179\u90e8\u8d85\u97f3\u6ce2", enName: "Abdominal ultrasound", category: "\u8d85\u97f3\u6ce2" }] },
    { name: "A", price: 3000, highlights: [], items: [] },
    { name: "C", price: 6000, highlights: [], items: [{ name: "\u5fc3\u81df\u8d85\u97f3\u6ce2", enName: "Cardiac ultrasound", category: "\u8d85\u97f3\u6ce2" }] },
  ];
  assert.deepEqual(sortPublicComparisonCards(cards, { key: "package", direction: "asc" }).map((card) => card.name), ["A", "B", "C"]);
  assert.deepEqual(sortPublicComparisonCards(cards, { key: "price", direction: "desc" }).map((card) => card.name), ["B", "C", "A"]);
  assert.deepEqual(sortPublicComparisonCards(cards, { key: "ultrasound", direction: "asc" }, "en").map((card) => card.name), ["B", "C", "A"]);
});
run("booking CSV export/import round trips core fields", () => {
  const csv = exportBookingsCsv([
    {
      customerName: "Alice, HR",
      customerPhone: "0912345678",
      appointmentDate: "2026-07-20",
      channel: "CORPORATE",
      packageName: "A Corp Package",
      finalPrice: 8000,
      status: "CONFIRMED",
      notes: "line1\nline2",
    },
  ]);
  const rows = parseBookingImportCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Alice, HR");
  assert.equal(rows[0].appointmentDate, "2026-07-20");
  assert.equal(rows[0].packageName, "A Corp Package");
  assert.equal(rows[0].finalPrice, 8000);
  assert.equal(rows[0].notes, "line1\nline2");
});