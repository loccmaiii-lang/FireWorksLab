# Import system policy plan

Goal: Apply user screenshot settings, 120000cm culling, generous fixed bounds and per-GPU draw limits on selected newly created/rebuilt particles.

Architecture: private central policy helper, importer integration/strict readback/rollback, right preview measured override persisted with row and confirmation fingerprint. Source packages remain immutable. Build v2.22 at the existing HTML path.

Constraints: no new directories, no formal asset changes or Cascade playback; preserve naming, platform, selection, optional cutout, source control, cache and staged replacement invariants. No shared tool/src changes.

- [x] Reproduce old missing system/GPU policy with failing isolated tests.
- [x] Central policy, finite conservative calculation with loops/bursts and invalid-input errors; explicitly measured override, not configured source max mislabeled as measured.
- [x] New/update integration; rollback all touched system fields; skip particle performs no policy writes.
- [x] Preview input persistence, invalidation, source identity binding, busy protection.
- [x] Reviewed exact patch guards, build, complete isolated suite and unsaved native readback.
- [x] Record boundaries, version/evidence, sanitized handoff and release claim.

Verification: v2.22; 31 scripts/701 PASS lines; new policy33 + UI12 checks; native5 checks. Both unsaved probes moved to Transient, no test files, no directories, no formal changes. Real browser visual and actual playback remain unverified.
