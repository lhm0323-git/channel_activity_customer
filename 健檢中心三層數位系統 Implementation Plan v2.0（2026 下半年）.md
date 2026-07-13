# 健檢中心三層數位系統 Implementation Plan v2.0（2026 下半年）

> **範圍聲明：** 本計畫聚焦健檢中心，不延伸至社醫部。三層架構（Channel–Activity–Customer）延續前期設計，但以四個痛點為落地優先順序。

***

## 執行摘要

將前期 Channel–Activity–Customer 三層框架，正式收斂為健檢中心的四個作業模組，依實作難度與影響範圍排定 MVP 優先序：

| 優先序 | 模組 | 工期 |
|------|------|------|
| P1 | LINE Bot 自動通知＋預約建檔 |4–6 週 |
| P2 | 自動生成個人化當日檢查清單 | 4–6 週 |
| P3 | 健檢報告 AI 中文轉譯 | 6–10 週 |

先用 1 個最小可行架構，解決 2 個痛點：
1. 預約與通知不要再靠人工逐一聯繫
2. 當日個人化清單不要再靠護理師逐張手抄

初期專案不追求全電子化，不追求HIS深串，而是先把建檔、批次處理、列印做起來。
***

## 一、三層架構在健檢中心的重新映射

### Channel 層（通路識別）

健檢中心的 Channel 不只是行銷通路，而是決定**動線、流程、費用結構、報告格式**的根本分類。以下四類互不重疊：

| Channel | 典型來源 | 特殊需求 |
|--------|--------|--------|
| 高階個人健檢 | 自費掛號、院長室轉介 | 高規格報告、主動 follow-up |
| 企業團體健檢 | 企業 HR 簽約 | 批次建檔、彙總報表 |
| 勞工體檢 | 廠商或事業單位委辦 | 特定項目表單（職安署格式） |
| 一般預防保健 | 自費或健保補助 | 標準套餐、快速吞吐 |

Channel 欄位必須在**預約建檔**時即確認，後續所有模組（排號、清單、報告）的邏輯都以此分岔。

### Activity 層（場次流程）

每一個健檢預約 = 一個 Activity instance。Activity 記錄該次健檢的：
- 預約日期、套餐代碼、應受檢項目清單
- 報到時間（實際）、各站完成時間
- 流程中缺失或異常項目
- 檢體後送進度、外檢狀態

Activity 是**系統計算跨部門服務流程、排班人力、動線壅塞度**的基本單位。

### Customer 層（個人主檔）先當主索引，不當 CRM 深度引擎

Customer 以 LINE UID + 身分證字號雙鍵為主檔。跨次預約共用同一 Customer，支援：
- 歷次異常值比較
- 個人化問卷預載（上次填寫資料延用）
- 高風險個案追蹤旗標

***

## 二、P1：LINE Bot 自動通知＋預約建檔

### 目標
取代人工電話通知，同時建立健檢中心數位門面：客戶可自助查詢套餐、線上預約、收到自動提醒。[^1][^2]

### 技術架構

```
[客戶 LINE] 
    ↕ Messaging API (Webhook)
[LINE Official Account + LIFF Mini App]
    ↕ HTTPS
[Cloud Functions for Firebase (Python/Node.js)]
    ↕
[Firestore 資料庫]  ←→  [Google Sheets / CSV 匯出給健管師]
    ↕ (日後)
[HIS 系統 API]
```

**為何選 Firebase：**
- Google Cloud 訂閱可直接啟用，無額外費用門檻[^3]
- LIFF（LINE 前端框架）+ Firebase Auth 可直接用 LINE UID 做身份綁定，無需另建帳號系統[^4][^5]
- Firestore 即時資料庫，支援後台管理員即時看到當日預約名單

### LIFF 前端功能清單（MVP）

| 功能 | 說明 |
|-----|-----|
| 套餐瀏覽 | 按 Channel 分類顯示（個人/團體/勞工/一般） |
| 線上預約 | 選日期、套餐、填基本資料，寫入 Firestore |
| 身份綁定 | 用 LINE UID 綁定身分證字號，建立 Customer 主檔 |
| 預約查詢 | 顯示下次預約日期、套餐、注意事項 |
| 取消/改期 | 觸發通知給健管師 |

### LINE Bot 自動通知流程

