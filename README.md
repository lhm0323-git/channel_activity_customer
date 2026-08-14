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
## 2026-07-29 Staging Phase 1/2

- 驗收環境：`https://cac-health-staging.web.app`；production `channel-activity-customer` 未變更。
- Phase 1：角色/停用員工、LINE 綁定、報告狀態與預約操作稽核皆已部署 staging。管理者可在「稽核紀錄」查看確認、取消、提醒、後台編修的操作者、時間與欄位摘要。
- Phase 2：套餐可設定民眾公開、僅內部、邀請制；邀請制可設定到期日並產生預約連結與 QR。公開找方案會列出未來 30 日停約日。
- 驗收與部署必須同時使用 `functions`、`firestore:rules`、`hosting`；不可只部署 Hosting。Email 寄送服務與 PITR 仍延後。

- 2026-07-29 修復：公共套餐頁需匯入 `listPublicManagedPackages`、邀請產生與撤銷 wrapper；staging Hosting 已更新。

- 公開「找方案」中文標題為「選擇需要的健檢方案」；有停約日才顯示「未來30日內停約日為：」。

- Staging acceptance data: `STAGING-Test-01` to `STAGING-Test-06` are safe-to-delete records dated 2026-08-04 through 2026-08-09.
## 2026-07-30 - 稽核紀錄精簡

- 新增稽核只保留「時間、動作、對應預約、操作者」；不再寫入欄位差異、前後值、客戶個資或備註。
- 僅保留人工可追溯操作：後台確認、取消、編修、改期核准與人工提醒；建立預約、排程 D-1 通知與現場報到不再新增紀錄。
- 管理者仍可由稽核列點開對應預約；既有舊稽核資料不回寫或刪除。PITR/TTL 保留至正式營運前另行決定。
- 2026-07-30 staging deployed: Functions updated and Hosting version `c8ab09c932a90d38` released to `https://cac-health-staging.web.app`; production remains unchanged.

## Production Deployment - 2026-08-10

- Production Hosting: `https://channel-activity-customer.web.app`
- Firebase project: `channel-activity-customer`
- Source release: `security-p0-staging` commit `40faa1e`
- Verified: core test suite passed, production build passed, and Hosting returned HTTP 200.
- Deployment updated Hosting and Firestore Rules. Firebase detected that the deployed Functions source was unchanged. Existing Firestore package, booking, customer, questionnaire, and staff data was not overwritten.

## Booking list ordering - 2026-08-10

- The staff booking list now defaults to appointment date ascending. Firestore range queries were verified to return the 2026-08-03 booking for both `2026-07-01..2026-08-10` and `2026-08-01..2026-08-10`; the earlier confusion was presentation order, not missing data.

## Known issue - 2026-08-10

- Staff booking edits are currently blocked before reaching application code because the Gen2 callable endpoint `updateBookingAsStaff` rejects browser CORS preflight requests. The required remediation is an explicit public callable invoker for this endpoint while retaining its existing `assertStaff` authorization. This IAM change is pending explicit approval.

## Staff booking edit access - 2026-08-10

- `updateBookingAsStaff` is configured as a public Firebase callable endpoint so browser CORS preflight can reach the function.
- The Cloud Run service is set to allow public access. Data authorization remains unchanged: `assertStaff(request)` still requires an authenticated, active staff or administrator account before any booking update is processed.
- Verified from the production origin: the callable `OPTIONS` preflight returns HTTP 204 and permits `POST`.


## 2026-08-10 CSV booking import compatibility

- Exported booking CSV now uses the concise headers `id` and `date`.
- Import remains backward-compatible with `idNumber` and `appointmentDate`, tolerates a UTF-8 BOM and header case differences, and treats a blank `status` as `BOOKED`.
- Staff CSV imports preserve valid statuses including `CONFIRMED`, `RESCHEDULED`, and `CANCELLED` instead of silently changing them to `BOOKED`.
- Verified against `bookings-2026-08-01-2026-08-11.csv`, unit tests, production build, Hosting release, and the production `createBooking` Function deployment.


## 2026-08-10 Excel CSV import compatibility

- CSV import now decodes UTF-8 first and falls back to Big5/CP950 when replacement characters are detected, preserving Traditional Chinese package names from legacy Excel CSV exports.
- Import normalizes `YYYY/M/D` and `YYYY-MM-DD` dates to `YYYY-MM-DD` before validation.
- Verified with `C:/Users/xray/Documents/1.csv`: all rows retained their Chinese package names and normalized to `2026-08-12`.
- Production Hosting release completed after unit tests and Vite build passed.


## 2026-08-10 CSV import diagnostics

