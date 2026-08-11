# Agent Handoff

這份文件是「目前狀態」；每日歷程請讀 [docs/PROGRESS.md](docs/PROGRESS.md)，完整操作說明請讀 [README.md](README.md)。兩者必須隨每次有意義的 commit 一起更新。

## 專案與環境

- Repo：`https://github.com/lhm0323-git/channel_activity_customer`
- Local root：`D:\Users\xray\.gemini\antigravity\scratch\Channel–Activity–Customer`
- App：`cac-liff-app/`
- Hosting：`https://channel-activity-customer.web.app`
- Firebase project：`channel-activity-customer`，Firestore `(default)` / `asia-east1`
- LIFF：`2010725321-sRRkD0Le`

## 2026-07-24 目前狀態

本機原始碼已從 7/23 的意外清空事件重建，並比目前 Hosting 多出以下尚未部署的功能：

- 民眾預約從套餐的 audience tag 自動帶入通路，不讓民眾選通路；新增必填的身分證/護照號碼與說明。
- 套餐工具可保存/停用檢查項目；院碼、委外與黃色備註改由備註彈窗編修。
- 停約日期由 Firestore `bookingBlockedDates` 管理；民眾端應先顯示「此日期暫停預約」，避免把規則拒絕誤解為系統錯誤。
- 後台「預約清單」重構為 2 欄式設計（主區域極大化預約表格顯示行數；右側側邊欄收納「停止預約日期」與「員工帳號管理」）。
- 支援一般瀏覽器（非 LINE LIFF）：未登入 LINE 時可以 Email 預約（Email 為必填），系統自動切換至 Email 到檢提醒。
- Functions 已新增：確認預約後依日期配發 `MMDD-流水號`、每日台北時間 09:00 D-1 LINE / Email 提醒、客戶已讀回覆與人員補發。
- LIFF 自動載入：「我的預約」與「報到序號」連結進入頁面即自動載入資料，報到序號以深藍金字高亮看板呈現，無需二次點擊。
- 健康問卷預填系統：建立問卷模組 (`src/questionnaire.js`)，支援後台套餐綁定問卷規則 (`packageQuestionnaireRules`)，並可依 `customerId` 自動預填帶入歷史問卷答案。
- 中文列印不列院碼/英文名稱，改列檢查意義；英文 UI 則列英文名稱。

## 已驗證

```powershell
cd cac-liff-app
npm test
npm run build
```

以上皆應通過。請先用本機驗收，不要在未獲明確同意下覆寫 Hosting。

## 部署順序

```powershell
cd cac-liff-app
firebase deploy --only firestore:rules --project channel-activity-customer
firebase deploy --only functions --project channel-activity-customer
npm run build
firebase deploy --only hosting --project channel-activity-customer
```

Functions 首次部署前：`cd functions; npm install`，並設定 `LINE_CHANNEL_ACCESS_TOKEN` secret。不要將 token 寫入 repo。

## 主要資料與權限

- `bookings`、`customers`、`checklists`：預約與清單。
- `managedPackages`、`managedItems`：人員可維護的套餐與檢查項目。
- `bookingBlockedDates`：指定日期停止預約。
- `staffUsers/{lowercase Gmail}`：後台人員白名單。管理者 `lhm0323@gmail.com` 可由預約清單 UI 新增。
- `bookingChangeRequests`：民眾改期申請。

## 下一位 agent 先做

1. 以不同 LINE 帳號測試停約日期，確認只呈現「此日期暫停預約」。
2. 驗收民眾預約 modal、檢查項目備註彈窗與表格欄寬後，再依使用者明確同意部署。
3. 以一筆「明日、已確認、有 LINE user ID」預約驗證排程/補發提醒與已讀回覆。
4. 功能驗收後先更新 README、PROGRESS、handoff，再做具體 commit 與 push。

## 不要提交

- `.env*`、`node_modules/`、`dist/`、`.firebase/`
- `cac-liff-app/artifacts/`、`cac-liff-app/tmp-*.mjs`
- 使用者提供的 PDF 或 LINE token
## 2026-07-28 Mobile booking management

