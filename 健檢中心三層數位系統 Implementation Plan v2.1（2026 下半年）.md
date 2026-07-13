# 健檢中心三層數位系統 Implementation Plan v2.1（2026 下半年）

> 範圍：健檢中心 CAC（Channel-Activity-Customer）第一輪 MVP。先交付可部署的 LIFF 預約與可列印當日清單；不碰 HIS API、不做 AI 翻譯、不做即時排號。

## 1. 執行摘要

第一輪只做兩件事：

| 優先序 | 模組 | 交付成果 |
|---|---|---|
| P1 | LINE OA + LIFF 預約建檔 + D-1 通知 | 客戶可在 LINE 內選套餐、送出預約，資料寫入 Firestore |
| P3 | 個人化當日檢查清單 | 從 booking 的 selectedItems 產生 A4 HTML 清單，可單張或批次列印 |

P2 Channel 排號分流與 P4 AI 報告中文轉譯延後。這兩者都需要更明確的現場流程與資料來源，現在做會把 MVP 做大。

核心原則：第一期不強求 HIS 串接，用 Firestore + CSV/Google Sheets 匯出當緩衝層，先驗證護理與健管流程是否真的省時。

## 2. CAC 對應

| 層 | 第一輪定義 | MVP 作用 |
|---|---|---|
| Channel | HIGH_END / CORPORATE / LABOR / GENERAL | 預約時必填，供通知文字與清單分類使用 |
| Activity | 每一筆健檢 booking | 保存日期、套餐、項目、價格、狀態 |
| Customer | LINE UID + 姓名/電話/身分識別遮罩 | 支援同一人後續查詢與再次預約 |

Customer 先當索引，不做完整 CRM。歷史異常追蹤、個人化問卷、跨次報告比較全部延後。

## 3. P1 實作

沿用 `套餐code.txt` 舊 React app 的核心，不重寫：

- `INITIAL_CSV_DATA`
- CSV parser
- 套餐欄位展開為 item id
- `selectedItems`
- 折扣門檻與手動 final price
- 現有報價單列印

新增最小 LIFF 預約流程：

1. LIFF 初始化取得 `lineUserId` 與 display name；未設定 `VITE_LIFF_ID` 時使用一般瀏覽器模式。
2. 外部民眾在「民眾方案」畫面依身分別、性別、檢查部位篩選套餐；不顯示單項加選與折扣計價器。企業團檢/勞工套餐先不進民眾版；8000馬年以上歸高階，其餘歸一般；方案亮點排除一般檢查、體脂肪、醫師理學、眼壓、尿液、CBC、肝膽、腎功能、胸部X光等基礎項目，優先凸顯高單價檢查類別；同類別多項如腫瘤標記、超音波、CT/CTA 需彙整成摘要，不逐項列出，也不顯示單項價格。
3. 點「選擇此方案並預約」後填：姓名、生日/身分識別、電話、Channel、希望日期、備註。內部人員可切到「內部工具」使用完整套餐/單項/計價功能。
4. 寫入 Firestore：`customers`、`bookings`。
5. 同步產生 `checklists/{bookingId}`。
6. 未設定 Firebase 時暫存 localStorage，方便本機展示。

Firestore 最小 schema：

```text
customers/{customerId}
  name, phone, lineUserId, idNumberMasked, createdAt, updatedAt

bookings/{bookingId}
  customerId, lineUserId, lineDisplayName, channel, appointmentDate,
  packageName, selectedItems, listPrice, discountRate, finalPrice,
  status, notes, createdAt, updatedAt

checklists/{bookingId}
  bookingId, stationGroups, warnings, outsourceItems, generatedAt, printedAt
```

D-1 通知在下一個實作切片補 Cloud Scheduler + Messaging API。此版先把預約資料結構固定，避免先寫通知再改 schema。

## 4. P3 實作

清單不先做 PDF server，直接用瀏覽器 A4 HTML print view：

- 用 `selectedItems.category` 對應站別。
- 同站項目合併顯示。
- `remark` 進注意事項。
- `outsource` 進外檢/後送區。
- 後台用日期讀取 booking，支援單張列印與批次列印。

第一版站別規則寫在 `src/core.js` 的 `STATION_MAP`。現場若調整站別，只改這張表。

## 5. 已建立的程式交付

路徑：`Channel–Activity–Customer/cac-liff-app/`

| 檔案 | 作用 |
|---|---|
| `src/App.jsx` | 原套餐 UI，加預約 modal 與當日清單後台 |
| `src/core.js` | CSV、計價、booking payload、checklist 純邏輯 |
| `src/firebase.js` | Firestore 寫入/查詢，未設定 Firebase 時用 localStorage |
| `src/liff.js` | LIFF 初始化 |
| `src/core.test.js` | CSV、計價、booking、checklist 測試 |

本機啟動：

```bash
cd Channel–Activity–Customer/cac-liff-app
npm install
npm run dev
```

測試：

```bash
npm test
```

## 6. 驗收條件

P1：

- 客戶可選套餐、加選項目、手動調整 final price。
- Booking 必填欄位不足時不能送出。
- 寫入的 `selectedItems` 保留 `id/name/enName/code/category/price/remark/outsource`。
- 未設定 Firebase 時可用 localStorage 展示流程。

P3：

- 後台可依日期讀取 booking。
- 單張與批次 A4 清單可列印。
- 同站合併、注意事項、外檢區正確顯示。
- 姓名、套餐、院碼、項目名稱不被表格截斷。

## 7. 延後項目

| 模組 | 延後原因 | 重新啟動條件 |
|---|---|---|
| P2 Channel 排號 | 需要現場站別容量與報到流程資料 | P1/P3 跑出至少 2 週真實 booking 資料 |
| P4 AI 報告翻譯 | 涉醫療複核與個資治理，風險高 | 有固定報告來源、複核責任人與去識別流程 |
| HIS API | 資訊室配合成本高 | Firestore/CSV MVP 證明節省工時後再談 |
| AI 推薦/agent | 現階段不是痛點主路徑 | 預約資料累積後再評估 |

## 8. 下一個實作切片

1. 在 Firebase 建 project，設定 `.env.local`。
2. 部署 Hosting，建立 LINE Login channel 與 LIFF app。
3. 加 Cloud Function：D-1 查明日 bookings，送 LINE Push Message。
4. 加一個 Google Sheets/CSV export，給健管師保留過渡流程。



