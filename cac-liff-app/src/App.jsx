import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Calculator,
  Settings2,
  RefreshCw,
  LayoutTemplate,
  ChevronRight,
  FileText,
  Save,
  ArrowDownCircle,
  Scale,
  Info,
  X,
  RotateCcw,
  HelpCircle,
  Menu,
  List,
  CheckSquare,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from "lucide-react";
import {
  CHANNELS,
  PUBLIC_AUDIENCES,
  PUBLIC_BODY_PARTS,
  PUBLIC_SEXES,
  PUBLIC_COMPARISON_ROWS,
  buildBookingPayload,
  calculatePricing,
  buildPublicPackageCards,
  buildChecklistPayload,
  exportBookingsCsv,
  filterPublicPackageCards,
  generateChecklist,
  getPublicPackageComparisonValue,
  sortPublicComparisonCards,
  parseBookingImportCsv,
  parseHealthCsv,
} from "./core.js";
import { initLiffProfile } from "./liff.js";
import {
  approveChangeRequest,
  confirmBooking,
  deleteManagedPackage,
  listBookingsByDate,
  listManagedPackages,
  listMyBookings,
  markChecklistPrinted,
  saveBooking,
  requestBookingChange,
  saveManagedPackage,
  saveChecklist,
  signInStaff,
  signOutStaff,
  watchPendingChangeRequests,
  watchStaffAuth,
} from "./firebase.js";