- Mobile staff booking management now renders the same booking operations as desktop instead of the former check-in-only view.
- The mobile list is a labeled two-column responsive layout with sorting and all booking actions preserved.
- Deployment scope: Hosting only. Do not deploy Functions or Firestore rules for this UI change.
- Local source remains the Git/deployment source. Daily acceptance should use `https://channel-activity-customer.web.app` rather than localhost.
- Email D-1 fallback remains deferred because the current Firestore `mail` queue has no supported delivery provider attached.
## 2026-07-28 - Portrait mobile booking list

- Source change: `cac-liff-app/src/App.jsx` adds a portrait-only breakpoint (`max-width: 639px` plus portrait orientation) for the staff booking list.
- Narrow phones now show full dates and compact booking rows. Tablets, landscape phones, and desktop retain the prior wider list.
- Validation: `npm test` and `npm run build` passed. Deploy Hosting only for this UI change.
## 2026-07-28 - Package Tool questionnaire mapping

- `listPackageQuestionnaireRules()` now keys rules by the stored `packageName`, not the encoded Firestore document ID.
- The Package Tool offers `無對應健康問卷`; it is stored as an empty questionnaire id, and questionnaire actions report that no questionnaire is required.
- The package-settings row wraps and gives the package name a `180px` minimum width.
- Verified with `npm test` and `npm run build`. Hosting-only deployment is sufficient.
- UI correction: the optional questionnaire select now displays 無 rather than a literal Unicode escape sequence.

## 2026-07-28 - Rich Menu route repair

- Fixed public URL rendering for LIFF Rich Menu deep links `?view=prep`, `?view=followup`, and `?view=contact` in `cac-liff-app/src/App.jsx`.
- Do not make LINE login mandatory: the current booking design supports email fallback for customers without LINE login.
- `?view=my-bookings` and `?view=checkin` remain on the existing My Bookings/check-in path.
- Validation: `npm test` and `npm run build` passed. Deploy Hosting only.
## 2026-07-28 - LIFF personal booking recovery

- Root cause of empty My Bookings: the public Firestore query was correctly restricted by anonymous `ownerUid`, but this changed between browser/session contexts.
- `functions/index.js` now exposes `claimMyLineBookings`. It verifies the current LIFF access token with LINE Profile API before reassigning only bookings whose stored `lineUserId` matches the verified LINE user to the current Firebase session.
- `src/liff.js` keeps LIFF access token in memory as `lineProfile.accessToken`; do not persist it.
- `?view=prep` uses `CheckInInfoPanel prepOnly`, loads the same verified customer bookings, hides serial, and shows base plus item-specific instructions.
- Email-only cross-device booking lookup remains intentionally deferred: it needs an emailed signed lookup link or another verified email authentication path; do not expose email-based Firestore search from the client.
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

- Fixed the phone layout where the deleted-package panel consumed the entire 240px package selector and hid active packages.
- `PackagesView` now gives the active list a shrinkable scroll region and hides deleted-package recovery below the desktop breakpoint.
- Verified with `npm test` and `npm run build`; deploy Hosting before acceptance testing in LIFF.
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

## 2026-07-28 - P0 staging staff access gate

- Staging Auth providers are enabled: Anonymous and Google.
- `security-p0-staging` now gates the staff UI from Firestore `staffUsers/{email}.active`; the old `VITE_STAFF_EMAILS` browser allowlist is no longer authoritative. Bootstrap admin: `lhm0323@gmail.com`.
- Staging Hosting deployed: https://cac-health-staging.web.app. Do not deploy this branch to `channel-activity-customer` yet.
- Passed: `npm test` and `npm run build -- --mode staging`.
- Manual next step: log in at staging with the admin Google account; create a non-admin staff entry, verify staff tools load, then set it inactive and verify the user is refused after sign-in.
## 2026-07-28 - Staff account activation control

- Admin staff account chips now include 啟用/停用. The bootstrap administrator cannot disable itself.
- This control writes the existing staffUsers/{email}.active field used by the frontend gate and Firestore Rules.

## 2026-07-29 - Report status staging MVP

- Added a separate staff `報告管理` tab. The booking list and booking-edit modal no longer contain report status or care-manager notes.
- Staff can set `處理中` / `已完成，請至中心領取` / `已寄發` / `請個管師聯繫`, plus an internal care-manager note. The LIFF `報告追蹤` view exposes only the customer-visible status for that owner; it never exposes the note or a report file.
- The Phase 1-3 implementation plan now defers PITR, backups, and final report file storage to Phase 3 after real bookings begin. No PITR or scheduled backup cost is enabled during trial.
- Verified: `npm test`, `npm run build -- --mode staging`, and Hosting deployment to `https://cac-health-staging.web.app`.
- Production `channel-activity-customer` remains unchanged. Next: staff acceptance in staging, then decide whether to promote the P0 and report-status changes to production.
## 2026-07-29 Staging Phase 1/2

