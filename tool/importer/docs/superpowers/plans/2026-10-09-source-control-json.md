# Source-control save receipt repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve saved-asset evidence and the actual source-control failure when UE returns FText.
**Architecture:** Normalize only Python error text at the JSON boundary; preserve strict disk and source-control verification. Execute inline using available tools; subskills are not available in this session.
**Tech Stack:** Existing HTML/JS importer, generated UE Python 2.7, Node isolated backend tests.

## Global Constraints
No new directories, user asset writes, native cleanup, automatic retry, or private source upload. Existing source-control errors must remain failures. Reuse production entry and backup as flat files. Scope excludes the pending Material design proposal.

- [x] Diagnose actual log failure and verify twelve files on disk; claim sanitized scope before source edits.
- [x] Back up private source and production HTML; hash affected disk files.
- [x] Add check-import-source-control.cjs executing the actual generated Python under UE Python 2.7. Reproduce FText JSON failure before changing code.
- [x] Normalize FText/Unicode errors, handle a mid-batch source-control disconnect without losing receipts or falsely marking success. Check failure, mixed add/edit, disabled provider, missing disk and Chinese messages.
- [x] Build version 2.24 with build.py; run new test plus check-import-recovery.cjs and check-import-update-backend.cjs.
- [x] Read-only native FText conversion verification; compare twelve file hashes unchanged. Do not rerun user import.
- [x] Update local changelog/readme, sanitized own record/handoff and release claim. Tell user connection remains external and same-name update can resume after it recovers.

Verification: 8 new + 7 recovery + 13 update + 29 baseline UI/backend + 14 interrupted recovery = 71 isolated checks passed. check-script-syntax.cjs was an incorrect command (file absent); actual check.cjs compiled the production script and passed. Native reads validated FText/Unicode only, not provider checkout. No asset writes.

Sanitized public record/handoff/release commit: c15b5b64. Full private evidence remains local.
