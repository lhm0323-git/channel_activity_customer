# Progress

本文件是可累積的日期紀錄；目前可接手狀態請見 [../agent_handoff.md](../agent_handoff.md)。

## 2026-07-24

### 今日完成

- 從 Git `1895ba5` 與 Hosting recovery artifacts 重建因意外清空而遺失的 `src/App.jsx` 工作面。
- 回復並擴充民眾套餐、預約、我的預約/改期/取消、套餐工具、預約清單、CSV、列印與員工帳號管理。
- 新增停約日期管理及民眾端預先檢查，避免 Firestore 拒絕直接顯示權限錯誤。
- 新增 `functions/`：確認預約配發報到流水號、每日台北時間 09:00 D-1 LINE 通知與 Email 備援、已讀確認與人工補發。
- 重構後台「預約清單」版面為 2 欄式設計（主區域最大化表格高度，右側側邊欄整合「停止預約日期」與「員工帳號管理」）。
- 補強非 LINE 身份預約之 Email 欄位必填與提示說明。
- 擴充 Cloud Functions 與前端提醒觸發：無 LINE ID 時轉為排入 Email 到檢提醒 (`d1NoticeChannel: EMAIL`)。
- 實現 LIFF 「我的預約／報到序號」開啟時自動載入，並以高亮看板直接呈現報到序號，無需重複點擊查詢。
- 新增健康問卷模組 `src/questionnaire.js` 與後台套餐問卷對應規則（`packageQuestionnaireRules`）。
- 新增民眾端「填寫/修改健康問卷」 Modal，支援依 `customerId` 自動預填帶入歷年填寫紀錄，加速問卷填寫。
- 新增「問卷內容三合一管理編輯器」Modal，支援：(1) 護理人員點選式表單設計器 (Form Builder)、(2) Excel / OCR 貼上快捷轉換、(3) JSON 高級模式，儲存至 Firestore `managedQuestionnaires`。
- 新增「A4 紙本健康問卷列印」功能，格式化屏基健檢中心抬頭、客戶資料、評估答覆與「受檢者/立同意書人簽名」與日期欄位。
- 新增前台「自費加選項目參考表 (`?view=addon-items`)」頁面，支援 11 大熱門加選分類預設公開展示、手機端滾動凍結頂端列 (Sticky Header)、分類標籤切換、關鍵字即時搜尋與欄位標頭排序 (分類/名稱/單價)。
- 新增後台「管理前台公開加選分類」Modal，允許醫護人員動態勾選欲在前台向民眾公開的檢查分類，設定即時儲存至 Firestore `settings/publicAddonCategories`。
- 回復檢查項目管理，將院碼/委外/備註集中到黃色備註彈窗；改善套餐工具固定欄寬。
- 更新 README 與 agent handoff，使部署、環境變數、已知風險與下一步可由 GitHub 直接接手。

### 重要檔案

- `cac-liff-app/src/App.jsx`：UI、預約與管理工作流。
- `cac-liff-app/src/core.js`、`src/core.test.js`：套餐解析、通路對應與純邏輯測試。
- `cac-liff-app/src/firebase.js`、`firestore.rules`：Firestore 存取、停約與後台資料。
- `cac-liff-app/functions/index.js`：LINE D-1 與報到流水號後端。
- `cac-liff-app/firebase.json`：Hosting、Firestore、Functions 部署設定。

### 決策

- 通路由套餐的 audience tag 決定，民眾不自行選通路。
- 報到採「日期 + 流水號」，不以 QR 掃描作為主要報到依賴。
- 日期停約原因僅供後台參考，民眾端只顯示「此日期暫停預約」。
- 不提交 Hosting 擷取 artifacts、暫存驗證腳本與使用者提供 PDF。

### 待驗收 / 阻塞

- 本機重建版尚未部署到 Hosting，需先驗收 UI。
- Functions 需確認 Cloud Scheduler、secret 與 LINE Messaging API token 的實際生產發送。
- 停約功能與民眾預約 modal 必須用非管理者 LINE 帳號測試。

### 下次接手先看

1. `agent_handoff.md`
2. `cac-liff-app/src/App.jsx`
3. `cac-liff-app/functions/index.js`
4. `firestore.rules`
## 2026-07-28

