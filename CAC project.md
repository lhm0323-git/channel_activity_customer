目前有跟健檢中心的資深護理同仁問到下列痛點

1. 利用通訊軟體line的 AI bot通知隔天來檢顧客, 不要靠人工通知(目前都靠人工通知每位客戶)
這部分順便做健檢中心的數位門面, 提供客戶線上選購想要的健檢套餐及預約booking建檔
看是透過web-based 表單或是firebase等等雲端資源(目前我有google cloud訂閱)
2. 自動化製作當天檢查項目流程checklist (activity\&personal based)
3. final report轉譯中文, 需人工點片語、且需調用很多支不同程式很麻煩

重新擬定三層數位系統（Channel–Activity–Customer）的implementation plan
專門for健檢中心(先不用考慮到社醫部, 以後有需要再延伸)

這份計畫已整理完成。以下是核心架構的快速導覽：

***

## 計畫核心邏輯

三個痛點直接對應三層架構，但落地順序不是按架構層別，而是按**投資報酬率與技術難度**排序。P1 LINE Bot 先上，因為它完全不碰 HIS，同時又是後三個模組的基礎建設（Customer 主檔、預約資料都在這裡建立）。

## 你的 GCP 訂閱直接用得上的部分

| 你的資源 | 對應模組 | 具體用途 |
| :-- | :-- | :-- |
| Google Cloud 訂閱 | P1 | Firebase（Cloud Functions + Firestore + Hosting） |
| Google Cloud 訂閱 | P4 | Document AI 做 PDF OCR |
| Google Cloud 訂閱 | P4 | Vertex AI 調用 Gemini 做翻譯 |
| Google Cloud 訂閱 | P1/P3 | Cloud Scheduler 做 D-1 自動通知 |

## 最重要的設計決策

**不強求 HIS 串接**是這次計畫成功的關鍵護身符。 第一期全部資料走 Firestore + CSV 匯出，讓系統可以在資訊室完全不配合的情況下先上線驗證效果，再用真實數字去跟資訊室談 HIS API 串接。

## 三層架構的實體化

前期討論的 Channel–Activity–Customer 框架在報告裡已正式落地：Channel = 四種健檢類型決定動線、Activity = 每次健檢預約主記錄（含 SLA 與狀態）、Customer = LINE UID + 身分證雙鍵主檔支撐跨次追蹤。

# 套餐code.txt是之前開發的web-based自選套餐與計價項目 react app, 可在桌機與行動裝置順利運行
有完整的 CSV 資料結構（含所有套餐、項目、分類、院碼）、選取邏輯、計價引擎，和列印功能。
如果要從這部分延伸, 做p1(line客戶自選套餐與預約介面)和p3(由已知客戶選擇項目生成個人化當日檢查清單)
怎麼做?

以下是兩個模組的具體做法：

***

## 整體策略：複用現有核心，加一層 LINE 外殼

現有 app 有三個可直接複用的核心：

1. **INITIAL_CSV_DATA** — 完整的項目主檔（分類 / 中英文名 / 院碼 / 臨床意義 / 自費價 / 套餐歸屬）
2. **packages 資料結構** — 套餐名稱 → item id 陣列的映射，已支援讀 CSV 衍生套餐 + 使用者自訂套餐
3. **計價引擎** — 折扣梯度邏輯（8000起10%、16000起15%、24000起20%、32000起25%）與建議訂價計算

**不需要從頭寫**。方式是把現有 React app 改成 LIFF 頁面（用 LINE LIFF SDK 包一層），加一個 Firestore 寫入層，再加一個清單生成模組。

***

## P1：LINE 客戶自選套餐與預約介面

### 改造架構

```
現有 React App (套餐選擇 + 計價)
        ↓  加入以下三個改動
1. LIFF SDK 初始化（取得 LINE UID）
2. 預約表單 Modal（姓名 / 日期 / Channel / 聯絡方式）
3. Firestore 寫入（appointment 文件）
```


### 具體程式碼改動

**Step 1：加 LIFF 初始化（在 App 最頂層 useEffect）**

```js
import liff from '@line/liff';

useEffect(() => {
  liff.init({ liffId: 'YOUR_LIFF_ID' })
    .then(() => {
      if (!liff.isLoggedIn()) liff.login();
      const profile = await liff.getProfile();
      setLineUID(profile.userId);
      setLineDisplayName(profile.displayName);
    });
}, []);
```

**Step 2：計算結果頁加「預約確認」按鈕（接在現有「複製」按鈕後面）**

現有的 CalcView 底部有三個按鈕（清空 / 報價單 / 複製），在 CalcView 加第四個「送出預約」按鈕，觸發預約 Modal：

```js
// Modal 內容
const BookingModal = () => (
  <div className="fixed inset-0 z-50 ...">
    {/* 顯示已選項目摘要（從 selectedItems 拿）*/}
    {/* 姓名 / 出生年月日 / 性別 */}
    {/* 希望日期（datepicker）*/}
    {/* Channel 選擇：高階個人 / 企業 / 勞工 / 一般 */}
    {/* 聯絡電話 */}
    {/* 備註 */}
    <button onClick={handleSubmitBooking}>確認送出</button>
  </div>
);
```

**Step 3：Firestore 寫入函式**

```js
import { db } from './firebase'; // Firebase config 另建
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const handleSubmitBooking = async () => {
  const apptRef = await addDoc(collection(db, 'appointments'), {
    lineUID: lineUID,
    displayName: lineDisplayName,
    customerName: formData.name,
    dob: formData.dob,
    gender: formData.gender,
    channel: formData.channel,         // HIGH_END / CORPORATE / LABOR / GENERAL
    packageName: packageName,
    selectedItems: selectedItems.map(i => ({
      id: i.id,
      name: i.name,
      enName: i.enName,
      code: i.code,
      category: i.category,
      price: i.price
    })),
    listPrice: listPriceTotal,
    discountRate: discountRate,
    finalPrice: finalPrice,
    preferredDate: formData.date,
    phone: formData.phone,
    remarks: formData.remarks,
    status: 'PENDING',
    createdAt: serverTimestamp()
  });
  
  // 成功後推送 LINE 確認訊息
  await fetch('/api/send-confirm', {
    method: 'POST',
    body: JSON.stringify({ lineUID, apptId: apptRef.id, packageName })
  });
  
  setShowBookingModal(false);
  setBookingSuccess(true);
};
```


