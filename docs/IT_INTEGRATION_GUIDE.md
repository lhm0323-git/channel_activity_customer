# 屏基健檢 CAC Web 系統與資訊室對接說明

> 文件版本：2026-08-12  
> 用途：系統交接、帳號認證、API 串接、資安與維運討論  
> 相關圖說：[CAC_ARCHITECTURE.md](CAC_ARCHITECTURE.md)

## 1. 系統摘要

CAC 是屏基健檢中心的 web-based 預約與營運系統，將業務分為：

- **Channel 通路**：套餐、通路標籤、LINE OA／網頁入口與企業專屬方案。
- **Activity 活動**：預約、改期、通知、報到序號、個人化當日清單與問卷。
- **Customer 客戶**：基本資料、每次預約、問卷歷程、報告狀態與未來異常追蹤。

第一階段不直接寫入 HIS，先用 Firebase 運作預約與現場流程；院內資料串接一律通過受保護的 server-side API，不讓瀏覽器直接連院內系統。

## 2. 線上環境

| 項目 | 內容 |
| --- | --- |
| Production | <https://channel-activity-customer.web.app/> |
| LINE LIFF | <https://liff.line.me/2010725321-sRRkD0Le> |
| Firebase project | `channel-activity-customer` |
| Staging | <https://cac-health-staging.web.app/> |
| Staging project | `cac-health-staging` |
| 前端 | React 18 + Vite 6，Firebase Hosting SPA |
| 後端 | Firebase Cloud Functions Gen 2，Node.js 22 |
| Functions 地區 | `us-central1` |
| 資料庫 | Cloud Firestore |
| 排程 | Cloud Scheduler，每日 09:00，`Asia/Taipei` |

`cac-health-staging` 是功能測試環境，不是 production Firestore 的自動鏡像或備份。

## 3. 使用說明

### 3.1 民眾

1. 從 LINE OA Rich Menu 或 production URL 進入。
2. 用身分別、性別、檢查部位篩選套餐，以卡片或比較總表閱讀。
3. 輸入姓名、電話、身分證／護照號碼、Email、希望日期與備註。
4. LIFF 中可綁定 LINE，以查詢預約並接收 D-1 提醒；沒有 LINE 時可使用 Email。
5. 「我的預約／改期」可查詢未來預約、提出改期或取消。
6. 「來檢須知」顯示報到序號與套餐對應注意事項，並可預填指定問卷。
7. 「報告追蹤」目前只顯示報告狀態，尚不提供正式報告檔下載。

### 3.2 健檢中心員工

1. 點「員工登入」完成 Google 登入；帳號另需存在 `staffUsers` 且為啟用狀態。
2. **套餐工具**：管理套餐、通路／部位標籤、價格、可見性、檢查項目及對應問卷；可代客建立單筆預約。
3. **預約清單**：依日期、通路與狀態查詢，編輯預約及病歷號，確認／取消，發送提醒，處理改期，列印個人化清單，匯入／匯出 CSV。
4. **問卷**：從單筆預約讀取該次填答，核對、修正後保存並列印簽名。跨次帶入只套用於已設定「下次預約自動帶入」的欄位。
5. **報告管理**：更新民眾可見的報告狀態，並輸入僅內部可見的個管師備註。

### 3.3 ADMIN

- 新增、啟用、停用員工帳號，分配 `STAFF` 或 `ADMIN`。
- 設定健檢中心 Gmail OAuth，供預約認領信使用。
- 讀取稽核紀錄，以姓名、病歷號、套餐或預約日期追蹤操作。
- 稽核紀錄只存操作 metadata，不存健康問卷答案。

## 4. 身分驗證與授權現況

| 對象 | 認證 | 授權 |
| --- | --- | --- |
| 民眾 | Firebase Anonymous Auth；可附加經伺服器驗證的 LINE access token | 限 `ownerUid` 資料；寫入經 callable Functions |
| 員工 | 目前為 Firebase Google Auth | `staffUsers/{lowercase email}` 必須啟用 |
| 管理者 | 同上 | `staffUsers.role == ADMIN`；另有一個 bootstrap admin |

### 改接院內帳號

首選院方既有 **OIDC 或 SAML 2.0 Identity Provider**（例如 Microsoft Entra ID、AD FS、Keycloak 或 Google Workspace），經 Firebase Identity Platform 登入。不建議 CAC 收取或驗證院內 AD／LDAP 密碼。

請資訊室提供：

1. IdP 類型：Google Workspace、Entra ID、AD FS、OIDC、SAML，或僅 AD／LDAP。
2. OIDC：issuer、client ID／secret、authorization／token／userinfo endpoints、email 與員工編號 claim。
3. SAML：metadata XML、Entity ID、SSO URL、簽章憑證、email 與員工編號 attribute。
4. MFA 規則、離職／停權生效時間、測試帳號及 staging callback allowlist。
5. `xxx@ptch.org.tw` 帳號規則及可供角色映射的群組／claim。

遷移順序：staging 配置 → 雙登入驗收 → 至少兩個院內 ADMIN → 驗證停用帳號 → 最後才移除個人 Gmail bootstrap，避免鎖死後台。

