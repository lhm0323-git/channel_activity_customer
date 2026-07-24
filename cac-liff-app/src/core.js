export const CHANNELS = [
  { value: "HIGH_END", label: "高階個人" },
  { value: "CORPORATE", label: "企業團體" },
  { value: "LABOR", label: "勞工體檢" },
  { value: "GENERAL", label: "一般預防" },
];

export function audienceToChannel(audience) {
  const tag = String(audience || "");
  if (/\u4f01\u696d|\u5718\u6aa2|\u516c\u6559/.test(tag)) return "CORPORATE";
  if (/\u52de\u5de5/.test(tag)) return "LABOR";
  if (/\u9ad8\u968e/.test(tag)) return "HIGH_END";
  return "GENERAL";
}

export function filterBookingsByChannel(bookings, channel = "ALL") {
  if (!channel || channel === "ALL") return bookings;
  return bookings.filter((booking) => booking.channel === channel);
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
  const hasMeaningfulCardio = items.some((item) => {
    const itemText = `${item.category || ""} ${item.name || ""} ${item.enName || ""}`;
    return !/\u5fc3\u96fb\u5716|EKG|ECG/i.test(itemText) && /\u5fc3|\u51a0\u72c0|\u8840\u7ba1|Cardiac|Coronary|Troponin|BNP/i.test(itemText);
  });
  const hasMeaningfulLung = items.some((item) => {
    const itemText = `${item.category || ""} ${item.name || ""} ${item.enName || ""}`;
    return !/\u80f8\u90e8\s*X\s*\u5149|CXR|Chest\s*X-?ray/i.test(itemText) && /\u80ba|LowDose|Lung|Pulmonary/i.test(itemText);
  });
  if (hasMeaningfulCardio) bodyParts.add("\u5fc3\u8840\u7ba1");
  if (hasMeaningfulLung) bodyParts.add("\u80ba\u90e8");
  if (items.some((item) => /Brain|腦(?!斷層)/i.test(`${item.name || ""} ${item.enName || ""}`) && /MRI|CT|CTA|電腦斷層|磁振/i.test(`${item.name || ""} ${item.enName || ""}`))) bodyParts.add("腦部");
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


export const PUBLIC_COMPARISON_ROWS = [
  { key: "price", label: "\u50f9\u683c", labelEn: "Price" },
  { key: "highlights", label: "\u4e3b\u8981\u4eae\u9ede", labelEn: "Highlights" },
  { key: "imaging", label: "CT / MRI \u5f71\u50cf", labelEn: "CT / MRI imaging" },
  { key: "ultrasound", label: "\u8d85\u97f3\u6ce2", labelEn: "Ultrasound" },
  { key: "endoscopy", label: "\u80c3\u8178\u93e1", labelEn: "Endoscopy" },
  { key: "cardio", label: "\u5fc3\u8840\u7ba1\u91cd\u9ede", labelEn: "Cardiovascular focus" },
  { key: "thyroidHormone", label: "\u7532\u72c0\u817a / \u6297\u8001", labelEn: "Thyroid / anti-aging" },
];

const COMPARISON_PATTERNS = {
  imaging: /MRI|CTA|LungCT|\bCT\b|Brain MRI|Calcium Score|\u96fb\u8166\u65b7\u5c64|\u78c1\u632f/i,
  ultrasound: /ultrasound|\u8d85\u97f3\u6ce2/i,
  endoscopy: /Panendoscopy|Colonoscopy|\u80c3\u93e1|\u8178\u93e1/i,
  cardio: /Cardiac|Coronary|Calcium Score|Troponin|BNP|\u5fc3\u81df|\u5fc3\u8840\u7ba1|\u51a0\u72c0/i,
  thyroidHormone: /Thyroid|TSH|Free T4|Vitamin|DHEA|Testosterone|Estradiol|IGF|PTH|Hormone|\u7532\u72c0\u817a|\u8377\u723e\u8499|\u6297\u8001/i,
};

function itemText(item) {
  return `${item.category || ""} ${item.name || ""} ${item.enName || ""}`;
}

function shouldIncludeComparisonItem(item, key, pattern) {
  const text = itemText(item);
  if (key === "cardio" && /\u5fc3\u96fb\u5716|EKG|ECG|ABI|PWV/i.test(text)) return false;
  return pattern.test(text);
}

function itemLabel(item, lang = "zh") {
  return lang === "en" ? item.enName || item.name || "" : item.name || item.enName || "";
}

export function getPublicPackageComparisonValue(card, key, lang = "zh") {
  if (key === "price") return `NT$ ${Number(card.price || 0).toLocaleString()}`;
  if (key === "highlights") return (card.highlights || []).slice(0, 3).map((item) => item.label).join("\u3001") || "-";
  const pattern = COMPARISON_PATTERNS[key];
  if (!pattern) return "-";
  const labels = [...new Set((card.items || []).filter((item) => shouldIncludeComparisonItem(item, key, pattern)).map((item) => itemLabel(item, lang)).filter(Boolean))];
  if (!labels.length) return "-";
  return labels.slice(0, 3).join("\u3001") + (labels.length > 3 ? ` +${labels.length - 3}` : "");
}
export function sortPublicComparisonCards(cards, sort, lang = "zh") {
  if (!sort?.key) return cards;
  const direction = sort.direction === "desc" ? -1 : 1;
  const valueFor = (card) => {
    if (sort.key === "package") return card.name || "";
    if (sort.key === "price") return Number(card.price || 0);
    const value = getPublicPackageComparisonValue(card, sort.key, lang);
    return value === "-" ? "\uffff" : value;
  };
  return [...cards].sort((a, b) => {
    const left = valueFor(a);
    const right = valueFor(b);
    const result = typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), lang === "en" ? "en" : "zh-Hant");
    return result * direction;
  });
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