### 部署方式

1. 把整個 React app 部署到 **Firebase Hosting**（`firebase deploy`）
2. LINE Developers Console 新增 LIFF App，Endpoint URL 填 Firebase Hosting 的 URL
3. 在 LINE OA 的選單或 Rich Menu 放一個按鈕，連結到 `https://liff.line.me/YOUR_LIFF_ID`

客戶點選單 → 開啟 LIFF → LINE 自動登入取得 UID → 瀏覽套餐 → 自選項目 → 送出預約 → Firestore 寫入 → LINE 自動回傳確認訊息。

***

## P3：個人化當日檢查清單（Activity-based Checklist）

### 延伸現有資料結構

現有 app 的 selectedItems 已有完整資訊：`{ id, category, name, enName, code, price, remark, outsource }`[^8_1]

清單生成只需要在這個基礎上加入**站別排程邏輯**與**列印/推送格式**。

### 清單生成邏輯

在現有 handlePrint 函式旁邊新增一個 `generateChecklist` 函式：

```js
// 站別對應表（依現有資料的分類欄位）
const STATION_MAP = {
  '一般檢查':    { station: 'A站', order: 1, duration: 10 },
  '理學檢查':    { station: 'A站', order: 1, duration: 15 },
  '血液常規':    { station: 'B站抽血', order: 2, duration: 5 },
  '肝膽功能':    { station: 'B站抽血', order: 2, duration: 0 }, // 同次抽血
  '腎功能':      { station: 'B站抽血', order: 2, duration: 0 },
  '糖尿病檢驗':  { station: 'B站抽血', order: 2, duration: 0 },
  '腫瘤篩檢':    { station: 'B站抽血', order: 2, duration: 0 },
  '尿液檢查':    { station: 'C站尿液', order: 3, duration: 5 },
  '糞便檢查':    { station: 'C站尿液', order: 3, duration: 5 },
  '特殊功能檢查': { station: 'D站功能', order: 4, duration: 20 },
  '心血管檢查':  { station: 'D站功能', order: 4, duration: 15 },
  '超音波':      { station: 'E站超音波', order: 5, duration: 20 },
  '影像醫學':    { station: 'F站影像', order: 6, duration: 15 },
  '腸胃內視鏡':  { station: 'G站內視鏡', order: 7, duration: 60 },
  '醫師解說':    { station: 'H診醫師', order: 8, duration: 20 },
};

const generateChecklist = (items) => {
  // 1. 依站別分組
  const stationGroups = {};
  items.forEach(item => {
    const station = STATION_MAP[item.category] || 
                    { station: '其他', order: 9, duration: 10 };
    if (!stationGroups[station.station]) {
      stationGroups[station.station] = { 
        ...station, items: [], totalMin: 0 
      };
    }
    stationGroups[station.station].items.push(item);
    stationGroups[station.station].totalMin += station.duration;
  });

  // 2. 依 order 排序 → 產生動線順序
  return Object.values(stationGroups)
    .sort((a, b) => a.order - b.order);
};
```


### 清單列印頁（擴充現有 handlePrint）

現有 handlePrint 已有完整的 HTML 列印模板。新增 `handlePrintChecklist` 函式，輸出個人化當日清單：[^8_1]

