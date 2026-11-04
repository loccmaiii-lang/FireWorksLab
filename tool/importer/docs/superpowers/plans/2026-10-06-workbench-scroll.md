# Workbench scrolling implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Keep the global header, tool heading and navigation stable while the right work area scrolls above the log dock.
**Architecture:** Viewport grid with a non-scrolling heading and one scroll root containing the original six panels. Preserve per-tool positions in session storage; retain current busy guard, mobile drawer, log resize measurement and original inputs.
**Tech Stack:** HTML, CSS grid, plain JavaScript, Python builder, Node/jsdom.

## Global constraints
No new directories. No UE requests beyond mocked existing initialization. Do not change importer/engine/parameter data. Same production filename; immutable original remains unchanged. Offline checks are not real browser visual approval.

### Task 1: Scroll ownership
Files: create workbench-scroll.css, workbench-scroll.js and check-workbench-scroll.cjs; modify build.py and the existing log CSS expectations.
- [x] Write a failing check that requires `.wb-page-scroll`, separate heading, body overflow hidden, grid height constraints, per-tool positions and busy guard.
- [x] Run `node check-workbench-scroll.cjs` on v2.16 and record failure.
- [x] Add grid `auto minmax(0,1fr)` rows to `.app` and `.content`; make `.mainbody` a two-column constrained grid. Reserve `var(--wb-log-height)` in content padding. Move original panels with `root.append(panel)` into the focusable scroll root; wrap switchPanel after existing presentation initialization to capture/restore positions only on a real page switch.
- [x] Keep mobile sidebar fixed drawer; make desktop sidebar an independently scrollable flex column, keep navigation groups non-shrinking. Sticky footers use bottom:0 inside the reserved scroll root.
- [x] Build v2.17 and verify new checks. Check native nested textarea/table scrolling, log collapse/error expansion, and restored per-tool positions without replacing original input nodes.

### Task 2: Release
Files: run-show-project-checks.py, README.md, CHANGELOG.md, existing backups release record; sanitized public dialogue/state/charter/handoff/update records.
- [x] Add the new check to the explicit offline runner; run all 25 scripts. Failures must be resolved without loosening engine preservation assertions.
- [x] Record build/original hashes, source backups and test counts in the existing backups directory. Update usage and release notes, publish only sanitized collaboration records and release claim.

Execution stays inline under user authorization; the referenced execution skills are unavailable. No subagent dispatch.
