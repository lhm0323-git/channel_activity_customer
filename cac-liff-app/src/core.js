export const CHANNELS = [
  { value: "HIGH_END", label: "高階個人" },
  { value: "CORPORATE", label: "企業團體" },
  { value: "LABOR", label: "勞工體檢" },
  { value: "GENERAL", label: "一般預防" },
];

export function audienceToChannel(audience) {
  if (audience === "高階") return "HIGH_END";
  if (audience === "公教") return "CORPORATE";
  return "GENERAL";
}

export const STATION_MAP = {
  一般檢查: { station: "A站 一般檢查", order: 1, duration: 10 },
  理學檢查: { station: "A站 一般檢查", order: 1, duration: 15 },
  血液常規: { station: "B站 抽血", order: 2, duration: 5 },
  肝膽功能: { station: "B站 抽血", order: 2, duration: 0 },
  腎功能: { station: "B站 抽血", order: 2, duration: 0 },
  血脂肪: { station: "B站 抽血", order: 2, duration: 0 },
  糖尿病檢驗: { station: "B站 抽血", order: 2, duration: 0 },
  甲狀腺: { station: "B站 抽血", order: 2, duration: 0 },
  腫瘤篩檢: { station: "B站 抽血", order: 2, duration: 0 },
  尿液檢查: { station: "C站 尿液/糞便", order: 3, duration: 5 },
  糞便檢查: { station: "C站 尿液/糞便", order: 3, duration: 5 },
  特殊功能檢查: { station: "D站 功能檢查", order: 4, duration: 20 },
  心血管檢查: { station: "D站 功能檢查", order: 4, duration: 15 },
  超音波: { station: "E站 超音波", order: 5, duration: 20 },
  影像醫學: { station: "F站 影像醫學", order: 6, duration: 15 },
  腸胃內視鏡: { station: "G站 內視鏡", order: 7, duration: 60 },
  醫師解說: { station: "H站 醫師解說", order: 8, duration: 20 },
};

export function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  const normalizedText = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if (char === "\n" && !inQuotes) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

export function parseHealthCsv(text, userPackages = {}, deletedPackages = {}) {
  const rows = parseCSV(text);
  if (rows.length === 0) return { items: [], packages: {} };

  const headers = rows[0];
  const fixedColumnNames = [
    "分類",
    "檢查項目(中)",
    "檢查項目(英)",
    "臨床意義 (可瞭解之症狀)",
    "自費價",
    "院碼",
    "委外單位",
    "備註 (檢驗天數/限制/說明)",
  ];
  const packageNames = headers.filter(
    (h) => h && !fixedColumnNames.includes(h) && !h.includes("備註") && !h.includes("院碼")
  );
  const idxCategory = headers.indexOf("分類");
  const idxName = headers.indexOf("檢查項目(中)");
  const idxEnName = headers.indexOf("檢查項目(英)");
  const idxClinical = headers.indexOf("臨床意義 (可瞭解之症狀)");
  const idxPrice = headers.indexOf("自費價");
  const idxCode = headers.findIndex((h) => h.includes("院碼"));
  const idxOutsource = headers.findIndex((h) => h.includes("委外"));
  const idxRemark = headers.findIndex((h) => h.includes("備註"));

  const items = [];
  const csvPackages = Object.fromEntries(packageNames.map((name) => [name, []]));

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || idxName === -1 || !cols[idxName]) continue;

    const item = {
      id: i,
      category: idxCategory !== -1 ? cols[idxCategory] : "",
      name: cols[idxName],
      enName: idxEnName !== -1 ? cols[idxEnName] : "",
      clinical: idxClinical !== -1 ? cols[idxClinical] : "",
      price: parseInt((idxPrice !== -1 ? cols[idxPrice] : "0").replace(/,/g, ""), 10) || 0,
      code: idxCode > -1 ? cols[idxCode] : "",
      outsource: idxOutsource > -1 ? cols[idxOutsource] : "",
      remark: idxRemark > -1 ? cols[idxRemark] : "",
    };

    items.push(item);
    packageNames.forEach((pkgName) => {
      const pkgIndex = headers.indexOf(pkgName);
      if (pkgIndex !== -1 && cols[pkgIndex]?.trim()) csvPackages[pkgName].push(item.id);
    });
  }

  const combinedPackages = { ...csvPackages, ...userPackages };
  const packages = Object.fromEntries(
    Object.entries(combinedPackages).filter(([name]) => !Object.prototype.hasOwnProperty.call(deletedPackages, name))
  );

  return { items, packages };
}

export function calculatePricing(items) {
  const listPrice = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  let discountRate = 5;
  if (listPrice >= 32000) discountRate = 25;
  else if (listPrice >= 24000) discountRate = 20;
  else if (listPrice >= 16000) discountRate = 15;
  else if (listPrice >= 8000) discountRate = 10;

  const discountAmount = Math.round(listPrice * (discountRate / 100));
  const rawPrice = listPrice - discountAmount;
  const suggestedPrice = rawPrice < 10000 ? Math.round(rawPrice / 100) * 100 : Math.round(rawPrice / 1000) * 1000;

  return { listPrice, discountRate, discountAmount, suggestedPrice };
}