### 完成
- 移除手機版預約清單自動切換為現場報到簡化畫面的分流。
- 手機版改用完整預約清單，保留篩選、排序、批次列印、CSV、單筆編輯、確認、取消、提醒與列印操作。
- 停約日期與員工帳號管理在手機改為清單後方區塊，避免壓縮首屏清單空間。

### 重要檔案
- `cac-liff-app/src/App.jsx`

### 驗證
- `npm test` 通過。
- `npm run build` 通過。

### 目前狀態
- 只需部署 Hosting。
- Email 通知功能依使用者決策暫緩，待院方決定 SMTP 或核准的交易型寄信服務。
## 2026-07-28 - Portrait booking list density

### Completed
- Reworked the staff booking list for narrow portrait phones without changing tablet or desktop behavior.
- Date filters now use the full available cell width; booking rows suppress repeated labels and use a compact three-column grid.

### Files
- `cac-liff-app/src/App.jsx`

### Verification
- `npm test` passed.
- `npm run build` passed. The existing Vite chunk-size warning remains.

### Next
- Validate the deployed list on a real portrait phone and adjust only if the clinic requires larger tap targets.
## 2026-07-28 - Package tool name and questionnaire mapping

### Completed
- Fixed the Package Tool layout so the package name has a usable minimum width.
- Added an explicit no-questionnaire option and preserved it in `packageQuestionnaireRules`.
- Fixed questionnaire-rule loading to use each document's `packageName`, restoring correct mappings for existing packages.
- Added `docs/CAC_ARCHITECTURE.md` with readable Chinese CAC architecture diagrams.

### Files
- `cac-liff-app/src/App.jsx`
- `cac-liff-app/src/firebase.js`
- `docs/CAC_ARCHITECTURE.md`

### Verification
- `npm test` passed.
- `npm run build` passed; existing Vite chunk-size warning remains.
- Corrected the Package Tool no-questionnaire option label to 無; production build passed.

## 2026-07-28 - Rich Menu public route rendering

### Completed
- Connected the existing public `prep`, `followup`, and `contact` panels to the URL view router.
- Preserved `my-bookings` and `checkin` behavior, including optional LINE login and email fallback.

### Files
- `cac-liff-app/src/App.jsx`

### Verification
- `npm test` passed.
- `npm run build` passed; existing Vite chunk-size warning remains.

### Acceptance URLs
- `https://channel-activity-customer.web.app/?view=prep`
- `https://channel-activity-customer.web.app/?view=followup`
- `https://channel-activity-customer.web.app/?view=contact`
## 2026-07-28 - LIFF booking recovery and personalised preparation

### Completed
- Diagnosed My Bookings regression: queries used Firebase anonymous `ownerUid`, so an existing LINE booking was unavailable after a changed browser/session.
- Added `claimMyLineBookings`: the callable Function validates the LIFF access token against LINE Profile API, finds only matching `lineUserId` bookings, and assigns them to the caller's Firebase session.
- Added the LIFF access token to in-memory profile state only; it is not stored in Firestore or local storage.
- Reconnected `?view=prep` to the customer's active bookings, with base instructions plus package-specific warnings from `getVisitInstructions`.

### Files
- `cac-liff-app/src/liff.js`
- `cac-liff-app/src/firebase.js`
- `cac-liff-app/src/App.jsx`
- `cac-liff-app/src/core.js`
- `cac-liff-app/src/core.test.js`
- `cac-liff-app/functions/index.js`

### Verification
- `npm test` passed.
- `npm run build` passed; existing Vite chunk-size warning remains.
- `node --check functions/index.js` passed.

### Deployment
- Deploy Functions and Hosting together: `firebase deploy --only functions,hosting --project channel-activity-customer`.
## 2026-07-28 - Customer LINE binding and upcoming visit views

### Completed
- My Bookings and Visit Instructions now show only non-cancelled bookings scheduled for today or later in Asia/Taipei.
- Visit Instructions keeps the package-specific preparation list and now shows the large check-in serial for every booking.
- Desktop customers can choose Connect LINE before booking; email remains the fallback when LINE is unavailable.
- Staff-created bookings deliberately omit the staff LINE identity. After saving, staff receive a one-time LIFF link to pass to the customer; opening it in the customer's LINE account securely binds that booking for My Bookings and LINE D-1 reminders.

### Files
- `cac-liff-app/src/App.jsx`
- `cac-liff-app/src/core.js`
- `cac-liff-app/src/core.test.js`
- `cac-liff-app/src/liff.js`
- `cac-liff-app/src/firebase.js`
- `cac-liff-app/functions/index.js`

