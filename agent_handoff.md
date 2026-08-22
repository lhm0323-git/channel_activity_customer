# Agent Handoff

This file is only the current takeover state. Historical entries are in
`docs/archive/HANDOFF_HISTORY_THROUGH_2026-08-20.md`; do not load them unless dated evidence is needed.

## Repository state

- Repo: `https://github.com/lhm0323-git/channel_activity_customer`
- Local root: `D:\Users\xray\.gemini\antigravity\scratch\Channel–Activity–Customer`
- Branch: `security-p0-staging`, tracking `origin/security-p0-staging`
- Last product/deployment commits: `cd13af4 fix: load release styles before app render`, `4e630ef fix: simplify batch booking actions`, `362a2ba fix: declare batch claim email function`
- Current product plan: `健檢中心三層數位系統 Implementation Plan v2.2（2026 下半年）.md` (2026-08-19).
- Production Hosting was redeployed on 2026-08-21 after release-style recovery; `index.html` now loads Tailwind before the application module.

## Current checkout

- Hospital employee Token API login, Firebase custom-token staff sessions, Firestore authorization, and the public-panel split are committed on `security-p0-staging`.
- v2.0/v2.1 plans and historical handoff/progress records are archived under `docs/archive/`; v2.2 is the sole current plan.
- Before a new task, start from `git status --short` and stage only task-owned paths.
- Before touching `App.jsx`, use the feature map in `docs/CAC_ARCHITECTURE.md` and search named symbols before reading a dependency cone.
- Before an authorized push, reconcile this file with the product/deployment commits being pushed; update the architecture map only if ownership or a system boundary changed.

## LINE notification follow-up on 2026-08-21

- Confirmed in production: LINE booking-success and staff-reschedule notifications work after deployment.
- Deployment requires `functions/functions.yaml` to grant `LINE_CHANNEL_ACCESS_TOKEN` to all three Functions; source annotations alone are overridden by that file.
- Added `functions/.env.channel-activity-customer` locally for `HOSPITAL_TOKEN_API_URL`; it is environment configuration and must not be committed.

## Email/OTP milestone (prepared 2026-08-22)

- Public 「我的預約」 now supports Email＋手機末四碼 OTP when LINE is unavailable; the memory-only token expires in 30 minutes, while OTP expires in 10 minutes.
- Functions keep LINE priority: only bookings without LINE use Gmail for booking, reschedule, cancellation, and D-1 notices. `functions/functions.yaml` must declare `MAILER_ENCRYPTION_KEY` for every sender.
- Passed: `npm test`, `npm run build`, release-style guard, and `npm run test:functions` (includes forged-token rejection plus cross-browser verified Email session for query, questionnaire, reschedule, and cancellation).
- Deployed 2026-08-22 08:31 Asia/Taipei: Hosting version `64da06de8fcb5fa4` and the 12 Email/OTP or notification Functions are ACTIVE; commit `8bf83b6` is pushed to `security-p0-staging`.

- Follow-up 2026-08-22: MyBookingsPanel is rendered directly within App, preventing Email/OTP input focus loss caused by nested-component remounting; Hosting version c3cb26e0169de3fb was released at 08:44 Asia/Taipei.

## Verification on 2026-08-20

- Passed: `cd cac-liff-app; npm test`.
- Passed: `cd cac-liff-app; npm run build` after the extraction.
- Sandboxed Vite initially hit Windows `spawn EPERM`; approved unsandboxed retry passed. This is not an application failure.
- Browser smoke test is pending: the Antigravity IDE session has no connectable browser instance.
- Existing Vite warning remains: one production chunk exceeds 500 kB after minification.

## Next action

1. In a browser-enabled session, smoke test the deployed public pages and the staff batch-booking / LINE-binding flow after the 2026-08-21 UI and style releases.
2. Keep the next App.jsx slice low-coupling; use the feature map and do not move shared state into hooks until ownership is clear.
3. Review the hospital-login diff and Token API contract; run `npm run test:rules` and `npm run test:functions` when emulator prerequisites are available.
4. Before every authorized push, update this handoff; update `CAC_ARCHITECTURE.md` only for an ownership or integration-boundary change.

## Safety boundaries

- Do not deploy Hosting, Functions, Firestore rules, secrets, or data without explicit target authorization.
- Do not remove the bootstrap admin before two hospital-domain administrators pass staging login and disabled-account tests.
- Never commit credentials, LINE/OAuth tokens, hospital passwords, patient data, `.env*`, `node_modules/`, `dist/`, or `.firebase/`.

## References

- Current plan: `健檢中心三層數位系統 Implementation Plan v2.2（2026 下半年）.md`
- System map: `docs/CAC_ARCHITECTURE.md`
- Hospital IT boundary: `docs/IT_INTEGRATION_GUIDE.md`
- Rules: `AGENTS.md`; history index: `docs/PROGRESS.md`
