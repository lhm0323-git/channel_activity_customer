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
## 2026-07-28 LIFF booking recovery and personalised preparation

- Opening `?view=my-bookings`, `?view=checkin`, or `?view=prep` inside LIFF now verifies the current LINE access token through a Cloud Function, then reclaims only bookings with that matching `lineUserId` for the current Firebase session.
- `?view=prep` shows fixed general preparation instructions plus only the warnings that match the booking's selected examination items. The check-in serial remains on the check-in view.
- Direct web access without LINE identity remains restricted to bookings created in that same browser session; it does not expose LINE bookings.
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

- The staff package tool now prioritizes active packages on phones. The deleted-package recovery panel remains available on desktop and no longer consumes the fixed mobile package-list height.
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

## 2026-07-28 - Staging isolation verification

- Read-only HTTP verification confirmed `https://cac-health-staging.web.app` serves a bundle configured for Firebase project `cac-health-staging`, not `channel-activity-customer`.

## 2026-07-28 - Staging Functions deployed

- Blaze deployment completed for the isolated project: 10 Cloud Functions, Firestore Rules, Hosting, and the 09:00 Asia/Taipei scheduler are live.
- Staging LINE secret is deliberately a non-production placeholder; it cannot send LINE messages.
- Artifact Registry cleanup deletes staging function images older than one day.
- Live `createBooking` returned HTTP 401 `UNAUTHENTICATED` to an unauthenticated request, confirming the public write boundary is enforced.
- Remaining external setup: Firebase Authentication has not been initialized in staging (`CONFIGURATION_NOT_FOUND`). Enable Anonymous and Google sign-in before browser acceptance.

## 2026-07-28 - Live staging P0 acceptance

- Firebase Authentication staging setup verified: Anonymous sign-in succeeds.
- Live staging acceptance passed with a timestamped test booking: callable create, owner read, direct Firestore overwrite denial, questionnaire response, reschedule request, and cancellation.
- Test booking was cancelled at the end; booking id recorded in terminal evidence only.
- `firebase functions:list` confirms the deployed Gen2 functions are ACTIVE. The Compute API lookup warning is non-blocking because Firebase Scheduler successfully created the job using the fallback compute service account.
- Remaining acceptance: interactive Google staff login in staging and staff UI edit/disabled-user denial, which cannot be automated without an interactive Google account session.

## P0 安全修補驗收環境

正式環境目前維持不變。P0 修補在隔離的 staging Firebase 專案驗收：`https://cac-health-staging.web.app`。

- Staging 已啟用 Anonymous 與 Google Authentication，且 Function、Rules、Hosting 已部署。
- 民眾建立/取消/改期預約與問卷寫入均改由 Callable Cloud Functions 執行；Firestore Rules 不接受民眾直接覆寫預約或問卷。
- 員工 UI 權限讀取 Firestore `staffUsers/{email}.active`；`lhm0323@gmail.com` 是 bootstrap 管理者。
- Staging 的 LINE token 是刻意無效的 placeholder，不能對真實客戶發送訊息。
- 正式部署前仍須完成 staging 的 Google 員工登入、建立非管理者員工、停用後拒絕存取的互動驗收。
- Staging 管理者可於「預約清單」的員工帳號區，對非管理者 Gmail 點選「停用」或「啟用」。停用者下次登入即無法進入後台。

## 2026-07-29 - Report status staging MVP

- Added a separate staff `報告管理` tab. The booking list and booking-edit modal no longer contain report status or care-manager notes.
- Staff can set `處理中` / `已完成，請至中心領取` / `已寄發` / `請個管師聯繫`, plus an internal care-manager note. The LIFF `報告追蹤` view exposes only the customer-visible status for that owner; it never exposes the note or a report file.
- The Phase 1-3 implementation plan now defers PITR, backups, and final report file storage to Phase 3 after real bookings begin. No PITR or scheduled backup cost is enabled during trial.
- Verified: `npm test`, `npm run build -- --mode staging`, and Hosting deployment to `https://cac-health-staging.web.app`.
- Production `channel-activity-customer` remains unchanged. Next: staff acceptance in staging, then decide whether to promote the P0 and report-status changes to production.