# CAC Codex Working Rules

## Start and scope

- Before changing anything, confirm this repository, the active branch, the dirty baseline, and the requested edit boundary.
- Preserve all pre-existing modified and untracked files. Do not stage, revert, reformat, or otherwise absorb unrelated changes.
- Treat `cac-liff-app/src/App.jsx` as a large-file hotspot. Start with `rg` or symbol search, then read the smallest dependency cone that covers the relevant state, effects, handlers, render branch, tests, and interfaces. Expand when correctness requires it; do not use a fixed line window or an absolute full-file ban.
- Keep application refactors separate from feature work. Prefer a clean, dedicated slice; when the user explicitly authorizes work against a documented dirty baseline, extract one low-coupling or vertical feature at a time without absorbing unrelated changes.

## Context and documentation

- Read `docs/CAC_ARCHITECTURE.md` for the current system map. Do not load archived progress or handoff history unless the task needs historical evidence.
- Use `agent_handoff.md` as the concise current-state handoff. Use `docs/PROGRESS.md` only as the history index and archive policy.
- Update the architecture map after structural changes. Keep handoff pointers symbol- or feature-based; line numbers become stale.

## Verification

- For JavaScript logic changes, run `npm test` from `cac-liff-app/`.
- For any UI or bundling change, run both `npm test` and `npm run build`.
- For material interaction, authentication, booking, administration, questionnaire, or print changes, also run a focused browser smoke test and record the scenarios checked.
- Run the relevant Firebase emulator suite for Functions or Firestore rule behavior when its prerequisites are available.
- `npm test` alone is not sufficient evidence for `App.jsx`; it currently exercises core logic rather than rendering the React UI.

## Failure circuit breaker

- Count failures by the same error signature or root cause, not by total failed commands.
- After two attempted fixes fail to improve the same error, stop further mutation for that error. Record the command, concise error, attempted fixes, current diff, and the next diagnostic step in `agent_handoff.md`.
- A sandbox or permission failure is not an application-test strike. Retry once through the approved execution path when appropriate.

## Git checkpoints

- Never use `git add .`, `git add -A`, or an equivalent broad staging command.
- Stage only explicit task-owned paths after reviewing the baseline and diff.
- Commit only a coherent, verified slice. Do not commit a failing state unless the user explicitly authorizes a WIP checkpoint branch.
- Push only when the task or repository has explicitly authorized it, the remote branch is known, the commit contains no pre-existing changes, and required verification has passed.
- Low quota or long context does not broaden commit, push, deployment, or destructive-operation authority.

## Deployment boundary

- Do not deploy Hosting, Functions, Firestore rules, secrets, or production data without explicit authorization for that deployment target.
- Never commit credentials, LINE tokens, OAuth secrets, hospital passwords, patient data, `.env*`, `node_modules/`, `dist/`, `.firebase/`, or temporary artifacts.
