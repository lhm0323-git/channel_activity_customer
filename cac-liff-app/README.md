# CAC LIFF App

健檢中心 CAC v2.1 的第一個可交付版本：外部民眾用簡化方案篩選與預約，內部人員保留舊套餐 React app 的完整 CSV、套餐、計價、報價單邏輯，另有當日檢查清單列印。


## UI Modes

- `民眾方案`：依身分別、性別、檢查部位篩選套餐；企業團檢/勞工先不顯示；8000馬年以上歸高階，其餘歸一般；主要項目排除基礎檢查，並把同類高價檢查彙整成摘要亮點，不顯示單項價格。
- `內部工具`：完整套餐與單項加選、搜尋、比較、自訂套餐、折扣計價、報價單。
- `當日清單`：依日期讀取 booking，單張或批次列印 A4 檢查清單。
## Run

```bash
npm install
npm run dev
```

## Environment

不設定環境變數時，booking 會存到 `localStorage`，方便本機測試。部署到 Firebase/LIFF 時設定：

```bash
VITE_LIFF_ID=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Files

- `src/App.jsx`：原套餐 UI，加 booking modal 與 admin checklist view。
- `src/core.js`：CSV、計價、booking payload、checklist 純邏輯。
- `src/firebase.js`：Firestore 寫入/查詢，未設定 Firebase 時退回 localStorage。
- `src/liff.js`：LIFF 初始化與 LINE profile 讀取。