## 5. 程式與部署架構

```text
Channel–Activity–Customer/
  cac-liff-app/
    src/App.jsx              UI 與互動流程
    src/core.js              CSV、計價、標籤、清單規則
    src/questionnaire.js     問卷 schema、帶入與列印
    src/firebase.js          Firebase client 與 callable 封裝
    src/liff.js              LINE LIFF
    functions/index.js       server-side 信任邊界
    firestore.rules          Firestore 存取規則
    firebase.json            Hosting／Functions／Emulator 設定
  docs/CAC_ARCHITECTURE.md
  docs/IT_INTEGRATION_GUIDE.md
  docs/PROGRESS.md
  agent_handoff.md
```

### 本機啟動與驗證

```powershell
cd cac-liff-app
npm install
npm run dev
npm test
npm run test:rules
npm run test:functions
npm run build
node --check functions/index.js
```

Rules／Functions emulator 需要 Java 與 Firebase CLI。LIFF、Google OAuth、LINE push 與院內 API 仍需 staging 互動驗收。

### 環境變數

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_LIFF_ID=
VITE_STAFF_EMAILS=
```

不得放入 Git：LINE channel access token、Gmail client secret、refresh token、service-account JSON、院內 API token、健保 DLL token及真實病人資料。

## 6. Cloud Functions 介面

2026-08-12 已由 Firebase CLI 核對 production：共 24 個 Gen 2 Functions，Node.js 22，均位於 `us-central1`。

### 民眾與 LINE

| Function | 用途 |
| --- | --- |
| `createBooking` | 驗證輸入、套餐及停約日，建立預約與 checklist |
| `cancelBooking` | 取消預約；已綁 LINE 時傳送取消通知 |
| `requestBookingChange` | 提出改期申請 |
| `getLineCustomerProfile` | 由已驗證 LINE ID 預填基本資料 |
| `claimMyLineBookings`, `claimBookingWithLine` | 將預約綁定客戶本人 LINE |
| `acknowledgeD1LineNotice` | 記錄民眾已收到 D-1 通知 |
| `saveMyQuestionnaireResponse` | 保存 owner 的問卷回答 |
| `getPublicManagedPackages` | 取得公開或有效邀請套餐 |

### 員工與管理者

| Function | 用途 |
| --- | --- |
| `updateBookingAsStaff` | 員工編輯預約及重建 checklist |
| `approveBookingChangeAsStaff` | 核准改期 |
| `checkInBookingAsStaff`, `confirmBookingWithSerial` | 報到／確認及序號 |
| `sendD1LineNotice`, `sendD1LineNotices` | 人工補發／每日 09:00 自動發送 |
| `getBookingQuestionnaireResponseAsStaff`, `saveBookingQuestionnaireResponseAsStaff` | 讀取與修正單筆預約問卷 |
| `createPackageInvite`, `revokePackageInvite` | 建立／撤銷邀請限定套餐連結 |
| `configureGmailMailer`, `getGmailMailerStatus`, `startGmailMailerAuthorization` | ADMIN 管理 Gmail OAuth |
| `connectMailerCallback` | Google OAuth 回呼；唯一非 callable HTTP endpoint |
| `sendBookingClaimEmailAsStaff` | 以健檢中心 Gmail 寄送 LINE 認領連結 |

新院內 API 必須由 server-side Function 呼叫，並以 `assertStaff` 或新 SSO claims 驗證；不可把 URL、token 或完整身分證號編入前端 bundle。

## 7. Firestore 資料

| Collection | 主要內容 | 存取邊界 |
| --- | --- | --- |
| `customers` | 姓名、電話、Email、LINE ID、遮罩證號 | owner 或 staff |
| `bookings` | 日期、通路、套餐、項目、價格、狀態、聯絡／通知、報告狀態 | owner 或 staff 讀；寫入經 Function |
| `checklists` | 站別、檢查項目、注意事項、委外項目 | staff |
| `managedPackages`, `managedItems` | 套餐與項目主檔 | 員工修改；民眾經 Function 取可見資料 |
| `managedQuestionnaires`, `packageQuestionnaireRules` | 問卷 schema 與套餐對應 | staff 管理 |
| `customerQuestionnaireResponses` | 客戶每次問卷回答 | owner 或 staff |
| `bookingBlockedDates`, `bookingChangeRequests` | 停約日與改期工作流 | staff 管理 |
| `staffUsers` | email、active、role | 員工讀，ADMIN 修改 |
| `auditLogs` | bookingId、action、actor、time | ADMIN 讀，不存問卷內容 |
| `systemSettings/mailer` | Gmail OAuth 設定與加密 token | 不開放 client 直接存取 |

正式對接 HIS 前，需共同確認資料主鍵、病歷號修正、客戶合併、保留年限及刪除／封存規則。

## 8. LINE、Email 與排程

- `LINE_CHANNEL_ACCESS_TOKEN` 僅存 Firebase Secret Manager。
- D-1 Scheduler 每日 09:00（台北時間）查詢隔日有效預約。
- 有 LINE ID 時優先 LINE push，民眾可回覆「已收到」。
- 無 LINE 但有 Email 時，目前會寫入 `mail` 佇列；穩定的 D-1 Email worker 尚待確認。
- 員工代訂後的 LINE 認領信已由 Gmail API 寄送；OAuth client secret／refresh token 加密後存放。
- 無 LINE／Email 的 CSV 企業名單顯示為待人工聯繫，不應視為訊息發送失敗。

## 9. 癌篩／預防保健 API 對接

資訊室規格：`api/癌症篩檢資格查詢_API規格文件.md`。目前尚未串接。

### 已知限制

- API 為院內 HTTP URL `http://129.34.70.168/...`，不應由 public browser 或 Internet Cloud Function 直接呼叫。
- Request 需完整身分證號、生日、病歷號、查詢日、員工代碼、科別及醫師代碼。
- CAC 目前只持有遮罩證號；生日與完整證號並非 booking 的完整持久資料。
- 不知道病歷號時，還需「身分證號＋生日 → 病歷號」院內 API。
- 成人預防保健與 BC 肝需院內健保署 DLL 產生 `sToken`，不可移到前端。

