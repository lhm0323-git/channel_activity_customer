# 使用者 Token 取得 API 規格文件

## 1. GetToken API 基本資訊

| 項目 | 說明 |
|---|---|
| API 名稱 | 使用者 Token 取得 API (GetToken) |
| HTTP Method | `POST` |
| Content-Type | `application/json` |
| URL | `https://orapi.ptch.org.tw/TokenAPI/v1/api/GetToken` |
| 功能 | 傳入使用者帳號與密碼進行身份驗證，取得存取系統所需之 Access Token 及 Refresh Token |

---

## 2. Request

### Request Header

```http
Content-Type: application/json
```

### Request Body

```json
{
    "userId": "07911",
    "pwd": "********"
}
```

### Request 欄位說明

| 欄位 | 型別 | 必填 | 說明 | 格式/限制 |
|---|---|---:|---|---|
| `userId` | string | 是 | 使用者帳號 / 職員編號。 | 字串，例如 `07911` |
| `pwd` | string | 是 | 使用者密碼。 | 字串（本文件不列示實際密碼內容，實作與測試時請自行帶入） |

### Request 注意事項

#### 1. `userId` 與 `pwd` 驗證

- 本 API 用於確認使用者身份，呼叫時必須同時提供有效的 `userId` 與 `pwd`。
- 若帳號或密碼輸入錯誤，將無法順利取得 Token。

#### 2. 安全性建議

- 密碼傳輸過程應確保採取安全加密連線（如 HTTPS），避免憑證洩漏。
- 密碼不應以明文方式記錄於 Log 檔案或錯誤訊息中。

---

## 3. Response

### HTTP Status Code
`200 OK`

### Response Body

```json
{
    "access_token": "<JWT_ACCESS_TOKEN_EXAMPLE>",
    "refresh_token": "<REFRESH_TOKEN_EXAMPLE>"
}
```

> 說明：上方為回應格式範例，`access_token`／`refresh_token` 為系統實際驗證成功後動態產生之內容，本文件不列示真實 Token 數值。

---

## 4. Response 欄位說明

| 欄位 | 型別 | 說明 |
|---|---|---|
| `access_token` | string | 身份驗證成功後頒發的 JWT 存取權限 Token，用於後續 API 請求之身份認證與授權。 |
| `refresh_token` | string | 用於當 `access_token` 過期時重新整理並取得新 Token 的刷新金鑰。 |

---

## 5. Token 流程概念

### 5.1 登入取得 Token 流程

使用者傳入帳號密碼後，伺服器驗證通過即核發 `access_token` 與 `refresh_token` 兩組 Token：

```text
                    ┌──────────────────┐
                    │  接收 Request     │
                    │ (userId & pwd)   │
                    └────────┬─────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ 驗證使用者帳號密碼   │
                  └─────────┬───────────┘
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
      【驗證成功】                   【驗證失敗】
             │                             │
             ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ 產生 Token      │           │ 回傳錯誤訊息    │
    │ access_token    │           │ (HTTP 401/400)  │
    │ refresh_token   │           └─────────────────┘
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Response        │
    │ 回傳 Token JSON  │
    └─────────────────┘
```

### 5.2 Refresh Token（換發 Token）流程

`access_token` 通常效期較短（例如數十分鐘），到期後不需要求使用者重新輸入帳號密碼，而是由前端改用 `refresh_token` 向伺服器換發新的 `access_token`：

```text
                    ┌──────────────────────┐
                    │ 接收 Request          │
                    │ (refresh_token)      │
                    └──────────┬───────────┘
                               │
                               ▼
                  ┌───────────────────────────┐
                  │ 驗證 refresh_token         │
                  │（是否存在／未過期／未被撤銷）│
                  └───────────┬───────────────┘
                              │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
      【驗證成功】                          【驗證失敗】
             │                                   │
             ▼                                   ▼
    ┌───────────────────────┐         ┌───────────────────────┐
    │ 產生新 Token            │         │ 回傳錯誤訊息            │
    │ 新 access_token        │         │ (HTTP 401)             │
    │（視系統設計）新 refresh_token│    │ 需重新登入取得新 Token   │
    └──────────┬────────────┘         └───────────────────────┘
               │
               ▼
    ┌───────────────────────┐
    │ Response               │
    │ 回傳新 Token JSON        │
    └───────────────────────┘
```

補充說明：