```
D-1 晚上 18:00
  ↓ Cloud Scheduler 觸發
  ↓ 查 Firestore 明日預約名單
  ↓ 依 Channel 套用不同通知模板
  ↓ LINE Push Message 發送給每位客戶
    → 提醒事項（空腹、備藥等）
    → 明日流程預覽
    → QR code（報到用）

當日報到
  ↓ 客戶出示 LINE QR code
  ↓ 護理師掃碼核對 → Firestore 更新 check-in 時間
  ↓ 系統自動推送「您的號碼牌：X號，預計等候 Y 分鐘」
```



台灣多家醫院已驗證此路徑的可行性：大林慈濟醫院透過 LINE API 串接掛號與進度查詢，上線後 9 個月吸引 11,000 名好友，最多人使用的功能是「掛號服務」及「進度查詢」。 亞東紀念醫院透過 LINE MINI App 實現「看診完即離院」，包含行動繳費與即時候診通知。[^6][^7]

### 資料庫設計（Firestore Collections）

```
customers/
  {lineUID}/
    id_number, name, dob, phone, channel_default
    appointments/ (subcollection)

appointments/
  {apptID}/
    customer_ref, date, channel, package_code
    checkin_time, status, notify_sent

packages/
  {packageCode}/
    name, channel, items[], price, prep_notes
```

### 建置步驟

1. 申請 LINE Official Account + 開啟 Messaging API
2. Firebase 專案設定（Authentication + Firestore + Functions + Hosting）
3. 建立 LIFF App，部署至 Firebase Hosting
4. 實作 Cloud Functions：Webhook handler、排程通知、QR code 生成
5. 建立 Google Sheets 同步（給不用系統的健管師查閱）
6. 灰度測試：先對內部同仁試用兩週

***

## 三、P2：Channel 分流排號系統

### 目標
解決「全部擠在櫃檯像菜市場」的問題。讓不同 Channel 的客人依照預約序號分流，如同銀行抽號碼牌。[^8]

### 設計邏輯

**關鍵決策：先到的客人不一定先檢查**，而是按 Channel 與套餐項目安排最佳動線，避免某一站擁塞。

```
預約建檔時 → 分配 Channel 標籤
                  ↓
當日報到（掃 LINE QR）
                  ↓
系統自動計算當前各站等候人數
                  ↓
發出個人化動線卡（PDF 或 LINE 訊息）：
  「您好，您的健檢順序為：
   ➊ 抽血（B站，#023）→ ➋ X光（D站）→ ➌ 腹部超音波（E站）→ ➍ 醫師解說（F診）」
```

### 分流架構

| Channel | 報到動線 | 優先資源 |
|--------|--------|--------|
| 高階個人 | VIP 專用報到窗口 | 高階影像（MRI/PET/高階超音波） |
| 企業團體 | 批次報到（HR 統一帶隊） | 批量抽血站、團體衛教室 |
| 勞工體檢 | 自助 kiosk 掃碼 | 肺功能/聽力等職業檢查站 |
| 一般預防 | 一般櫃檯快速報到 | 標準站 |

### IoT/硬體建議（低成本優先）

不需採購昂貴 IoT 設備，初版可用以下方案：[^8]

- **報到端：** iPad kiosk + LINE QR 掃碼（或護理師手機掃碼）
- **各站顯示：** 現有電視/螢幕 + Chrome 開啟 Firebase Realtime Dashboard
- **各站回報：** 護理師手機/平板掃客人 QR，更新 Firestore 狀態

整體投入可控制在不添購專屬硬體設備的範圍內。

***

## 四、P3：自動生成個人化當日檢查清單（Activity-based Checklist）

### 目標
每位受檢者有一份**個人化 + 當日項目 + 顯示各站狀態**的電子清單，取代目前護理師手動填寫的紙本流程。

### 清單生成邏輯

```
Customer 主檔（歷史異常旗標）
    +
Appointment 套餐清單
    +
Channel 規則（勞工體檢 = 強制追加職業特定項目）
    ↓
AI 規則引擎 / 簡單條件邏輯
    ↓
個人化清單 PDF（或 LINE Flex Message）
```

### 清單欄位設計

