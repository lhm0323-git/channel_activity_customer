# 癌症篩檢資格查詢 API 規格文件

## 1. API 基本資訊

| 項目 | 說明 |
|---|---|
| API 名稱 | 癌症篩檢資格查詢 |
| HTTP Method | `POST` |
| Content-Type | `application/json` |
| URL | `http://129.34.70.168/CancerScreening/api/CheckCancerScreening/CheckCancerScreening` |
| 功能 | 查詢病人四癌、成人預防保健、BC肝、LDCT、HPV、胃癌等篩檢資格與相關歷史紀錄 |

---

## 2. Request

### Request Header

```http
Content-Type: application/json
```

### Request Body

```json
{
    "sRegNo": "597***",
    "sIdNo": "T121******",
    "sBirthDate": "1972/07/28",
    "sCardId": "",
    "sCheckDate": "20260108",
    "sToken": "",
    "sUserId": "g640",
    "sDepNo": "60",
    "sDocCode": "g704"
}
```

### Request 欄位說明

| 欄位 | 型別 | 必填 | 說明 | 格式/限制 |
|---|---|---:|---|---|
| `sRegNo` | string | 是 | 病歷號。系統查詢病人院內資料的重要依據。若不知道病歷號，需先透過其他 API 查詢取得。 | 依院內病歷號格式 |
| `sIdNo` | string | 是 | 病人身分證號。 | 台灣身分證字號 |
| `sBirthDate` | string | 是 | 病人出生日期。 | `yyyy/MM/dd`，西元年 |
| `sCardId` | string | 否 | 健保卡/卡片號碼。若院內沒有建檔且未提供，部分資料可能無法查詢。 | 字串 |
| `sCheckDate` | string | 是 | 執行篩檢資格判斷的日期。 | `yyyyMMdd` |
| `sToken` | string | 條件式 | 健保署相關 API 所需 Token。用於查詢成人預防保健及 B、C 型肝炎等雲端資料。 | Token 字串 |
| `sUserId` | string | 是 | 執行查詢的使用者代號/職員編號。 | 例如 `g640` |
| `sDepNo` | string | 是 | 執行查詢的科別代碼。 | 例如 `60` |
| `sDocCode` | string | 是 | 執行查詢的醫師代碼。 | 例如 `g704` |

### Request 注意事項

#### 1. `sRegNo` 病歷號

`sRegNo` 為院內病人資料查詢的重要條件。

如果呼叫端不知道病歷號，**無法直接透過本 API 完成完整查詢**，需要另外提供「身分證號＋出生日期 → 查詢病歷號」的 API。

目前尚未撰寫(要額外撰寫一隻API)

#### 2. `sCardId` 卡片號碼

如果病人的卡片號碼沒有在院內建檔，同時 Request 又沒有提供 `sCardId`，部分依賴卡片資料的查詢可能無法取得完整結果。

因此若系統端有卡片號碼，**建議一併提供**。

#### 3. `sToken`

`sToken` 用於呼叫健保署相關雲端服務。

如果沒有提供有效 Token：

- 四癌雲端資料仍可能正常取得
- 成人預防保健雲端資料可能無法取得
- B、C 型肝炎雲端資料可能無法取得
- `sAdultAndBCLiverStatusResponse.sStatus` 可能為 `false`

另外，Token 的取得通常受限於**院內環境及健保署相關服務條件**，因此非院內環境可能無法取得。

有專屬的健保署DLL取得，再入DLL 呼叫裡面的Function取得(必須院內環境)

---

# 3. Response

### Response Body

```json
{
    "sBOCWebServiceResponse": {
        "sStatus": true,
        "sMsg": "",
        "sRegNo": "597***",
        "sPName": "黃*正",
        "sIdNo": "T121******",
        "sBirthDate": "19720728",
        "sColonDate": "",
        "sOralDate": "",
        "sBreastDate": "",
        "sPssDate": "",
        "sColorectalCancer": "",
        "sOralCancer": "",
        "sBreastCancer": "",
        "sCervicalCancer": "",
        "sAboriginal": "",
        "sDisability": ""
    },
    "sAdultAndBCLiverStatusResponse": {
        "sStatus": false,
        "sCode": null,
        "sDescription": null,
        "sAdultCode": null,
        "sAdultMsg": null,
        "sBCLiverCode": null,
        "sBCLiverMsg": null
    },
    "sBOCRemark": "NNNNNN;雲端查無罹癌註記;雲端查無原住民註記;雲端查無身心障礙註記;",
    "sIC31Result": "【不符合】子抹IC31檢核：性別不符合",
    "sIC31PTCHDate": null,
    "sIC31ICDate": null,
    "sIC91Result": "【不符合】乳攝IC91檢核：性別不符合",
    "sIC91PTCHDate": null,
    "sIC91ICDate": null,
    "sIC95Result": "【不符合】口腔IC95檢核：不提示--沒有抽煙 或 (無抽煙或已戒)且從未吃過檳榔",
    "sIC95PTCHDate": null,
    "sIC95ICDate": null,
    "sIC85Result": "【符合】定量免疫法糞便潛血檢查（大腸癌）",
    "sIC85PTCHDate": null,
    "sIC85ICDate": null,
    "sIC21Result": "【無法判斷】40-64歲成人預防保健檢查：雲端資料",
    "sIC21PTCHDate": null,
    "sIC21ICDate": null,
    "sIC29Result": "【無法判斷】BC肝IC29檢核：雲端資料",
    "sIC29PTCHDate": "",
    "sIC29ICDate": "",
    "sICLDResult": "【不符合】LDCTICLD檢核：2年內已有院內LDCT記錄(IC卡)",
    "sICLDPTCHDate": "",
    "sICLDICDate": "2025/05/16",
    "sHPVResult": "【不符合】HPV IC3A、IC3B、IC3C檢核：性別不符合",
    "sHPVICDate": null,
    "sHPVPTCHDate": "",
    "sIC3FResult": "【符合】糞便抗原檢測胃幽門螺旋桿菌（胃癌）",
    "sIC3FICDate": null,
    "sIC3FPTCHDate": null,
    "sFilePath": null
}
```