### Verification
- `npm test` passed.
- `npm run build` passed. Existing Vite chunk-size warning remains.
- `node --check functions/index.js` passed.

### Deployment
- Deploy Functions and Hosting together: `firebase deploy --only functions,hosting --project channel-activity-customer`.
Deployment completed on 2026-07-28: Functions and Hosting released successfully to `https://channel-activity-customer.web.app`.
## 2026-07-28 - Public header shortcuts

- Consolidated the public navigation into the first header row and removed the former second navigation strip.
- Added browser shortcuts matching the six LINE Rich Menu destinations: packages, my bookings, visit instructions, add-on items, report follow-up, and contact/directions.
- Added a prominent Connect LINE action when no LINE identity is available. Browser shortcuts use the same SPA routes as LIFF, so desktop acceptance stays in the web app.
- Verified with `npm test` and `npm run build`; Hosting deployed successfully.
## 2026-07-28 - Responsive public shortcut layout

- Removed the visible LINE status sentence below the application title to preserve header space.
- On phones, the six public shortcuts now use a fixed three-column, two-row grid. The optional Connect LINE action occupies a full third row, avoiding horizontal scrolling.
- On desktop, shortcuts remain in one compact first-row strip.
- Verified with `npm test` and `npm run build`; Hosting deployed successfully.
## 2026-07-28 - Mobile package tool list

### Completed
- Fixed the staff package tool on phones: active package rows retain the available scroll area instead of being collapsed by the deleted-package panel.
- Deleted-package restore remains a desktop-only management action.

### Files
- `cac-liff-app/src/App.jsx`

### Verification
- `npm test` passed.
- `npm run build` passed; existing Vite chunk-size warning remains.

### Next
- Verify in a real phone LIFF session that the active list scrolls through all current packages.
## 2026-07-28 - Mobile LIFF header

- The duplicate in-app title is hidden below the desktop breakpoint because LINE already supplies the LIFF top title on phones. Desktop browser pages retain the app title.
## 2026-07-28 - P0 security staging branch

- Branch: `security-p0-staging`; production project `channel-activity-customer` has not been changed.
- Staging Firebase project: `cac-health-staging` in `asia-east1`; staging web app configuration is local-only in `cac-liff-app/.env.staging` and is intentionally ignored by Git.
- Public writes for `bookings`, `customers`, `checklists`, booking-change requests, and questionnaire responses now route through authenticated Cloud Functions. The function validates input, verifies any submitted LINE access token server-side, assigns `ownerUid` server-side, checks blocked dates, and creates the checklist transactionally.
- Active staff retain direct Firestore editing. Disabled `staffUsers` (`active: false`) are denied by both Firestore Rules and callable staff checks.
- Questionnaire print output now HTML-escapes customer, schema, question, and answer values.
- Added `npm run test:rules` using the official Firebase Rules test helper. It requires a local JDK because the Firestore Emulator uses Java.
- Verification completed: `node --check functions/index.js`, `npm test` (32 checks including print XSS), and `npm run build`.
- Staging deployment is blocked only by Firebase: `cac-health-staging` must be upgraded to Blaze before Cloud Build/Artifact Registry can deploy Gen2 Functions. Do not deploy this branch to production until staging Functions and end-to-end booking flows pass.
## 2026-07-28 - P0 local verification complete

- Staging Firestore rules deployed to `cac-health-staging` (asia-east1).
- Passed: `npm test`, `npm run test:rules`, `npm run test:functions`, `node --check functions/index.js`, and `npm run build`.
- Functions test proves anonymous public booking, questionnaire response, change request, and cancellation continue to work while a direct booking overwrite is denied.
- Staging Functions/Hosting deployment remains blocked until `cac-health-staging` is upgraded to Blaze. Production remains unchanged.
- Next: enable Blaze and Auth providers in staging, deploy Functions + Hosting, then perform browser acceptance before any production deployment.

## 2026-07-28 - Staging Hosting deployed

- Isolated frontend deployed: https://cac-health-staging.web.app
- Built with `.env.staging`; `VITE_LIFF_ID` is intentionally empty, so this staging site cannot use the production LIFF channel.
- Firestore Rules are deployed. Functions remain pending until the staging Firebase project is upgraded to Blaze.
