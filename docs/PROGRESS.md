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