---

# 4. Response 欄位說明

## 4.1 四癌雲端結果 `sBOCWebServiceResponse`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `sStatus` | boolean | 四癌雲端服務呼叫是否成功 |
| `sMsg` | string | 呼叫失敗或其他訊息 |
| `sRegNo` | string | 病歷號 |
| `sPName` | string | 病人姓名 |
| `sIdNo` | string | 身分證號 |
| `sBirthDate` | string | 出生日期，格式 `yyyyMMdd` |
| `sColonDate` | string | 大腸癌篩檢雲端日期 |
| `sOralDate` | string | 口腔癌篩檢雲端日期 |
| `sBreastDate` | string | 乳房攝影雲端日期 |
| `sPssDate` | string | 子宮頸抹片雲端日期 |
| `sColorectalCancer` | string | 大腸癌罹癌註記 |
| `sOralCancer` | string | 口腔癌罹癌註記 |
| `sBreastCancer` | string | 乳癌罹癌註記 |
| `sCervicalCancer` | string | 子宮頸癌罹癌註記 |
| `sAboriginal` | string | 原住民身分註記 |
| `sDisability` | string | 身心障礙註記 |

---

## 4.2 成人健檢及 B、C 型肝炎 `sAdultAndBCLiverStatusResponse`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `sStatus` | boolean | 雲端服務是否成功 |
| `sCode` | string | 回應代碼 |
| `sDescription` | string | 回應說明 |
| `sAdultCode` | string | 成人預防保健查詢結果代碼 |
| `sAdultMsg` | string | 成人預防保健查詢結果訊息 |
| `sBCLiverCode` | string | B、C 型肝炎查詢結果代碼 |
| `sBCLiverMsg` | string | B、C 型肝炎查詢結果訊息 |

> ⚠️ 若沒有提供有效的 `sToken`，此區塊可能無法取得資料，`sStatus` 會為 `false`。

---

# 5. 四癌及其他篩檢結果

API 會直接回傳各項篩檢的**資格判斷結果**。

結果通常包含三種狀態：

| 狀態 | 意義 |
|---|---|
| `【符合】` | 病人符合該項篩檢資格 |
| `【不符合】` | 病人不符合該項篩檢資格 |
| `【無法判斷】` | 因資料不足或外部雲端資料無法取得，無法完成判斷 |

---

## 5.1 子宮頸抹片 IC31

| 欄位 | 說明 |
|---|---|
| `sIC31Result` | 子宮頸抹片篩檢資格判斷結果 |
| `sIC31PTCHDate` | 院內子宮頸抹片紀錄日期 |
| `sIC31ICDate` | IC 卡子宮頸抹片紀錄日期 |

例如：

```text
【不符合】子抹IC31檢核：性別不符合
```

---

## 5.2 乳房攝影 IC91

| 欄位 | 說明 |
|---|---|
| `sIC91Result` | 乳房攝影篩檢資格判斷結果 |
| `sIC91PTCHDate` | 院內乳房攝影紀錄日期 |
| `sIC91ICDate` | IC 卡乳房攝影紀錄日期 |

---

## 5.3 口腔癌 IC95

| 欄位 | 說明 |
|---|---|
| `sIC95Result` | 口腔癌篩檢資格判斷結果 |
| `sIC95PTCHDate` | 院內口腔癌篩檢紀錄日期 |
| `sIC95ICDate` | IC 卡口腔癌篩檢紀錄日期 |

---

## 5.4 大腸癌 IC85

| 欄位 | 說明 |
|---|---|
| `sIC85Result` | 大腸癌篩檢資格判斷結果 |
| `sIC85PTCHDate` | 院內大腸癌篩檢紀錄日期 |
| `sIC85ICDate` | IC 卡大腸癌篩檢紀錄日期 |

例如：

```text
【符合】定量免疫法糞便潛血檢查（大腸癌）
```

---

## 5.5 成人預防保健 IC21

| 欄位 | 說明 |
|---|---|
| `sIC21Result` | 成人預防保健資格判斷結果 |
| `sIC21PTCHDate` | 院內成人健檢紀錄日期 |
| `sIC21ICDate` | IC 卡成人健檢紀錄日期 |