- Current branch: `security-p0-staging`.
- Staging: `https://cac-health-staging.web.app` / Firebase project `cac-health-staging`. Do not deploy this branch to production without explicit approval.
- Phase 1 is deployed in staging: active `ADMIN`/`STAFF` records, staff LINE separation, report-status tab, and Cloud Function audit entries for confirm/cancel/remind/staff-edit. Audit records are admin-only and store field summaries, not personal values.
- Phase 2 is deployed in staging: `PUBLIC`, `INTERNAL`, `INVITE_ONLY` managed packages; callable public package list; server-validated invitation token; expiring invite link/QR and immediate revoke control; public 30-day blocked-date notice.
- Verification passed: `node --check functions/index.js`, `npm test`, `npm run test:rules`, `npm run test:functions`, and `npm run build -- --mode staging`.
- Pending acceptance: sign in as a staging admin; verify a disabled staff account is denied, audit list is admin-only, and invite-only package visibility/revocation works in a non-staff browser. Email delivery and Phase 3 PITR/backups are deliberately deferred.

## 2026-07-29 Staging public page repair

- If the public page reports `listPublicManagedPackages is not defined`, verify the three Phase 2 wrappers are imported from `src/firebase.js` in `src/App.jsx`.
- The corrected bundle was deployed Hosting-only to staging after `npm test` and `npm run build -- --mode staging` passed.

## 2026-07-29 Public package copy

- Keep the Chinese public package title as 「選擇需要的健檢方案」. Do not restore the generic subtitle.
- Only show the blocked-date sentence when there are dates within 30 days: 「未來30日內停約日為：」.

## 2026-07-30 Package and audit acceptance repair

- Package Tool requires `packageVisibility`, `packageInviteExpiry`, `packageInviteLink`, and `packageInviteQr` state in `App.jsx`; do not remove them.
- Audit rows resolve the booking live for administrators rather than copying customer details into `auditLogs`.
- Staging has six safe-to-delete test bookings, `STAGING-Test-01` to `STAGING-Test-06`, dated 2026-08-04 through 2026-08-09.
- Staging deliberately cannot test real LINE binding or D-1 LINE delivery because `VITE_LIFF_ID` is unset and its Messaging token is not production-valid.
## 2026-07-30 - 稽核紀錄精簡

- 新增稽核只保留「時間、動作、對應預約、操作者」；不再寫入欄位差異、前後值、客戶個資或備註。
- 僅保留人工可追溯操作：後台確認、取消、編修、改期核准與人工提醒；建立預約、排程 D-1 通知與現場報到不再新增紀錄。
- 管理者仍可由稽核列點開對應預約；既有舊稽核資料不回寫或刪除。PITR/TTL 保留至正式營運前另行決定。
- 2026-07-30 staging deployed: Functions updated and Hosting version `c8ab09c932a90d38` released to `https://cac-health-staging.web.app`; production remains unchanged.

## 2026-08-10 Production release

- The staging security release is live in production at `https://channel-activity-customer.web.app`.
- Git source: branch `security-p0-staging`, commit `40faa1e refactor: reduce booking audit volume`.
- Production deployment scope: Hosting, Firestore Rules, and Functions comparison. Functions were unchanged and therefore skipped by Firebase; Hosting and Rules released successfully.
- Production data was retained. Do not seed staging test records into the production project.
- Verify production through the hosted app; localhost is no longer the acceptance target.

## 2026-08-10 Booking list ordering fix

- Firestore did not lose the 2026-08-03 booking. Both tested query ranges returned it.
- Staff booking list now defaults to appointment date ascending instead of creation-time order. Production Hosting release completed at 2026-08-10 14:04 Taipei.

## 2026-08-10 Staff booking edit diagnosis