export const PUBLIC_AUDIENCES = ["全部", "一般", "高階", "公教", "婚前"];
export const PUBLIC_SEXES = ["不限", "男", "女"];
export const PUBLIC_BODY_PARTS = ["全部", "心血管", "肺部", "腦部", "腸胃", "甲狀腺"];

export const PUBLIC_EXCLUDED_HIGHLIGHT_NAMES = new Set([
  "一般檢查",
  "體脂肪檢測",
  "醫師理學",
  "氣壓式眼壓測定",
  "尿液常規檢查",
  "全血計數全套&白血球分類",
  "肝膽功能全套",
  "腎功能全套",
  "胸部X光",
  "血脂肪全套",
  "飯前血糖",
  "B、C型肝炎抗原抗體",
]);

function getPackageTier(packageName, listPrice) {
  if (/企業|勞工/.test(packageName)) return "HIDDEN";
  if (/馬年|12000|12600|16000|23800|32000|47000|CT|MRI|癌篩|心肺|肺腦|全腹|抗老/.test(packageName) || listPrice >= 8000) return "HIGH_END";
  return "GENERAL";
}

export function inferPublicPackageTags(packageName, items = [], listPrice = 0) {
  const text = `${packageName} ${items.map((item) => `${item.category} ${item.name} ${item.enName}`).join(" ")}`;
  const tier = getPackageTier(packageName, listPrice);
  const audience = /公教/.test(packageName)
    ? ["公教"]
    : /婚前/.test(packageName)
      ? ["婚前"]
      : [tier === "HIGH_END" ? "高階" : "一般"];

  let sex = "不限";
  if (/女|婦|乳房|CA-125|CA-153/.test(text)) sex = "女";
  if (/男|攝護腺|前列腺|PSA|PHI/.test(text) && sex !== "女") sex = "男";

  const bodyParts = new Set();
  if (/心|冠狀|血管|EKG|ABI|PWV|Troponin|BNP/.test(text)) bodyParts.add("心血管");
  if (/肺|胸|CXR|LowDose|Pulmonary/.test(text)) bodyParts.add("肺部");
  if (/腦|Brain|頸/.test(text)) bodyParts.add("腦部");
  if (/胃|腸|糞便|FIT|Panendoscopy|Colonoscopy/.test(text)) bodyParts.add("腸胃");
  if (/甲狀腺|Thyroid|TSH|Free T4/.test(text)) bodyParts.add("甲狀腺");

  return { audience, sex, bodyParts: [...bodyParts], tier };
}

function isExcludedPublicHighlight(item) {
  const text = `${item.name || ""} ${item.enName || ""} ${item.category || ""}`;
  return PUBLIC_EXCLUDED_HIGHLIGHT_NAMES.has(item.name) || /胸部\s*X\s*光|CXR|血脂肪全套|Cholesterol\/TG\/HDL\/LDL|飯前血糖|Glucose AC|CBC&DC|心電圖|EKG|肝炎|HBsAg|Anti-HBs|Anti-HCV/.test(text);
}

function getHighlightGroup(item) {
  const text = `${item.category || ""} ${item.name || ""} ${item.enName || ""}`;
  if (/腫瘤|AFP|CA-|CEA|PSA|PIVKA|HE4|PHI|SAA/.test(text)) return "腫瘤標記篩檢";
  if (/超音波|ultrasound/i.test(text)) return "超音波檢查";
  if (/CTA|LungCT|\bCT\b|電腦斷層|鈣化|Calcium Score/i.test(text)) return "CT/CTA 影像檢查";
  if (/MRI|磁振/i.test(text)) return "MRI 影像檢查";
  if (/內視鏡|胃鏡|大腸鏡|Panendoscopy|Colonoscopy/i.test(text)) return "腸胃內視鏡";
  if (/心血管|冠狀|ABI|PWV|Troponin|BNP|EKG/i.test(text)) return "心血管功能檢查";
  if (/甲狀腺|Thyroid|TSH|Free T4/i.test(text)) return "甲狀腺檢查";
  if (/賀爾蒙|營養|Vitamin|DHEA|Testosterone|Estradiol|IGF|PTH/i.test(text)) return "賀爾蒙/營養功能";
  if (/骨質|DXA|BMD/i.test(text)) return "骨質密度檢查";
  return item.name;
}

