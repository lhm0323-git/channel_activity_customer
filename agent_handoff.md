# agent_handoff.md

## Project
CAC (Channel-Activity-Customer) health-check center MVP.

Current repo target: `lhm0323-git/channel_activity_customer`.

## Current Goal
First deliverable is not a full smart health platform. It is:

1. Public-facing LIFF-style package selection and booking MVP.
2. Internal staff package/pricing tool preserved from the old React app.
3. Admin same-day printable checklist view.

P2 queue routing, HIS integration, AI recommendations, and AI report translation are deferred.

## Important Files

- `套餐code.txt`: original single-file React package/pricing app and source CSV data.
- `CAC project.md`: prior discussion and project context.
- `健檢中心三層數位系統 Implementation Plan v2.1（2026 下半年）.md`: current scoped implementation plan.
- `cac-liff-app/`: current runnable Vite React MVP.
- `cac-liff-app/src/App.jsx`: UI modes, booking modal, admin checklist view, old internal package tool.
- `cac-liff-app/src/core.js`: CSV parser, pricing, public package filtering/highlights, booking payload, checklist logic.
- `cac-liff-app/src/core.test.js`: regression tests for parser, pricing, booking, checklist, public package rules.
- `cac-liff-app/src/firebase.js`: Firestore writes/reads with localStorage fallback.
- `cac-liff-app/src/liff.js`: LIFF init and LINE profile handling.

## How To Run

```bash
cd cac-liff-app
npm install
npm run dev
```

Local URL is usually `http://127.0.0.1:5173/`.

## How To Test

```bash
cd cac-liff-app
npm test
```

`npm run build` works outside the Windows sandbox. Inside this agent sandbox it commonly fails with Vite `spawn EPERM`; that is an environment issue, not necessarily a code failure.

## Current UI Modes

- `民眾方案`: simplified public package cards and booking entry.
- `內部工具`: full internal package/pricing/quote workflow from the old app.
- `當日清單`: date-filtered bookings and A4 print checklist.

## Public Package Rules Implemented

Public UI intentionally shows less than internal UI.

Audience filter:

- `一般`: general packages only.
- `高階`: high-end packages only, generally `8000馬年` and above or explicitly high-end names.
- `公教`: public-servant packages only. `3500公教` and `4500公教` must not appear under `一般`.
- `婚前`: premarital packages only. `7000婚前女` and `7200婚前男` must not appear under `高階` even if list price crosses the high-end threshold.
- Enterprise group and labor packages are hidden from public UI for now.

Body filter currently keeps only:

- `心血管`
- `肺部`
- `腦部`
- `腸胃`

Removed from public body filter: `基礎`, `抗老`, `全身`, `肝腹`, `甲狀腺`.

Hidden or non-public package columns:

- Exact package name `甲狀腺` is hidden from public cards because it came from the CSV header but is not considered an internal package offering for public selection.

Public highlights exclude basic/low-attraction items:

- 一般檢查
- 體脂肪檢測
- 醫師理學
- 氣壓式眼壓測定
- 尿液常規檢查
- 全血計數全套&白血球分類
- 肝膽功能全套
- 腎功能全套
- 胸部X光
- 血脂肪全套
- 飯前血糖
- B、C型肝炎抗原抗體
- 靜態心電圖 / EKG

Grouped public highlights:

- Tumor markers -> `腫瘤標記篩檢`
- Ultrasound -> `超音波檢查`
- CT/CTA -> `CT/CTA 影像檢查`
- MRI -> `MRI 影像檢查`
- Endoscopy -> `腸胃內視鏡`
- Cardio tests -> `心血管功能檢查`
- Thyroid tests -> `甲狀腺檢查`
- Hormone/nutrition -> `賀爾蒙/營養功能`
- Bone density -> `骨質密度檢查`

Important gotcha: do not use broad `/CT/i` matching. It misclassified `Pulmonary Function Test` because `Function` contains `ct`. Current logic uses stricter CT matching.

## Public Detail Behavior

On public cards:

- Initial `包含項目 / 檢查意義` shows major display items only.
- `查看全部` expands to all package items, like the previous version.
- Public cards never show single-item prices.
- Internal mode still shows full item/pricing details.

## Booking And Checklist

Booking modal collects:

- name
- birthday/id field
- phone
- channel
- appointment date
- notes

Write path:

- With Firebase env vars: Firestore `customers`, `bookings`, `checklists`.
- Without Firebase env vars: localStorage fallback for demo/testing.

Checklist generation:

- `generateChecklist()` groups `selectedItems` by `STATION_MAP` in `src/core.js`.
- `remark` items become warnings.
- `outsource` items go to outsource area.

## Known Deferred Work

- Real LINE LIFF production setup.
- Firebase project and `.env.local`.
- Cloud Scheduler / Cloud Function D-1 LINE push notification.
- Google Sheets or CSV export for health-manager transition workflow.
- HIS API.
- Queue routing and station completion tracking.
- AI translation/recommendation.

## Development Notes

- Prefer changing `src/core.js` for package classification bugs; UI should consume normalized card data.
- Keep public package logic covered in `src/core.test.js` before changing rules.
- Do not expose enterprise/labor group packages in public UI until their separate package data is ready.
- Do not add public packages that internal staff cannot select.
- Avoid new dependencies unless clearly needed.