| 欄位 | 說明 |
|-----|-----|
| 受檢者姓名、ID | Customer 主檔拉取 |
| Channel | 高階個人 / 企業 / 勞工 / 一般 |
| 套餐名稱 | Activity 欄位 |
| 應受檢項目清單 | 套餐代碼展開 |
| 各站完成狀態 | 護理師掃碼更新（✓ / 待完成 / 異常） |
| 特殊注意事項 | 由 Customer 主檔異常旗標自動帶入（如「上次血糖偏高，請提醒加驗」） |
| 報告預計完成時間 | 系統估算 |

### 技術實作

- Cloud Functions 在預約確認後立即生成清單，存入 Firestore
- 報到掃碼後，推送 LINE Flex Message 版清單給客戶
- 護理師後台（Firebase Hosting 靜態網頁）顯示當日所有清單，可篩選 Channel 與狀態
- 清單 PDF 生成可用 Google Cloud Run + WeasyPrint（Python）或 Puppeteer

***

## 五、P4：健檢報告 AI 中文轉譯

### 目標
自動將英文健檢報告（尤其放射影像報告）轉譯為中文，並整合到報告交付流程中，減少手動點選片語的作業時間。

### 技術選型

**翻譯核心：** GPT-4o 或 Gemini 1.5 Pro（調用 Google Cloud Vertex AI，與現有 GCP 訂閱整合）[^9][^10]

研究顯示，GPT-4 在放射科報告英譯中文的精確度表現優異，在清晰度、可讀性及與原意一致性上獲得放射科醫師高度評價，但在醫學術語準確性上仍需人工複核。 Qwen 系列（阿里巴巴）在英文到繁體/簡體中文的翻譯表現上也有突出結果。[^9]

**流程設計：**

```
放射科報告（英文 PDF / HL7 / 純文字）
    ↓
Google Document AI OCR（結構化文字擷取）
    ↓
Vertex AI / OpenAI API
  System Prompt：「你是資深放射科翻譯助理，將以下英文影像報告轉譯為正式繁體中文醫療報告格式，
  保留所有數值與解剖學術語，並標注需醫師複核的異常發現」
    ↓
中文草稿報告
    ↓
醫師/放射師快速複核介面（React 網頁，左英右中，關鍵詞高亮）
    ↓
確認後輸出 PDF，觸發 LINE Bot 通知客戶取件
```

**Google Cloud Document AI** 支援 OCR、Form Parser、自訂欄位萃取，可處理 PDF 健檢報告並輸出結構化資料，準確率在醫療文件上可達 96.1%。[^11][^12]

### 介面設計（輕量複核 UI）

- 網頁左側：原文（英文）
- 網頁右側：AI 中文草稿，異常關鍵詞以紅色高亮
- 底部：三個按鈕：「確認送出」、「修改後送出」、「退回重譯」
- 確認後自動觸發 LINE Push：「您的健檢報告已完成，請至櫃檯或線上查閱」

### 重要合規說明

- 本功能定位為「輔助翻譯草稿」，非自動診斷。所有報告須有執照醫師複核簽名後方可交付。
- 個資保護：文字傳入 API 前需去識別化（移除姓名、身分證號），翻譯完成後再還原對應。
- Google Cloud Healthcare API 及 Vertex AI 在台灣均有提供醫療資料處理合規支援。[^13]

***

## 六、整體系統架構（MVP）

```
┌──────────────────────────────────────────────────────┐
│                  前端互動層                            │
│  LINE OA ─ LIFF Mini App ─ 護理師後台 (Firebase Hosting) │
└──────────────────┬───────────────────────────────────┘
                   │ HTTPS / LINE Webhook
┌──────────────────▼───────────────────────────────────┐
│              Cloud Functions for Firebase              │
│  • 預約 CRUD   • 排號邏輯   • 清單生成   • 報告轉譯觸發   │
└──────┬───────────────────┬────────────────────────────┘
       │                   │
┌──────▼──────┐    ┌────────▼────────────────────────────┐
│  Firestore  │    │  Google Cloud (GCP)                  │
│  ─ customers│    │  ─ Document AI (OCR)                 │
│  ─ appts    │    │  ─ Vertex AI / OpenAI API (翻譯)      │
│  ─ packages │    │  ─ Cloud Scheduler (D-1 通知)         │
│  ─ reports  │    │  ─ Cloud Run (PDF 生成)               │
└──────┬──────┘    └─────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  匯出層（過渡期）                                       │
│  Google Sheets / CSV → 健管師人工操作 / HIS 手動匯入    │
└─────────────────────────────────────────────────────┘
       ↕  (Phase 2：HIS API 直接串接)
┌──────────────────────────────────────────────────────┐
│                     HIS 系統                          │
└──────────────────────────────────────────────────────┘
```