### 建議介面

```text
CAC staff UI
  -> authenticated CAC Cloud Function
  -> hospital HTTPS gateway (allowlist / mTLS / OAuth2)
  -> MRN lookup + cancer-screening service + NHI DLL token
```

請資訊室補充：

1. HTTPS 入口、網路路徑、防火牆 allowlist；若僅院內網可達，需決定 VPN／private connector 或院內 gateway。
2. 服務對服務認證方式，不用前端 API key 或共用靜態密碼。
3. 病歷號前置 API、測試環境與去識別測試個案。
4. `sUserId`、`sDepNo`、`sDocCode` 的映射與稽核責任。
5. timeout、retry、rate limit、錯誤碼、服務時段及變更通知。
6. 查詢紀錄保留期；Log 不記完整身分證號、健保 token 或完整 response。

## 10. 部署與回復

```powershell
cd cac-liff-app
npm run build
firebase deploy --only hosting --project channel-activity-customer
firebase deploy --only firestore:rules --project channel-activity-customer
firebase deploy --only functions --project channel-activity-customer
```

涉及認證、Rules、資料模型或院內 API 時：

1. 先部署 `cac-health-staging`。
2. 驗收民眾預約、LINE／Email、員工登入、預約編輯、問卷與列印。
3. 記錄 production 的 Hosting release、Function revisions與必要資料備份。
4. 先部署 Functions／Rules，再部署相符 Hosting，立即做 smoke test。
5. 保留上一個 Git commit 與 Hosting release；Functions 由已確認 commit 重建回復。

Functions 現位於 `us-central1`。若遷移 `asia-east1`，需另案處理新 region 部署、前端 Functions instance、OAuth callback、Scheduler、IAM、重複排程及舊函式下線。

## 11. 監控、備份與待辦

### 應監控

- Functions error rate、latency、invocation及 Scheduler 每日結果。
- LINE push 401／429、Gmail OAuth失效及寄信失敗。
- Firestore denied requests與讀寫異常成長。
- `auditLogs` 容量與保留期；不複製預約或問卷內容。

### 尚待決定

- 正式上線後 Firestore PITR／排程備份、保留天數與復原演練。
- 個資與健康問卷的法定保留、刪除及封存流程。
- 每日／時段容量與企業團檢批次認領 QR／到期管理。
- 正式 HIS／報告匯入前的主資料、客戶合併、異常轉介及權限分級。

## 12. 資訊室首輪對接清單

1. 確認院內 IdP 及 OIDC／SAML 可行性。
2. 確認 staging 測試帳號、MFA、離職帳號停用及 ADMIN 復原流程。
3. 確認癌篩 API 的 HTTPS gateway、認證、病歷號前置 API及 DLL token位置。
4. 確認 CAC 員工角色與 `sUserId`／`sDepNo`／`sDocCode` 映射。
5. 確認資料保留、Log 遮罩、備份／復原及資安事件聯絡窗口。
6. 建立去識別端到端測試：建立預約 → 查資格 → 確認 → 問卷 → D-1 → 列印 → 稽核。

## 13. 建議維運分工

| 責任方 | 建議負責項目 |
| --- | --- |
| 資訊室 | 院內 IdP、SSO metadata與停權流程；院內 HTTPS gateway；病歷號／癌篩／HIS API；網路與防火牆；GCP IAM、監控、備份與資安事件處理 |
| 健檢中心 | 套餐、價格、通路、停約日、問卷、來檢須知、員工名單、日常預約及異常流程的業務規則 |
| CAC 維護者 | 前端、Cloud Functions、Firestore schema／Rules、LINE／Gmail整合、測試、版本控制與部署說明 |
| 共同 | staging 驗收、正式變更窗口、資料保留、權限定期複核、災難復原演練與上線簽核 |

正式對接前應指定一位資訊室技術窗口、一位健檢中心流程 owner 與一位備援 ADMIN；所有 production 認證或 API 變更需有可回復版本與驗收紀錄。