- Production `updateBookingAsStaff` is not reachable from browsers: Cloud Run rejects unauthenticated CORS preflight requests before the Firebase callable handler executes.
- Do not weaken Firestore Rules. The narrowly scoped fix is an explicit public invoker for this one callable endpoint, with existing `assertStaff` retained. Await explicit approval before applying IAM exposure.
- Cancelled booking rows now have no operations buttons; Hosting release completed at 2026-08-10 14:33 Taipei.

## 2026-08-10 Staff booking edit access restored

- `updateBookingAsStaff` is public only at the Cloud Run callable transport layer to permit CORS preflight. Do not remove `assertStaff(request)`; it remains the booking-data authorization boundary.
- Production verification passed: `OPTIONS` from the Hosting origin returns HTTP 204 and allows `POST`.
- User acceptance required: edit any active booking from the staff booking list, save, then confirm the booking fields and its audit entry update.


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

## 2026-08-10 - CSV import session fix

- Production Hosting now refreshes Firebase Auth before staff CSV rows call createBooking. The prior error claiming that Email was required without LINE was caused by a stale or non-staff callable session.
- CSV import intentionally accepts blank customer Email and LINE ID. It still requires a currently authenticated Google staff session; if it reports the new staff-login message, use the app Logout then Staff Login with an active staff account.
- Deployed Hosting version: 9a3f4ff9bd4e1787.
- Validation passed: npm test and npm run build.

## 2026-08-10 - CSV import email validation repair

- CSV imports no longer rely on the public createBooking contact rule. Each CSV row has source STAFF_CSV; production createBooking performs assertStaff first, then permits blank Email/LINE ID.
- Public self-service booking remains unchanged and still requires a connected LINE identity or valid Email.
- Production Function: createBooking revision createbooking-00003-buk; Hosting release version a6a66d4c6807e062.
- Verify by importing C:/Users/xray/Documents/1.csv after Staff Login. Its rows are dated 2026-08-12, so the booking list must include that date.

## 2026-08-10 - CSV import actual root cause fixed

- The persisted import error was not a Firebase token issue. In production createBooking, the valid-email check lacked the non-staff guard and therefore rejected staff CSV rows with blank Email.
- Fixed and deployed: `if (!isStaff && !lineProfile && !validEmail(customerEmail))`. Production revision: createbooking-00004-dab.
- Staff CSV rows still require active staff/admin verification through assertStaff. Public self-service bookings remain required to supply LINE or Email.

## 2026-08-10 - CSV import verification complete

- Regression test added in src/functions.p0.test.js. It signs in a simulated staff email, seeds active staffUsers in the emulator, and successfully creates a STAFF_CSV booking with no Email/LINE ID.
- Passed: npm test and npm run test:functions. Production createBooking revision remains createbooking-00004-dab.

## 2026-08-11 - Current CSV import correction

The persistent `CSV ... 未登入 LINE 時，請填寫 Email ...` error was caused by the browser client, not the production Function: `buildBookingPayload()` rejected the row before `saveBooking()` ran. The fixed CSV-only call in `src/App.jsx` passes `allowMissingContact: true`; normal public bookings retain the LINE-or-Email requirement. Contactless staff imports use `notificationChannel: NONE`.

Deployed production:
- Hosting release: `ec574d5a0f337fcb`
- `createBooking`: `createbooking-00005-taz`

Verification passed: `npm test`, `npm run build`, deployed bundle marker verification. `npm run test:functions` hit a local emulator `functions/not-found` response in this run; do not treat that as production failure. First acceptance step: Staff Login, import `C:/Users/xray/Documents/1.csv`, read the per-row import log, and ensure the date filter covers the CSV dates.

## 2026-08-11 - Gmail booking-link email handoff

Current state: Gmail API integration is deployed but intentionally not connected until the administrator supplies the newly rotated OAuth client secret through the app UI and grants consent as `ptch.health@gmail.com`.

Admin acceptance sequence:
1. Log into production as CAC admin and open `預約清單`.
2. In `預約 Email 寄件設定`, confirm Client ID, enter the rotated Client Secret, and keep sender as `ptch.health@gmail.com`; save.
3. Click `連結 Gmail`; complete consent with the dedicated Gmail account. If Google shows `redirect_uri_mismatch`, add exactly `https://us-central1-channel-activity-customer.cloudfunctions.net/connectMailerCallback` to the OAuth client.
4. Create one staff booking with a non-staff test Email and no LINE identity. Verify the booking persists, the email arrives, the claim link opens LIFF, and the booking becomes linked after customer LINE login.