**設計原則：** 第一期不強求 HIS 串接。用 CSV/Google Sheets 當緩衝層，讓系統可以在 HIS 完全不動的情況下先上線驗證，之後再補 API 整合。

***

## 七、資料模型重點欄位（Activity-based KPI）

### appointments（Activity 層核心表）

| 欄位名 | 類型 | 說明 |
|------|------|------|
| appt_id | string | 系統自動生成 |
| customer_ref | reference | 指向 customers 主檔 |
| date | timestamp | 健檢日期 |
| channel | enum | HIGH_END / CORPORATE / LABOR / GENERAL |
| package_code | string | 套餐代碼 |
| items_required | array | 應受檢項目清單 |
| items_completed | array | 已完成項目 |
| checkin_time | timestamp | 實際報到時間 |
| checkout_time | timestamp | 離開時間 |
| notify_sent_d1 | boolean | D-1 通知是否已發送 |
| report_status | enum | PENDING / AI_DRAFT / REVIEWED / DELIVERED |
| ai_translation_id | string | 指向報告轉譯記錄 |

### KPI 計算方式

| KPI | 計算公式 | 說明 |
|-----|---------|-----|
| 報到完成率 | checkin_time 非空 / 當日總預約數 | 應達 95% 以上 |
| 平均滯留時間 | checkout_time − checkin_time（平均） | 目標壓縮至 2.5 小時內 |
| 通知送達率 | notify_sent_d1 = true / 前日預約數 | 目標 100%（取代人工）|
| 報告交付及時率 | DELIVERED 且在 SLA 天數內 / 總完成數 | 依 channel 設不同 SLA |
| AI 草稿採用率 | 醫師「確認送出」次數 / 總翻譯草稿數 | 追蹤模型品質 |

***

## 八、智慧醫療計畫（國家經費）的接軌建議

下半年延續智慧醫療計畫，本系統可作為以下 deliverables 的基礎：

| 計畫可交付成果 | 對應模組 | 量化指標 |
|------------|--------|---------|
| 智慧分診系統 | P2 Channel 分流排號 | 縮短候診時間 X% |
| 民眾自助健康服務 | P1 LINE Bot 預約通知 | 人工通知電話減少量 |
| 臨床 NLP 應用 | P4 AI 報告轉譯 | 翻譯作業時間縮短量 |
| 個人化健康管理 | P3 個人化清單 | 異常追蹤完整率 |

建議以「智慧健檢四模組」為計畫主題，對應國科會或衛福部的「數位醫療轉型」補助框架，同時對齊長庚、亞東、慈濟等醫學中心已有的 LINE 醫療服務案例作為參照依據。[^7][^6][^8]

***

## 九、風險與控制

| 風險 | 等級 | 控制措施 |
|-----|-----|--------|
| HIS 無法及時串接 | 高 | P1 期全用 Firestore + CSV，不依賴 HIS |
| 個資保護（PDPA） | 高 | LINE LIFF 身份綁定加密，AI 轉譯前去識別化，Firestore 規則鎖定 |
| 護理同仁操作抗拒 | 中 | 先做 LINE Bot 通知（護理師無需改變工作流程）再推後台 |
| AI 翻譯錯誤導致醫糾 | 中 | 定位為草稿輔助，強制人工複核，報告上標注「AI 輔助翻譯，以醫師複核版本為準」 |
| 系統停機影響當日健檢 | 中 | 保留紙本 fallback 流程，Firestore 離線模式可暫存 |

***

## 十、建議落地順序（2026 下半年 Roadmap）

```
2026 Q3（7–9月）
  ├─ 7月：技術評估、Firebase 專案建立、LINE OA 申請
  ├─ 8月：P1 MVP 上線（LINE Bot 通知 + LIFF 基本預約）
  └─ 9月：P3 清單生成上線，與 P1 整合

2026 Q4（10–12月）
  ├─ 10月：P2 分流排號 beta 測試（先從企業團體 Channel 試點）
  ├─ 11月：P4 AI 報告轉譯 alpha（先做放射科報告，僅限高階個人 Channel）
  └─ 12月：智慧醫療計畫成果展示，評估 HIS API 串接規格
```

