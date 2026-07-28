# CAC 專案架構與需求查核

本文件刻意拆成多張小圖。不要合併成一張圖，否則 Mermaid 會縮小字體而無法閱讀。

## 1. CAC 三層總覽

```mermaid
flowchart LR
  Channel["Channel 通路\n客戶從哪裡進來？"]
  Activity["Activity 活動\n預約如何被安排與執行？"]
  Customer["Customer 客戶\n受檢者留下什麼紀錄與後續服務？"]

  Channel -->|"選擇具通路標籤的套餐"| Activity
  Activity -->|"預約、清單、問卷"| Customer
  Customer -->|"回檢與歷程"| Channel
```

## 2. Channel：對應「民眾方案」與「套餐工具」

```mermaid
flowchart TB
  OA["LINE 官方帳號\nRich Menu"] --> LIFF["LIFF / 網頁\n民眾方案"]
  LIFF --> Filter["身分別、性別、檢查部位篩選"]
  Filter --> Compare["卡片檢視 / 比較總表"]
  Compare --> Book["選擇方案並預約"]

  Tool["套餐工具\n內部人員"] --> Meta["套餐內容\n通路標籤、部位標籤、最終價格"]
  Meta --> Compare
```

**已完成：** LINE OA deep link、民眾方案、套餐篩選、卡片檢視、比較總表、套餐工具編修套餐與項目。

**尚未完成：** 通路負責人 CRM、企業合約／名單版本管理、通路轉換成效儀表板。

## 3. Activity：對應「預約清單」

```mermaid
flowchart TB
  Book["民眾方案或套餐工具\n建立預約"] --> CheckDate{"該日期可預約？"}
  CheckDate -->|"否"| Stop["顯示：此日期暫停預約"]
  CheckDate -->|"是"| List["預約清單\n日期區間、通路、排序、CSV"]

  List --> Confirm["確認預約"]
  Confirm --> Serial["產生報到序號\nMMDD-001"]
  Serial --> Print["列印個人化\n當日檢查清單"]
  Serial --> D1["D-1 LINE 提醒\n台北時間 09:00"]
  D1 --> Ack["民眾點選\n我已收到通知"]

  List --> Change["核准改期 / 取消預約"]
  List --> Survey["指派與檢視\n健康問卷"]
```

**已完成：** 停止預約日期、預約清單、確認與報到序號、個人化清單列印、CSV 匯入匯出、改期／取消、D-1 LINE 提醒、問卷。

**尚未完成：** 各站完成狀態、檢體交接追蹤、時段／容量管理、多人即時控場儀表板。

## 4. Customer：對應「我的預約／改期」與 Rich Menu

```mermaid
flowchart TB
  Identity["民眾身分\nLINE ID 可選；Email 可填"] --> Profile["客戶基本資料"]
  Profile --> MyBooking["我的預約／改期\n查詢、改期、取消"]
  MyBooking --> Notice["報到序號／當日流程\n套餐對應來檢須知"]
  MyBooking --> Questionnaire["健康問卷\n帶入前次填答"]
  Questionnaire --> History["問卷填答歷程"]
  MyBooking --> Visit["到院受檢\n出示健保卡與報到序號"]
```

**已完成：** 客戶基本資料、我的預約／改期、取消預約、套餐對應須知、問卷歷程、D-1 已讀回覆。

**尚未完成：** 健檢報告匯入、異常結果追蹤、轉介流程、個管師待辦清單、長期個人健康紀錄。

## 5. 技術實作：程式、資料與自動化

```mermaid
flowchart LR
  UI["App.jsx\n民眾方案 / 套餐工具 / 預約清單"] --> Core["core.js\n計價、標籤、CSV、比較、清單"]
  UI --> Firebase["firebase.js\nFirestore、登入、Cloud Functions"]
  UI --> Liff["liff.js\nLINE 個人資料"]

  Firebase --> DB["Cloud Firestore"]
  Firebase --> Auth["Firebase Auth\nGoogle 員工登入"]
  Firebase --> Fn["Cloud Functions"]
  Fn --> Scheduler["Cloud Scheduler\n每天 09:00"]
  Fn --> LINE["LINE Messaging API\nD-1 推播"]
```

### 主要 Firestore 資料

| 對應功能 | 資料表 |
| --- | --- |
| 客戶與預約 | `customers`、`bookings`、`checklists` |
| 套餐工具 | `managedPackages`、`managedItems` |
| 預約清單營運 | `bookingBlockedDates`、`bookingChangeRequests`、`dailyCheckInCounters` |
| 員工登入 | `staffUsers` |
| 健康問卷 | `managedQuestionnaires`、`packageQuestionnaireRules`、`customerQuestionnaireResponses` |
| Email 提醒 | `mail` 目前只是佇列，尚未串接真正寄信服務 |

## 結論

目前 CAC 是可運作的 **Channel → Activity 預約 MVP**，並已建立 Customer 層的前段資料與問卷歷程；它尚不是完整的健檢報告、異常追蹤與個管師管理平台。