export function getPublicPackageHighlights(items, maxCount = 6) {
  const groups = new Map();
  items.filter((item) => !isExcludedPublicHighlight(item)).forEach((item) => {
    const label = getHighlightGroup(item);
    const current = groups.get(label) || { id: label, label, count: 0, topPrice: 0 };
    current.count += 1;
    current.topPrice = Math.max(current.topPrice, Number(item.price || 0));
    groups.set(label, current);
  });

  return [...groups.values()]
    .sort((a, b) => b.topPrice - a.topPrice)
    .slice(0, maxCount)
    .map((group) => ({
      id: group.id,
      label: group.count > 1 ? `${group.label}（${group.count}項）` : group.label,
    }));
}

export function getPublicPackageDisplayItems(items) {
  return items
    .filter((item) => !isExcludedPublicHighlight(item))
    .sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
}

export function buildPublicPackageCards(packages, items, packageMeta = {}) {
  return Object.entries(packages)
    .map(([name, ids]) => {
      const packageItems = items.filter((item) => ids.includes(item.id));
      const pricing = calculatePricing(packageItems);
      const meta = packageMeta[name] || {};
      const inferredTags = inferPublicPackageTags(name, packageItems, pricing.listPrice);
      const tags = meta.audience ? { ...inferredTags, audience: [meta.audience] } : inferredTags;
      const audience = tags.audience[0] || "一般";
      const categories = [...new Set(packageItems.map((item) => item.category).filter(Boolean))];
      return {
        name,
        itemIds: ids,
        items: packageItems,
        price: Number(meta.finalPrice) || pricing.suggestedPrice,
        listPrice: pricing.listPrice,
        channel: audienceToChannel(audience),
        tags,
        categories,
        highlights: getPublicPackageHighlights(packageItems),
        displayItems: getPublicPackageDisplayItems(packageItems),
      };
    })
    .filter((card) => card.tags.tier !== "HIDDEN");
}

export function filterPublicPackageCards(cards, filters) {
  return cards.filter((card) => {
    const audienceOk = !filters.audience || filters.audience === "全部" || card.tags.audience.includes(filters.audience);
    const sexOk = !filters.sex || filters.sex === "不限" || card.tags.sex === "不限" || card.tags.sex === filters.sex;
    const bodyPartOk = !filters.bodyPart || filters.bodyPart === "全部" || card.tags.bodyParts.includes(filters.bodyPart);
    return audienceOk && sexOk && bodyPartOk;
  });
}
export function generateChecklist(items) {
  const groups = {};

  items.forEach((item) => {
    const station = STATION_MAP[item.category] || { station: "其他", order: 99, duration: 10 };
    if (!groups[station.station]) {
      groups[station.station] = { ...station, items: [], totalMin: 0 };
    }
    groups[station.station].items.push(item);
    groups[station.station].totalMin += station.duration;
  });

  return Object.values(groups).sort((a, b) => a.order - b.order);
}

export function maskId(value) {
  const text = String(value || "").trim();
  if (text.length <= 4) return text;
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

export function buildBookingPayload({ formData, lineProfile, packageName, selectedItems, listPrice, discountRate, finalPrice }) {
  const trimmedName = String(formData.name || "").trim();
  const trimmedPhone = String(formData.phone || "").trim();
  const appointmentDate = String(formData.appointmentDate || "").trim();
  const idNumber = String(formData.idNumber || "").trim();
  const channel = String(formData.channel || "GENERAL").trim();

  if (!trimmedName) throw new Error("請填寫姓名");
  if (!trimmedPhone) throw new Error("請填寫聯絡電話");
  if (!appointmentDate) throw new Error("請選擇希望日期");
  if (!selectedItems.length) throw new Error("請先選擇至少一個檢查項目");

  const lineUserId = lineProfile?.userId || null;
  const customerId = lineUserId || `${trimmedPhone}-${idNumber || trimmedName}`;

  return {
    customer: {
      customerId,
      name: trimmedName,
      phone: trimmedPhone,
      lineUserId,
      idNumberMasked: maskId(idNumber),
    },
    booking: {
      customerId,
      customerName: trimmedName,
      customerPhone: trimmedPhone,
      idNumberMasked: maskId(idNumber),
      lineUserId,
      lineDisplayName: lineProfile?.displayName || "",
      channel,
      appointmentDate,
      packageName,
      selectedItems: selectedItems.map(({ id, name, enName, code, category, price, remark, outsource }) => ({
        id,
        name,
        enName,
        code,
        category,
        price,
        remark,
        outsource,
      })),
      listPrice,
      discountRate,
      finalPrice: Number(finalPrice) || 0,
      status: "BOOKED",
      notes: String(formData.notes || "").trim(),
    },
  };
}

export function buildChecklistPayload(booking) {
  const stationGroups = generateChecklist(booking.selectedItems || []);
  const warnings = (booking.selectedItems || []).filter((item) => item.remark);
  const outsourceItems = (booking.selectedItems || []).filter((item) => item.outsource);

  return {
    bookingId: booking.bookingId || booking.id || "",
    stationGroups,
    warnings,
    outsourceItems,
  };
}

















