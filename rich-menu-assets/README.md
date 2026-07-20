# 屏基健檢中心 LINE Rich Menu v5

Image: `pch-health-rich-menu-v5-2500x1686.png`
Size: `2500 x 1686`
Layout: `3 columns x 2 rows`

## v5 UI Notes

- 依手機實際顯示裁切感，減少格內留白並盡量放大文字。
- 回到 v3 的大視覺比例，但主標與副標再放大。
- Icon 放大並固定在上方，文字下移到約 1/3 高度，避免重疊。
- 文字左對齊，保留手機縮小後的可讀性。
- 移除每格重複的「屏基健檢中心」，降低無效資訊。
- 重新區分 icon：
  - 找方案：放大鏡 + 文件
  - 我的預約：月曆 + 循環箭頭
  - 來檢須知：清單 + 餐具
  - 報到流程：QR + 動線箭頭
  - 報告追蹤：報告 + 趨勢線
  - 聯絡交通：電話 + 地圖線索

## Action Areas

| Area | Label | Bounds x,y,w,h | URL |
|---|---|---:|---|
| 1 | 找方案 / 預約 | `0,0,833,843` | `https://liff.line.me/2010725321-sRRkD0Le?view=packages` |
| 2 | 我的預約 / 改期 | `833,0,833,843` | `https://liff.line.me/2010725321-sRRkD0Le?view=my-bookings` |
| 3 | 來檢須知 | `1666,0,834,843` | `https://liff.line.me/2010725321-sRRkD0Le?view=prep` |
| 4 | 報到 QR / 流程 | `0,843,833,843` | `https://liff.line.me/2010725321-sRRkD0Le?view=checkin` |
| 5 | 報告追蹤 | `833,843,833,843` | `https://liff.line.me/2010725321-sRRkD0Le?view=followup` |
| 6 | 聯絡交通 | `1666,843,834,843` | `https://liff.line.me/2010725321-sRRkD0Le?view=contact` |

## Upload Note

Use `pch-health-rich-menu-v5-2500x1686.png` for the LINE OA rich menu image. Set each area action as `Link` and paste the corresponding LIFF URL.




