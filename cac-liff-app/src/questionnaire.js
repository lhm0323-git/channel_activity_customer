export const QUESTIONNAIRES = [
  {
    id: "hpa-adult-health",
    title: "健康署成人預防保健服務問卷 (紅框欄位)",
    description: "衛福部國健署成人預防保健服務檢查紀錄單（受檢者與醫護協助填寫）",
    sections: [
      {
        title: "基本資料與教育程度",
        questions: [
          { id: "aboriginal", type: "radio", label: "原住民身分", options: ["否", "是"] },
          { id: "education", type: "radio", label: "教育程度", options: ["無", "小學", "國(初)中", "高中(職)", "專科、大學", "研究所以上"] },
        ],
      },
      {
        title: "疾病史與長期服藥",
        questions: [
          { id: "pastDiseases", type: "checkbox", label: "個人疾病史（可複選）", options: ["高血壓", "糖尿病", "高血脂症", "心臟病", "腦中風", "腎臟病", "B型肝炎", "C型肝炎", "精神疾病", "小兒麻痺", "其他", "以上均無"] },
          { id: "medicationStatus", type: "radio", label: "長期服藥", options: ["無", "有"] },
          { id: "medicationReason", type: "text", label: "若有長期服藥，病因", placeholder: "例如：高血壓控制" },
        ],
      },
      {
        title: "家族史",
        questions: [
          { id: "familyHistory", type: "checkbox", label: "直系親屬家族史（可複選）", options: ["高血壓", "糖尿病", "血脂異常", "心臟病", "腦中風", "精神疾病", "癌症", "其他", "以上均無"] },
        ],
      },
      {
        title: "健康行為評估",
        questions: [
          { id: "smokingStatus", type: "radio", label: "一、最近半年來，您吸菸的情形是？", options: ["不吸菸", "朋友敬菸或應酬才吸菸", "平均一天約吸一包菸（含以下）", "平均一天約吸一包菸以上"] },
          { id: "drinkingStatus", type: "radio", label: "二、最近半年來，您喝酒的情形是？", options: ["不喝酒", "偶爾喝酒或應酬才喝", "經常喝酒"] },
          { id: "betelNutStatus", type: "radio", label: "三、最近半年來，您嚼檳榔的情形是？", options: ["不嚼檳榔", "偶爾會嚼或應酬才嚼", "經常嚼或習慣在嚼"] },
          { id: "exerciseStatus", type: "radio", label: "四、最近二週，您是否有運動（每週達150分鐘以上）？", options: ["沒有", "有，但未達每週150分鐘（2.5小時）", "有，且每週達150分鐘以上（2.5小時）"] },
          { id: "coughTwoWeeks", type: "radio", label: "五、您是否出現咳嗽超過二週的情形？", options: ["沒有", "有"] },
        ],
      },
      {
        title: "憂鬱檢測",
        questions: [
          { id: "depressedMood", type: "radio", label: "一、過去二週，你是否感覺情緒低落、沮喪或沒有希望？", options: ["否", "是"] },
          { id: "anhedonia", type: "radio", label: "二、過去兩週，你是否感覺做事情失去興趣或樂趣？", options: ["否", "是"] },
        ],
      },
    ],
  },
  {
    id: "general-health",
    title: "一般成人健康評估問卷",
    description: "了解您的基本健康狀況、生活習慣與病史，協助醫師精準評估。",
    sections: [
      {
        title: "個人病史與用藥",
        questions: [
          { id: "pastDiseases", type: "checkbox", label: "過去是否有以下疾病史（可複選）", options: ["高血壓", "糖尿病", "高血脂", "心臟病", "中風", "氣喘", "肝炎", "腎臟病", "癌症", "無"] },
          { id: "currentMeds", type: "text", label: "目前常服用的藥物或保健食品", placeholder: "例如：降血壓藥、維他命C" },
          { id: "allergies", type: "text", label: "藥物或食物過敏史", placeholder: "例如：盤尼西林過敏、海鮮過敏，若無請填無" },
        ],
      },
      {
        title: "生活習慣與家族史",
        questions: [
          { id: "smoking", type: "radio", label: "吸菸習慣", options: ["從不吸菸", "已戒菸", "偶爾吸菸", "每天吸菸"] },
          { id: "drinking", type: "radio", label: "飲酒習慣", options: ["從不飲酒", "偶爾飲酒", "經常飲酒"] },
          { id: "exercise", type: "radio", label: "規律運動（每週 3 次以上、每次 30 分鐘）", options: ["無規律運動", "偶爾運動", "規律運動"] },
          { id: "familyHistory", type: "checkbox", label: "直系親屬家族病史（可複選）", options: ["高血壓", "糖尿病", "心臟病", "癌症", "腦中風", "無"] },
        ],
      },
    ],
  },
  {
    id: "cardiac-vascular",
    title: "心血管風險專項評估問卷",
    description: "針對心血管、頭頸部血管與心肌健康之專用問卷。",
    sections: [
      {
        title: "心胸部症狀評估",
        questions: [
          { id: "chestPain", type: "radio", label: "近期是否有胸痛、胸悶或運動後喘不過氣？", options: ["從不", "偶爾", "頻繁"] },
          { id: "palpitations", type: "radio", label: "是否有心悸、心律不整感受？", options: ["無", "偶爾", "經常"] },
          { id: "dizziness", type: "radio", label: "是否有頭暈、突然站立眼昏花或暈厥史？", options: ["無", "偶爾", "有過暈厥"] },
          { id: "familyCvd", type: "radio", label: "家族中是否有 55 歲前發生心肌梗塞或猝死者？", options: ["否", "是", "不清楚"] },
        ],
      },
    ],
  },
  {
    id: "premarital-health",
    title: "婚前健檢健康諮詢問卷",
    description: "孕前與婚前醫學檢查專用問卷。",
    sections: [
      {
        title: "婚前與生育諮詢",
        questions: [
          { id: "geneticHistory", type: "checkbox", label: "家族遺傳性疾病（如蠶豆症、地中海型貧血）", options: ["地中海型貧血", "蠶豆症 (G6PD)", "血友病", "無"] },
          { id: "rubellaVaccine", type: "radio", label: "女性是否接種過德國麻疹疫苗？", options: ["是", "否", "不確定"] },
          { id: "pregnancyPlan", type: "radio", label: "預計未來一年內是否有備孕計畫？", options: ["有", "暫無", "無"] },
        ],
      },
    ],
  },
];