```js
const handlePrintChecklist = (customerName, apptDate, channel) => {
  const stationPlan = generateChecklist(selectedItems);
  // 需要外送的項目
  const outsourceItems = selectedItems.filter(i => i.outsource);
  // 有備註限制的項目
  const restrictItems = selectedItems.filter(i => i.remark);

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>當日健檢流程單 - ${customerName}</title>
        <style>
          body { font-family: "Microsoft JhengHei", sans-serif; padding: 30px; }
          .header { display: flex; justify-content: space-between; 
                    border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
          .patient-info { background: #f8fafc; padding: 12px; 
                          border-radius: 8px; margin: 16px 0; }
          .station { margin: 12px 0; border: 1px solid #e2e8f0; 
                     border-radius: 8px; overflow: hidden; }
          .station-header { background: #4f46e5; color: white; 
                            padding: 8px 16px; font-weight: bold;
                            display: flex; justify-content: space-between; }
          .station-items { padding: 8px 16px; }
          .item-row { display: flex; align-items: center; 
                      padding: 6px 0; border-bottom: 1px dashed #f1f5f9; }
          .checkbox { width: 18px; height: 18px; border: 2px solid #94a3b8; 
                      border-radius: 3px; margin-right: 10px; flex-shrink: 0; }
          .item-code { font-family: monospace; font-size: 11px; 
                       background: #f1f5f9; padding: 2px 4px; 
                       border-radius: 3px; margin-right: 8px; }
          .warning { background: #fefce8; border: 1px solid #fde047; 
                     padding: 10px; border-radius: 6px; margin-top: 16px; }
          .outsource { background: #fef2f2; border: 1px solid #fca5a5; 
                       padding: 10px; border-radius: 6px; margin-top: 8px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0">當日健檢流程單</h2>
            <div style="font-size:12px; color:#64748b">${apptDate} ｜ ${channel}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:22px; font-weight:bold">${customerName}</div>
            <div style="font-size:11px; color:#94a3b8">共 ${selectedItems.length} 項</div>
          </div>
        </div>

        ${stationPlan.map((group, idx) => `
          <div class="station">
            <div class="station-header">
              <span>➡ ${group.station}</span>
              <span style="font-size:12px; opacity:0.8">
                ${group.items.length}項 ｜ 約${group.totalMin}分鐘
              </span>
            </div>
            <div class="station-items">
              ${group.items.map(item => `
                <div class="item-row">
                  <div class="checkbox"></div>
                  ${item.code ? `<span class="item-code">${item.code}</span>` : ''}
                  <div>
                    <div style="font-weight:bold">${item.name}</div>
                    ${item.enName ? 
                      `<div style="font-size:11px; color:#94a3b8">${item.enName}</div>` : ''}
                    ${item.remark ? 
                      `<div style="font-size:11px; color:#b45309">⚠ ${item.remark}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}

        ${restrictItems.length > 0 ? `
          <div class="warning">
            <div style="font-weight:bold; color:#92400e; margin-bottom:6px">
              ⚠ 特殊注意事項
            </div>
            ${restrictItems.map(i => `
              <div style="font-size:12px">
                <strong>${i.name}</strong>：${i.remark}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${outsourceItems.length > 0 ? `
          <div class="outsource">
            <div style="font-weight:bold; color:#991b1b; margin-bottom:6px">
              📦 委外檢驗（結果需等待）
            </div>
            ${outsourceItems.map(i => `
              <div style="font-size:12px">
                <strong>${i.name}</strong>（${i.outsource}）
              </div>
            `).join('')}
          </div>
        ` : ''}

        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
```


### 從 Firestore 讀取既有客戶資料（跨次預填）

當護理師在後台查詢客戶時，可從 appointments collection 拉出前次紀錄，自動帶入清單：

```js
// Cloud Function 或後台管理頁面
const getPreviousVisit = async (lineUID) => {
  const q = query(
    collection(db, 'appointments'),
    where('lineUID', '==', lineUID),
    orderBy('createdAt', 'desc'),
    limit(2)  // 取最近兩次
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
};
```


***

## 最小改動清單（第一個可跑版本）

| 步驟 | 工作量 | 說明 |
| :-- | :-- | :-- |
| 1. Firebase 專案設定 | 1天 | Firestore、Hosting、Auth 開通 |
| 2. 現有 React app 加 LIFF SDK | 0.5天 | 三行初始化代碼，取 LINE UID |
| 3. 加預約 Modal + Firestore 寫入 | 2天 | 新增 BookingModal 元件、handleSubmitBooking |
| 4. 加 generateChecklist + handlePrintChecklist | 1天 | 複用現有 handlePrint 框架擴充 |
| 5. 部署到 Firebase Hosting | 0.5天 | `npm run build && firebase deploy` |
| 6. LINE Developers 設定 LIFF | 0.5天 | 填 endpoint URL |

**合計約 5–6 天**，不需要動任何現有邏輯，只是在外圍加層。

現有 app 的 `packageName`、`selectedIds`、`selectedItems`、`listPriceTotal`、`discountRate`、`finalPrice` 這六個 state 全部可以直接送進 Firestore，不需要重新設計資料結構。


---

# 屏基健檢中心目前上線的line是一個**純 LINE OA（官方帳號）+ 手動客服**的配置，**不是 LIFF，也沒有串任何後端**：

- 對話內容是人工輸入的問候語（「請提供～姓名 / 生日 / 身分證字號...」）
- 圖文選單有六個按鈕（關於我們 / 健檢套餐 / 最新消息 / 衛教資訊 / 健檢介紹 / 健檢預約）
- 帳號標示「此帳號由負責人員回覆訊息」→ 純人工回覆模式
- 沒有 Webhook、沒有 Bot、沒有 Firebase、沒有 LIFF

**這和 LIFF 完全不同。** 這是最初階的 LINE OA，等同一般店家掛的 LINE 門號，只是掛了個選單圖片。

***

## 三種技術層次的差異

| 層次 | 現在黃經理做的 | 你要規劃的 P1 | 完整三層系統 |
| :-- | :-- | :-- | :-- |
| 技術類型 | LINE OA 人工客服 | LINE OA + LIFF + Firestore | LINE OA + LIFF + Firestore + AI agent |
| 預約建檔 | 人工抄寫 | 客戶自填 → 自動寫 DB | 自動建檔 + 跨次 CRM |
| 套餐選擇 | 手動說明 | LIFF 頁面（你的 React app） | 同左 + AI 推薦 |
| 客戶識別 | 無 | LINE UID 自動綁定 | LINE UID + 身分證雙鍵 |
| D-1 通知 | 人工打字 | Cloud Scheduler 自動推播 | 同左 + 個人化清單 |


***

## LIFF 是什麼、怎麼申請

**LIFF（LINE Front-end Framework）** 是 LINE 官方提供的嵌入式網頁框架，讓你在 LINE 的聊天視窗內打開一個客製化的網頁應用程式（就是你的 React app），同時自動取得使用者的 LINE UID，不需要另外登入。[^9_2][^9_3]

### 申請步驟（免費，不需要付費）

1. 進入 [LINE Developers Console](https://developers.line.biz)，用 LINE Business ID 登入
2. 建立一個 **Provider**（例如：屏基醫療財團法人）
3. 在 Provider 下建立 **LINE Login Channel**（不是 Messaging API Channel）
4. 進入 LINE Login Channel → 點選 **LIFF 分頁** → 點選 **Add**
5. 填入：
    - LIFF app name：健檢套餐預約
    - Size：**Full**（全螢幕）
    - Endpoint URL：你的 Firebase Hosting 網址（`https://your-project.web.app`）
    - Scopes：勾選 `profile` 和 `openid`
    - Bot link feature：選 `On (Normal)`
6. 按下 **Add** → 取得 LIFF ID 和 LIFF URL（格式：`https://liff.line.me/xxxxxxx`）[^9_3][^9_4]

**LIFF 本身完全免費**，不另收費用。費用只來自 LINE OA 的訊息則數。[^9_5]

***

## 收費方式完整拆解

### LINE OA 月費方案（2026 最新）[^9_6]

| 方案 | 月費 | 免費推播則數 | 可加購 |
| :-- | :-- | :-- | :-- |
| 輕用量 | 免費 | 200 則/月 | 不可 |
| 中用量 | NT\$800 | 3,000 則/月 | 不可 |
| 高用量 | NT\$1,200 | 6,000 則/月 | 可，NT\$0.2/則起 |

**健檢中心的建議方案：中用量（NT\$800/月）**。原因：D-1 通知每天最多 30-50 人來檢，一個月約 600–1,000 人，中用量的 3,000 則完全夠用，超出再升高用量即可。[^9_5][^9_6]

### 訊息計費邏輯（關鍵）

- **Push API（主動推播，計費）**：D-1 前一天通知、預約確認、清單推送 → 消耗則數[^9_7]
- **Reply API（回應用戶訊息，免費）**：客戶主動傳訊息後的自動回覆 → 完全不計費[^9_5]
- **LIFF 頁面開啟**：不消耗訊息則數，完全免費

**實際試算**：每月來檢約 600 人，每人 D-1 推播 1 則 = 600 則，中用量 3,000 則額度，還剩下 2,400 則可用於其他推播。

### GCP 費用（你已有訂閱）

| 服務 | 用途 | 費用 |
| :-- | :-- | :-- |
| Firebase Hosting | LIFF 頁面靜態部署 | 免費（Spark 方案 10GB/月） |
| Firestore | 預約資料庫 | 免費（50K 讀/天，20K 寫/天） |
| Cloud Functions | Webhook 處理 + D-1 排程 | 免費（200萬次/月） |
| Cloud Scheduler | 每天觸發 D-1 通知 | 免費（3 個 job/月） |

**初期月成本 ≈ GCP 幾乎 \$0 + LINE OA NT\$800 = NT\$800/月**。[^9_8]

***

## 你要對黃經理提出的技術需求修正

以下是一份可以直接用來溝通的技術規格說明：

***

### 現況缺口

目前 LINE OA 是人工客服模式，缺少四個核心功能：

1. **無法自動識別客戶**：每次客戶詢問都要重新詢問姓名、身分證，無法與 HIS 或健檢紀錄連結
2. **無法讓客戶自選套餐**：現在的圖文選單只是靜態連結，點進去不能互動計價
3. **D-1 通知靠人工**：每天下午電話或手動打字通知隔天客戶，耗費人力且容易漏接
4. **無法生成個人化清單**：每位客戶的檢查項目不同，目前用紙本或手動整理

### 需要新增的技術架構

**第一層：LIFF 套餐選擇介面**

- 在現有圖文選單的「健檢套餐」和「健檢預約」按鈕，把連結改為 LIFF URL
- LIFF 頁面嵌入現有 React 套餐計價 app，客戶可在 LINE 內直接自選項目、查看金額
- 完成選擇後填寫預約資訊（姓名、日期、Channel），自動寫入 Firestore

**第二層：Webhook + Cloud Functions**

- 在 LINE Developers 設定 Webhook URL（指向 Cloud Functions）
- 用 Reply API 處理關鍵字回應（免費）
- 用 Cloud Scheduler 每天下午 4 點，呼叫 Cloud Functions 批次 Push 隔天預約客戶（計費，每人 1 則）

**第三層：資料庫（Firestore）**

- 每筆預約記錄：LINE UID、姓名、生日、電話、Channel、選擇項目、日期、狀態
- 客戶主檔：LINE UID 為主鍵，支援跨次查詢


### 移交黃經理的行動項目

1. **提供 LINE OA 的 Channel Secret 和 Channel Access Token**（在 LINE Developers 後台取得），這是串接 Webhook 的必要憑證
2. **把圖文選單的「健檢預約」按鈕連結改為 LIFF URL**（待你部署完 Firebase Hosting 後提供）
3. **在 LINE Developers 開通 Webhook**，把自動回應改為 Webhook 模式（回應功能同時開「聊天」和「Webhook」，聊天設為「手動聊天」，讓人工客服和 Bot 可以並存）[^9_7]
4. **確認 LINE OA 方案升至中用量**，確保 D-1 推播額度足夠

***

## 你的 GCP 訂閱如何串接

你已有 GCP 訂閱，直接用同一個 Google 帳號建 Firebase 專案即可：

```
GCP Console → Firebase Console（同帳號）
→ 新建 Firebase 專案
→ 開通 Firestore、Hosting、Functions、Scheduler
→ 把 Firebase Hosting URL 填入 LIFF Endpoint URL
→ 把 Cloud Functions URL 填入 LINE Webhook URL
```

LINE Bot ↔ Cloud Functions ↔ Firestore 這條路徑全部在你的 GCP 訂閱範圍內，不需要另外開帳號，費用也由你的 GCP 統一結算。[^9_9][^9_10]
<span style="display:none">[^9_11][^9_12][^9_13][^9_14][^9_15][^9_16][^9_17][^9_18][^9_19][^9_20][^9_21][^9_22][^9_23][^9_24][^9_25][^9_26][^9_27][^9_28][^9_29]</span>

<div align="center">⁂</div>

[^9_1]: 1000013333.jpg

[^9_2]: https://blog.accuhit.net/2025/06/05/line-oa經營小工具》line-liff是什麼？靠它拓展品牌官方帳號/

[^9_3]: https://www.ezpretty.com.tw/blog/inner?id=43

[^9_4]: https://ithelp.ithome.com.tw/articles/10237550

[^9_5]: https://hackmd.io/@assistive-devices/rJEQJX95be

[^9_6]: https://site-now.app/line-oa-guide/

[^9_7]: https://help.no8.io/zh-TW/articles/4161463-line-訊息費用規則-insightark

[^9_8]: https://taichunmin.idv.tw/blog/2022-09-11-gcp-functions-hosting.html

[^9_9]: https://medium.com/@tessintaiwan/integrating-line-bot-with-firebase-authentication-water-tracker-part-2-c2dbb0718344

[^9_10]: https://github.com/dlackty/line-liff-firebase-starter

[^9_11]: https://ciao-chung.com/page/article/line-message-api

[^9_12]: http://alex9ufoexploer.blogspot.com/2025/11/line-line-messaging-api.html

[^9_13]: https://vibeaico.com/blog/line-messaging-api-setup

[^9_14]: https://ithelp.ithome.com.tw/articles/10193441?sc=hot

[^9_15]: https://vocus.cc/article/677cc490fd897800017c564e

[^9_16]: https://www.da-vinci.com.tw/tw/blog/line-notify

[^9_17]: http://etrex.blogspot.com/2017/12/line-messaging-api-webhook-2018-it.html

[^9_18]: https://www.youtube.com/watch?v=Mw3cODdkaFM

[^9_19]: https://lifestyle.assist-all.co.jp/line-messaging-api-getting-started-guide/

[^9_20]: https://www.anyong.com.tw/37452

[^9_21]: https://blog.cresclab.com/zh-tw/line-oa-price-2023

[^9_22]: https://skydigital.com.tw/posts/line-official-account-pricing/

[^9_23]: https://dental-connect-production.up.railway.app/blog/19-line-oa-fee-setup-guide-2026

[^9_24]: https://docs.ezorderly.com/guide/importly/integration/lineliff

[^9_25]: https://blog.ocard.co/knowhow/lineoa-chat-advancedplan-update/

[^9_26]: https://ithelp.ithome.com.tw/articles/10375225

[^9_27]: https://docs.peajia.com.tw/home/blog/skills/linequestion

[^9_28]: https://ithelp.ithome.com.tw/articles/10375477

[^9_29]: https://codelab.line.me/codelabs/liff/index.html

---
# P3：自動生成個人化當日檢查清單（Activity-based Checklist）

每位受檢者有一份個人化 + 當日項目 + 顯示各站狀態的電子清單，取代目前護理師手動填寫的紙本流程。
電子checklist是個理想, 不過目前不可能為每位客戶配置顯示電子清單的載具
可能還是會維持手寫紙本流程
只是要先減少產出個人化當日檢查清單的人工, 先這部分自動化

P3 的本質不是「電子化載具」，而是**消滅護理師每天早上手抄清單的那 30-60 分鐘人工**。紙本繼續存在沒關係，只是讓紙本從「護理師手寫」變成「系統自動列印」。

***

## 現況的真正痛點

目前護理師每天早上要做的事：

1. 翻出隔天預約名單（可能在 Excel、紙本或 HIS 某個頁面）
2. 對照每個人的套餐，逐一查對應的檢查項目
3. 手抄或手填一張清單
4. 寫上注意事項（空腹、委外等待天數、特殊限制）
5. 每人一張，重複 N 次

這是純粹的「資料查表 + 格式填寫」，機器應該比人快 100 倍。

***

## P3 的精確定義（修正後）

> **輸入**：已知的當日預約名單（姓名 + 套餐/選項組合）
> **輸出**：每人一張 A4 PDF，直接送印，護理師只需點「列印全部」
> **載具**：紙本，維持現行流程，只是自動產出

***

## 兩種資料輸入路徑（先選一條）

### 路徑 A：從 Firestore 自動讀取（P1 建好後）

P1 預約完成後資料已在 Firestore，P3 的 Cloud Function 直接讀當天的 appointments collection，自動批次生成 PDF。這是最乾淨的路徑，但需要 P1 先上線。

### 路徑 B：今天就能用的 CSV 上傳介面（不依賴 P1）

護理師每天早上把 HIS 匯出的當日名單（一個簡單 Excel/CSV）上傳到一個網頁，系統讀入後立刻生成全部人的清單 PDF，一鍵列印。

**建議：先做路徑 B，馬上解決問題，之後無縫升級到路徑 A。**

***

## 路徑 B 的具體實作

### 輸入 CSV 格式（護理師每天填一次，或從 HIS 匯出）

```
姓名,性別,生日,套餐,加選項目,備註
王大明,男,1968/03/15,12000樂活,"腦部磁振造影(無顯影),維生素D檢測",無痛胃鏡
李小花,女,1975/08/22,7000婚前女,,
陳建國,男,1955/11/04,47000肺腦心腸胃,"NT-proBNP",已知對顯影劑過敏
```

只有六欄，HIS 能匯出前三欄，其他由護理師補填，或從預約系統來。

### 系統核心邏輯

你的 React app 已有完整的**套餐 → 項目展開**邏輯（CSV 主檔 + packages 物件），P3 直接複用這個引擎：

```js
// 現有 app 已有的邏輯，直接搬過來
const expandPackageItems = (packageName, addOns, allItems, packages) => {
  const baseItemIds = packages[packageName] || [];
  const baseItems = allItems.filter(i => baseItemIds.includes(i.id));
  
  // 加選項目（用名稱比對）
  const addOnItems = addOns
    ? addOns.split(',').map(name => 
        allItems.find(i => i.name.trim() === name.trim())
      ).filter(Boolean)
    : [];
  
  // 合併去重
  const allSelected = [...baseItems, 
    ...addOnItems.filter(a => !baseItemIds.includes(a.id))];
  
  return allSelected;
};
```


### 站別排序邏輯（這是關鍵，決定清單順序）

護理師現在手寫的清單是「依動線順序」排列，不是依分類。需要定義一個站別順序表：

```js
const STATION_ORDER = {
  '一般檢查':     { station: 'A　報到 / 量測', order: 1 },
  '理學檢查':     { station: 'A　報到 / 量測', order: 1 },
  '尿液檢查':     { station: 'B　尿液 / 糞便', order: 2 },
  '糞便檢查':     { station: 'B　尿液 / 糞便', order: 2 },
  '血液常規':     { station: 'C　抽血', order: 3 },
  '肝膽功能':     { station: 'C　抽血', order: 3 },
  '腎功能':       { station: 'C　抽血', order: 3 },
  '糖尿病檢驗':   { station: 'C　抽血', order: 3 },
  '血脂肪':       { station: 'C　抽血', order: 3 },
  '腫瘤篩檢':     { station: 'C　抽血', order: 3 },
  '賀爾蒙營養功能檢驗': { station: 'C　抽血', order: 3 },
  '心血管功能檢驗':     { station: 'C　抽血', order: 3 },
  '甲狀腺功能檢驗':     { station: 'C　抽血', order: 3 },
  '感染檢驗':     { station: 'C　抽血', order: 3 },
  '特殊功能檢查': { station: 'D　功能檢查', order: 4 },
  '心血管檢查':   { station: 'D　功能檢查', order: 4 },
  '超音波':       { station: 'E　超音波', order: 5 },
  '影像醫學':     { station: 'F　影像（X光/CT/MRI）', order: 6 },
  '腸胃內視鏡':   { station: 'G　內視鏡', order: 7 },
  '其他會診':     { station: 'H　醫師診間', order: 8 },
};
```

**這個表你需要請吳主任或護理長確認一次**，因為各醫院健檢動線略有不同。確認後就固定下來，之後不需要再改。

***

## 輸出 PDF 樣式（直接用現有列印引擎擴充）

你的 React app 已有 `handlePrint` 函式產出 HTML 列印頁。P3 只是在同一個框架上，從「一人一次」改成「批次一次印全部人」：[^11_1]

```js
const handlePrintAllChecklists = (appointments) => {
  const pages = appointments.map(apt => {
    const items = expandPackageItems(
      apt.packageName, apt.addOns, parsedItems, packages
    );
    const grouped = groupByStation(items); // 依站別排序分組
    const warnings = items.filter(i => i.remark);
    const outsource = items.filter(i => i.outsource);
    
    return `
      <div class="page" style="page-break-after: always;">
        <!-- 頭部：姓名 / 日期 / Channel / 套餐名 / 項目總數 -->
        <div class="header">
          <div class="name">${apt.name}</div>
          <div class="meta">
            ${apt.gender} ｜ ${apt.dob} ｜ ${apt.date} ｜ ${apt.channel}
          </div>
          <div class="package">${apt.packageName}　共 ${items.length} 項</div>
        </div>
        
        <!-- 依站別分組的清單（每項有空白checkbox供手寫勾記） -->
        ${grouped.map(group => `
          <div class="station-block">
            <div class="station-title">▶ ${group.station}</div>
            ${group.items.map(item => `
              <div class="item-row">
                <span class="checkbox">□</span>
                <span class="code">${item.code || ''}</span>
                <span class="name-zh">${item.name}</span>
                <span class="name-en">${item.enName}</span>
                ${item.remark ? `<span class="remark">⚠ ${item.remark}</span>` : ''}
              </div>
            `).join('')}
          </div>
        `).join('')}
        
        <!-- 底部：委外等待清單 + 特殊注意 -->
        ${outsource.length ? `
          <div class="outsource-box">
            委外檢驗（需等待報告）：
            ${outsource.map(i => `${i.name}（${i.outsource}）`).join('、')}
          </div>
        ` : ''}
      </div>
    `;
  });
  
  // 開新視窗 → window.print()
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head>
      <style>
        @media print { @page { size: A4; margin: 10mm; } }
        .page { font-family: 'Microsoft JhengHei', sans-serif; 
                font-size: 11px; }
        .header { border-bottom: 2px solid #4338ca; margin-bottom: 8px; }
        .name { font-size: 20px; font-weight: bold; }
        .checkbox { display: inline-block; width: 14px; 
                    height: 14px; border: 1px solid #333; 
                    margin-right: 6px; }
        .station-title { background: #e0e7ff; padding: 3px 8px; 
                         font-weight: bold; margin: 6px 0 3px 0; }
        .item-row { padding: 2px 0; display: flex; gap: 8px; 
                    align-items: baseline; }
        .code { font-family: monospace; font-size: 10px; 
                color: #666; min-width: 60px; }
        .remark { color: #b45309; font-size: 10px; }
        .outsource-box { background: #fef2f2; border: 1px solid #fca5a5;
                         padding: 6px; margin-top: 8px; font-size: 10px; }
      </style>
    </head><body>
      ${pages.join('')}
      <script>window.onload = () => window.print();</script>
    </body></html>
  `);
};
```


***

## 完整工作流（對護理師來說的操作）

```
每天 07:30，護理師開電腦
    ↓
打開「清單生成工具」網頁
（Firebase Hosting 部署，只是一個網頁，不需安裝任何軟體）
    ↓
上傳當日預約 CSV
（從 HIS 匯出 → 或手填六欄表格）
    ↓
系統自動展開每人的項目 → 依動線排序 → 套入模板
    ↓
預覽畫面顯示「今天 N 位受檢者」
    ↓
點「列印全部」→ 印表機一次印出所有人的清單
    ↓
護理師拿清單放在每人的夾子裡（現有動作，沒有改變）
```

**護理師的操作從「每人 5 分鐘手抄」變成「一次上傳 + 一鍵列印」。** 10 人的班以前要 50 分鐘，之後 5 分鐘搞定。

***

## 最小工作量（可獨立於 P1 先做）

| 步驟 | 時間 | 說明 |
| :-- | :-- | :-- |
| 確認動線站別順序表 | 1 次討論 | 請吳主任或護理長確認一次 |
| 把現有套餐展開邏輯抽成獨立模組 | 半天 | 從 Tao-Can-code.txt 直接搬 |
| 做 CSV 上傳 + 預覽介面 | 1 天 | 簡單的 HTML 表單 |
| handlePrintAllChecklists 函式 | 半天 | 從現有 handlePrint 改寫 |
| 部署到 Firebase Hosting | 半天 | `firebase deploy` |
| 護理師試用 + 調整格式 | 1 次試用 | 讓護理師確認欄位夠不夠用 |

**合計：2–3 天開發 + 1 次護理師試用，就能正式取代手寫流程。** 完全不依賴 HIS 串接，不依賴 P1 完成，不需要任何額外載具。
---

# 1. firestore的管理UI長什麼樣? 除了透過LIFF導入客戶預約資料

後臺可以人工整批匯入csv(如公司簽約團檢名單)嗎?

2.黃經理已將我拉進[屏基健檢中心](https://page.line.biz/account/@746kuqiy)的管理者群, 前面那個line OA是他自己做的
我還要開通那些功能, 讓後續AI agent協作好串連我的GCP架firestore database

3. 先做P1 LINE Bot 自動通知＋預約建檔 和 P3 自動生成個人化當日檢查清單
P2\&P4暫緩, 問過護理人員不是當務之急, P2甚至可以不用做
P3的"由 Customer 主檔異常旗標自動帶入（如「上次血糖偏高，請提醒加驗」）"
也不用做, 她們的系統沒有查過往健檢報告的權限, 很麻煩

重新整理三層數位系統 Implementation Plan

可以，這次就把它重新收斂成**健檢中心版、先做 P1 + P3、P2/P4 暫緩**的 implementation plan。
先直接回答你 3 個問題，再給新版三層計畫。

## 1. Firestore 後台 UI 長什麼樣

Firestore 原生後台是 **Firebase Console 裡的資料表檢視**，比較像工程用資料庫管理介面，不像醫療行政人員可直接操作的櫃台系統。它可以看 collection、document、欄位值，也能手動新增或修改單筆資料，但**不適合護理師或行政大量日常操作**。

所以實務上要分兩層：


| 層次 | 用途 | 給誰用 |
| :-- | :-- | :-- |
| Firebase Console / Firestore UI | 看資料、除錯、手動改少量資料 | 你 / 工程端 |
| 自建 Admin Web 後台 | 匯入 CSV、查名單、改狀態、列印清單 | 健檢中心行政 / 護理 |

你問的 **公司簽約團檢名單整批匯入 CSV**，答案是：**可以，而且應該做在自建 Admin 後台，不要叫使用者直接碰 Firestore Console。**
也就是做一個「名單匯入」頁面：

- 上傳 CSV
- 系統預覽欄位對應
- 檢查重複名單 / 缺欄位 / 日期格式
- 按下「批次建立 activity + customer」
- 匯入結果顯示成功幾筆、失敗幾筆、錯誤原因

這樣才符合健檢中心實務。

### 建議的 CSV 匯入分兩種

**A. customer 主檔匯入**
適合企業團檢先給員工名單

欄位建議：

- 公司名稱
- 姓名
- 身分證字號或員工編號
- 出生年月日
- 性別
- 手機
- LINE 綁定狀態（空白可）
- 備註

**B. activity 預約匯入**
適合某一場團檢已確定日期與套餐

欄位建議：

- 活動批次編號
- 公司名稱
- 健檢日期
- Channel = corporate
- 姓名
- 身分證字號
- 套餐名稱
- 加選項目
- 報到時段
- 備註

做法上是：**CSV 匯入不只是塞進 Firestore，而是跑一個 import pipeline**，把資料拆成：

- Customers collection
- Activities / Bookings collection
- ActivityItems subcollection 或 items array

這樣後面 P3 才能直接生成個人化清單。

## 2. 你現在已進 LINE OA 管理者，接下來要開通什麼

你現在被拉進的是 **LINE Official Account Manager** 管理後台，這代表你可以先碰到 OA 內容經營，但**這還不是完整開發入口**。
你若要把 OA、LIFF、Webhook、GCP、Firestore 串起來，還要補開以下幾個層次：

### A. LINE Developers 權限

這是最重要的。
你需要的不只是 OA Manager，而是該帳號對應的 **LINE Developers provider / channel 權限**，至少要能看到：

- Messaging API channel
- LINE Login channel
- LIFF tab
- Channel secret
- Channel access token
- Webhook URL 設定

沒有這些，你只能改選單和貼文，**不能真正開發 Bot / LIFF / Webhook**。

### B. Messaging API 開通

要讓 Bot 與 GCP 串接，需確認：

- 啟用 Messaging API
- 開啟 Webhook
- 取得 Channel Secret
- 取得 long-lived channel access token 或可更新 token
- 關閉純關鍵字自動回應，改由 webhook 接管主要流程
- 保留必要 welcome message / rich menu


### C. LINE Login + LIFF

若 P1 要讓客戶在 LINE 內直接選套餐與預約，需新增：

- LINE Login channel
- 在該 channel 底下建立 LIFF App
- LIFF endpoint 指向你的 Firebase Hosting 網址
- scopes 至少開 `profile`、`openid`
- Bot link 啟用


### D. GCP / Firebase 專案

你這邊需掌握：

- Firebase project owner 或 editor
- Firestore 啟用
- Firebase Hosting 啟用
- Cloud Functions / Cloud Run
- Cloud Scheduler
- Secret Manager
- Service Account 權限
- Logging / Error Reporting


### E. 後續 AI agent 協作要預留的能力

你說的是未來 AI agent 能協作，這裡重點不是先上 AI，而是**先把接口與事件流設計乾淨**。
所以現在就要保留：

- booking created event
- reminder pending event
- checklist generated event
- manual import completed event

也就是系統做每一步，都能留下結構化資料與狀態欄位。未來 AI agent 才能接手摘要、客服、排程判斷、名單整理。

## 3. 重新定義：先做 P1 + P3，P2/P4 暫緩

這個調整很對。現在不該為了「三層完整」硬做不痛不癢的功能。
目前應收斂成：

- **P1 = LINE 預約建檔 + 自動通知**
- **P3 = 自動產生紙本用個人化當日檢查清單**
- **P2 = 暫緩，可不做**
- **P4 = 暫緩**
- **Customer 主檔異常旗標回帶 = 不做**

這代表三層數位系統不是消失，而是改成**精簡版三層**：


| 層 | 現階段定義 | 先做什麼 |
| :-- | :-- | :-- |
| Channel | 來客來源 / 受檢型態 | 高階個人、企業團檢、勞工體檢、一般健保 |
| Activity | 每一筆預約 / 每一場團檢 | 建檔、通知、名單、清單產出 |
| Customer | 只保留基本主檔，不碰歷史異常整合 | 姓名、生日、手機、LINE UID、識別碼 |

也就是說，**Customer 層先當主索引，不當 CRM 深度引擎。**
這樣最符合目前健檢中心權限與流程現實。

***

## 健檢中心版 Implementation Plan v2

## A. 目標

先用 1 個最小可行架構，解決 2 個高痛點：

1. **預約與通知不要再靠人工逐一聯繫**
2. **當日個人化清單不要再靠護理師逐張手抄**

所以本期專案不追求全電子化，不追求 HIS 深串，不追求 AI 花樣，而是先把**建檔、批次處理、列印**做起來。

## B. 這期範圍

### P1：LINE 預約建檔 + 自動通知

功能包含：

- LINE Rich Menu 入口
- LIFF 套餐/預約頁
- 客戶填表送出
- Firestore 建立 customer + booking
- D-1 自動提醒
- 後台可人工新增/修改預約
- CSV 批次匯入企業團檢名單


### P3：自動生成紙本用個人化當日檢查清單

功能包含：

- 依 booking 套餐展開當日項目
- 依站別順序整理
- 產出可列印版 PDF / HTML print view
- 批次列印全部當日受檢者清單
- 後台標示已列印 / 已報到 / 已完成


### 不做

- P2 電子站點狀態追蹤
- P4 報告中文轉譯 / AI 讀片 workflow
- 歷次異常追蹤
- 歷史報告自動引用
- HIS 深度雙向串接

***

## C. 系統架構

### 1) 前台

- LINE OA Rich Menu
- LIFF Web App：套餐選擇 + 預約建檔
- 企業客戶不一定走 LIFF，可由後台批次匯入


### 2) 後台

- Admin Web
- 名單查詢
- 單筆預約建立 / 編修
- CSV 批次匯入
- 當日清單預覽
- 一鍵列印


### 3) 雲端

- Firebase Hosting：前台 LIFF + Admin Web
- Firestore：customers / bookings / import_batches / checklist_jobs
- Cloud Functions：Webhook、通知、CSV import、清單產生
- Cloud Scheduler：每天固定時間發 D-1 通知
- Cloud Storage：匯入原始 CSV、產出的 PDF

***

## D. 資料模型

### customers

保留最小必要欄位：

- customer_id
- name
- dob
- gender
- national_id_masked 或 external_id
- phone
- line_user_id
- source_channel
- created_at
- updated_at


### bookings

這是本期主表，重點都在這裡：

- booking_id
- customer_id
- channel_type
- booking_source（LIFF / admin / csv_import）
- appointment_date
- appointment_slot
- package_name
- selected_items
- add_on_items
- status（booked / reminded / checked_in / checklist_printed / done / cancelled）
- notes
- import_batch_id
- created_at
- updated_at


### import_batches

- batch_id
- company_name
- upload_file
- upload_user
- upload_time
- total_rows
- success_rows
- failed_rows
- status


### checklist_jobs

- job_id
- target_date
- generated_by
- generated_time
- booking_count
- output_file_url
- print_status

***

## E. 核心流程

## 流程 1：個人客預約

1. 客戶從 LINE OA 點「健檢預約」
2. 開啟 LIFF 頁面
3. 填基本資料、選套餐、選日期
4. 送出後寫入 Firestore
5. 系統建立 booking
6. D-1 自動推播提醒

## 流程 2：企業團檢匯入

1. 行政從公司名單整理 CSV
2. 後台上傳 CSV
3. 系統驗證欄位與重複資料
4. 匯入 customers + bookings
5. 顯示錯誤清單
6. 到提醒日自動推播，若沒有 LINE UID 則保留人工處理名單

## 流程 3：當日清單列印

1. 護理師打開 Admin Web
2. 選擇日期
3. 系統抓當日 bookings
4. 依 package + add-ons 展開項目
5. 按站別順序生成每人紙本清單
6. 一鍵列印全部
7. 狀態更新為 checklist_printed

***

## F. P1 / P3 的實際畫面清單

### 前台 LIFF

- 首頁 / 說明頁
- 套餐選擇頁
- 自選項目頁
- 預約填表頁
- 預約完成頁


### 後台 Admin

- Dashboard
- 預約列表
- Customer 查詢
- CSV 匯入頁
- 匯入結果頁
- 當日清單頁
- 列印預覽頁

***

## G. 你現在要先補齊的權限與設定清單

你可以直接丟給黃經理或廠商：

### LINE 端

- LINE OA Manager 管理權限
- LINE Developers provider 權限
- Messaging API channel 權限
- LINE Login channel 權限
- LIFF app 管理權限
- Rich Menu 編輯權限
- Webhook URL 設定權限
- Channel Secret / Access Token 可存取


### GCP / Firebase 端

- Firebase project owner/editor
- Firestore admin
- Hosting deploy 權限
- Functions deploy 權限
- Scheduler 權限
- Secret Manager 權限
- Cloud Storage 權限
- Logging viewer

***

## H. 對黃經理 / 外包要提的需求修正

建議你不要講抽象的「要串 Firebase」，而是講成**可驗收規格**：

### 必改 1：預約不能停留在聊天訊息

- 預約送出後必須建立結構化資料
- 至少寫入 bookings collection
- 可由後台查詢與修改


### 必改 2：Rich Menu 的「健檢預約」要改成 LIFF 入口

- 不是只跳聊天室
- 要開啟互動式預約頁
- 預約後可回寫資料庫


### 必改 3：企業團檢需支援 CSV 批次匯入

- 後台要有 upload + preview + import 結果
- 不能只做單筆聊天式建檔


### 必改 4：清單要能一鍵列印

- 不要求每位客戶有平板
- 但要能自動產生紙本用個人化清單
- 以取代護理師手抄

***

## I. 實施順序

### 第 0 階段：權限打通

- 拿到 LINE Developers
- 拿到 GCP/Firebase
- 盤點目前外包做到哪裡


### 第 1 階段：P1 上線

- LIFF 預約前台
- Firestore 建檔
- Admin 查詢
- D-1 通知


### 第 2 階段：P3 上線

- CSV 匯入
- 當日清單生成
- 批次列印

這樣的順序是對的，因為 **P3 要吃 booking 資料**，P1 先把資料模型打好，P3 就很順。[^12_2][^12_1]

## J. 管理重點

這版 implementation plan 的重點不是「做炫」，而是：

- 先拿回資料主權
- 先減掉人工通知
- 先減掉手抄清單
- 讓 booking 成為未來延伸的核心資料表
- 保留之後再往 AI agent、社醫部延伸的空間

你現在最值得先做的下一步，不是寫程式，而是先拉出一張 **權限/系統邊界表**，把：

- 黃經理
- 外包廠商
- 你
- 健檢中心護理/行政
- 資訊室

各自負責什麼講清楚。
不然後面最容易卡的不是技術，而是「誰能改 webhook、誰拿 token、誰能 deploy」。