- Staff booking import now shows a persistent per-row result panel beneath the import controls.
- Each row records success or the exact failure: missing name/phone/date/package, package not found, or the Firebase error returned while creating the booking.
- The panel remains visible after the booking list refresh, so the summary is no longer overwritten by the load status.
- Production Hosting deployment completed after unit tests and Vite build passed.

## 2026-08-10 - CSV staff import authentication

- CSV import is a staff operation. Before each row is submitted, the app refreshes the current Firebase Auth token so the callable receives the current Google staff identity.
- Imported customers may leave Email blank; Email remains required only for self-service bookings that have neither a connected LINE identity nor an Email contact.
- If the browser session is anonymous or stale, the UI now asks the operator to sign out and use Staff Login again rather than reporting the misleading customer Email validation error.

## 2026-08-10 - Server-enforced CSV staff import

- CSV rows are now marked as staff imports. The Create Booking Cloud Function runs assertStaff before accepting an import with blank Email or LINE ID.
- This keeps the public booking rule unchanged: a self-service booking without LINE still requires a valid Email.

## 2026-08-10 - CSV import Email validation correction

- Corrected createBooking so the Email requirement applies only to non-staff self-service bookings without a LINE identity. Verified staff CSV imports may omit both Email and LINE ID.

### CSV import regression coverage

- The Functions emulator test creates an active staff account and proves that a STAFF_CSV booking with blank customer Email and LINE ID is accepted. This prevents the public no-LINE Email requirement from regressing into the staff CSV workflow.

## 2026-08-11 Staff CSV imports without contact details

- The browser-side `buildBookingPayload` check now accepts blank LINE ID and Email only when the authenticated staff CSV import path explicitly passes `allowMissingContact: true`.
- Public self-service bookings are unchanged: without a LINE identity they must still provide Email.
- A contactless staff import is stored with `notificationChannel: NONE`, so it is not misrepresented as an Email reminder target.
- Production deployment: Hosting release `ec574d5a0f337fcb`; Cloud Function `createBooking` revision `createbooking-00005-taz`.

## Gmail booking-link email

Staff-created single bookings with a customer Email and no customer LINE identity can now send the customer a booking-link email automatically. Administrators configure the dedicated sender from the `預約清單` tab; credentials are encrypted at rest with the Firebase secret `MAILER_ENCRYPTION_KEY` and are never committed to Git.

Required one-time administrator action:

1. In `預約清單`, enter the Google OAuth Client ID, the newly rotated Client Secret, and `ptch.health@gmail.com`, then save.
2. Select `連結 Gmail`, sign in as `ptch.health@gmail.com`, and grant Gmail send permission.
3. The OAuth client must list this exact redirect URI: `https://us-central1-channel-activity-customer.cloudfunctions.net/connectMailerCallback`.

The mail contains only the package, appointment date, and a short-lived customer LINE-link URL. It does not include ID/passport number, telephone, or questionnaire data. A staff user can resend the link for a booking that still has no customer LINE identity.

Known operational constraint: Google OAuth apps using the sensitive `gmail.send` scope may issue refresh tokens that expire after seven days while the OAuth consent screen remains in Testing. Publish/verify the OAuth app before relying on this for routine production mail.
## Staff booking-list contact status

The `預約清單` column `聯絡／綁定` combines the stored telephone number with a concise system-derived contact state: `LINE 已綁定`, `Email 已登記`, `待受檢者連結`, or `待人工聯繫`. The adjacent notification column reports `已回覆`, `已發送`, `尚未通知`, `待人工聯繫`, or `發送失敗`. These labels do not add or migrate booking fields.

## Returning customer prefill

When a customer opens a package from LIFF with a previously linked LINE identity, CAC verifies the LINE access token through a callable Function and pre-fills the saved name, phone, and Email. CAC stores and displays only a masked ID/passport number; it never supports ID-number-only lookup. Browser/Email-only and staff proxy bookings continue to use manual entry.

## Medical record number

Staff can enter and update a booking's medical record number in the booking-detail modal. It appears immediately after the customer name in the staff booking list and is protected by staff authorization.


## Latest Update

- 2026-08-11: The admin audit-log tab now loads the latest 100 records, supports loading older pages, and filters loaded records by booking customer name, medical record number, package, or appointment date. Selecting a result opens its linked booking detail.
## Latest Update

- 2026-08-12: The LIFF booking modal scrolls within short mobile screens. Cancelling a LINE-linked booking sends a best-effort LINE cancellation message. The staff booking list now defaults to active bookings; use the Show filter to view cancelled records or all records.
## Latest Update - 2026-08-12 Booking-scoped questionnaire correction