export function getQuestionnaireById(id, customList = []) {
  const combined = [...customList, ...QUESTIONNAIRES];
  return combined.find((q) => q.id === id) || combined[0] || QUESTIONNAIRES[0];
}

export function validateQuestionnaireSchema(schema) {
  if (!schema || typeof schema !== "object") throw new Error("問卷格式必須為 JSON 物件");
  if (!schema.id || typeof schema.id !== "string") throw new Error("問卷必須包含識別碼 (id)");
  if (!schema.title || typeof schema.title !== "string") throw new Error("問卷必須包含標題 (title)");
  if (!Array.isArray(schema.sections) || schema.sections.length === 0) throw new Error("問卷必須至少包含一個章節 (sections)");
  return true;
}

export function parseExcelPasteText(text) {
  if (!text || !text.trim()) throw new Error("請先貼上內容");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const sectionsMap = {};

  lines.forEach((line) => {
    const parts = line.includes("\t") ? line.split("\t") : line.split("|");
    if (parts.length < 2) return;
    const sectionTitle = (parts[0] || "通用章節").trim();
    const qLabel = (parts[1] || "").trim();
    const qTypeStr = (parts[2] || "單選").trim();
    const optionsStr = (parts[3] || "").trim();

    if (!qLabel) return;
    let type = "radio";
    if (qTypeStr.includes("複選") || qTypeStr.includes("checkbox")) type = "checkbox";
    else if (qTypeStr.includes("簡答") || qTypeStr.includes("填空") || qTypeStr.includes("text")) type = "text";

    const options = optionsStr ? optionsStr.split(/[,，、]/).map((o) => o.trim()).filter(Boolean) : [];

    if (!sectionsMap[sectionTitle]) sectionsMap[sectionTitle] = [];
    sectionsMap[sectionTitle].push({
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      label: qLabel,
      options: type === "text" ? [] : (options.length > 0 ? options : ["無", "有"]),
    });
  });

  const sections = Object.keys(sectionsMap).map((title) => ({
    title,
    questions: sectionsMap[title],
  }));

  if (sections.length === 0) throw new Error("無法解析有效的問卷格式，請確認是否有以 | 或 Tab 鍵隔開欄位");

  return {
    id: `custom-q-${Date.now()}`,
    title: "Excel / 複製貼上自訂問卷",
    description: "由文字或 Excel 快捷內容自動解析轉換",
    sections,
  };
}

