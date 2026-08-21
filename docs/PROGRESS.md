# Progress index

This file is an index and retention policy, not a session-start context dump.
For the current takeover state, read `../agent_handoff.md`.

## Active record

- Current branch, dirty state, verification, blockers, and next action: `../agent_handoff.md`
- Current architecture and integration boundary: `CAC_ARCHITECTURE.md`
- Current product roadmap: `../健檢中心三層數位系統 Implementation Plan v2.2（2026 下半年）.md`
- Hospital IT operating handoff: `IT_INTEGRATION_GUIDE.md`

## Archived history

- Progress through 2026-08-20: `archive/PROGRESS_THROUGH_2026-08-20.md`
- Handoff history through 2026-08-20: `archive/HANDOFF_HISTORY_THROUGH_2026-08-20.md`
- Superseded implementation plans v2.0/v2.1: `archive/plans/`

Archived files are not default agent context. Read them only for historical evidence, regression archaeology, deployment provenance, or a specifically dated decision.

## Maintenance policy

- Keep `agent_handoff.md` at roughly 50-60 lines and replace stale state instead of appending a diary.
- Record only current branch/commit, task-owned dirty files, verification results, blockers, and the first next action.
- Use Git history for completed implementation details; do not duplicate every commit in both handoff and progress documents.
- Archive accumulated chronological notes at a dated boundary rather than allowing this index to grow indefinitely.
- Update `CAC_ARCHITECTURE.md` only when a structural or integration boundary changes.
- Keep only the newest approved implementation plan at the repository root; move superseded plans to `docs/archive/plans/`.

## 2026-08-20

- Added global and repository quota-safe working rules.
- Preserved the previous handoff and progress documents byte-for-byte in `docs/archive/`.
- Replaced the active handoff with a concise current-state document.
- Baseline `npm test` and `npm run build` passed; no application refactor, commit, push, or deployment was performed.