const STAFF_EMAILS = String(import.meta.env.VITE_STAFF_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function canUseStaffTools(user) {
  if (!user?.email) return false;
  if (STAFF_EMAILS.length === 0) return import.meta.env.DEV;
  return STAFF_EMAILS.includes(user.email.toLowerCase());
}

const APP_TITLE = "\u5c4f\u57fa\u5065\u6aa2\u5957\u9910\u9810\u7d04";
const TEXT = {
  zh: {
    langToggle: "English",
    publicTab: "\u6c11\u773e\u65b9\u6848",
    staffTab: "\u5167\u90e8\u5de5\u5177",
    adminTab: "\u7576\u65e5\u6e05\u55ae",
    staffLogin: "\u54e1\u5de5\u767b\u5165",
    logout: "\u767b\u51fa",
    publicTitle: "\u9078\u64c7\u9069\u5408\u7684\u5065\u6aa2\u65b9\u6848",
    publicSubtitle: "\u4f9d\u8eab\u5206\u5225\u3001\u6027\u5225\u8207\u60f3\u4e86\u89e3\u7684\u6aa2\u67e5\u90e8\u4f4d\u7be9\u9078\u3002\u9019\u88e1\u53ea\u986f\u793a\u5957\u9910\u8cc7\u8a0a\uff0c\u4e0d\u63d0\u4f9b\u55ae\u9805\u52a0\u9078\u3002",
    audience: "\u8eab\u5206\u5225",
    sex: "\u6027\u5225",
    bodyPart: "\u6aa2\u67e5\u90e8\u4f4d",
    packagePrice: "\u5957\u9910\u7e3d\u50f9",
    highlights: "\u4e3b\u8981\u9805\u76ee",
    included: "\u5305\u542b\u9805\u76ee / \u6aa2\u67e5\u610f\u7fa9",
    collapse: "\u6536\u5408\u9805\u76ee",
    viewAllPrefix: "\u67e5\u770b\u5168\u90e8",
    itemUnit: "\u9805",
    choose: "\u9078\u64c7\u6b64\u65b9\u6848\u4e26\u9810\u7d04",
    noPackages: "\u6c92\u6709\u7b26\u5408\u689d\u4ef6\u7684\u5957\u9910\uff0c\u8acb\u653e\u5bec\u7be9\u9078\u689d\u4ef6\u3002",
    bookingTitle: "\u9001\u51fa\u5065\u6aa2\u9810\u7d04",
    name: "\u59d3\u540d",
    idNumber: "\u8eab\u5206\u8b49/\u8b77\u7167\u865f\u78bc",
    idNumberHelp: "\u672c\u570b\u6c11\u773e\u586b\u8eab\u5206\u8b49\uff1b\u5916\u7c4d\u9867\u5ba2\u53ef\u586b\u8b77\u7167\u6216\u5c45\u7559\u8b49\u3002\u73fe\u5834\u4ecd\u6703\u4ee5\u5065\u4fdd\u5361\u6216\u8b49\u4ef6\u6838\u5c0d\u3002",
    phone: "\u96fb\u8a71",
    appointmentDate: "\u5e0c\u671b\u65e5\u671f",
    notes: "\u5099\u8a3b",
    submit: "\u78ba\u8a8d\u9001\u51fa",
    closeBooking: "\u95dc\u9589\u9810\u7d04\u8996\u7a97",
  },
  en: {
    langToggle: "\u4e2d\u6587",
    publicTab: "Packages",
    staffTab: "Staff tools",
    adminTab: "Daily list",
    staffLogin: "Staff login",
    logout: "Logout",
    publicTitle: "Choose a Health Check Package",
    publicSubtitle: "Filter by audience, sex, and body area. Package information only; add-on items are hidden here.",
    audience: "Audience",
    sex: "Sex",
    bodyPart: "Body area",
    packagePrice: "Package price",
    highlights: "Highlights",
    included: "Included items / Purpose",
    collapse: "Collapse items",
    viewAllPrefix: "View all",
    itemUnit: "items",
    choose: "Choose this package and book",
    noPackages: "No matching packages. Please broaden the filters.",
    bookingTitle: "Submit Health Check Booking",
    name: "Name",
    idNumber: "ID / Passport number",
    idNumberHelp: "Taiwan residents may enter national ID. Foreign guests may enter passport or ARC number; staff will verify on site.",
    phone: "Phone",
    appointmentDate: "Preferred date",
    notes: "Notes",
    submit: "Submit booking",
    closeBooking: "Close booking dialog",
  },
};
const OPTION_LABELS_EN = {
  "\u5168\u90e8": "All",
  "\u4e00\u822c": "General",
  "\u9ad8\u968e": "Premium",
  "\u516c\u6559": "Civil servant",
  "\u5a5a\u524d": "Premarital",
  "\u4e0d\u9650": "Any",
  "\u7537": "Male",
  "\u5973": "Female",
  "\u5fc3\u8840\u7ba1": "Cardiovascular",
  "\u80ba\u90e8": "Lung",
  "\u8166\u90e8": "Brain",
  "\u8178\u80c3": "GI",
  "\u7532\u72c0\u817a": "Thyroid",
  "\u5abd\u6027": "Women",
};
function optionLabel(value, lang) {
  return lang === "en" ? OPTION_LABELS_EN[value] || value : value;
}

function inferPackageAudienceName(name) {
  if (new RegExp("\\u516c\\u6559").test(name)) return "\u516c\u6559";
  if (new RegExp("\\u5a5a\\u524d").test(name)) return "\u5a5a\u524d";
  if (new RegExp("8000|12000|12600|16000|23800|32000|47000|\\u80ba|\\u8166|\\u5fc3\\u8840\\u7ba1").test(name)) return "\u9ad8\u968e";
  return "\u4e00\u822c";
}

function normalizeTag(value) {
  return String(value || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function splitTags(value) {
  return String(value || "")
    .split(/[,\\uFF0C\\n]/)
    .map((tag) => normalizeTag(tag).trim())
    .filter(Boolean);
}

function normalizeCsvData(value) {
  return String(value || "").replace(/B\s*型利[納鈉]利尿胜[肽?？]?/g, "N端B型利鈉胜肽前驅物");
}
function isUsableCsvData(value) {
  try {
    const parsed = parseHealthCsv(value || "");
    const names = Object.keys(parsed.packages);
    return parsed.items.length > 50 && names.length > 10 && names.includes("2700\u5c0f\u8cc7") && names.includes("3500\u57fa\u790e");
  } catch {
    return false;
  }
}
const PUBLIC_VIEWS = new Set(["packages", "my-bookings", "prep", "checkin", "followup", "contact"]);

function readPublicViewFromUrl() {
  if (typeof window === "undefined") return "packages";
  const params = new URLSearchParams(window.location.search);
  const candidates = [params.get("view")];
  const liffState = params.get("liff.state");
  if (liffState) {
    const stateQuery = liffState.includes("?") ? liffState.slice(liffState.indexOf("?") + 1) : liffState.replace(/^#/, "");
    candidates.push(new URLSearchParams(stateQuery).get("view"));
  }
  const hashQuery = window.location.hash.startsWith("#?") ? window.location.hash.slice(2) : "";
  if (hashQuery) candidates.push(new URLSearchParams(hashQuery).get("view"));
  return candidates.find((view) => PUBLIC_VIEWS.has(view)) || "packages";
}
// CAC package source data
const INITIAL_CSV_DATA = `分類,檢查項目(中),檢查項目(英),臨床意義 (可瞭解之症狀),自費價,院碼,委外單位,備註 (檢驗天數/限制/說明),2700小資,3500基礎,3500公教,4500公教,5800關懷,7000婚前女,7200婚前男,8000馬年,12000樂活,12600觀心,16000心肺,16000胃腸,23800肺胃腸,32000肺腦,32000公教-肺腦腸胃,32000公教-心肺,32000公教-肺+全腹癌篩(MRI顯影),32000公教-腦心肺(無顯影),47000肺腦心腸胃,肺癌篩(CT無顯影),全腹癌篩(CT顯影)+代謝,全腹癌篩(MR顯影),腦血管(MRI無顯影),腦頸血管(CT顯影),心肝代謝(CT無顯影),心血管+全腹癌篩+代謝(CT顯影),肺+全腹癌篩(CT顯影)+代謝,肺+全腹癌篩(MRI顯影),肺心肝腹(CT顯影),肺腦心肝腹(CT顯影),肺心肝(CT無顯影),腦心肝(MR&CT無顯影),腦心肝肺(MR&CT無顯影),腦心血管+全腹癌篩+代謝(CT顯影),抗老賀爾蒙營養(女),抗老賀爾蒙營養(男),甲狀腺
一般檢查,一般檢查,General Examination,含身高、體重、血壓、脈搏、腰圍等身體基本評估,120,,,,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,
理學檢查,體脂肪檢測,,評估肥胖程度與健康風險 ,180,999830,,,v,v,,,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,,,,,,,,,,,,,,,,
理學檢查,醫師理學,,醫師理學評估,360,,,,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,
特殊功能檢查,氣壓式眼壓測定,Intraocular Pressure (IOP),測量眼球內部壓力，篩檢青光眼及高眼壓症,162,636022,,,v,v,,,v,,,v,v,v,v,v,v,v,v,v,v,v,v,,,,,,,,,,,,,,,,,,
特殊功能檢查,純音聽力檢查,Audiometry,評估聽力受損程度及聽力損失類型,240,635034,,,,,,,,,,,v,,,,v,v,,,,,v,,,,,,,,,,,,,,,,,,
特殊功能檢查,肺功能檢查,Pulmonary Function Test,評估肺活量、呼吸道通暢度及氣體交換功能,366,630003,,,v,,,,,,,,v,,,,v,v,,,,,v,v,,,,,,,v,v,v,v,v,,v,,,,
尿液檢查,尿液常規檢查,Urine Analysis,篩檢泌尿道感染、蛋白尿、糖尿、血尿,90,615078,,,v,v,v,v,v,v,v,v,v,,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,
血液常規,全血計數全套&白血球分類,CBC&DC,評估貧血、發炎、感染、凝血功能(血小板)&細分感染類型 (細菌/病毒/寄生蟲),300,612138+612037,,,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,
肝膽功能,肝膽功能全套,T.Bil/D.Bil/T.pro/Alb/Glob/AG ratio/AST/ALT/GGT/Alk-P,肝膽功能評估,500,/L0111,,,v,v,v,v,v,v,v,v,v,,v,v,v,v,v,v,v,v,v,,,,,,,,,,,,,,,,,,
肝膽功能,肝膽功能重點,T.Bil/Alb/AST/ALT/GGT,肝膽功能評估,312,610015+610005+610079+610080+610076,,,,,,,,,,,,,,,,,,,,,,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,
腎功能,腎功能全套,BUN/Cr/UA,腎功能評估,144,610017+610033+610087,,,v,v,v,v,v,v,v,v,v,,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,
血脂肪,血脂肪全套,Cholesterol/TG/HDL/LDL,評估血脂好壞、動脈硬化風險,768,610025+610083+610053+610060,,國健,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,
糖尿病檢驗,飯前血糖,Glucose AC,糖尿病篩檢 (空腹),60,610046,,,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,v,,,,,,,,,,,,,,
糖尿病檢驗,糖化血色素,HbA1c,評估3月內血糖控制狀況,240,610052,,,,,,,,,,v,v,v,v,v,v,v,v,v,v,v,v,,v,v,,v,v,v,v,v,v,v,v,v,v,v,,,
糖尿病檢驗,胰島素阻抗評估,HOMA-IR ,評估糖尿病前期風險、胰島素敏感度,300,614005+610046,外檢,"[Glucose (mg/dl) x insulin (mIU/L)]/405,5個工作天",,,,,,,,,,,,,,,,,,,,,v,v,,v,v,v,v,v,v,v,v,v,v,v,,,
肝炎檢驗,B、C型肝炎抗原抗體,HBsAg/Anti-HBs/Anti-HCV,了解是否感染B、C型肝炎或具免疫抗體,732,613203+613024+613025,,,,,,,v,v,v,,v,,,,v,v,,,,,v,,,,,,,,,,,,,,,,,,
賀爾蒙營養功能檢驗,維生素D檢測,Vitamin D (25-OH),評估骨質疏鬆風險、鈣質吸收效率及免疫調節功能,660,614119,,,,,,,,,,v,v,,,,v,v,v,v,,,v,,v,v,,v,v,v,v,v,v,v,v,v,v,v,,,
心血管功能檢驗,高敏感C反應蛋白,hs-CRP,評估血管內皮的發炎程度,330,613126,,,,,,,,,,,v,v,v,v,,,v,v,v,v,,,,,v,v,v,v,,,v,v,v,v,v,v,,,
心血管功能檢驗,同半胱胺酸,Homocysteine,血液中的代謝毒素，是獨立的心血管疾病與中風風險因子,480,614117,,,,,,,,,,,,v,v,v,v,v,v,v,v,v,v,,,,v,v,,,,,,v,,v,v,v,,,
心血管功能檢驗,N端B型利鈉胜肽前驅物,NT-proBNP,篩檢心臟衰竭及評估心臟負荷的早期指標,960,612150,,,,,,,,,,,,,,,,,,,,,,,,,,,v,v,,,v,v,v,v,v,v,,,
心血管功能檢驗,高感度心肌鈣蛋白 I,hs Troponin I,評估心肌微小損傷,540,610346,,,,,,,,,,,,,,,,,,,,,,,,,,,v,v,,,v,v,v,v,v,v,,,
腫瘤篩檢,肝癌標記-甲種胎兒蛋白,AFP,肝癌篩檢與治療監測參考 ,360,613001,,,,,v,v,,,,v,v,,v,v,v,v,v,v,v,v,v,v,v,v,,,,v,v,v,v,v,,,,v,,,
腫瘤篩檢,胰臟癌標記 ,CA-199,胰臟癌、膽管癌篩檢參考 ,480,613046,,,,,v,,,,,v,v,,v,v,v,v,v,v,v,v,v,v,v,v,,,,v,v,v,v,v,,,,v,,,
腫瘤篩檢,癌胚抗原,CEA,大腸、直腸癌之篩檢與治療監測參考 ,480,614008,,2個工作天,,,v,,,,,v,v,,,,v,v,v,v,v,,v,v,v,v,,,,v,v,v,v,v,,,,v,,,
腫瘤篩檢,乳癌標記,CA-153,乳癌之篩檢與治療監測參考 ,480,613050,,,,,,,,,,,,,,,,v,v,v,,v,,,v,v,,,,v,v,v,v,v,,,,v,,,
腫瘤篩檢,卵巢癌標記,CA-125,卵巢癌之篩檢指標 ,480,613047,,,,,,,,,,,,,,,,v,v,v,,v,,,v,v,,,,v,v,v,v,v,,,,v,,,
腫瘤篩檢,攝護腺癌標記,PSA,攝護腺癌風險篩檢,480,614031,,,,,,,,,,,,,,,,,,,,,v,,,,,,,,,,,,,,,,,,
腫瘤篩檢,攝護腺癌標記,FREE PSA,區分良性/惡性攝護腺,480,613230,,,,,,,,,,,,,,,,,,,,,v,,,,,,,,,,,,,,,,,,
心血管檢查,靜態心電圖,EKG,篩檢心律不整、心肌缺氧,180,631001,,,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,
影像醫學,胸部 X 光,CXR,篩檢心臟肥大與否、肺臟呼吸道等疾病篩檢,240,642101,,輻射劑量0.01mSv,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,v,v,v,v,v,v,,,,,,v,,v,,,
影像醫學,雙能量體脂肪及肌肉量全身組成分析,DXA Body Composition Analysis,全身體脂肪及肌肉量分析，特別是內臟脂肪,1200,999034,,檢查時間:含更衣移床8min; 輻射劑量< 0.001mSv超低，在飛機上10分鐘的輻射都比這多,,,,,,,,v,,,,,,,v,,,,,,v,v,,v,v,v,v,v,v,v,v,v,v,v,,,
影像醫學,骨質密度檢測,DXA BMD,骨質密度檢查。,720,652080,,檢查時間:含更衣移床4min; 輻射劑量0.01mSv，等於一張胸部x光,,,v,,,,,v,v,,,,v,v,v,v,v,v,v,,v,v,,v,v,v,v,v,v,v,v,v,v,v,,,
超音波,腹部超音波,Abdominal ultrasound,檢查是否有脂肪肝、結石、腫瘤或病變 ,1056,632107,,,,v,v,v,v,v,v,v,v,,v,v,v,v,v,v,v,v,v,v,,,,,,,,,,,v,,,,,,
超音波,心臟彩色杜普勒超音波,Cardiac Doppler ultrasound,評估心臟肥大、瓣膜及收縮功能 ,2520,632103,,,,,,,v,v,v,v,v,v,v,v,v,v,v,v,v,v,v,,,,,,v,v,,,v,v,,,,v,,,
超音波,頸動脈超音波,Carotid ultrasound,偵測頸血管狹窄、斑塊,2040,631010+632013,,,,,,,,,,,,,,,,v,,,,,v,,,,v,,,,,,,,,v,v,,,,
超音波,週邊動脈硬化篩檢,ABI/PWV,評估肢體動脈狹窄與硬化程度 ,2084,631011+631009,,,,,,v,,,,,v,v,,,v,v,v,,,,v,,,,,,,,,,,,,,,,,,
超音波,下腹部超音波,Gynecologic/Prostate Ultrasound,檢測婦科器官/攝護腺相關病變  ,540,632110,,,,,,,,v,,,,,,,,,,,,,v,,,,,,,,,,,,,,,,,,
超音波,乳房超音波,Breast ultrasound,檢測乳房纖維囊腫、腫瘤或異常  ,705,632149,,限3F外科,,,,,,,,,,,,,,v,,,,,,,,,,,,,,,,,,,,,,,
腸胃內視鏡,胃鏡,Panendoscopy (PES),直接觀察食道、胃、十二指腸之發炎、潰瘍或腫瘤,1890,632211,,,,,,,,,,,,,,,v,,,,,,,,,,,,,,,,,,,,,,,,
腸胃內視鏡,大腸鏡(含保可淨),Colonoscopy,檢查大腸息肉、發炎或腫瘤,4095,632214+334017,,,,,,,,,,,,,,,v,,,,,,,,,,,,,,,,,,,,,,,,
腸胃內視鏡,無痛胃鏡,Painless Panendoscopy,採靜脈麻醉進行胃鏡檢查，減少不適感,5190,632238,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
腸胃內視鏡,無痛大腸鏡,Painless Colonoscopy,採靜脈麻醉進行大腸鏡檢查，減少不適感,7395,632239,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
腸胃內視鏡,無痛胃腸鏡,Painless whole endoscopy,採靜脈麻醉進行全胃腸鏡檢查，減少不適感,11285,632238+632239,,,,,,,,,,,,,,v,,,v,,,,v,,,,,,,,,,,,,,,,,,
腸胃內視鏡,麻評,Anesthesia Assessment,EKG+CXR+Cr+GPT+CBC/DC+AC sugar,880,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
特殊功能檢查,胃幽門螺旋桿菌-碳13吹氣檢查,C-13 Urea Breath Test(UBT),偵測胃幽門螺旋桿菌感染(胃潰瘍/胃癌風險因子),1392,613220,,空腹4小時,,,,v,,,,,,,,,,v,,v,,v,,,,,,,,,,,,,,,,,,,
糞便檢查,胃幽門螺旋桿菌,H.pylori Ag-fecal,檢測胃幽門螺旋桿菌感染 ,450,612164,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,v,v,,,,v,v,v,v,v,,,,v,,,
糞便檢查,潛血免疫分析,FIT,早期發現大腸直腸癌等消化道出血問題,480,616024,,國健,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
影像醫學,低劑量肺部電腦斷層(無顯影),LowDose LungCT(non-contrast),早期肺癌篩檢,7200,CTCHE7(999950),,檢查時間:含更衣移床8min; 輻射劑量:0.4 mSv，約2個月日常自然輻射,,,,,,,,,,,v,,v,v,v,v,v,v,v,v,,,,,,,v,v,v,v,v,,v,,,,
影像醫學,冠狀動脈鈣化分析(無顯影),Calcium Score(non-contrast),評估冠狀動脈硬化風險,7200,CTCHE6(999949),,檢查時間:含更衣移床8min; 輻射劑量:0.4 mSv，約2個月日常自然輻射,,,,,,,,,,v,v,,,,,,,v,v,,,,,,,,,,,,,,,,,,
影像醫學,冠狀動脈電腦斷層(顯影),Coronary CTA(contrast),完整評估冠狀動脈狹窄與硬化程度 ,24000,CTCHE5(999951),,檢查時間:含更衣移床18min; 輻射劑量:3.5 mSv，約1年半日常自然輻射,,,,,,,,,,,,,,,,v,,,,,,,,,,,,,,,,,,,,,
影像醫學,腦&頸動脈血管評估電腦斷層(顯影),Brain&Neck CTA(contrast),篩檢腦血管疾病及頭頸部腫瘤 ,18000,999170,,檢查時間:含更衣移床18min; 輻射劑量:4.4 mSv， 約22個月日常自然輻射,,,,,,,,,,,,,,,,,,,,,,,,v,,,,,,v,,,,v,,,
影像醫學,心肝代謝電腦斷層模組(無顯影),Calcium Score with liver fat map(non-contrast),評估冠狀動脈硬化風險(無顯影劑)及量化脂肪肝 ,9600,999171,,檢查時間:含更衣移床10min; 輻射劑量:4.2 mSv， 約21個月日常自然輻射,,,,,,,,,,,,,,,,,,,,,,,,,v,,,,,,v,v,v,,,,
影像醫學,心肝代謝電腦斷層模組(顯影),Coronary CTA with liver fat map(contrast),完整評估冠狀動脈狹窄硬化程度、腹部器官及量化脂肪肝 ,26400,999172,,檢查時間:含更衣移床20min; 輻射劑量:11 mSv，雖然數值較高，但僅等於過去舊型CT單掃描一個心臟的劑量。現在我們一次看心、肝膽胰脾腎全腹器官。,,,,,,,,,,,,,,,,,,,,,,,,,,v,,,v,v,,,,v,,,
影像醫學,全腹部癌篩代謝電腦斷層模組(顯影),Abdomen CT with liver fat map(contrast),偵測全腹部器官病變及量化脂肪肝 ,14400,999173,,檢查時間:含更衣移床10min; 輻射劑量:7.5 mSv，約等於一個長期吸菸者半年內肺部所累積的自然輻射，但在這卻能換取精準的癌症早期篩檢。,,,,,,,,,,,,,,,,,,,,,v,,,,,,v,,,,,,,,,,
影像醫學,全腹部磁振造影(顯影),Whole abdomen MRI(contrast),偵測全腹部器官病變 ,24000,XMRWHOL(999151),,檢查時間:含更衣移床65min; 無輻射劑量,,,,,,,,,,,,,,,,,v,,,,,v,,,,,,v,,,,,,,,,
影像醫學,腦部磁振造影(無顯影),Brain MRI(non-contrast),無顯影劑腦部檢查 ,7800,XMRBRA(652084),,檢查時間:含更衣移床35min; 無輻射劑量,,,,,,,,,,,,,,v,v,,,v,v,,,,v,,,,,,,,,v,v,,,,
電解質,鈉鉀氯,Serum Na、K、Cl,腎衰竭、水分電解質失衡、心律不整,144,610068+610055+610028,,,,,,,,,,,,,v,v,,v,,,,,v,,,,,,,,,,,,,,,,,,
電解質,鈣磷,Serum Ca、P,骨質疏鬆、副甲狀腺機能、腎病,96,610019+610070,,,,,,,,,,,,,,,,v,,,,,v,,,,,,,,,,,,,,,,v,v,
電解質,鎂,Serum Mg,心律不整、肌肉抽搐,60,610066,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,v,v,
賀爾蒙營養功能檢驗,硫酸去氫表雄酮,DHEA-S,評估腎上腺皮質「抗壓性」與「抗衰老」的精準功能指標,600,613064,外檢,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,v,v,
賀爾蒙營養功能檢驗,類胰島素成長因子 1,IGF-1,與骨質流失、肌肉萎縮及脂肪堆積相關,480,613113,立人,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,v,v,
賀爾蒙營養功能檢驗,動情素、濾泡刺激素、黃體生成激素,Estradiol(E2)/FSH/LH,評估女性荷爾蒙水平、更年期症狀,648,613066+613079+614009,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,v,,
賀爾蒙營養功能檢驗,睪固酮,Testosterone,評估男性荷爾蒙水平、更年期症狀,180,614048,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,v,
賀爾蒙營養功能檢驗,副甲狀腺素,Intact-PTH,評估副甲狀腺功能，預防骨折與反覆腎結石,432,614007,,2個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,v,v,
賀爾蒙營養功能檢驗,葉酸(維生素B9)檢測,Folic Acid,評估貧血原因、神經系統健康,216,610344,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,v,v,
賀爾蒙營養功能檢驗,血清鐵、鐵蛋白、總鐵結合能力,Serum Fe/Ferritin/TIBC,評估缺鐵性貧血與其他鐵代謝異常,792,610304+610305+613073,,3個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
甲狀腺功能檢驗,游離甲狀腺素,Free T4,準確評估甲狀腺功能,240,613078,,,,,,,,v,v,,v,v,v,v,v,v,v,v,v,v,v,,,,,,,,,,,,,,,,,,v
甲狀腺功能檢驗,甲狀腺刺激素,TSH,甲狀腺功能異常之首選篩檢,288,614056,,,,,,,,v,v,,v,v,v,v,v,v,v,v,v,v,v,,,,,,,,,,,,,,,,,,v
甲狀腺功能檢驗,抗甲狀腺過氧化脢抗體,Anti-Thyroid peroxidase Ab,評估自體免疫甲狀腺炎風險,240,613231,,,,,,,,,,,v,v,v,v,v,v,v,v,v,v,v,,,,,,,,,,,,,,,,,,v
甲狀腺功能檢驗,甲狀腺超音波,Thyroid ultrasound,甲狀腺結節篩檢,732,632135,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,v
腫瘤篩檢,肝癌標記,PIVKA-II,肝癌早期篩檢標記 (較AFP更靈敏),1160,614280,,2個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
腫瘤篩檢,卵巢癌標記,HE4,卵巢癌之篩檢指標 ,1440,614325/614326,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
腫瘤篩檢,攝護腺癌標記,Prostate health index (PHI),攝護腺癌風險篩檢,2887,614331+614332+614333,聯合,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
腫瘤篩檢,胃癌標記 ,CA 72-4,反映胃、腸、胰臟等表皮惡性腫瘤嚴重性 ,600,613115,外檢,2個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
腫瘤篩檢,胃大腸癌風險檢測,SAA(Serum Amyloid A),胃大腸癌風險篩檢,7000,614308,俊質生醫,10個工作天 ,,,,,,,,,,,,,,,,,,v,,,,,,,,,,,,,,,,,,,
腫瘤篩檢,新柏式液態薄層抹片,,子宮頸癌篩檢，提升準確率 ,1800,797507,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
尿液檢查,尿液微蛋白/肌酸酐比值,Urine ACR test,篩檢糖尿病與高血壓引起早期腎病變,378,610034+613053,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血脂肪,載脂蛋白 A1,Apolipoprotein A1,比傳統「好膽固醇HDL」更精準的血管保護力指標,330,613031/614340,立人,空腹8hr,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血脂肪,載脂蛋白 B,Apolipoprotein B,比傳統「壞膽固醇LDL」更精準的血管硬化指標,330,613032,立人,空腹8hr,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,紅血球,RBC,貧血、紅血球增多症,24,612029,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,白血球,WBC,感染、白血病、發炎反應,24,612036,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,血紅素,Hb,貧血程度指標,24,612016,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,血球容積比,Hct,血液濃稠度、貧血,24,612019,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,平均紅血球容積,MCV,區分貧血類型 (小球/大球性),32,612024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,平均紅血球血紅素,MCH,貧血分類參考,32,612024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,平均紅血球濃度,MCHC,貧血分類參考,24,612024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,血小板,Platelet,凝血功能、出血傾向,48,612026,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,全血計數全套,Complete Blood Count test,評估貧血、發炎、感染、凝血功能(血小板),240,612138,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,白血球分類,D.C.,細分感染類型 (細菌/病毒/寄生蟲),84,612037,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
血液常規,血型測定,ABO & Rh,輸血前確認、溶血疾病,140,,,,,,,,,v,v,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
糞便檢查,糞便常規檢查,Stool routine,檢測糞便的外觀、顏色、潛血，以及顯微鏡下的紅血球、白血球、寄生蟲卵等，用於診斷胃腸道出血、感染、發炎（如潰瘍、大腸癌）或消化吸收不良,90,616012,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
糞便檢查,傷寒沙門氏菌,Typhoid-fecal,檢測傷寒沙門氏菌感染，為供膳人員必檢項目 ,240,617080,,6個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
糞便檢查,阿米巴痢疾,Parasite ova濃縮法,檢測阿米巴原蟲感染,60,616001,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
感染檢驗,淋病篩檢,Gonococcus culture,檢測潛伏淋病感染,240,617099,,4個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
感染檢驗,愛滋病抗原抗體篩檢,HIV Ag/Ab,檢測潛伏愛滋病感染,384,613092,,,,,,,,v,v,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
感染檢驗,梅毒血清反應,VDRL RPR,梅毒篩檢 (非特異性),84,614038,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
感染檢驗,梅毒螺旋體特異性抗體檢測,Syphilis TP,檢測潛伏梅毒感染,360,613045/613133,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
感染檢驗,麻疹抗體,Measles IgG,檢測麻疹的保護性抗體,288,614014,,4個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
感染檢驗,腮腺炎抗體,Mumps IgG,檢測腮腺炎的保護性抗體,240,614018,,8個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
感染檢驗,德國麻疹抗體,Rubella Ab IgG,孕前篩檢、德國麻疹免疫力確認,288,614042,,3個工作天 ,,,,,,v,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
感染檢驗,水痘抗體,Varicella Zoster IgG,檢測水痘的保護性抗體,240,614061,,4個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
感染檢驗,丙型干擾素釋放試驗,IGRA,檢測潛伏結核感染,3600,614186,,10個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
感染檢驗,人類乳突病毒分型,HPV DNA Genotyping,子宮頸癌高風險病毒型別篩檢,2160,614310/618304,立人,容器向LAB取,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
影像醫學,腹部 X 光,KUB,篩檢腹部器官是否有膽結石、泌尿道結石,240,643103,,輻射劑量0.23mSv,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
影像醫學,腰椎 X 光,LUMBAR SPINE (AP+LAT),瞭解腰椎位移、骨刺或退化情形,540,644105+644106,,輻射劑量0.43mSv,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
影像醫學,頸椎 X 光,CERVICAL SPINE (AP+LAT),瞭解頸椎位移、骨刺或退化情形,540,644101+644102,,輻射劑量0.06mSv,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
自體免疫與發炎,Phadiatop過敏原(定性),Allergen Phadiatop,常見吸入性過敏原的初步篩檢,606,613094/613211,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
自體免疫與發炎,吸入性/食物性特異過敏原,,吸入性/食物性特異過敏原篩檢,1944,613209,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
自體免疫與發炎,食物性特異過敏原,,食物性特異過敏原篩檢,1944,613210/613233,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
自體免疫與發炎,異位性皮膚炎特異過敏原,,異位性皮膚炎特異過敏原篩檢,1944,613234,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
自體免疫與發炎,家塵/黴菌/毛屑過敏原,,家塵/黴菌/毛屑過敏原篩檢,1944,613342/613343,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
自體免疫與發炎,嗜酸性球陽離子蛋白,ECP Test,評估氣喘、異位性皮膚炎與過敏性腸炎,710,613097,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
自體免疫與發炎,免疫球蛋白IgE檢測,IgE,評估過敏體質,300,614001,,5個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
自體免疫與發炎,類風濕因子,RA Factor,類風濕性關節炎及自體免疫性疾病篩檢 ,330,614036,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
自體免疫與發炎,Anti-ENA 篩檢,Anti-ENA screen(CTD),輔助ANA做更特異自體免疫性疾病篩檢,360,613157,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
基因檢測,Apo E genotyping(麗寶),Apo E Genotyping,阿茲海默/心血管/腦中風,3000,614327,麗寶,10個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
基因檢測,失智症基因檢測,Dementia Gene Test,遺傳性失智症風險評估,25000,618078,麗寶,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
基因檢測,神經系統疾病基因檢測 (麗寶),Neurological Disease Gene Test,遺傳性神經疾病篩檢,30000,618079,麗寶,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
遺傳檢測,蠶豆症酵素篩檢,G6PD deficiency test,評估蠶豆症遺傳性疾病,300,610042,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
其他會診,精神身心評估,Psychiatric Assessment,評估焦慮、憂鬱及身心壓力狀態,1080,991101,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
其他會診,耳鼻喉科/眼科/牙科會診,,,100,990072/990071/990073,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
其他會診,10年心血管疾病風險評估,10-Year CVD Risk,評估未來10年發生心血管疾病的機率,60,999809/999810,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
特殊功能檢查,眼底鏡檢查,,,75,636030,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
特殊功能檢查,精液分析,Semen analysis,評估男性生育能力指標,84,615077,,,,,,,,,v,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
毒物檢驗,乙醯膽鹼脂脢(RBC),Acetylcholinesterase (RBC),評估紅血球內酵素活性，確診有機磷/氨基甲酸鹽中毒,1080,610111,立人,15個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
毒物檢驗,乙醯膽鹼脂脢(血清),Cholinesterase (Serum),快速篩檢有機磷農藥中毒及評估肝臟合成功能,108,610026,外檢,篩檢用，4個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
毒物檢驗,尿液巴拉刈,Urine Paraquat Test,檢測巴拉刈(除草劑)中毒,60,615026,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液嗎啡快篩,Urine Morphine,藥物濫用篩檢,420,610067,高醫,"4個工作天,(EIA篩檢,請加蓋手印)",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液安非他命快篩,Urine Amphetamine,藥物濫用篩檢,420,615001,高醫,4個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液鴉片快篩,Urine Opiates/Morphine,藥物濫用篩檢,300,610286,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液古柯鹼快篩,Urine Cocaine,藥物濫用篩檢,300,610287,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液大麻快篩,Urine Cannabinoids (THC),藥物濫用篩檢,300,610288,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液安眠藥快篩,Urine BZD,藥物濫用篩檢,384,610289,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液FM2,Urine FM2,藥物濫用確診,1980,615027,高醫,30個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液MDMA,Urine MDMA,藥物濫用確診,1980,615044,高醫,14個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液K他命,Urine Ketamine,藥物濫用確診,1980,615056,高醫,16個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液大麻,Urine Cannabinoids (THC),藥物濫用確診,2400,615074,高醫,11個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液古柯鹼,Urine Cocaine,藥物濫用確診,1440,613132,高醫,16個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,安非他命,Urine Amphetamine,藥物濫用確診,1440,613142,高醫,11個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液嗎啡,Urine Morphine,藥物濫用確診,1440,613143,高醫,11個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液天使塵,Urine PCP (Phencyclidine) ,藥物濫用篩檢,540,614263,高醫,11個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
藥物濫用檢測,尿液尼古丁,Urine Cotinine,尼古丁代謝物、吸菸檢測,1200,615072,外檢,30個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,血清汞,Serum Hg,汞中毒,720,610054,立人,22個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,血清鉛,Serum Pb,鉛中毒,480,613131/610071,立人,11個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,血清鋁,Serum Al,鋁中毒 (透析患者相關),480,610102,高醫,30個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,血清鎘,Serum Cd,鎘中毒,480,610103,高醫,30個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,血清鉻,Serum Cr,鉻中毒,1080,613137,高醫,16個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,血清錳,Serum Mn,錳中毒,564,613333,高醫,16個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,血清銅,Serum Cu,威爾森氏症、銅代謝異常,420,610035,立人,10個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,血清銦,Serum In,銦中毒,1320,614254,立人,10個工作天，容器向LAB取,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,血清鋅,Serum Zn,鋅中毒,480,610092,高醫,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,血清鋰,Serum Li,躁鬱症藥物濃度監測,180,610062,高醫,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,尿鉛 ,Urine Pb,鉛中毒,554,612118,外檢,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,尿鎘 ,Urine Cd,鎘中毒,576,614222,聯合,16個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,尿鉻,Urine Cr,鉻中毒,1080,614253,立人,16個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,尿鎳,Urine Ni,鎳中毒,576,614190,立人,22個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,尿汞,Urine Hg,汞中毒,480,610327/612118,立人,22個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
重金屬檢測,尿砷,Urine As,砷中毒,3720,614189,立人,30個工作天,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,`;

const App = () => {
  // 核心狀態
  const [csvData, setCsvData] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("health_planner_csv_v3");
      return isUsableCsvData(saved) ? saved : INITIAL_CSV_DATA;
    }
    return INITIAL_CSV_DATA;
  });

  const [userPackages, setUserPackages] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("health_planner_user_packages_v3");
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        console.error("Failed to parse saved packages", e);
        return {};
      }
    }
    return {};
  });

  const [deletedPackages, setDeletedPackages] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(
          "health_planner_deleted_packages_v3"
        );
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        console.error("Failed to parse deleted packages", e);
        return {};
      }
    }
    return {};
  });

  const [parsedItems, setParsedItems] = useState([]);
  const [packages, setPackages] = useState({});
  const [packageMeta, setPackageMeta] = useState({});
  const [packageAudience, setPackageAudience] = useState("\u4e00\u822c");
  const [packageBodyParts, setPackageBodyParts] = useState("");
  const [packageFilter, setPackageFilter] = useState("ALL");
  const [showCsvInput, setShowCsvInput] = useState(false);

  // 排序與篩選狀態
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [activeCategory, setActiveCategory] = useState(null);

  // 選擇狀態
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [discountRate, setDiscountRate] = useState(5);
  const [packageName, setPackageName] = useState("新版自選健檢套餐");
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [finalPrice, setFinalPrice] = useState(null);

  // 比較模式狀態
  const [compareList, setCompareList] = useState([]);
  const [modalItem, setModalItem] = useState(null);

  // LIFF / 預約 / 後台狀態
  const [lineProfile, setLineProfile] = useState(null);
  const [liffMessage, setLiffMessage] = useState("一般瀏覽器模式");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStatus, setBookingStatus] = useState("");
  const [myBookings, setMyBookings] = useState([]);
  const [myBookingStatus, setMyBookingStatus] = useState("");
  const [changeDates, setChangeDates] = useState({});
  const [changeNotes, setChangeNotes] = useState({});
  const [mode, setMode] = useState("public");
  const [publicView, setPublicView] = useState(readPublicViewFromUrl);
  const [lang, setLang] = useState("zh");
  const [staffUser, setStaffUser] = useState(null);
  const [staffStatus, setStaffStatus] = useState("");
  const t = TEXT[lang];
  const [publicFilters, setPublicFilters] = useState({ audience: "全部", sex: "不限", bodyPart: "全部" });
  const [publicPackageLayout, setPublicPackageLayout] = useState("cards");
  const [comparisonSort, setComparisonSort] = useState({ key: "price", direction: "asc" });
  const [expandedPackageName, setExpandedPackageName] = useState(null);
  const [comparisonDetailCard, setComparisonDetailCard] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    name: "",
    idNumber: "",
    phone: "",
    channel: "GENERAL",
    appointmentDate: "",
    notes: "",
  });
  const [adminDate, setAdminDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [adminChannel, setAdminChannel] = useState("ALL");
  const [adminBookings, setAdminBookings] = useState([]);
  const [selectedAdminBookingIds, setSelectedAdminBookingIds] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [adminStatus, setAdminStatus] = useState("");

  useEffect(() => {
    const syncView = () => {
      const view = readPublicViewFromUrl();
      setPublicView(view);
      if (PUBLIC_VIEWS.has(view)) setMode("public");
    };
    syncView();
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);

  const openPublicView = (view) => {
    setMode("public");
    setPublicView(view);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", view);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      window.history.pushState({}, "", url);
    }
  };
  // 初始化載入 Tailwind
  useEffect(() => {
    if (!document.getElementById("tailwind-cdn")) {
      const script = document.createElement("script");
      script.id = "tailwind-cdn";
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listManagedPackages().then((managed) => {
      if (cancelled) return;
      const active = {};
      const deleted = {};
      const meta = {};
      managed.forEach((pkg) => {
        if (!pkg.name) return;
        if (pkg.deleted) {
          deleted[pkg.name] = pkg.itemIds || [];
          return;
        }
        active[pkg.name] = pkg.itemIds || [];
        meta[pkg.name] = {
          audience: normalizeTag(pkg.audience || inferPackageAudienceName(pkg.name)),
          bodyParts: Array.isArray(pkg.bodyParts) ? pkg.bodyParts.map(normalizeTag) : [],
          finalPrice: Number(pkg.finalPrice) || 0,
        };
      });
      if (Object.keys(active).length) setUserPackages((current) => ({ ...current, ...active }));
      if (Object.keys(deleted).length) setDeletedPackages((current) => ({ ...current, ...deleted }));
      setPackageMeta((current) => ({ ...current, ...meta }));
    }).catch((error) => console.warn("Managed package load failed", error));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return watchStaffAuth((user) => {
      if (!canUseStaffTools(user)) {
        setStaffUser(null);
        if (user) setStaffStatus("\u6b64 Google \u5e33\u865f\u672a\u6388\u6b0a\u4f7f\u7528\u5167\u90e8\u5de5\u5177");
        setMode("public");
        return;
      }
      setStaffUser(user);
      setStaffStatus(user ? `\u5df2\u767b\u5165\uff1a${user.email}` : "");
    });
  }, []);

  useEffect(() => {
    if (!staffUser) {
      setPendingChanges([]);
      return undefined;
    }
    return watchPendingChangeRequests(setPendingChanges);
  }, [staffUser]);

  useEffect(() => {
    let cancelled = false;
    initLiffProfile()
      .then((result) => {
        if (cancelled) return;
        setLineProfile(result.profile);
        setLiffMessage(result.message);
      })
      .catch((error) => {
        if (!cancelled) setLiffMessage(`LIFF 初始化失敗：${error.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 核心：全能型 CSV 解析器 (解決換行、引號與逗號問題)
  const parseCSV = (text) => {
    const rows = [];
    let currentRow = [];
    let currentField = "";
    let inQuotes = false;

    // 統一換行符號，避免 CR LF 問題
    const normalizedText = text.replace(/\\r\\n/g, "\\n").replace(/\\r/g, "\\n");

    for (let i = 0; i < normalizedText.length; i++) {
      const char = normalizedText[i];
      const nextChar = normalizedText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 處理轉義的雙引號 (Excel 會將 " 轉為 "")
          currentField += '"';
          i++;
        } else {
          // 切換引號狀態
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // 欄位結束 (只有在非引號中才算)
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\\n" && !inQuotes) {
        // 列結束 (只有在非引號中才算)
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }

    // 處理檔尾最後一個欄位
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
    }

    return rows;
  };

  // 解析 CSV
  useEffect(() => {
    try {
      const normalizedCsvData = normalizeCsvData(csvData);
      if (normalizedCsvData !== csvData) {
        setCsvData(normalizedCsvData);
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("health_planner_csv_v3", normalizedCsvData);
      }

      if (!normalizedCsvData) {
        setParsedItems([]);
        setPackages({});
        return;
      }

      const parsed = parseHealthCsv(normalizedCsvData, userPackages, deletedPackages);
      setParsedItems(parsed.items);
      setPackages(parsed.packages);
    } catch (e) {
      console.error("CSV Parse Error", e);
    }
  }, [csvData, userPackages, deletedPackages]);

  // 排序處理
  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        if (current.direction === "asc") return { key, direction: "desc" };
        return { key: null, direction: "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const resetSort = () => {
    setSortConfig({ key: null, direction: "asc" });
  };

  const handleCategoryClick = (category) => {
    setActiveCategory(category === activeCategory ? null : category);
  };

  // 進階搜尋與排序邏輯
  const filteredItems = useMemo(() => {
    let data = parsedItems;

    // 1. 搜尋
    if (searchTerm.trim()) {
      const tokens = searchTerm
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t);
      data = data.filter((item) => {
        const searchContent = `
                ${item.name.toLowerCase()} 
                ${item.enName.toLowerCase()} 
                ${item.category.toLowerCase()} 
                ${item.clinical.toLowerCase()}
            `;
        return tokens.every((token) => {
          if (token.startsWith("-") && token.length > 1) {
            const notKey = token.substring(1);
            return !searchContent.includes(notKey);
          }
          if (token.includes("|")) {
            const orKeys = token.split("|").filter((k) => k);
            return orKeys.some((key) => searchContent.includes(key));
          }
          if (token.includes("&")) {
            const andKeys = token.split("&").filter((k) => k);
            return andKeys.every((key) => searchContent.includes(key));
          }
          return searchContent.includes(token);
        });
      });
    }

    // 2. 分類篩選
    if (activeCategory) {
      data = data.filter((item) => item.category === activeCategory);
    }

    // 3. 排序
    if (sortConfig.key) {
      data = [...data].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === "price") {
          valA = Number(valA);
          valB = Number(valB);
        } else {
          valA = String(valA || "");
          valB = String(valB || "");
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [parsedItems, searchTerm, sortConfig, activeCategory]);

  const publicPackageCards = useMemo(() => {
    return buildPublicPackageCards(packages, parsedItems, packageMeta);
  }, [packages, parsedItems, packageMeta]);

  const availableAudiences = useMemo(() => {
    const values = new Set(PUBLIC_AUDIENCES);
    publicPackageCards.forEach((card) => (card.tags.audience || []).forEach((tag) => values.add(tag)));
    splitTags(packageAudience).forEach((tag) => values.add(tag));
    return [...values];
  }, [publicPackageCards, packageAudience]);

  const availableBodyParts = useMemo(() => {
    const values = new Set(PUBLIC_BODY_PARTS);
    publicPackageCards.forEach((card) => (card.tags.bodyParts || []).forEach((tag) => values.add(tag)));
    splitTags(packageBodyParts).forEach((tag) => values.add(tag));
    return [...values];
  }, [publicPackageCards, packageBodyParts]);

  const visiblePublicPackageCards = useMemo(() => {
    return filterPublicPackageCards(publicPackageCards, publicFilters);
  }, [publicPackageCards, publicFilters]);

  const selectedItems = useMemo(() => {
    return parsedItems.filter((item) => selectedIds.includes(item.id));
  }, [parsedItems, selectedIds]);

  const listPriceTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + Number(item.price), 0);
  }, [selectedItems]);

  // 折扣與價格計算
  useEffect(() => {
    let rate = 5;
    if (listPriceTotal >= 32000) rate = 25;
    else if (listPriceTotal >= 24000) rate = 20;
    else if (listPriceTotal >= 16000) rate = 15;
    else if (listPriceTotal >= 8000) rate = 10;

    setDiscountRate(rate);
  }, [listPriceTotal]);

  const discountAmount = Math.round(listPriceTotal * (discountRate / 100));
  const rawPrice = listPriceTotal - discountAmount;

  const calculatedSuggestedPrice = useMemo(() => {
    if (rawPrice < 10000) {
      return Math.round(rawPrice / 100) * 100;
    } else {
      return Math.round(rawPrice / 1000) * 1000;
    }
  }, [rawPrice]);

  useEffect(() => {
    const managedPrice = Number(packageMeta[packageName]?.finalPrice) || 0;
    setFinalPrice(managedPrice || calculatedSuggestedPrice);
  }, [calculatedSuggestedPrice, packageMeta]);

  // 比較模式資料計算 (防呆版)
  const comparisonData = useMemo(() => {
    if (compareList.length === 0) return null;

    // 安全檢查：確保 packages 有資料
    if (Object.keys(packages).length === 0) return null;

    const allInvolvedIds = new Set();
    compareList.forEach((pkgName) => {
      if (packages[pkgName]) {
        packages[pkgName].forEach((id) => allInvolvedIds.add(id));
      }
    });

    const items = parsedItems.filter((item) => allInvolvedIds.has(item.id));

    const totals = {};
    compareList.forEach((pkgName) => {
      const sum =
        packages[pkgName]?.reduce((acc, id) => {
          const item = parsedItems.find((i) => i.id === id);
          return acc + (item ? item.price : 0);
        }, 0) || 0;

      let rate = 5;
      if (sum >= 32000) rate = 25;
      else if (sum >= 24000) rate = 20;
      else if (sum >= 16000) rate = 15;
      else if (sum >= 8000) rate = 10;

      const discountAmt = Math.round(sum * (rate / 100));
      const rawFinal = sum - discountAmt;
      const final =
        rawFinal < 10000
          ? Math.round(rawFinal / 100) * 100
          : Math.round(rawFinal / 1000) * 1000;

      totals[pkgName] = { list: sum, final: final, rate: rate };
    });

    return { items, totals };
  }, [compareList, packages, parsedItems]);

  const setPublicFilter = (field, value) => {
    setPublicFilters((current) => ({ ...current, [field]: value }));
  };

  const selectPublicPackage = (card) => {
    setCompareList([]);
    setPackageName(card.name);
    setSelectedIds(card.itemIds);
    setFinalPrice(card.price);
    setBookingField("channel", card.tags.audience.includes("高階") ? "HIGH_END" : "GENERAL");
    setShowBookingModal(true);
  };
  // 操作函式
  const applyPreset = (name) => {
    setCompareList([]);

    // 如果點擊的是當前選中的套餐，則取消選取
    if (packageName === name) {
      setPackageName("新版自選健檢套餐");
      setSelectedIds([]);
      return;
    }

    // 否則，切換到新點選的套餐
    const ids = packages[name];
    if (ids) {
      setSelectedIds(ids);
      setPackageName(name);
      const meta = packageMeta[name] || {};
      setPackageAudience(normalizeTag(meta.audience || inferPackageAudienceName(name)));
      setPackageBodyParts(Array.isArray(meta.bodyParts) ? meta.bodyParts.map(normalizeTag).join(", ") : "");
      if (meta.finalPrice) setFinalPrice(meta.finalPrice);
    }
  };

  const toggleCompare = (name) => {
    setCompareList((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      return [...prev, name];
    });
  };

  const handleRowClick = (item) => {
    setModalItem(item);
  };

  const handleToggleSelect = (e, item) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(item.id)
        ? prev.filter((i) => i !== item.id)
        : [...prev, item.id]
    );
  };

  const savePackage = async () => {
    if (!packageName.trim()) {
      alert("請輸入套餐名稱");
      return;
    }

    if (deletedPackages.hasOwnProperty(packageName)) {
      const newDeleted = { ...deletedPackages };
      delete newDeleted[packageName];
      setDeletedPackages(newDeleted);
      localStorage.setItem(
        "health_planner_deleted_packages_v3",
        JSON.stringify(newDeleted)
      );
    }

    const bodyParts = splitTags(packageBodyParts);
    const newUserPackages = { ...userPackages, [packageName]: selectedIds };
    setUserPackages(newUserPackages);
    setPackageMeta((current) => ({ ...current, [packageName]: { audience: packageAudience.trim(), bodyParts, finalPrice: Number(finalPrice) || 0 } }));
    localStorage.setItem(
      "health_planner_user_packages_v3",
      JSON.stringify(newUserPackages)
    );

    await saveManagedPackage({ name: packageName, itemIds: selectedIds, audience: packageAudience.trim(), bodyParts, finalPrice });

    setSavedMessage(`「${packageName}」已儲存`);
    setTimeout(() => setSavedMessage(""), 3000);
  };

  const deletePackage = (e, name) => {
    e.stopPropagation();
    if (window.confirm(`確定要移除「${name}」套餐嗎？`)) {
      const packageContent = packages[name];
      const newDeleted = { ...deletedPackages, [name]: packageContent };
      setDeletedPackages(newDeleted);
      localStorage.setItem(
        "health_planner_deleted_packages_v3",
        JSON.stringify(newDeleted)
      );

      if (packageName === name) {
        setPackageName("新版自選健檢套餐");
        setSelectedIds([]);
      }
      deleteManagedPackage(name, packageContent).catch((error) => console.warn("Delete managed package failed", error));
      setCompareList((prev) => prev.filter((n) => n !== name));
    }
  };

  const restorePackage = (name) => {
    const newDeleted = { ...deletedPackages };
    delete newDeleted[name];
    setDeletedPackages(newDeleted);
    localStorage.setItem(
      "health_planner_deleted_packages_v3",
      JSON.stringify(newDeleted)
    );
  };

  const resetToDefault = () => {
    if (
      window.confirm(
        "確定要清除所有暫存資料？這會移除您匯入的 CSV 與所有自訂套餐，還原到初始狀態。"
      )
    ) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("health_planner_csv_v3");
        localStorage.removeItem("health_planner_user_packages_v3");
        localStorage.removeItem("health_planner_deleted_packages_v3");
      }

      setCsvData(INITIAL_CSV_DATA);
      setUserPackages({});
      setDeletedPackages({});
      setParsedItems([]);
      setPackages({});
      setSelectedIds([]);
      setPackageName("新版自選健檢套餐");
      setCompareList([]);
      setModalItem(null);
      setSortConfig({ key: null, direction: "asc" });
      setActiveCategory(null);
    }
  };

  const copyToClipboard = () => {
    const text = `
【套餐名稱】：${packageName}
------------------------------------------
勾選項目明細：
${selectedItems
  .map(
    (item) =>
      `* ${item.code ? `[${item.code}] ` : ""}${item.category} - ${
        item.name
      } - NT$ ${item.price}`
  )
  .join("\\n")}

------------------------------------------
費用結算：
1. 表定總價 (List Price Total): NT$ ${listPriceTotal}
2. 折扣率 (Discount Rate): ${discountRate} % (依總價自動帶入)
3. 折扣金額: NT$ ${discountAmount}
4. 建議訂價 (Suggested Price): NT$ ${finalPrice}
------------------------------------------
    `.trim();

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>報價單 - ${packageName}</title>
          <style>
            body { font-family: "Microsoft JhengHei", sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h1 { margin: 0; font-size: 24px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; color: #555; }
            .category-col { width: 12%; }
            .code-col { width: 10%; }
            .price-col { width: 12%; text-align: right; }
            .total-section { margin-top: 30px; display: flex; flex-direction: column; align-items: flex-end; }
            .total-row { display: flex; justify-content: space-between; width: 250px; padding: 5px 0; }
            .final-price { font-size: 20px; font-weight: bold; color: #000; border-top: 2px solid #333; padding-top: 10px; margin-top: 5px; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>健檢套餐報價單</h1>
          </div>
          <div class="meta">
            <span><strong>套餐名稱：</strong>${packageName}</span>
            <span><strong>製表日期：</strong>${new Date().toLocaleDateString()}</span>
          </div>
          
          <table>
            <thead>
              <tr>
                <th class="category-col">分類</th>
                <th class="code-col">院碼</th>
                <th>項目名稱</th>
                <th class="price-col">單價</th>
              </tr>
            </thead>
            <tbody>
              ${selectedItems
                .map(
                  (item) => `
                <tr>
                  <td>${item.category}</td>
                  <td style="font-family: monospace;">${item.code || "-"}</td>
                  <td>
                    <div style="font-weight: bold;">${item.name}</div>
                    ${
                      item.enName
                        ? `<div style="font-size: 11px; color: #666;">${item.enName}</div>`
                        : ""
                    }
                  </td>
                  <td class="price-col">${item.price.toLocaleString()}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>項目總數：</span>
              <span>${selectedItems.length} 項</span>
            </div>
            <div class="total-row">
              <span>表定總價：</span>
              <span>NT$ ${listPriceTotal.toLocaleString()}</span>
            </div>
            <div class="total-row" style="color: #e11d48;">
              <span>專案折扣 (${discountRate}%)：</span>
              <span>- NT$ ${discountAmount.toLocaleString()}</span>
            </div>
            <div class="total-row final-price">
              <span>建議報價：</span>
              <span>NT$ ${Number(finalPrice).toLocaleString()}</span>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const setBookingField = (field, value) => {
    setBookingForm((current) => ({ ...current, [field]: value }));
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const staffMode = mode === "staff" || mode === "admin";

  const handleStaffLogin = async () => {
    try {
      setStaffStatus("\u767b\u5165\u4e2d...");
      const user = await signInStaff();
      if (!canUseStaffTools(user)) {
        await signOutStaff();
        setStaffStatus("\u6b64 Google \u5e33\u865f\u672a\u6388\u6b0a\u4f7f\u7528\u5167\u90e8\u5de5\u5177");
        setMode("public");
        return;
      }
      setStaffUser(user);
      setStaffStatus(`\u5df2\u767b\u5165\uff1a${user.email}`);
      setMode("staff");
    } catch (error) {
      setStaffStatus(`\u767b\u5165\u5931\u6557\uff1a${error.message}`);
    }
  };

  const handleStaffLogout = async () => {
    await signOutStaff();
    setStaffUser(null);
    setStaffStatus("");
    setMode("public");
  };

  const setStaffMode = (nextMode) => {
    if (!staffUser) {
      setStaffStatus("\u8acb\u5148\u767b\u5165\u54e1\u5de5\u5e33\u865f");
      return;
    }
    setMode(nextMode);
  };

  const handleSubmitBooking = async () => {
    try {
      setBookingStatus("寫入預約中...");
      const payload = buildBookingPayload({
        formData: bookingForm,
        lineProfile,
        packageName,
        selectedItems,
        listPrice: listPriceTotal,
        discountRate,
        finalPrice,
      });
      const result = await saveBooking(payload);
      const bookingForChecklist = { ...payload.booking, bookingId: result.bookingId };
      await saveChecklist(result.bookingId, buildChecklistPayload(bookingForChecklist));
      setBookingStatus(result.localOnly ? `已暫存本機預約：${result.bookingId}` : `預約已建立：${result.bookingId}`);
      setShowBookingModal(false);
      setAdminDate(payload.booking.appointmentDate);
    } catch (error) {
      setBookingStatus(error.message);
    }
  };


  const handleLoadMyBookings = async () => {
    try {
      setMyBookingStatus("\u8b80\u53d6\u4e2d...");
      const bookings = await listMyBookings();
      setMyBookings(bookings);
      setMyBookingStatus(`\u5df2\u8f09\u5165 ${bookings.length} \u7b46\u9810\u7d04`);
    } catch (error) {
      setMyBookingStatus(`\u8b80\u53d6\u5931\u6557\uff1a${error.message}`);
    }
  };

  const handleRequestBookingChange = async (booking) => {
    try {
      const change = buildChangeRequestPayload({
        booking,
        requestedAppointmentDate: changeDates[booking.bookingId],
        notes: changeNotes[booking.bookingId],
      });
      const result = await requestBookingChange(change);
      setMyBookingStatus(result.localOnly ? "\u5df2\u66ab\u5b58\u6539\u671f\u7533\u8acb" : "\u5df2\u9001\u51fa\u6539\u671f\u7533\u8acb\uff0c\u8acb\u7b49\u5019\u5065\u6aa2\u4e2d\u5fc3\u78ba\u8a8d");
    } catch (error) {
      setMyBookingStatus(`\u9001\u51fa\u5931\u6557\uff1a${error.message}`);
    }
  };

  const statusLabel = (status) => ({ BOOKED: "待確認", CONFIRMED: "已確認", RESCHEDULED: "已改期", CANCELLED: "已取消" }[status] || status || "待確認");

  const handleConfirmBooking = async (booking) => {
    try {
      await confirmBooking(booking.bookingId);
      setAdminStatus("已確認預約");
      handleLoadAdminBookings();
    } catch (error) {
      setAdminStatus(`確認失敗：${error.message}`);
    }
  };

  const handleApproveChangeRequest = async (request) => {
    try {
      await approveChangeRequest(request);
      setAdminStatus("\u5df2\u6838\u51c6\u6539\u671f");
      if (adminDate === request.currentAppointmentDate || adminDate === request.requestedAppointmentDate) {
        handleLoadAdminBookings();
      }
    } catch (error) {
      setAdminStatus(`\u6838\u51c6\u5931\u6557\uff1a${error.message}`);
    }
  };

  const handleLoadAdminBookings = async () => {
    try {
      setAdminStatus("讀取中...");
      const bookings = await listBookingsByDate(adminDate, adminChannel);
      setAdminBookings(bookings);
      setSelectedAdminBookingIds([]);
      setAdminStatus(`已載入 ${bookings.length} 筆預約`);
    } catch (error) {
      setAdminStatus(`讀取失敗：${error.message}`);
    }
  };

  const selectedAdminBookings = adminBookings.filter((booking) => selectedAdminBookingIds.includes(booking.bookingId));
  const allAdminBookingsSelected = adminBookings.length > 0 && selectedAdminBookingIds.length === adminBookings.length;

  const toggleAdminBookingSelection = (bookingId) => {
    setSelectedAdminBookingIds((current) => current.includes(bookingId) ? current.filter((id) => id !== bookingId) : [...current, bookingId]);
  };

  const toggleAllAdminBookings = () => {
    setSelectedAdminBookingIds(allAdminBookingsSelected ? [] : adminBookings.map((booking) => booking.bookingId).filter(Boolean));
  };

  const handlePrintSelectedBookings = () => {
    if (!selectedAdminBookings.length) {
      setAdminStatus("\u8acb\u5148\u52fe\u9078\u8981\u5217\u5370\u7684\u5ba2\u6236");
      return;
    }
    printBookings(selectedAdminBookings);
  };

  const downloadCsv = async (filename, csvText) => {
    const blob = new Blob(["\ufeff", csvText], { type: "text/csv;charset=utf-8" });
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "picked";
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return "downloaded";
  };

  const handleExportAdminBookings = async () => {
    const target = selectedAdminBookings.length ? selectedAdminBookings : adminBookings;
    if (!target.length) {
      setAdminStatus("\u6c92\u6709\u53ef\u532f\u51fa\u7684\u9810\u7d04");
      return;
    }
    try {
      const mode = await downloadCsv(`bookings-${adminDate || "all"}.csv`, exportBookingsCsv(target));
      setAdminStatus(mode === "picked" ? `\u5df2\u5132\u5b58 ${target.length} \u7b46 CSV` : `\u5df2\u532f\u51fa ${target.length} \u7b46 CSV\uff08\u8acb\u67e5\u770b\u4e0b\u8f09\u8cc7\u6599\u593e\uff09`);
    } catch (error) {
      if (error?.name !== "AbortError") setAdminStatus(`CSV \u532f\u51fa\u5931\u6557\uff1a${error.message}`);
    }
  };

  const handleImportBookingCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setAdminStatus("CSV \u532f\u5165\u4e2d...");
      const rows = parseBookingImportCsv(await file.text());
      let imported = 0;
      const skipped = [];
      for (const row of rows) {
        const ids = packages[row.packageName];
        if (!row.name || !row.phone || !row.appointmentDate || !row.packageName || !ids?.length) {
          skipped.push(row.rowNumber);
          continue;
        }
        const rowItems = parsedItems.filter((item) => ids.includes(item.id));
        const pricing = calculatePricing(rowItems);
        const payload = buildBookingPayload({
          formData: {
            name: row.name,
            phone: row.phone,
            idNumber: row.idNumber,
            channel: row.channel,
            appointmentDate: row.appointmentDate,
            notes: row.notes,
          },
          lineProfile: null,
          packageName: row.packageName,
          selectedItems: rowItems,
          listPrice: pricing.listPrice,
          discountRate: pricing.discountRate,
          finalPrice: row.finalPrice || Number(packageMeta[row.packageName]?.finalPrice) || pricing.suggestedPrice,
        });
        payload.booking.status = row.status;
        const result = await saveBooking(payload);
        await saveChecklist(result.bookingId, buildChecklistPayload({ ...payload.booking, bookingId: result.bookingId }));
        imported += 1;
      }
      setAdminStatus(`CSV \u532f\u5165\u5b8c\u6210\uff1a${imported} \u7b46${skipped.length ? `\uff0c\u8df3\u904e\u7b2c ${skipped.join(", ")} \u5217` : ""}`);
      if (adminDate) handleLoadAdminBookings();
    } catch (error) {
      setAdminStatus(`CSV \u532f\u5165\u5931\u6557\uff1a${error.message}`);
    }
  };
  const buildChecklistHtml = (bookings) => {
    const pages = bookings.map((booking) => {
      const checklist = buildChecklistPayload(booking);
      return `
        <section class="page">
          <header class="header">
            <div>
              <h1>${escapeHtml(booking.customerName || booking.name || booking.customerId || "未命名")}</h1>
              <p>${escapeHtml(booking.appointmentDate)} ｜ ${escapeHtml(booking.channel)} ｜ ${escapeHtml(booking.packageName)}</p>
            </div>
            <div class="count">${(booking.selectedItems || []).length} 項</div>
          </header>
          ${checklist.stationGroups
            .map(
              (group) => `
                <div class="station">
                  <div class="station-title">
                    <strong>${escapeHtml(group.station)}</strong>
                    <span>${group.items.length} 項 / 約 ${group.totalMin} 分</span>
                  </div>
                  ${group.items
                    .map(
                      (item) => `
                        <div class="item">
                          <span class="box"></span>
                          <span class="code">${escapeHtml(item.code || "-")}</span>
                          <span class="name">${escapeHtml(item.name)}</span>
                          <span class="en">${escapeHtml(item.enName || "")}</span>
                        </div>`
                    )
                    .join("")}
                </div>`
            )
            .join("")}
          ${checklist.warnings.length ? `<div class="notice"><strong>注意事項</strong>${checklist.warnings.map((i) => `<p>${escapeHtml(i.name)}：${escapeHtml(i.remark)}</p>`).join("")}</div>` : ""}
          ${checklist.outsourceItems.length ? `<div class="outsource"><strong>外檢/後送</strong>${checklist.outsourceItems.map((i) => `<p>${escapeHtml(i.name)}：${escapeHtml(i.outsource)}</p>`).join("")}</div>` : ""}
        </section>`;
    });

    return `
      <html>
        <head>
          <title>當日健檢清單</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: "Microsoft JhengHei", Arial, sans-serif; color: #111827; margin: 0; }
            .page { page-break-after: always; padding: 4mm 0; }
            .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 10px; }
            h1 { margin: 0; font-size: 22px; }
            p { margin: 3px 0; }
            .count { font-size: 18px; font-weight: 700; white-space: nowrap; }
            .station { border: 1px solid #d1d5db; margin: 8px 0; break-inside: avoid; }
            .station-title { display: flex; justify-content: space-between; background: #f3f4f6; padding: 6px 8px; font-size: 13px; }
            .item { display: grid; grid-template-columns: 18px 82px minmax(120px, 1fr) minmax(80px, 1fr); gap: 8px; align-items: center; padding: 5px 8px; border-top: 1px solid #e5e7eb; font-size: 12px; }
            .box { width: 13px; height: 13px; border: 1px solid #111827; display: inline-block; }
            .code { font-family: Consolas, monospace; color: #374151; }
            .name { font-weight: 700; }
            .en { color: #6b7280; }
            .notice, .outsource { border: 1px solid #f59e0b; background: #fffbeb; padding: 8px; margin-top: 8px; font-size: 12px; break-inside: avoid; }
            .outsource { border-color: #fca5a5; background: #fef2f2; }
          </style>
        </head>
        <body>${pages.join("")}<script>window.onload = () => window.print();</script></body>
      </html>`;
  };

  const printBookings = async (bookings) => {
    if (!bookings.length) {
      setAdminStatus("沒有可列印的預約");
      return;
    }
    const printWindow = window.open("", "_blank");
    printWindow.document.write(buildChecklistHtml(bookings));
    printWindow.document.close();
    await Promise.all(bookings.map((booking) => booking.bookingId ? markChecklistPrinted(booking.bookingId) : null));
  };

  const printCurrentSelection = () => {
    const booking = {
      bookingId: "preview",
      customerName: bookingForm.name || "預覽客戶",
      appointmentDate: bookingForm.appointmentDate || new Date().toISOString().slice(0, 10),
      channel: bookingForm.channel,
      packageName,
      selectedItems,
    };
    printBookings([booking]);
  };
  // --- UI Components ---

  const PackagesView = () => (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-100 border-b border-slate-200 flex-none sticky top-0 z-10">
        <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-indigo-600" />
          套餐列表 ({Object.keys(packages).length})
        </h3>
        <p className="text-xs text-slate-500 mt-1">勾選方塊以進行比較</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {Object.keys(packages).filter((name) => packageFilter === "ALL" || (packageMeta[name]?.audience || inferPackageAudienceName(name)) === packageFilter).map((name) => {
          const isComparing = compareList.includes(name);
          const isActive = packageName === name && compareList.length === 0;

          return (
            <div
              key={name}
              className={`flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg text-sm lg:text-xs font-medium transition-all group relative ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md"
                  : isComparing
                  ? "bg-amber-50 text-amber-900 border border-amber-200"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-transparent"
              }`}
            >
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-5 h-5 lg:w-4 lg:h-4 flex-shrink-0"
                checked={isComparing}
                onChange={() => toggleCompare(name)}
                title="勾選加入比較"
              />
              <button
                onClick={() => applyPreset(name)}
                className="flex-1 text-left truncate pl-1 py-1"
              >
                <span className="block truncate">{name}</span>
                <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{packageMeta[name]?.audience || inferPackageAudienceName(name)}</span>
              </button>

              <div className="flex items-center">
                {isActive && !isComparing && (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                )}
                <button
                  onClick={(e) => deletePackage(e, name)}
                  className={`p-2 lg:p-1 rounded hover:bg-rose-100 hover:text-rose-600 transition-opacity ${
                    isActive
                      ? "text-white/80 hover:text-white hover:bg-white/20"
                      : "text-slate-400 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                  }`}
                  title="移除此套餐"
                >
                  <Trash2 className="w-4 h-4 lg:w-3 lg:h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(deletedPackages).length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 p-3 max-h-[150px] overflow-y-auto custom-scrollbar flex-none">
          <h4 className="text-xs lg:text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
            <Trash2 className="w-4 h-4 lg:w-3 lg:h-3" /> 最近刪除 (
            {Object.keys(deletedPackages).length})
          </h4>
          <div className="space-y-2 lg:space-y-1">
            {Object.keys(deletedPackages).map((name) => (
              <div
                key={name}
                className="flex items-center justify-between px-2 py-2 lg:py-1.5 bg-white border border-slate-200 rounded text-sm lg:text-xs text-slate-500"
              >
                <span className="truncate max-w-[150px] lg:max-w-[120px] strike-through decoration-slate-300 line-through decoration-2">
                  {name}
                </span>
                <button
                  onClick={() => restorePackage(name)}
                  className="p-1.5 lg:p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                  title="還原此套餐"
                >
                  <RotateCcw className="w-4 h-4 lg:w-3 lg:h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const ItemsView = () => (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-col gap-3 flex-none sticky top-0 bg-white z-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-800">
              檢查項目 ({parsedItems.length})
            </h2>
          </div>
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋 (支援 & AND, 空格 OR, - NOT)"
                className="w-full pl-9 pr-2 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {sortConfig.key && (
              <button
                onClick={resetSort}
                className="px-2 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border hover:bg-slate-200 flex items-center gap-1"
                title="回復原始排序"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowCsvInput(!showCsvInput)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border flex-shrink-0 flex items-center gap-1 ${
                showCsvInput
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-white text-slate-600"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">匯入</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center min-h-[20px]">
          {activeCategory && (
            <div className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs animate-in fade-in zoom-in">
              <Filter className="w-3 h-3" />
              <span className="font-bold">{activeCategory}</span>
              <button
                onClick={() => setActiveCategory(null)}
                className="hover:bg-indigo-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {!activeCategory && (
            <div className="text-[10px] text-slate-400 flex flex-wrap gap-2 px-1">
              <span className="bg-slate-50 px-1 rounded">&amp;=AND</span>
              <span className="bg-slate-50 px-1 rounded">空格=OR</span>
              <span className="bg-slate-50 px-1 rounded">-=NOT</span>
            </div>
          )}
        </div>
      </div>

      {showCsvInput && (
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500">
              貼上 CSV 更新 (自動儲存)
            </span>
            <button
              onClick={resetToDefault}
              className="text-[10px] text-rose-500 bg-rose-50 px-2 py-1 rounded flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              重設
            </button>
          </div>
          <textarea
            className="w-full h-32 p-2 text-xs font-mono rounded border border-slate-300"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
        <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex-none sticky top-0 z-20 shadow-sm">
          <div className="col-span-1 text-left">選取</div>
          <div
            className="col-span-2 text-left hidden lg:flex items-center gap-1 cursor-pointer hover:text-indigo-600 transition-colors select-none"
            onClick={() => handleSort("category")}
          >
            分類
            {sortConfig.key === "category" ? (
              sortConfig.direction === "asc" ? (
                <ArrowUp className="w-3 h-3 text-indigo-600" />
              ) : (
                <ArrowDown className="w-3 h-3 text-indigo-600" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-20" />
            )}
          </div>
          <div className="col-span-7 lg:col-span-3 text-left">項目名稱</div>
          <div
            className="col-span-2 lg:col-span-1 text-left flex items-center gap-1 cursor-pointer hover:text-indigo-600 transition-colors select-none"
            onClick={() => handleSort("price")}
          >
            單價
            {sortConfig.key === "price" ? (
              sortConfig.direction === "asc" ? (
                <ArrowUp className="w-3 h-3 text-indigo-600" />
              ) : (
                <ArrowDown className="w-3 h-3 text-indigo-600" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-20" />
            )}
          </div>
          <div className="col-span-2 lg:col-span-5 text-left flex items-center gap-1">
            檢查意義 <Info className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => handleRowClick(item)}
            className={`grid grid-cols-12 gap-2 p-2 border-b border-slate-100 items-center cursor-pointer transition-all hover:bg-slate-50 relative group min-h-[50px] lg:min-h-[40px] ${
              selectedIds.includes(item.id) ? "bg-indigo-50/60" : ""
            }`}
          >
            {/* Checkbox */}
            <div className="col-span-1 flex justify-start items-center">
              <div
                className={`w-6 h-6 lg:w-5 lg:h-5 rounded border flex items-center justify-center transition-all ${
                  selectedIds.includes(item.id)
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
                onClick={(e) => handleToggleSelect(e, item)}
              >
                {selectedIds.includes(item.id) && (
                  <CheckCircle2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                )}
              </div>
            </div>

            {/* Category */}
            <div className="col-span-2 text-left hidden lg:block">
              <span
                className={`text-[10px] font-bold px-1 py-0.5 rounded-md block truncate text-center cursor-pointer transition-colors ${
                  activeCategory === item.category
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryClick(item.category);
                }}
                title="點擊篩選此分類"
              >
                {item.category}
              </span>
            </div>

            {/* Name */}
            <div className="col-span-7 lg:col-span-3 text-left">
              <div className="font-medium text-xs text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight truncate">
                {item.name}
              </div>
              {item.enName && (
                <div className="text-[10px] text-slate-400 truncate">
                  {item.enName}
                </div>
              )}
              {/* Mobile Category Tag */}
              <span
                className={`lg:hidden text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block cursor-pointer ${
                  activeCategory === item.category
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryClick(item.category);
                }}
              >
                {item.category}
              </span>
            </div>

            {/* Price */}
            <div className="col-span-2 lg:col-span-1 text-left font-mono font-bold text-slate-700 text-sm lg:text-xs">
              {item.price.toLocaleString()}
            </div>

            {/* Clinical */}
            <div className="col-span-2 lg:col-span-5 text-sm lg:text-xs text-slate-500 leading-relaxed text-left flex items-center gap-1">
              <span className="line-clamp-2 lg:line-clamp-none">
                {item.clinical}
              </span>
              {item.remark && (
                <span
                  className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded-sm border border-yellow-200 flex-shrink-0 whitespace-nowrap"
                  title={item.remark}
                >
                  備註
                </span>
              )}
              {item.code && !item.remark && (
                <Info className="w-3 h-3 text-slate-300 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            沒有找到符合條件的項目
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="block mx-auto mt-2 text-indigo-600 underline"
              >
                清除分類篩選
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const CalcView = ({ isMobile }) => {
    const isCompareMode = compareList.length > 0;

    // 防呆：確保 comparisonData 存在
    if (isCompareMode && (!comparisonData || !comparisonData.totals)) {
      return (
        <div className="p-8 text-center text-slate-400 text-xs">
          正在載入比較資料...
        </div>
      );
    }

    if (isCompareMode) {
      return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center flex-none sticky top-0 z-10">
            <h2 className="text-base font-bold text-amber-900 flex items-center gap-2">
              <Scale className="w-5 h-5" />
              比較模式
            </h2>
            <button
              onClick={() => setCompareList([])}
              className="text-xs bg-white border border-amber-200 px-3 py-1.5 rounded-full text-amber-700 hover:bg-amber-100"
            >
              退出
            </button>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
            <table className="w-full text-xs text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-slate-500">
                <tr>
                  <th className="p-3 border-b font-bold min-w-[150px] bg-slate-100 sticky left-0 z-20">
                    項目
                  </th>
                  {compareList.map((pkg) => {
                    // 使用 Optional Chaining 確保安全存取
                    const data = comparisonData?.totals?.[pkg];
                    return (
                      <th
                        key={pkg}
                        className="p-3 border-b font-bold min-w-[140px] bg-amber-50 text-slate-800 border-l border-slate-200 align-top"
                      >
                        <div className="text-sm text-slate-600 mb-1 truncate">
                          {pkg}
                        </div>
                        <div className="text-lg text-amber-600 font-mono font-black">
                          ${data?.final?.toLocaleString() || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-1">
                          (表定: {data?.list?.toLocaleString() || 0} |{" "}
                          {data?.rate || 0}% off)
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonData?.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 sticky left-0 bg-white border-r border-slate-100 z-10">
                      <div className="font-bold text-slate-700">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.category}
                      </div>
                    </td>
                    {compareList.map((pkg) => {
                      const hasItem = packages[pkg]?.includes(item.id);
                      return (
                        <td
                          key={pkg}
                          className={`p-3 text-center border-l border-slate-200 ${
                            hasItem ? "bg-indigo-50/20" : ""
                          }`}
                        >
                          {hasItem ? (
                            <CheckCircle2 className="w-5 h-5 text-indigo-600 mx-auto" />
                          ) : (
                            <span className="text-slate-200">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Default Single Calculation View
    return (
      <div className={`flex flex-col gap-4 ${isMobile ? "" : "h-full"}`}>
        {/* Calc Card */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex-none">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-400" />
              費用試算
            </h3>
            {savedMessage && (
              <span className="text-xs text-emerald-400 font-bold animate-pulse">
                {savedMessage}
              </span>
            )}
          </div>
          <div className="p-4 space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  套餐名稱
                </label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-indigo-700 outline-none focus:border-indigo-500"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                />
              </div>
              <label className="w-28 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {"\u901a\u8def\u6a19\u7c64"}
                <input placeholder="一般, 高階, A企業" className="w-full mt-1 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" value={packageAudience} onChange={(e) => setPackageAudience(e.target.value)} />
              </label>
              <label className="w-36 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {"\u90e8\u4f4d\u6a19\u7c64"}
                <input placeholder="心血管, 企業專案" className="w-full mt-1 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" value={packageBodyParts} onChange={(e) => setPackageBodyParts(e.target.value)} />
              </label>
              <button
                onClick={savePackage}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold h-[38px] flex items-center gap-1"
              >
                <Save className="w-4 h-4" /> 儲存
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-baseline border-b border-dashed border-slate-200 pb-2">
                <span className="text-sm text-slate-600">表定總價</span>
                <span className="text-lg font-mono font-bold text-slate-800">
                  NT$ {listPriceTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  折扣 ({discountRate}%)
                </span>
                <div className="text-xs text-rose-500 font-medium">
                  - {discountAmount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-400">建議訂價</span>
              <div className="flex items-center gap-1">
                <span className="text-lg font-black text-indigo-600 font-mono">
                  NT$
                </span>
                <input
                  type="number"
                  className="w-28 bg-slate-50 border-b-2 border-indigo-200 text-right text-2xl font-black text-indigo-600 font-mono focus:outline-none focus:border-indigo-500 px-1"
                  value={finalPrice || 0}
                  onChange={(e) => setFinalPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="py-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 flex justify-center items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" /> 清空
              </button>
              <button
                onClick={handlePrint}
                className="py-3 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 flex justify-center items-center gap-1"
              >
                <Printer className="w-4 h-4" /> 報價單
              </button>
              <button
                onClick={copyToClipboard}
                className="py-3 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black flex justify-center items-center gap-1 shadow-lg shadow-slate-200"
              >
                <Copy className="w-4 h-4" /> 複製
              </button>
              <button
                onClick={() => setShowBookingModal(true)}
                className="py-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex justify-center items-center gap-1 shadow-lg shadow-emerald-100"
              >
                <CheckCircle2 className="w-4 h-4" /> 預約
              </button>
              <button
                onClick={printCurrentSelection}
                className="py-3 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 flex justify-center items-center gap-1"
              >
                <CheckSquare className="w-4 h-4" /> 清單預覽
              </button>
            </div>
            {bookingStatus && (
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                {bookingStatus}
              </div>
            )}
          </div>
        </div>

        {/* List Card */}
        <div
          className={`bg-white rounded-xl shadow-md border border-slate-200 flex flex-col ${
            isMobile ? "" : "flex-1 overflow-hidden"
          }`}
        >
          <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center flex-none">
            <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              已選明細 ({selectedItems.length})
            </h4>
          </div>
          <div className={`${isMobile ? "" : "flex-1 overflow-y-auto"} p-0`}>
            {selectedItems.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {selectedItems.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex justify-between items-center p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-xs w-4">
                        {idx + 1}.
                      </span>
                      <div className="flex flex-col">
                        <span className="block font-bold text-slate-700">
                          {item.name}
                        </span>
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] text-slate-400">
                            {item.category}
                          </span>
                          {item.code && (
                            <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500 font-mono">
                              #{item.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-slate-600 font-medium pl-2">
                      ${item.price.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="p-3 bg-slate-50 text-right text-xs font-bold text-slate-500 border-t border-slate-200">
                  總計: ${listPriceTotal.toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm italic">
                尚未選擇任何項目
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const PublicInfoPanel = ({ view }) => {
    const contactMapUrl = "https://www.google.com/maps/search/?api=1&query=%E5%B1%8F%E6%9D%B1%E5%B8%82%E5%A4%A7%E9%80%A3%E8%B7%AF66%E8%99%9F%E6%81%A9%E6%85%88%E5%A4%A7%E6%A8%932%E6%A8%93";
    const content = {
      prep: {
        title: "來檢須知",
        lead: "檢查前一天請依套餐內容確認禁食、採檢與用藥注意事項。",
        items: ["多數抽血與腹部超音波需禁食 8 小時", "請攜帶身分證件、健保卡與既往病歷/用藥資料", "需留尿、糞便或特殊檢體者，依中心通知準備", "女性請避開生理期；懷孕或疑似懷孕請先告知"],
      },
      checkin: {
        title: "報到 QR / 當日流程",
        lead: "預約完成後，後續會在這裡整合報到 QR code 與當日檢查動線。",
        items: ["目前請先依預約成功資訊與中心通知報到", "報到時出示 LINE 預約資料或身分證件", "現場人員會依套餐產生個人檢查清單", "QR code 報到功能會接在下一階段"],
      },
      followup: {
        title: "報告查詢 / 異常追蹤",
        lead: "報告完成與異常追蹤會以健檢中心通知為準。",
        items: ["若有重大異常，個管師會協助後續說明與轉介", "日後可整合報告完成通知、追蹤提醒與回診安排", "目前若需查詢進度，請直接聯絡健檢中心"],
      },
      contact: {
        title: "聯絡我們 / 交通",
        lead: "屏基健檢中心聯絡與交通資訊。",
        items: ["電話：08-7369955-18", "地址：屏東市大連路66號恩慈大樓2樓", "建議來檢前確認預約日期、報到時間與注意事項", "企業團檢或特殊需求請直接來電洽詢"],
      },
    }[view] || {};
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h1 className="text-xl font-black text-slate-900">{content.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{content.lead}</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(content.items || []).map((item) => <div key={item} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">{item}</div>)}
        </div>
        {view === "contact" ? (
          <a href={contactMapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm sm:w-auto">開啟 Google Maps 導航</a>
        ) : null}
      </div>
    );
  };

  const MyBookingsPanel = () => (    <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900">我的預約</h2>
          <p className="mt-1 text-xs text-slate-500">此裝置可查詢自己建立的預約，改期需由健檢中心確認。</p>
        </div>
        <button onClick={handleLoadMyBookings} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white">{lang === "en" ? "Find my bookings" : "查詢我的預約"}</button>
      </div>
      {myBookingStatus && <div className="mt-3 text-xs text-slate-500">{myBookingStatus}</div>}
      {myBookings.length > 0 && (
        <div className="mt-4 space-y-3">
          {myBookings.map((booking) => (
            <div key={booking.bookingId} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900">{booking.packageName}</div>
                  <div className="text-slate-600">{booking.appointmentDate} / {statusLabel(booking.status)}</div>
                  <div className="text-xs text-slate-400">{booking.bookingId}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr_auto] gap-2 w-full sm:w-auto">
                  <input type="date" className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={changeDates[booking.bookingId] || ""} onChange={(e) => setChangeDates((current) => ({ ...current, [booking.bookingId]: e.target.value }))} />
                  <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="改期原因/備註" value={changeNotes[booking.bookingId] || ""} onChange={(e) => setChangeNotes((current) => ({ ...current, [booking.bookingId]: e.target.value }))} />
                  <button onClick={() => handleRequestBookingChange(booking)} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white">送出改期</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const showComparisonCard = (card) => {
    setComparisonDetailCard(card);
  };

  const toggleComparisonSort = (key) => {
    setComparisonSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  };

  const sortMark = (key) => comparisonSort.key === key ? (comparisonSort.direction === "asc" ? " \u2191" : " \u2193") : "";

  const PackageComparison = ({ cards, compact = false }) => {
    const sortedCards = sortPublicComparisonCards(cards, comparisonSort, lang);
    return (
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-base font-black text-slate-900">{lang === "en" ? "Package comparison" : "\u5957\u9910\u6bd4\u8f03\u7e3d\u8868"}</h2>
            <p className="text-xs text-slate-500">{lang === "en" ? "Each package is one row; tap headers to sort" : "\u6bcf\u500b\u5957\u9910\u4e00\u5217\uff0c\u9ede\u6b04\u4f4d\u53ef\u6392\u5e8f"}</p>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 top-0 z-20 w-36 bg-slate-50 px-3 py-3 text-left text-xs font-black text-slate-600"><button className="text-left font-black" onClick={() => toggleComparisonSort("package")}>{lang === "en" ? "Package" : "\u5957\u9910"}{sortMark("package")}</button></th>
                {PUBLIC_COMPARISON_ROWS.map((row) => (
                  <th key={row.key} className="sticky top-0 z-10 min-w-[150px] bg-slate-50 px-3 py-3 text-left text-xs font-black text-slate-600"><button className="text-left font-black" onClick={() => toggleComparisonSort(row.key)}>{lang === "en" ? row.labelEn : row.label}{sortMark(row.key)}</button></th>
                ))}
                <th className="sticky top-0 z-10 w-28 bg-slate-50 px-3 py-3 text-left text-xs font-black text-slate-600">{lang === "en" ? "Action" : "\u64cd\u4f5c"}</th>
              </tr>
            </thead>
            <tbody>
              {sortedCards.map((card) => (
                <tr key={card.name} className="border-t border-slate-100">
                  <th className="sticky left-0 z-10 bg-white px-3 py-3 text-left align-top">
                    <button className="font-black text-slate-900 underline decoration-slate-300 underline-offset-4" onClick={() => showComparisonCard(card)}>{card.name}</button>
                  </th>
                  {PUBLIC_COMPARISON_ROWS.map((row) => (
                    <td key={`${card.name}-${row.key}`} className="min-w-[150px] px-3 py-3 align-top text-slate-700 leading-relaxed">
                      {getPublicPackageComparisonValue(card, row.key, lang)}
                    </td>
                  ))}
                  <td className="w-28 px-3 py-3 align-top">
                    <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700" onClick={() => showComparisonCard(card)}>{lang === "en" ? "Details" : "\u8a73\u7d30"}</button>
                    <button className="mt-2 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white" onClick={() => selectPublicPackage(card)}>{lang === "en" ? "Book" : "\u9810\u7d04"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  const PublicPackageView = () => (
    <main className="flex-1 overflow-y-auto bg-slate-50">
      <section className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 space-y-5">
        {publicView === "packages" ? (
          <>
            <div className="bg-white border border-slate-200 rounded-lg p-4 lg:p-5">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900">{t.publicTitle}</h1>
              <p className="mt-2 text-sm text-slate-600">{t.publicSubtitle}</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-xs font-bold text-slate-600">
                  {t.audience}
                  <select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal" value={publicFilters.audience} onChange={(e) => setPublicFilter("audience", e.target.value)}>
                    {availableAudiences.map((value) => <option key={value} value={value}>{optionLabel(value, lang)}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-600">
                  {t.sex}
                  <select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal" value={publicFilters.sex} onChange={(e) => setPublicFilter("sex", e.target.value)}>
                    {PUBLIC_SEXES.map((value) => <option key={value} value={value}>{optionLabel(value, lang)}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-600">
                  {t.bodyPart}
                  <select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal" value={publicFilters.bodyPart} onChange={(e) => setPublicFilter("bodyPart", e.target.value)}>
                    {availableBodyParts.map((value) => <option key={value} value={value}>{optionLabel(value, lang)}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-1 text-sm font-bold">
                <button className={`rounded px-3 py-2 ${publicPackageLayout === "cards" ? "bg-slate-900 text-white" : "text-slate-600"}`} onClick={() => setPublicPackageLayout("cards")}>{"\u5361\u7247\u6aa2\u8996"}</button>
                <button className={`rounded px-3 py-2 ${publicPackageLayout === "table" ? "bg-slate-900 text-white" : "text-slate-600"}`} onClick={() => setPublicPackageLayout("table")}>{"\u6bd4\u8f03\u7e3d\u8868"}</button>
              </div>
            </div>

            {publicPackageLayout === "table" ? <PackageComparison cards={visiblePublicPackageCards} /> : null}

            <div className={`${publicPackageLayout === "table" ? "hidden" : "grid"} grid-cols-1 lg:grid-cols-2 gap-4`}>
              {visiblePublicPackageCards.map((card) => {
                const expanded = expandedPackageName === card.name;
                const shownItems = expanded ? card.items : card.displayItems.slice(0, 8);
                return (
                  <article key={card.name} className="bg-white border border-slate-200 rounded-lg p-4 lg:p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{card.name}</h2>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {card.tags.audience.slice(0, 3).map((tag) => <span key={tag} className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{tag}</span>)}
                          {card.tags.sex !== "不限" && <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{card.tags.sex}</span>}
                          {card.tags.bodyParts.slice(0, 4).map((tag) => <span key={tag} className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">{tag}</span>)}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-slate-500">{t.packagePrice}</div>
                        <div className="text-xl font-black font-mono text-slate-900">NT$ {card.price.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      <div className="font-bold text-slate-800 mb-1">{t.highlights}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {card.highlights.map((item) => <span key={item.id} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">{item.label}</span>)}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <div className="text-xs font-bold text-slate-500 mb-2">{t.included}</div>
                      <div className="space-y-2">
                        {shownItems.map((item) => (
                          <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-3 text-sm">
                            <div className="font-bold text-slate-800">{lang === "en" && item.enName ? item.enName : item.name}</div>
                            <div className="text-slate-600 leading-relaxed">{item.clinical || (lang === "en" ? item.category : item.enName || item.category)}</div>
                          </div>
                        ))}
                      </div>
                      {card.items.length > card.displayItems.length && (
                        <button className="mt-3 text-xs font-bold text-slate-700 underline" onClick={() => setExpandedPackageName(expanded ? null : card.name)}>
                          {expanded ? t.collapse : `${t.viewAllPrefix} ${card.items.length} ${t.itemUnit}`}
                        </button>
                      )}
                    </div>

                    <button onClick={() => selectPublicPackage(card)} className="mt-auto w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                      {t.choose}
                    </button>
                  </article>
                );
              })}
            </div>

            {visiblePublicPackageCards.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{t.noPackages}</div>
            )}
          </>
        ) : publicView === "my-bookings" ? (
          <MyBookingsPanel />
        ) : (
          <PublicInfoPanel view={publicView} />
        )}
      </section>
    </main>
  );
  const PackageDetailModal = ({ card }) => card ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setComparisonDetailCard(null)}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">{card.name}</h2>
            <div className="mt-1 text-sm font-mono font-black text-slate-900">NT$ {Number(card.price || 0).toLocaleString()}</div>
          </div>
          <button className="rounded-md bg-slate-100 p-2 text-slate-500" onClick={() => setComparisonDetailCard(null)} aria-label={lang === "en" ? "Close package details" : "\u95dc\u9589\u5957\u9910\u8a73\u7d30"}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {card.tags.audience.slice(0, 3).map((tag) => <span key={tag} className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{tag}</span>)}
            {card.tags.sex !== "\u4e0d\u9650" && <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{card.tags.sex}</span>}
            {card.tags.bodyParts.slice(0, 5).map((tag) => <span key={tag} className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">{tag}</span>)}
          </div>
          <div className="space-y-2">
            {card.items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 gap-1 border-b border-slate-100 py-2 text-sm sm:grid-cols-[180px_1fr] sm:gap-4">
                <div className="font-bold text-slate-900">{lang === "en" && item.enName ? item.enName : item.name}</div>
                <div className="leading-relaxed text-slate-600">{item.clinical || (lang === "en" ? item.category : item.enName || item.category)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
          <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={() => setComparisonDetailCard(null)}>{lang === "en" ? "Close" : "\u95dc\u9589"}</button>
          <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white" onClick={() => { setComparisonDetailCard(null); selectPublicPackage(card); }}>{lang === "en" ? "Book this package" : "\u9810\u7d04\u6b64\u5957\u9910"}</button>
        </div>
      </div>
    </div>
  ) : null;
  const BookingModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.bookingTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">{liffMessage}</p>
          </div>
          <button className="p-2 rounded-md bg-slate-100 text-slate-500" onClick={() => setShowBookingModal(false)} aria-label={t.closeBooking}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
          <div className="font-bold text-slate-800">{packageName}</div>
          <div>{selectedItems.length} 項 / NT$ {Number(finalPrice || 0).toLocaleString()}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-600">
            {t.name}
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" value={bookingForm.name} onChange={(e) => setBookingField("name", e.target.value)} />
          </label>
          <label className="text-xs font-bold text-slate-600">
            {t.idNumber}
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" placeholder="A123456789 / Passport / ARC" value={bookingForm.idNumber} onChange={(e) => setBookingField("idNumber", e.target.value)} />
            <span className="mt-1 block text-[11px] font-normal leading-4 text-slate-500">{t.idNumberHelp}</span>
          </label>
          <label className="text-xs font-bold text-slate-600">
            {t.phone}
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" value={bookingForm.phone} onChange={(e) => setBookingField("phone", e.target.value)} />
          </label>
          <label className="text-xs font-bold text-slate-600">
            {t.appointmentDate}
            <input type="date" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" value={bookingForm.appointmentDate} onChange={(e) => setBookingField("appointmentDate", e.target.value)} />
          </label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">
            Channel
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" value={bookingForm.channel} onChange={(e) => setBookingField("channel", e.target.value)}>
              {CHANNELS.map((channel) => (
                <option key={channel.value} value={channel.value}>{channel.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">
            {t.notes}
            <textarea className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" rows="3" value={bookingForm.notes} onChange={(e) => setBookingField("notes", e.target.value)} />
          </label>
        </div>

        <button onClick={handleSubmitBooking} className="w-full py-3 rounded-md bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">
          {t.submit}
        </button>
      </div>
    </div>
  );

  const AdminView = () => (
    <div className="hidden lg:flex h-full max-w-[1280px] mx-auto w-full flex-col gap-4 p-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-end gap-3">
        <label className="text-xs font-bold text-slate-600">
          健檢日期
          <input type="date" className="block mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" value={adminDate} onChange={(e) => setAdminDate(e.target.value)} />
        </label>
        <label className="text-xs font-bold text-slate-600">
          通路
          <select className="block mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" value={adminChannel} onChange={(e) => setAdminChannel(e.target.value)}>
            <option value="ALL">全部通路</option>
            {CHANNELS.map((channel) => (
              <option key={channel.value} value={channel.value}>{channel.label}</option>
            ))}
          </select>
        </label>

        <button onClick={handleLoadAdminBookings} className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-bold">讀取</button>
        <button onClick={handlePrintSelectedBookings} disabled={!selectedAdminBookings.length} className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-bold disabled:opacity-40">列印勾選</button>
        <button onClick={handleExportAdminBookings} disabled={!adminBookings.length} className="px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 text-sm font-bold disabled:opacity-40">{"\u532f\u51fa CSV"}</button>
        <label className="px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 text-sm font-bold cursor-pointer">
          {"\u532f\u5165 CSV"}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportBookingCsv} />
        </label>        <span className="text-xs text-slate-500">{adminStatus}</span>
      </div>
      <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
        <div className="bg-amber-50 px-4 py-2 text-sm font-black text-amber-900">改期待處理 ({pendingChanges.length})</div>
        {pendingChanges.length ? pendingChanges.map((request) => (
          <div key={request.requestId} className="grid grid-cols-12 items-center gap-2 px-4 py-3 border-t border-amber-100 text-sm">
            <div className="col-span-2 font-bold text-slate-800">{request.customerName || "\u672a\u547d\u540d"}</div>
            <div className="col-span-3 text-slate-600 truncate">{request.packageName}</div>
            <div className="col-span-2 text-slate-600">{request.currentAppointmentDate}</div>
            <div className="col-span-2 font-bold text-emerald-700">{request.requestedAppointmentDate}</div>
            <div className="col-span-2 text-slate-500 truncate">{request.notes}</div>
            <div className="col-span-1 text-right"><button onClick={() => handleApproveChangeRequest(request)} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white">核准</button></div>
          </div>
        )) : (
          <div className="p-4 text-sm text-slate-400">目前沒有改期申請</div>
        )}
      </div>


      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-100 text-xs font-bold text-slate-600 px-4 py-2">
          <div className="col-span-1"><input type="checkbox" checked={allAdminBookingsSelected} onChange={toggleAllAdminBookings} aria-label="Select all bookings" /></div>
          <div className="col-span-2">姓名/Customer</div>
          <div className="col-span-2">電話</div>
          <div className="col-span-1">Channel</div>
          <div className="col-span-2">套餐</div>
          <div className="col-span-1">狀態</div>
          <div className="col-span-2">金額</div>
          <div className="col-span-1 text-right">操作</div>
        </div>
        {adminBookings.length ? adminBookings.map((booking) => (
          <div key={booking.bookingId} className="grid grid-cols-12 items-center px-4 py-3 border-t border-slate-100 text-sm">
            <div className="col-span-1"><input type="checkbox" checked={selectedAdminBookingIds.includes(booking.bookingId)} onChange={() => toggleAdminBookingSelection(booking.bookingId)} aria-label={`Select ${booking.customerName || booking.name || booking.customerId}`} /></div>
            <div className="col-span-2 font-bold text-slate-800">{booking.customerName || booking.name || booking.customerId}</div>
            <div className="col-span-2 text-slate-600">{booking.customerPhone || booking.phone || "-"}</div>
            <div className="col-span-1 text-slate-600">{booking.channel}</div>
            <div className="col-span-2 text-slate-600 truncate">{booking.packageName}</div>
            <div className="col-span-1 text-slate-600">{statusLabel(booking.status)}</div>
            <div className="col-span-2 font-mono text-slate-700">NT$ {Number(booking.finalPrice || 0).toLocaleString()}</div>
            <div className="col-span-1 text-right space-y-1">
              {booking.status === "CONFIRMED" ? null : <button onClick={() => handleConfirmBooking(booking)} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white">確認</button>}
              <button onClick={() => printBookings([booking])} className="text-xs px-2 py-1 rounded bg-slate-900 text-white">列印</button>
            </div>
          </div>
        )) : (
          <div className="p-8 text-center text-sm text-slate-400">尚無資料</div>
        )}
      </div>
    </div>
  );
  return (
    // Root container:
    // Mobile: min-h-screen (allows natural scrolling) + pb-10 (space for footer if needed, though not used here)
    // Desktop: h-screen + overflow-hidden (app-like experience)
    <div className="min-h-screen lg:h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col lg:overflow-hidden relative box-border">
      {/* 浮動視窗 (Global) */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setModalItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Content... Same as before */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 rounded mb-2 inline-block">
                  {modalItem.category}
                </span>
                <h3 className="text-xl font-bold text-slate-800">
                  {modalItem.name}
                </h3>
                <p className="text-sm text-slate-400">{modalItem.enName}</p>
              </div>
              <button
                onClick={() => setModalItem(null)}
                className="p-2 bg-slate-100 rounded-full text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded">
                  <span className="block text-xs text-slate-400 mb-1">
                    自費價
                  </span>
                  <span className="font-mono font-bold text-lg">
                    NT$ {modalItem.price}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <span className="block text-xs text-slate-400 mb-1">
                    院碼
                  </span>
                  <span className="font-mono">{modalItem.code || "-"}</span>
                </div>
              </div>

              <div className="text-base">
                <span className="text-slate-500 text-xs block mb-1">
                  臨床意義
                </span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
                  {modalItem.clinical}
                </p>
              </div>

              {modalItem.remark && (
                <div className="text-sm">
                  <span className="text-slate-500 text-xs block mb-1">
                    備註 / 限制
                  </span>
                  <div className="bg-yellow-50 p-3 rounded text-yellow-800 text-sm border border-yellow-100">
                    {modalItem.remark}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                handleToggleSelect(e, modalItem);
                setModalItem(null);
              }}
              className={`w-full mt-6 py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
                selectedIds.includes(modalItem.id)
                  ? "bg-rose-500 text-white shadow-rose-200"
                  : "bg-indigo-600 text-white shadow-indigo-200"
              }`}
            >
              {selectedIds.includes(modalItem.id) ? (
                <>
                  <Trash2 className="w-5 h-5" /> 從清單移除
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" /> 加入規劃清單
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {comparisonDetailCard && <PackageDetailModal card={comparisonDetailCard} />}
      {showBookingModal && BookingModal()}

      <div className="flex-none border-b border-slate-200 bg-white px-4 py-3 lg:px-6 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-900">{APP_TITLE}</div>
          <div className="text-xs text-slate-500">{liffMessage}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "zh" ? "en" : "zh")} aria-label="Switch language" className="rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200">{t.langToggle}</button>
          {staffStatus && <span className="hidden md:inline text-xs text-slate-500 max-w-[260px] truncate">{staffStatus}</span>}
          <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs font-bold">
            <button onClick={() => openPublicView("packages")} className={`px-3 py-2 ${mode === "public" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>{t.publicTab}</button>
            {staffUser && (
              <>
                <button onClick={() => setStaffMode("staff")} className={`px-3 py-2 ${mode === "staff" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>{t.staffTab}</button>
                <button onClick={() => setStaffMode("admin")} className={`px-3 py-2 ${mode === "admin" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>{t.adminTab}</button>
              </>
            )}
          </div>
          {staffUser ? (
            <button onClick={handleStaffLogout} className="rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200">{t.logout}</button>
          ) : (
            <button onClick={handleStaffLogin} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white">{t.staffLogin}</button>
          )}
        </div>
      </div>

      {staffMode && !staffUser ? PublicPackageView() : mode === "admin" ? AdminView() : mode === "public" ? PublicPackageView() : <>
      {/* Desktop Layout (Hidden on Mobile) */}
      <div className="hidden lg:grid h-full max-w-[1920px] mx-auto w-full grid-cols-12 gap-6 p-6 items-stretch">
        <div className="col-span-2 h-full min-h-0">
          {PackagesView()}
        </div>

        {compareList.length > 0 ? (
          // 比較模式：使用 10 欄寬 (2 + 10)
          <div className="col-span-10 h-full min-h-0">
            {CalcView({})}
          </div>
        ) : (
          // 一般規劃模式：使用 6 + 4 分割
          <>
            <div className="col-span-6 h-full min-h-0">
              {ItemsView()}
            </div>
            <div className="col-span-4 h-full min-h-0">
              {CalcView({})}
            </div>
          </>
        )}
      </div>

      {/* Mobile Layout (Stacked Mode) */}
      <div className="lg:hidden flex-1 flex flex-col bg-slate-50 overflow-y-auto">
        {/* 1. Packages Section (Fixed Height + Scroll) */}
        <div className="p-4 pb-2">
          <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            Step 1: 選擇套餐
          </h3>
          <div className="h-[240px] border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {PackagesView()}
          </div>
        </div>

        {/* 2. Calculation & List Section (Auto Height) */}
        <div className="p-4 py-2">
          <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Step 2: 費用與明細
          </h3>
          {CalcView({ isMobile: true })}
        </div>

        {/* 3. Items Selection Section (Fixed Height + Scroll) */}
        <div className="p-4 pt-2 pb-8">
          <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4" />
            Step 3: 加選項目
          </h3>
          <div className="h-[500px] border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {ItemsView()}
          </div>
        </div>
      </div>
      </>}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-in { animation: fadeIn 0.25s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;




