export function mergePreviousAnswers(schema, previousAnswers = {}) {
  const merged = {};
  if (!schema || !Array.isArray(schema.sections)) return merged;

  schema.sections.forEach((section) => {
    (section.questions || []).forEach((q) => {
      const prevVal = previousAnswers[q.id];
      if (prevVal !== undefined && prevVal !== null) {
        merged[q.id] = prevVal;
      } else {
        merged[q.id] = q.type === "checkbox" ? [] : "";
      }
    });
  });

  return merged;
}

export function generatePrintableQuestionnaireHtml({ booking, schema, answers }) {
  const customerName = booking?.customerName || booking?.name || "未填寫";
  const idNumber = booking?.idNumber || booking?.idNumberMasked || "未填寫";
  const phone = booking?.customerPhone || booking?.phone || "未填寫";
  const appointmentDate = booking?.appointmentDate || new Date().toISOString().slice(0, 10);
  const packageName = booking?.packageName || "健檢套餐";

  let sectionsHtml = "";
  (schema?.sections || []).forEach((section) => {
    sectionsHtml += `<div style="margin-top: 15px; border-bottom: 2px solid #1e293b; padding-bottom: 4px;"><h3 style="margin: 0; font-size: 15px; color: #1e293b;">${section.title}</h3></div>`;
    sectionsHtml += `<table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px;">`;
    (section.questions || []).forEach((q) => {
      let ansVal = answers ? answers[q.id] : undefined;
      if (Array.isArray(ansVal)) {
        ansVal = ansVal.length > 0 ? ansVal.join("、") : "無特別勾選";
      } else if (!ansVal) {
        ansVal = "未填寫";
      }
      sectionsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 6px; width: 55%; font-weight: bold; color: #334155; vertical-align: top;">${q.label}</td>
          <td style="padding: 8px 6px; width: 45%; color: #0f172a; vertical-align: top; background-color: #f8fafc;">${ansVal}</td>
        </tr>
      `;
    });
    sectionsHtml += `</table>`;
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>健康問卷評估表 - ${customerName}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px dashed #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #0f172a; }
          .header h2 { margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #475569; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; background: #f1f5f9; border-radius: 6px; font-size: 13px; }
          .info-table td { padding: 8px 12px; border: 1px solid #cbd5e1; }
          .signature-box { margin-top: 35px; border-top: 2px solid #0f172a; padding-top: 15px; font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>屏東基督教醫院 健檢中心</h1>
          <h2>${schema?.title || "受檢客戶健康問卷評估表"}</h2>
        </div>
        <table class="info-table">
          <tr>
            <td><strong>受檢者姓名：</strong>${customerName}</td>
            <td><strong>身分證 / 護照：</strong>${idNumber}</td>
          </tr>
          <tr>
            <td><strong>預約健檢日期：</strong>${appointmentDate}</td>
            <td><strong>預約套餐名稱：</strong>${packageName}</td>
          </tr>
          <tr>
            <td><strong>聯絡電話：</strong>${phone}</td>
            <td><strong>列印時間：</strong>${new Date().toLocaleString("zh-TW")}</td>
          </tr>
        </table>
        ${sectionsHtml}
        <div class="signature-box" style="margin-top: 40px; padding-top: 20px; display: flex; justify-content: space-between;">
          <span>受檢者 / 立同意書人簽名：_________________________</span>
          <span>日期：_______ 年 ____ 月 ____ 日</span>
        </div>
      </body>
    </html>
  `;
}

export function printQuestionnaireDocument({ booking, schema, answers }) {
  const html = generatePrintableQuestionnaireHtml({ booking, schema, answers });
  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}
