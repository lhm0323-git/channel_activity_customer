# agent_handoff.md

## Project
CAC (Channel-Activity-Customer) health-check center MVP.

Repo: `https://github.com/lhm0323-git/channel_activity_customer`
Local root: `D:\Users\xray\.gemini\antigravity\scratch\Channel–Activity–Customer`
App root: `cac-liff-app/`

## Production

- Firebase Hosting: `https://channel-activity-customer.web.app`
- LIFF ID: `2010725321-sRRkD0Le`
- LIFF URL: `https://liff.line.me/2010725321-sRRkD0Le`
- Firebase project: `channel-activity-customer`
- Firestore: `(default)`, `asia-east1`

Source and live Hosting are currently aligned. Normal `npm run build` + Firebase deploy is safe if tests pass.

## Current MVP Scope

Completed working surface:

1. Public package selection with card/table comparison and LIFF deep links.
2. Public booking create flow.
3. Public `My bookings / reschedule` view with reschedule request and cancel booking.
4. Staff Google login gated by `VITE_STAFF_EMAILS` or Firestore `staffUsers`.
5. Internal package/pricing tool with managed package persistence.
6. Booking list tab with date range, channel filter, sorting, editable booking modal, confirm/cancel, CSV import/export, selected print.
7. A4 checklist print flow.

Deferred: HIS API, real queue routing, station completion tracking, D-1 LINE push job, questionnaires/consent forms, AI recommendation, AI report translation.

## Most Recent Verified Changes

2026-07-22:

- Fixed staff login so Firestore `staffUsers/{email}` accounts work after being added in the admin UI.
- Firestore rules now compare staff email with `request.auth.token.email.lower()`.
- Fixed booking list scrolling by giving the booking list its own scroll container and sticky header.
- Fixed public `My bookings / reschedule`:
  - removed broken `buildChangeRequestPayload` call;
  - sends `bookingChangeRequests` directly;
  - shows full-width mobile date input;
  - removes booking id display;
  - adds `Cancel booking` button;
  - cleaned garbled Chinese labels in that panel.
- Deployed Hosting and Firestore rules where needed.

Verification run:

```powershell
cd cac-liff-app
npm test
npm run build
firebase deploy --only hosting --project channel-activity-customer
```

Last deployment completed successfully. Firestore rules compile passed during the staff-login rules deploy.

## Firestore Collections

- `customers/{customerId}`: public owner data; staff can read.
- `bookings/{bookingId}`: booking records.
  - owners can read their own bookings;
  - owners can only cancel their own booking by changing `status/cancelledAt/updatedAt`;
  - staff can update booking details.
- `bookingChangeRequests/{requestId}`: public reschedule requests; staff approves.
- `checklists/{bookingId}`: generated checklist data.
- `managedPackages/{packageId}`: public reads; staff creates/updates; soft delete only.
- `staffUsers/{email}`: staff account allowlist managed by admin UI.

Admin email hardcoded in rules/source: `lhm0323@gmail.com`.

## Important Current Behavior

Public users:

- Can create bookings through LIFF/public page.
- Can query their own bookings through `?view=my-bookings`.
- Can request reschedule; request appears in staff booking list pending area.
- Can cancel their own booking; record remains with `status = CANCELLED`.

Staff users:

- Admin can add staff Gmail accounts in `預約清單` tab.
- Newly added staff may need to sign out/in again.
- Booking list can scroll when rows exceed screen height.
- Clicking a booking row/details opens editable modal.

## Known Gaps / Next Tasks

1. D-1 LINE automatic reminder:
   - needs Cloud Scheduler or scheduled Cloud Function;
   - track `d1NoticeSentAt`, `d1NoticeStatus`, `d1AcknowledgedAt`;
   - add customer acknowledgement link/button later.
2. Reschedule workflow is request-based only:
   - public request does not directly change appointment date;
   - staff must approve from pending changes.
3. Questionnaire/consent module not started.
4. Booking CSV import exists but needs real enterprise HR sample validation.
5. UI still has some older garbled labels outside recently touched panels; fix only when encountered.
6. Bundle size warning remains; skip code splitting until it causes measurable load issues.

## Commands

Local dev:

```powershell
cd cac-liff-app
npm install
npm run dev
```

Test/build:

```powershell
npm test
npm run build
```

Deploy:

```powershell
firebase deploy --only hosting --project channel-activity-customer
firebase deploy --only firestore:rules --project channel-activity-customer
firebase deploy --only hosting,firestore:rules --project channel-activity-customer
```

## Do Not Commit

- `cac-liff-app/.env.local`
- `cac-liff-app/dist/`
- `cac-liff-app/.firebase/`
- `cac-liff-app/node_modules/`
- temporary scripts such as `tmp-*.mjs` / `tmp-*.cjs`
- user-provided PDFs unless explicitly requested

## Current Untracked Files To Treat Carefully

At the time of this handoff there were untracked local artifacts such as budget docs/PDFs and `cac-liff-app/tmp-check-packages.mjs`. They were intentionally not included in the app commit unless explicitly requested.