# Interrupted import recovery implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Repair the native read-only PixelFormat failure and allow partial packages to update existing assets and create missing assets.
**Architecture:** Explicit native text-map write with full readback; mixed update target plan, particle existence determines creation versus swap/rollback. Version-control failures remain errors. Existing source backups are flat files.
**Tech Stack:** plain JS, CSS shell unchanged, Python build, Node DOM/backend checks, existing native API.

## Global constraints
No new directories, deletion, Cascade playback, shared tool/src edits or public private-source upload. Existing asset writes are limited to the authorized importer repair; safe native probes use transient objects only.

### Task 1: Format and partial recovery
Files: fireworks-policy.js, fireworks-update.js, fireworks-import.js, fireworks-ui.js; check-import-interrupted.cjs; existing fixture and exact preservation checks.
- [x] Regression rejects Python `set_editor_property('pixel_format',...)` and requires mixed existing-texture/missing-particle validation. Record failure on v2.17.
- [x] Write the native ForcePlatformSettings map as `(("Android",(PixelFormat=PF_ASTC_6x6)),...)` through the existing property API, preserving other keys. Read back every platform and limit before save. Never overwrite existing unknown struct fields silently.
- [x] Update mode allows a missing particle when at least one selected target exists; entirely absent selected targets point to new mode, unreadable disk assets/type/source/lock checks still block.
- [x] For missing particles explicitly create first, use initial system setup, synchronize LOD/cache, and rollback only an actually pre-existing particle. Backup existing assets only, defer source-control add for memory-only assets until saved.
- [x] Include imported-memory counts on failures and explain partial recovery without changing numbering.

### Task 2: Native validation and release
- [x] Safely test native field write/readback on transient texture without creating asset files. Test mixed target pipeline, existing rollback, disk failure, source-control failure, entirely absent targets and exact preservation assertions.
- [x] Build v2.18, run explicit full isolated suite, record hashes and native boundaries. Update local usage and sanitized public handoff, release claim.

Execution inline; referenced execution skills unavailable. The user authorized fixes; no new agent delegation.
