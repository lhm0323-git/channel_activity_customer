# agent_handoff.md

## Project
CAC (Channel-Activity-Customer) health-check center MVP.

Repo: `https://github.com/lhm0323-git/channel_activity_customer`
Local root: `D:\Users\xray\.gemini\antigravity\scratch\Channel–Activity–Customer`
App root: `cac-liff-app/`

## Current Production URLs

- Firebase Hosting: `https://channel-activity-customer.web.app`
- Firebase project: `channel-activity-customer`
- Firestore database: `(default)`, `asia-east1`, Firestore Native, Standard/free tier.

## Current Goal

Deliver the first usable CAC MVP:

1. Public package selection and booking page.
2. Internal package/pricing tool.
3. Same-day booking/checklist view for nurses/case managers.
4. Firestore persistence for bookings and eventually managed packages.
5. LIFF integration next.

Deferred: HIS API, queue routing, station status tracking, AI recommendation, AI report translation.

## Current Deployment State

Completed today:

- Firebase Web App created: `cac-liff-app`.
- Hosting deployed and reachable at `https://channel-activity-customer.web.app`.
- Firestore API enabled and `(default)` database created in `asia-east1`.
- Firestore rules deployed.
- Google Auth provider was enabled by user in Firebase Console.
- A live Hosting hotfix was deployed directly to `dist` to fix garbled `????` labels in the top nav. Live bundle currently contains `員工登入` and no `????`.

Important: source and live are not fully aligned right now. `src/App.jsx` was restored to a clean buildable source after an emergency hotfix attempt. The live site includes a patched bundle for `員工登入`, but source does not yet contain the clean staff-gating UI implementation. Do not run `npm run build && firebase deploy --only hosting` until staff gating is re-applied cleanly to source, or the live login/nav hotfix may be overwritten.

Verified at end of session:

```powershell
npm test
npm run build
Invoke-WebRequest https://channel-activity-customer.web.app
```

Tests/build passed after restoring `src/App.jsx`; Hosting URL returned `200`.

## Files Added/Changed Today

Firebase/deploy config:

- `cac-liff-app/firebase.json`: Hosting config and Firestore rules/index config.
- `cac-liff-app/.firebaserc`: default project `channel-activity-customer`.
- `cac-liff-app/firestore.rules`: MVP Firestore rules.
- `cac-liff-app/firestore.indexes.json`: empty indexes config.
- `cac-liff-app/.env.example`: Firebase/LIFF env template.
- `cac-liff-app/package.json`: adds `deploy:hosting` script.
- `cac-liff-app/.gitignore`: should ignore `node_modules`, `dist`, `.env`, `.env.local`, `.firebase/`.

App logic:

- `cac-liff-app/src/core.js`: public package classification, booking payload fields, checklist logic.
- `cac-liff-app/src/core.test.js`: regression tests for public package rules and booking payload.
- `cac-liff-app/src/firebase.js`: Firebase app init, Firestore booking/checklist helpers, Auth helper functions, managed package helper functions.
- `cac-liff-app/src/liff.js`: LIFF message text fixed.

## Firestore Rules Currently Deployed

Collections:

- `customers/{customerId}`
  - public create allowed for booking flow.
  - read allowed only when signed in.
  - update/delete denied.
- `bookings/{bookingId}`
  - public create allowed for booking flow.
  - read/update allowed only when signed in.
  - delete denied.
- `checklists/{bookingId}`
  - public create allowed for booking flow.
  - read/update allowed only when signed in.
  - delete denied.
- `managedPackages/{packageId}`
  - public read allowed so public UI can load managed packages.
  - create/update allowed only when signed in.
  - delete denied; use soft delete.

Security caveat: signed-in means any Google account unless allowlist/custom claims are added. Next hardening step is staff allowlist.

## Data Persistence State

Bookings:

- Public booking writes to Firestore collections: `customers`, `bookings`, `checklists`.
- `buildBookingPayload()` now includes `customerName`, `customerPhone`, and `idNumberMasked` in booking payload in source, so internal list/CSV can avoid joining `customers`.

Packages:

- Source has Firebase helper functions for `managedPackages`:
  - `listManagedPackages()`
  - `saveManagedPackage()`
  - `deleteManagedPackage()` soft-deletes with `deleted: true`
- Clean source wiring in `App.jsx` still needs to be re-applied. Current source internal package edits may still rely on localStorage. This is the next main implementation task.

## Public Package Rules

Current intended rules:

- Public UI shows less detail than internal UI.
- Single item prices are hidden from public UI.
- Public cards show highlights first; `查看全部` expands full item list.
- `甲狀腺` should be available under `一般` when it exists as an internal package.
- `3500公教` and `4500公教` belong only to `公教`, not `一般`.
- `7000婚前女` and `7200婚前男` belong to `婚前`, not `高階`.
- High-end starts around `8000馬年` and above.
- Enterprise/labor packages remain separate and should not be mixed into general public options until their data is ready.

Highlight exclusions include low-attraction/basic items such as general exam, body fat, physician physical, IOP, UA, CBC/DC, liver/kidney basics, chest X-ray, lipids, fasting glucose, hepatitis antigen/antibody, and EKG.

Gotcha: do not broadly match `/CT/i`; it misclassifies `Pulmonary Function Test` because `Function` contains `ct`. Use stricter CT/CTA matching.

## Commands

Local dev:

```powershell
cd cac-liff-app
npm install
npm run dev
```

Tests/build:

```powershell
npm test
npm run build
```

Deploy Hosting after source is safe:

```powershell
npm run deploy:hosting
```

Deploy Firestore rules:

```powershell
firebase deploy --only firestore --project channel-activity-customer
```

## LIFF Next Step

LINE Developers:

- Create LIFF app.
- Endpoint URL: `https://channel-activity-customer.web.app`
- Scope: at least `profile`; add `openid` later if ID token validation is needed.
- Put LIFF ID into `cac-liff-app/.env.local` as `VITE_LIFF_ID=...`.
- Rebuild and deploy Hosting only after source is aligned.

## Next Tasks For Tomorrow

1. Re-apply staff gating cleanly in `src/App.jsx` source:
   - Top nav: public sees `民眾方案` + `員工登入` only.
   - Signed-in staff sees `內部工具`, `當日清單`, and `登出`.
   - Use `watchStaffAuth`, `signInStaff`, `signOutStaff` from `src/firebase.js`.
   - Avoid editing generated `dist` directly except emergency hotfixes.

2. Wire managed package persistence in source:
   - Load `managedPackages` on app startup.
   - Merge active managed packages into `userPackages/packageMeta`.
   - Save internal package edits to Firestore.
   - Soft-delete packages via `deleted: true`.
   - Keep localStorage fallback only for local demo/offline.

3. Internal booking list:
   - Staff-only date filter reads Firestore `bookings`.
   - Add CSV export from loaded bookings.
   - Keep A4 checklist print.

4. Security hardening:
   - Add staff allowlist or custom claims. Current rules trust any Google signed-in user.
   - Consider separating public package reads from staff package writes.

5. After source alignment:
   - `npm test`
   - `npm run build`
   - `firebase deploy --only hosting,firestore --project channel-activity-customer`
   - Verify live JS has no `????` and includes `員工登入`.

## Do Not Forget

- `.env.local` contains real Firebase config and should not be committed.
- `dist/` and `.firebase/` should not be committed.
- The live site currently has a bundle hotfix that is not represented by source. Fix source before the next normal deploy.