---

## 5.6 B、C 型肝炎 IC29

| 欄位 | 說明 |
|---|---|
| `sIC29Result` | B、C 型肝炎篩檢資格判斷結果 |
| `sIC29PTCHDate` | 院內 B、C 型肝炎紀錄日期 |
| `sIC29ICDate` | IC 卡 B、C 型肝炎紀錄日期 |

---

## 5.7 LDCT

| 欄位 | 說明 |
|---|---|
| `sICLDResult` | LDCT 肺癌篩檢資格判斷結果 |
| `sICLDPTCHDate` | 院內 LDCT 紀錄日期 |
| `sICLDICDate` | IC 卡 LDCT 紀錄日期 |

例如：

```text
【不符合】LDCTICLD檢核：2年內已有院內LDCT記錄(IC卡)
```

---

## 5.8 HPV

| 欄位 | 說明 |
|---|---|
| `sHPVResult` | HPV 篩檢資格判斷結果 |
| `sHPVICDate` | HPV IC 卡紀錄日期 |
| `sHPVPTCHDate` | HPV 院內紀錄日期 |

例如：

```text
【不符合】HPV IC3A、IC3B、IC3C檢核：性別不符合
```

---

## 5.9 胃癌 / 幽門桿菌 IC3F

| 欄位 | 說明 |
|---|---|
| `sIC3FResult` | 胃癌/幽門桿菌篩檢資格判斷結果 |
| `sIC3FICDate` | IC 卡相關紀錄日期 |
| `sIC3FPTCHDate` | 院內相關紀錄日期 |

例如：

```text
【符合】糞便抗原檢測胃幽門螺旋桿菌（胃癌）
```

---

## 5.10 其他欄位

| 欄位 | 說明 |
|---|---|
| `sBOCRemark` | 四癌雲端資料補充說明 |
| `sFilePath` | 目前未使用，預留欄位 |

例如：

```text
NNNNNN;雲端查無罹癌註記;雲端查無原住民註記;雲端查無身心障礙註記;
```

---

# 6. 各篩檢代碼對照

| 代碼 | 篩檢項目 |
|---|---|
| `IC31` | 子宮頸抹片 |
| `IC91` | 乳房攝影 |
| `IC95` | 口腔癌 |
| `IC85` | 大腸癌 |
| `IC21` | 成人預防保健 |
| `IC29` | B、C 型肝炎 |
| `ICLD` | LDCT 肺癌篩檢 |
| `HPV` | HPV 篩檢 |
| `IC3F` | 胃癌／幽門螺旋桿菌 |

---

# 8. 查詢流程概念

```text
                    ┌──────────────────┐
                    │  接收 Request     │
                    └────────┬─────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ 驗證病人基本資料     │
                  │ 病歷號/身分證/生日   │
                  └─────────┬───────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
        ┌─────────┐   ┌──────────┐   ┌──────────┐
        │ 四癌雲端 │   │ 院內資料 │   │ IC卡資料 │
        └────┬────┘   └─────┬────┘   └────┬─────┘
             │              │             │
             └──────────────┼─────────────┘
                            ▼
                   ┌─────────────────┐
                   │ 篩檢資格判斷     │
                   │ IC31 / IC91     │
                   │ IC95 / IC85     │
                   │ IC21 / IC29     │
                   │ ICLD / HPV      │
                   │ IC3F            │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Response        │
                   │ 回傳查詢結果      │
                   └─────────────────┘
```

---

# 9. 使用範例

### Request

```http
POST http://129.34.70.168/CancerScreening/api/CheckCancerScreening/CheckCancerScreening
Content-Type: application/json
```

```json
{
    "sRegNo": "597001",
    "sIdNo": "T121234567",
    "sBirthDate": "1972/07/28",
    "sCardId": "",
    "sCheckDate": "20260108",
    "sToken": "TOKEN_VALUE",
    "sUserId": "g640",
    "sDepNo": "60",
    "sDocCode": "g704"
}
```

### Response 重點

```json
{
    "sIC31Result": "【不符合】子抹IC31檢核：性別不符合",
    "sIC91Result": "【不符合】乳攝IC91檢核：性別不符合",
    "sIC95Result": "【不符合】口腔IC95檢核：不提示--沒有抽煙 或 (無抽煙或已戒)且從未吃過檳榔",
    "sIC85Result": "【符合】定量免疫法糞便潛血檢查（大腸癌）",
    "sIC21Result": "【無法判斷】40-64歲成人預防保健檢查：雲端資料",
    "sIC29Result": "【無法判斷】BC肝IC29檢核：雲端資料",
    "sICLDResult": "【不符合】LDCTICLD檢核：2年內已有院內LDCT記錄(IC卡)",
    "sHPVResult": "【不符合】HPV IC3A、IC3B、IC3C檢核：性別不符合",
    "sIC3FResult": "【符合】糞便抗原檢測胃幽門螺旋桿菌（胃癌）"
}
```

前端即可依 `【符合】`、`【不符合】`、`【無法判斷】` 判斷顯示狀態，再顯示後面的詳細原因。

---