export function bookingCheckInCode(bookingId) {
  return String(bookingId || "").replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() || "-";
}

const VISIT_INSTRUCTION_RULES = [
  { id: "eye", zh: "\u773c\u79d1\u6aa2\u67e5\u8005\u8acb\u52ff\u914d\u6234\u96b1\u5f62\u773c\u93e1\u3002", en: "Do not wear contact lenses for eye examinations.", match: /\u773c\u58d3|\u773c\u79d1|\u8996\u529b/i },
  { id: "abi", zh: "\u56db\u80a2\u52d5\u8108\u58d3\u6aa2\u67e5\u8acb\u52ff\u7a7f\u7dca\u8eab\u9577\u8932\u53ca\u9577\u7d72\u896a\u3002", en: "Avoid tight trousers and long stockings for ABI/PWV testing.", match: /ABI|PWV|\u56db\u80a2\u52d5\u8108/i },
  { id: "pap", zh: "\u5973\u6027\u57f7\u884c\u5b50\u5bae\u9838\u62b9\u7247\u524d\u4e00\u5929\u8acb\u907f\u514d\u6027\u884c\u70ba\u3002", en: "Avoid sexual intercourse the day before a Pap smear.", match: /\u62b9\u7247|Pap smear/i },
  { id: "semen", zh: "\u7cbe\u6db2\u5206\u6790\u8acb\u7981\u617e 3 \u5929\u5f8c\u5230\u9662\u7559\u53d6\u3002", en: "Abstain for 3 days before semen analysis.", match: /\u7cbe\u6db2/i },
  { id: "neck", zh: "\u9838\u90e8\u6216\u7532\u72c0\u817a\u8d85\u97f3\u6ce2\u6aa2\u67e5\u8005\uff0c\u8acb\u7a7f\u8457\u53ef\u9732\u51fa\u9838\u90e8\u7684\u4e0a\u8863\u3002", en: "Wear a top that exposes the neck for neck or thyroid ultrasound.", match: /\u9838\u90e8.*\u8d85\u97f3\u6ce2|\u7532\u72c0\u817a.*\u8d85\u97f3\u6ce2/i },
  { id: "stress-ekg", zh: "\u904b\u52d5\u5fc3\u96fb\u5716\u6aa2\u67e5\u8005\uff0c\u8acb\u7a7f\u8457\u4fbf\u65bc\u8dd1\u6b65\u7684\u5bec\u9b06\u8863\u8932\u548c\u904b\u52d5\u978b\u3002", en: "Wear loose clothing and athletic shoes for exercise ECG testing.", match: /\u904b\u52d5\u5fc3\u96fb/i },
  { id: "mri", zh: "MRI \u6aa2\u67e5\u8005\u5982\u6709\u5fc3\u81df\u652f\u67b6\u3001\u690d\u7259\u6216\u5176\u4ed6\u91d1\u5c6c\u690d\u5165\u7269\u8acb\u4e8b\u5148\u544a\u77e5\uff1b\u6aa2\u67e5\u524d\u8acb\u53d6\u4e0b\u91d1\u5c6c\u7269\u54c1\u3002", en: "Tell staff about stents, dental implants, or other metal implants before MRI; remove metal objects.", match: /MRI|\u6838\u78c1/i },
  { id: "endoscopy", zh: "\u80c3\u8178\u93e1\u6aa2\u67e5\u82e5\u4f7f\u7528\u9ebb\u9189\uff0c\u8acb\u53d6\u4e0b\u6d3b\u52d5\u5047\u7259\uff0c\u52ff\u5316\u599d\u6216\u5857\u6307\u7532\u6cb9\u3002", en: "For sedated endoscopy, remove removable dentures and avoid makeup or nail polish.", match: /\u80c3\u93e1|\u8178\u93e1|\u5167\u8996\u93e1/i },
  { id: "colonoscopy", zh: "\u5927\u8178\u93e1\u6aa2\u67e5\u8005\u8acb\u4f9d\u885b\u6559\u55ae\u5f35\u5b8c\u6210\u98f2\u98df\u53ca\u6e05\u8178\u6e96\u5099\u3002", en: "Follow the preparation leaflet for diet and bowel cleansing before colonoscopy.", match: /\u5927\u8178\u93e1/i },
  { id: "sedation", zh: "\u7121\u75db\u8178\u80c3\u93e1\u6aa2\u67e5\u5f8c\u4e0d\u53ef\u81ea\u884c\u958b\u8eca\uff0c\u8acb\u7531\u5bb6\u5c6c\u966a\u540c\u8fd4\u5bb6\u3002", en: "After sedated endoscopy, do not drive; arrange an accompanying adult.", match: /\u7121\u75db|\u9ebb\u9189/i },
];

