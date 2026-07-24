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