- Staff booking detail now loads the questionnaire response for that exact booking. Authorized staff can correct and save answers, then print the corrected A4 form for customer signature. Questionnaire answers are not copied into audit logs.
- National Health Administration preventive-care eligibility lookup is not active yet. Its planned boundary is an authenticated staff Cloud Function that forwards a one-time ID lookup to the hospital API without persisting or logging the full ID.

## Latest Update - 2026-08-12 Questionnaire field carry-forward

- Returning customers can reuse selected answers across bookings. Each questionnaire question now has a staff-managed `carryForward` setting in the visual questionnaire designer.
- Built-in questionnaires carry forward stable history fields such as disease history, allergies, family history, education, identity category, genetic history, and rubella vaccination. Current medication, recent symptoms, lifestyle behavior, mental-health screening, and pregnancy plans remain blank for each new booking.
- Reopening the same booking still loads every saved answer. New custom questions and imported questions default to not carrying forward.
- Production Hosting version: `2519d7c7722ff1e5`.

## Current operational update

- Booking List supports contextual multi-select actions: Confirm, Reminder, Print, and Cancel. The action strip appears only after one or more bookings are selected; click a row to edit its details.
- Booking List selection controls use 20px checkboxes. The final column shows preventive-care lookup readiness; it is prepared for future authorized National Health Administration eligibility results without exposing full identifiers.
## Enterprise group booking claims

For CSV-imported enterprise rosters, select the imported bookings in `預約清單` and use `連結 QR` to print one QR per employee. The QR has a random, single-use claim token only; the employee opens it in LINE to link the booking. `寄連結信` sends the same token-only linking URL to selected email-only, LINE-unlinked bookings. Claim links expire two calendar days before the appointment. Do not send QR sheets through unrestricted public channels.
## 2026-08-14 - Enterprise claim workflow deployed

- Production deployment completed: Firebase Hosting release `06ecf9db5850b738`, Firestore Rules, and `exportBookingClaimsAsStaff` Function revision `exportbookingclaimsasstaff-00002-zup`.
- The export Callable has `allUsers -> roles/run.invoker` only at its Cloud Run ingress so Firebase callable requests can reach the handler. It continues to call `assertStaff`; an anonymous protocol probe returns HTTP 401 and no claim data.
- `bookingClaims` remains fully denied to client Firestore access. New QR and email links contain only a random one-time token, with expiry two calendar days before the appointment.
- Acceptance: select active unlinked enterprise rows in Booking List, use `連結 QR` to print a staff-only sheet, scan one QR in LINE, then verify the token cannot be reused. Select an email-only unlinked row and use `寄連結信`.
## 2026-08-14 - Enterprise link terminology

- Renamed staff-facing enterprise claim wording to `寄連結信` and `連結 QR`; printed QR sheets and status messages now use the same wording. Internal token and collection names remain unchanged for backward compatibility.
- Production terminology release: Firebase Hosting version `f3e8e99658f53a35` on 2026-08-14.

## 2026-08-14 - Booking link email deliverability

- Production now sends the enterprise booking-link email as `multipart/alternative`: a readable plain-text fallback plus a simple HTML version with the clinic name, booking package, appointment date, link expiry, contact phone, address, and a single LINE-link button. Dynamic booking values are HTML-escaped.
- The subject is now `屏基健檢中心｜<日期> 健檢預約確認`; the sender remains the configured Gmail account. The message contains no ID/passport number, phone number, questionnaire data, Firestore document ID, or QR attachment.
- `寄連結信` sends selected Email-only, LINE-unlinked bookings sequentially with a 1.2-second interval and shows `第 n/總數` progress. This reduces identical burst traffic but Gmail acceptance does not guarantee inbox placement.
- Production deployment: Functions `createBooking`, `sendBookingClaimEmailAsStaff`, and `cancelBooking` updated successfully; Hosting release `c6bac4b76ed5539f`.
- Verification: `node --check functions/index.js`; 36 `npm test` checks; production `npm run build`; Firebase Functions and Hosting deploy succeeded.
- Acceptance: send to several staff-controlled inboxes, verify subject/body/button, then mark a legitimate message as `非垃圾郵件` if Gmail classifies it incorrectly. Long-term deliverability requires an authenticated hospital-owned sending domain with SPF/DKIM/DMARC; do not treat the temporary `@gmail.com` sender as a guaranteed production delivery channel.
- Local CLI note: on this workstation Firebase Functions HTTP discovery fails with local `fetch failed`. Deploy Functions with `$env:FIREBASE_FUNCTIONS_DISCOVERY_OUTPUT_PATH='true'; firebase deploy --only functions:<name> --project channel-activity-customer` to use manifest-file discovery. This is a workstation CLI workaround, not a runtime setting.