1. `refresh_token` 的效期通常設計得比 `access_token` 長（例如數小時至數天），僅用於換發新的 `access_token`，不應直接當作一般 API 呼叫的身分憑證使用。
2. 換發時，伺服器除檢查 `refresh_token` 是否過期外，亦須確認該 Token 是否已被撤銷（例如使用者已登出、或該 Token 已被使用過）。
3. 若系統採用「Refresh Token Rotation（輪替）」機制，每次換發成功後會同時核發一組新的 `refresh_token`，並讓舊的 `refresh_token` 立即失效，藉此降低 Token 遭盜用後被長期濫用的風險；是否採用此機制，依實際系統設計為準。
4. 若 `refresh_token` 驗證失敗（已過期、已被撤銷或不存在），伺服器應回傳錯誤（例如 HTTP 401），並要求使用者重新登入取得新的 Token，不應嘗試以錯誤或推測的資料續發 Token。

---

## 6. RefreshToken API 基本資訊

| 項目 | 說明 |
|---|---|
| API 名稱 | 使用者 Token 換發 API (RefreshToken) |
| HTTP Method | `POST` |
| Content-Type | `application/json` |
| URL | `https://orapi.ptch.org.tw/TokenAPI/v1/api/Refeshtoken` |
| 功能 | 傳入尚未過期之 `refresh_token`，換發新的 Access Token（及視系統設計換發新的 Refresh Token），使用者不需重新輸入帳號密碼 |

> 備註：URL 路徑中之 `Refeshtoken`（非 `RefreshToken`）為既有系統實際端點名稱，文件依實際端點原樣列示，串接時請注意大小寫與拼寫需與此一致。

---

## 7. Request

### Request Header

```http
Content-Type: application/json
```

### Request Body

```json
{
    "refresh_token": "<REFRESH_TOKEN_EXAMPLE>"
}
```

### Request 欄位說明

| 欄位 | 型別 | 必填 | 說明 | 格式/限制 |
|---|---|---:|---|---|
| `refresh_token` | string | 是 | 取得新 Token 的刷新金鑰（由 GetToken 或前一次 RefreshToken 回應取得） | 字串 |

---

## 8. Response

### HTTP Status Code
`200 OK`

### Response Body

```json
{
    "access_token": "<JWT_ACCESS_TOKEN_EXAMPLE>",
    "refresh_token": "<REFRESH_TOKEN_EXAMPLE>"
}
```

> 說明：上方為回應格式範例，實際數值由伺服器動態產生，本文件不列示真實 Token 數值。

---

## 9. Response 欄位說明

| 欄位 | 型別 | 說明 |
|---|---|---|
| `access_token` | string | 身份驗證成功後頒發的 JWT 存取權限 Token，用於後續 API 請求之身份認證與授權。 |
| `refresh_token` | string | 用於當 `access_token` 過期時重新整理並取得新 Token 的刷新金鑰。 |

---

## 10. 使用範例

### Request

```http
POST https://orapi.ptch.org.tw/TokenAPI/v1/api/Refeshtoken
Content-Type: application/json
```

```json
{
    "refresh_token": "<REFRESH_TOKEN_EXAMPLE>"
}
```

### Response

```json
{
    "access_token": "<JWT_ACCESS_TOKEN_EXAMPLE>",
    "refresh_token": "<REFRESH_TOKEN_EXAMPLE>"
}
```

---

## 11. 錯誤處理建議（HTTP Status Code）

| Status Code | 情境 | 建議處理方式 |
|---|---|---|
| `400 Bad Request` | 缺少必要欄位或欄位格式錯誤 | 檢查 Request Body 是否完整、格式是否正確 |
| `401 Unauthorized` | 帳號密碼錯誤，或 `refresh_token` 已過期／已撤銷／不存在 | 要求使用者重新輸入帳號密碼登入 |
| `500 Internal Server Error` | 伺服器內部錯誤 | 記錄錯誤 Log，通報系統管理人員排查 |

---

## 12. 安全性注意事項（補充）

1. 所有呼叫皆應透過 HTTPS 加密傳輸，避免帳密與 Token 於傳輸過程中外洩。
2. `access_token`、`refresh_token` 屬敏感憑證，前端與後端皆不應以明文記錄於一般應用程式 Log。
3. 建議依最小權限原則設計 Token 內容（payload），避免夾帶非必要之個人敏感資訊。
4. 正式環境串接前，請先於測試環境驗證流程與錯誤處理機制是否符合預期，本文件內容以規格說明為目的，實際欄位與行為仍應以正式環境驗證結果為準。

