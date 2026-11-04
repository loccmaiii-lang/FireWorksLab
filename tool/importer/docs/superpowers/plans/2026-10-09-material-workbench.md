# Selected Material workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the user-approved 2026-10-09 Material workbench visual and interaction contract in the existing standalone HTML.
**Architecture:** Preserve existing controllers/IDs/state/engine closures. A common semantic theme supplies six-page styling; the import-specific workspace stylesheet replaces compressed three-pane styling. A small presentation module owns ripple, toast, responsive view selection and field accessibility, without storing domain data. Execute inline with available tools; no subagent raster work is needed because the target has no new raster content and supplies the existing brand.
**Tech Stack:** Existing HTML/CSS/JS, Python builder, Node/jsdom isolation. Offline Material icon assets from official source embedded in the HTML.

## Global Constraints
No new directory, no UE writes or live importer actions, no private source/ID/media upload. Preserve v2.24 save receipts and all naming/platform/selection/backup policies. Source visual: df-workbench-material3-draft_20261009.png (1672x941); interaction contract: df-workbench-material3-design_20261009.html. Keep original entry, data keys and desktop shortcut. Browser rejects file protocol; no equivalent HTTP/raw-browser workaround. Explicitly block visual QA if capture remains unavailable.

### Task 1: Common Material presentation
Files: create material.css/material.js/material-icons.json in existing workbench; modify build.py and shell.html. Consume existing controls; add only presentation data attributes. Theme roles/18px groups/16px fields/14px asset rows, visible focus/hover/press/disabled/busy feedback. Source icons use official library, no handwritten SVG.
- [x] Resolve chosen target and read shared rules; push claim and flat backup.
- [x] Write semantics/behavior isolation test check-material-ui.cjs before implementation.
- [x] Implement theme, icons and delegated feedback; compile production same entry as v2.25.

### Task 2: Import workspace and local scrolling
Files: replace fireworks-workspace.css; modify fireworks.html/fireworks-workspace.js and presentation hooks in fireworks-ui.js/workbench-log.js only. Keep data signatures, importOne and actual native backend unchanged.
- [x] Match batch/settings/asset panels and footer; neutral planned actions, persistent selected containers, compact explainable error.
- [x] At narrow widths switch queue/settings/preview via accessible presentation tabs; title/footer/log remain reachable. Switch view does not select or confirm anything. Restore focus if a pane becomes hidden. Keep editing inputs intact.
- [x] Log selection pauses follow; explicit latest resumes. Copy result uses accessible toast. Field errors link label/hint and keep values; disabled action supplies visible reason.

### Task 3: Verification and delivery boundaries
- [x] Run check-material-ui.cjs + existing six-page, workspace, log/scroll, selection/confirmation/update/interruption and v2.24 receipt tests. Correct only genuinely superseded presentation expectations.
- [x] Assert protected native/plan/show code hashes and original source unchanged; build.js generated scripts compile.
- [x] Write design-qa.md with honest blocked visual result if browser cannot capture; do not claim screen geometry or full accessibility validation.
- [x] Update local README/changelog/plan and sanitized shared own record/handoff/release claim. Refresh original HTML to inspect v2.25. No automatic import.

Implementation and isolated checks completed. Visual acceptance remains blocked per design-qa.md; no QA pass or live UE acceptance is claimed. No subagents, no new directories, no native operations.