**最小可行版本（8 月底前可上線）：**
- LINE OA + 自動 D-1 通知
- LIFF 預約表單（寫入 Firestore）
- 護理師 Google Sheets 查閱當日名單
- 這三項不需 HIS 串接，兩位工程師六週可完成

---

## References

1. [智慧醫療服務聊天機器人- SYSTEX 精誠資訊](https://tw.systex.com/line-robot/) - 精誠集團24小時智慧醫療聊天機器人，為全台唯一以「自然語言處理」（Natural Language Processing, NLP）技術為核心，並特別設計「同音校正」與「反問」的功能，讓病患體驗仿若「...

2. [LINE官方帳號－線上預約掛號，診所預約系統，LINE診所雲端網路掛號系統](https://tw.linebiz.com/smb/industry-application/medical/) - 線上診所預約掛號系統透過視覺化呈現，讓病患快速掛號以及自動化提醒，透過網路即時傳遞診所相關訊息，分流病患也能夠主動提醒定期回診、拿藥，LINE官方帳號網路掛號快速方便！

3. [Build a Doctor Appointment Booking System with Firebase (Full Backend Tutorial)](https://www.youtube.com/watch?v=8osqbCbNpTk) - In this video, I show you how to build a **complete backend for a Doctor Appointment Booking Website...

4. [GitHub - dlackty/line-liff-firebase-starter](https://github.com/dlackty/line-liff-firebase-starter) - Contribute to dlackty/line-liff-firebase-starter development by creating an account on GitHub.

5. [LIFFのLINEログインとFirebase Auth連携チュートリアル【実装から ...](https://note.com/fuku_fk/n/nf04cd464492f) - LIFFとFirebase（Firestore）を使うと、様々なLINEサービスを手軽に作成することができます。 例えばスターバックスの会員カードような、LINEのユーザーと会員情報を紐付けたサービス...

6. [亞東紀念醫院: 亞東院訊 - 亞東醫院](https://www.femh.org.tw/magazine/viewmag.aspx?ID=11908) - 醫療財團法人徐元智先生醫藥基金會亞東紀念醫院, Far Eastern Memorial Hospital, 亞東紀念醫院位於新北市板橋區的醫學中心等級的大型綜合醫院。亞東紀念醫院網站提供門診掛號（含...

7. [全台第一家活用API整合醫療諮詢，打造「AI健康秘書」](https://tw.linebiz.com/case-study/tzu-chi/) - 全台第一家活用API整合醫療諮詢，打造「AI健康秘書」，9個月好友達11,000人，系統/服務/資訊品質滿意度高達82%。運用LINE所提供的「LINE Biz-Solutions」，全方位整合資源，...

8. [應用物聯網和人工智能來優化健檢流程和提升顧客體驗](https://www.cgu.edu.tw/barc/Subject/Detail/61163?nodeId=8085) - 經費來源:國科會、友達數位科技服務股份有限公司

9. [Large Language Model Ability to Translate CT and MRI Free-Text Radiology Reports Into Multiple Languages - PubMed](https://pubmed.ncbi.nlm.nih.gov/39688492/) - Background High-quality translations of radiology reports are essential for optimal patient care. Be...

10. [Artificial Intelligence in Multilingual Interpretation and ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC11433331/) - The AI-MIRACLE Study investigates the efficacy of using ChatGPT 4.0, a large language model (LLM), f...

11. [KaustubhPasalkar/Medical-Document-Automation-with-Google ...](https://github.com/KaustubhPasalkar/Medical-Document-Automation-with-Google-Cloud-Document-AI-BigQuery) - Streamline medical insurance claim processing with advanced AI techniques, reducing manual efforts a...

12. [Document AI](https://cloud.google.com/document-ai) - Document AI lets developers create high-accuracy processors to extract unstructured or structured da...

13. [Medical Text Processing with the Healthcare Natural Language API](https://cloud.google.com/blog/topics/healthcare-life-sciences/medical-text-processing-on-google-cloud) - Code samples and guidelines demonstrating how you can effectively implement processing of unstructur...