Security contract:
- `MAILER_ENCRYPTION_KEY` is Firebase Secret Manager version 2; no plaintext OAuth secret/token belongs in Git or Firestore.
- `configureGmailMailer` and status/authorization calls enforce `assertAdmin`; email resend enforces `assertStaff`.
- The OAuth callback is public only to receive Google redirects, validates one-time state, and expires authorization state after 10 minutes.
- First secret version was never configured with credentials; latest Function revisions use secret version 2.

Do not rely on routine email delivery until Google OAuth is published/verified or the refresh-token policy is otherwise confirmed. Testing-mode refresh tokens can expire after seven days.
- Secret hygiene: production Functions are bound to MAILER_ENCRYPTION_KEY version 2. The prior version is retained because irreversible secret destruction requires separate explicit confirmation; no OAuth credential was configured through this integration before deployment.

## 2026-08-11 - Gmail authorization INTERNAL fix

- Root cause: the administrator profile used by `startGmailMailerAuthorization` returned email/role but omitted Firebase Auth UID. The one-time OAuth state write therefore attempted to store `actorUid: undefined`, which Firestore rejected and surfaced as `INTERNAL`.
- Fixed `staffProfile()` to return the authenticated UID for bootstrap admin and stored staff accounts. OAuth state and audit records now receive a valid actor UID.
- Verification: production log reproduced the exact Firestore error; `node --check functions/index.js` and `npm test` passed; production Function revision `startgmailmailerauthorization-00002-xuj` is ACTIVE.
- Acceptance: retry `連結 Gmail`; the next expected screen is Google account selection/consent, not an INTERNAL error.
## 2026-08-11 - Contact location map

- Added the supplied Health Check Center location map to the public `聯絡交通` view, immediately before the Google Maps navigation button.
- Asset: `cac-liff-app/public/health-check-center-location.jpg`.
- Verified: `npm test`, `npm run build`, production Hosting deployment, and public image URL HTTP 200 (`image/jpeg`).
## 2026-08-11 - Gmail Chinese subject encoding

- Fixed booking-link email MIME headers using RFC 2047 UTF-8 Base64 encoding for non-ASCII headers.
- Claim emails now use the sender display name `屏基健檢中心` and a correctly encoded Chinese subject. Existing emails are unchanged; newly sent or resent mail uses the fix.
- Files: `cac-liff-app/functions/index.js`.
- Verification: `node --check functions/index.js`, `npm test`, production deployment of `createBooking` and `sendBookingClaimEmailAsStaff`.
## 2026-08-11 - Booking list contact and reminder labels

- Updated the staff booking list to replace the phone-only column with `聯絡／綁定`: it keeps the telephone number and derives one concise status from existing data: `LINE 已綁定`, `Email 已登記`, `待受檢者認領`, or `待人工聯繫`.
- Reminder labels are now operational: `已回覆`, `已發送`, `尚未通知`, `待人工聯繫`, or `發送失敗`. Contactless corporate imports no longer look like a message-delivery failure.
- No Firestore schema, booking data, or notification behavior changed. This is a display-only rule; the future corporate claim workflow still needs explicit `claimStatus` and expiry design before it is implemented.
- File: `cac-liff-app/src/App.jsx`.
- Verification: `npm run build` passed; deployed to production Firebase Hosting release `3dc5c59093b8639e`.

## 2026-08-11 - Returning customer prefill via LINE

- Added `getLineCustomerProfile`, a callable endpoint that requires both Firebase Auth and a valid LINE access token. It reads only the customer document keyed by that verified LINE user ID and returns name, phone, email, and masked ID number.
- The public booking modal now pre-fills a returning LINE customer\'s basic details after they select a package. It does not retrieve or store a full ID/passport number: the form shows the saved masked ID and permits an empty ID field for the already LINE-linked customer.
- Browser/Email-only users and staff proxy bookings remain manual entry flows. There is no ID-number-only lookup endpoint.
- Files: `cac-liff-app/functions/index.js`, `cac-liff-app/src/firebase.js`, `cac-liff-app/src/core.js`, `cac-liff-app/src/App.jsx`.
- Verification: `node --check functions/index.js`, `npm test`, and `npm run build` passed. Production Function and Hosting were deployed; interactive acceptance requires an existing LINE-linked customer account in LIFF.