export function getVisitInstructions(selectedItems = [], lang = "zh") {
  const source = selectedItems.map((item) => [item.name, item.enName, item.category].filter(Boolean).join(" ")).join("\n");
  return VISIT_INSTRUCTION_RULES.filter((rule) => rule.match.test(source)).map((rule) => rule[lang] || rule.zh);
}

export function makeFirestoreSafeId(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/]/g, "-")
    .replace(/[.#$[\]]/g, "_")
    .slice(0, 120);
}

export function buildBookingPayload({ formData, lineProfile, packageName, selectedItems, listPrice, discountRate, finalPrice }) {
  const trimmedName = String(formData.name || "").trim();
  const trimmedPhone = String(formData.phone || "").trim();
  const trimmedEmail = String(formData.email || "").trim();
  const appointmentDate = String(formData.appointmentDate || "").trim();
  const idNumber = String(formData.idNumber || "").trim();
  const channel = String(formData.channel || "GENERAL").trim();

  if (!trimmedName) throw new Error("請填寫姓名");
  if (!trimmedPhone) throw new Error("請填寫聯絡電話");
  if (!appointmentDate) throw new Error("請選擇希望日期");
  if (!selectedItems.length) throw new Error("請先選擇至少一個檢查項目");

  const lineUserId = lineProfile?.userId || null;
  const customerId = makeFirestoreSafeId(lineUserId || `${trimmedPhone}-${idNumber || trimmedName}`);

  return {
    customer: {
      customerId,
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      lineUserId,
      idNumberMasked: maskId(idNumber),
    },
    booking: {
      customerId,
      customerName: trimmedName,
      customerPhone: trimmedPhone,
      customerEmail: trimmedEmail,
      idNumberMasked: maskId(idNumber),
      lineUserId,
      lineDisplayName: lineProfile?.displayName || "",
      channel,
      appointmentDate,
      packageName,
      selectedItems: selectedItems.map(({ id, name, enName, code, category, price, clinical, remark, outsource }) => ({
        id,
        name,
        enName,
        code,
        category,
        price,
        clinical,
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


















export const BOOKING_CSV_HEADERS = [
  "name",
  "phone",
  "email",
  "idNumber",
  "appointmentDate",
  "channel",
  "packageName",
  "finalPrice",
  "status",
  "notes",
];

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportBookingsCsv(bookings) {
  const rows = bookings.map((booking) => [
    booking.customerName || booking.name || "",
    booking.customerPhone || booking.phone || "",
    booking.customerEmail || booking.email || "",
    booking.idNumber || booking.idNumberMasked || "",
    booking.appointmentDate || "",
    booking.channel || "",
    booking.packageName || "",
    booking.finalPrice || "",
    booking.status || "",
    booking.notes || "",
  ]);
  return [BOOKING_CSV_HEADERS, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function parseBookingImportCsv(text) {
  const rows = parseCSV(text).filter((row) => row.some((cell) => String(cell || "").trim()));
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => String(header || "").trim());
  const indexOf = (name) => headers.indexOf(name);
  return rows.slice(1).map((row, rowIndex) => {
    const value = (name) => {
      const index = indexOf(name);
      return index >= 0 ? String(row[index] || "").trim() : "";
    };
    return {
      rowNumber: rowIndex + 2,
      name: value("name"),
      phone: value("phone"),
      email: value("email"),
      idNumber: value("idNumber"),
      appointmentDate: value("appointmentDate"),
      channel: value("channel") || "GENERAL",
      packageName: value("packageName"),
      finalPrice: Number(value("finalPrice").replace(/,/g, "")) || 0,
      status: value("status") || "BOOKED",
      notes: value("notes"),
    };
  });
}