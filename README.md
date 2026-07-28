# 屏基健檢中心 CAC 數位預約系統

CAC（Channel–Activity–Customer）是屏基健檢中心的 Firebase + LINE LIFF MVP。第一期提供民眾套餐選擇與預約，並讓健檢中心人員管理套餐、預約、當日清單與 D-1 LINE 通知。

## 目前功能

- 民眾端：套餐卡片與比較總表、中英文切換、依套餐通路自動歸類、LINE LIFF / 一般瀏覽器 Email 雙軌預約、我的預約/改期/取消、來檢須知與報到流水號。
- 套餐工具：套餐與價格編修、通路/部位標籤、可新增與停用檢查項目、備註與院碼的彈窗編修、中文報價單與 A4 檢查清單列印。
- 預約清單：日期區間與通路篩選、排序、預約詳情/編修、確認後產生報到序號、取消、CSV 匯入匯出、批次列印。
- 現場與通知：手機現場報到、指定日期停約、每日台北時間 09:00 的 D-1 LINE / Email 通知、客戶已讀回覆與人工補發。
- 權限：Google 員工登入；管理者可於後台新增 `staffUsers` Gmail 帳號。

## 專案結構

- `cac-liff-app/`：Vite + React 前端、Firestore 規則與 Firebase Functions。
- `cac-liff-app/functions/`：D-1 提醒、確認預約與報到序號的 Cloud Functions。
- `rich-menu-assets/`：LINE OA Rich Menu 素材。
- `agent_handoff.md`：目前可交接的系統狀態與風險。
- `docs/PROGRESS.md`：依日期累積的工作紀錄。

## 本機啟動

```powershell
cd cac-liff-app
npm install
npm run dev
```

開啟 `http://127.0.0.1:5173/`。本機瀏覽器跳過 LIFF 初始化；員工 Google 登入仍須將 `localhost` 與 `127.0.0.1` 加入 Firebase Authentication 的 Authorized domains。

驗證：

```powershell
npm test
npm run build
```

## 部署

Firebase 專案：`channel-activity-customer`  
Hosting：`https://channel-activity-customer.web.app`  
LIFF：`https://liff.line.me/2010725321-sRRkD0Le`

```powershell
cd cac-liff-app
npm run build
firebase deploy --only hosting --project channel-activity-customer
firebase deploy --only firestore:rules --project channel-activity-customer
firebase deploy --only functions --project channel-activity-customer
```

部署 Functions 前，需先安裝其相依套件並設定 LINE Messaging API token：

```powershell
cd functions
npm install
firebase functions:secrets:set LINE_CHANNEL_ACCESS_TOKEN --project channel-activity-customer
```

## 前端環境變數

建立 `cac-liff-app/.env.local`：

```dotenv
VITE_LIFF_ID=2010725321-sRRkD0Le
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=channel-activity-customer
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_STAFF_EMAILS=lhm0323@gmail.com
```

不要提交 `.env.local` 或 LINE access token。

## 已知問題與下一步

- 本機重建版尚未重新部署到 Hosting；須先完成民眾預約 modal 與套餐工具項目編修的驗收。
- Firestore 規則、Hosting、Functions 必須分別部署；僅部署 Hosting 不會更新停約或 D-1 後端行為。
- D-1 排程只通知「明日、已確認、已有報到序號、且有 LINE user ID」的預約；無回覆者仍由人工二線聯繫。
- 後續優先驗收：停約友善訊息、預約清單按鈕收斂、列印語系、檢查項目彈窗編修與欄寬。
## 2026-07-28 行動版後台

- 「預約清單」在手機與桌機皆使用完整管理介面；手機改為附欄位標示的雙欄卡片列，保留排序、勾選、確認、取消、提醒、列印與單筆詳情。
- 現場報到簡化頁已不再作為手機版預約清單的預設畫面。
- 本機原始碼保留作為版本控管、建置與部署來源；日常驗收使用正式網址，不再以 localhost 作業。
- Email 提醒暫緩：目前僅能排入 Firestore `mail` 佇列，尚未串接正式寄信服務。
## 2026-07-28 Mobile booking list

- Portrait phones (under 640px) use a compact booking-list layout: full date, customer, package, phone, channel, status, notice, amount, and actions remain available without repeated field labels.
- Landscape phones, tablets, and desktop keep the wider management layout.
- Acceptance target remains `https://channel-activity-customer.web.app`; local source is retained only for development and deployment.
## 2026-07-28 Package tool questionnaire settings

- The Package Tool keeps the package-name field readable on narrower desktop widths by allowing the settings row to wrap.
- Package questionnaire rules are loaded by their stored package name rather than the encoded Firestore document ID.
- Staff can select `無對應健康問卷`; the public and staff questionnaire actions then stop instead of silently falling back to a general questionnaire.
- The no-questionnaire option in Package Tool is displayed as 無.

## 2026-07-28 Rich Menu public routes

The public SPA now renders these LIFF deep-link views on both LIFF and direct web URLs: `prep`, `followup`, and `contact`. LINE login remains optional so a customer without LINE can book with an email contact address.