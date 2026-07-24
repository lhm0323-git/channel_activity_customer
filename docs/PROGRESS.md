# Progress

本文件是可累積的日期紀錄；目前可接手狀態請見 [../agent_handoff.md](../agent_handoff.md)。

## 2026-07-24

### 今日完成

- 從 Git `1895ba5` 與 Hosting recovery artifacts 重建因意外清空而遺失的 `src/App.jsx` 工作面。
- 回復並擴充民眾套餐、預約、我的預約/改期/取消、套餐工具、預約清單、CSV、列印與員工帳號管理。
- 新增停約日期管理及民眾端預先檢查，避免 Firestore 拒絕直接顯示權限錯誤。
- 新增 `functions/`：確認預約配發報到流水號、每日台北時間 09:00 D-1 LINE 通知、已讀確認與人工補發。
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