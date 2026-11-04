# Import compatibility implementation plan

Goal: implement the cloud importer queue authorized by “执行”, preserving ordinary imports and all existing workbench features.

Architecture: `fireworks-compat.js` owns explicit dissolve scope, canonical aliases, saved texture identity and proof. Existing plan/read/selection/import/UI layers call it. Browser storage keeps the hash registry; only saved, clean, matching Texture2D files qualify. Native material graph audit stays local. Tech stack: standalone HTML, JavaScript, Python via the existing UE bridge, isolated Node/DOM checks.

Constraints: no new directories, no parent material creation, no existing asset reimport/migration, no Cascade opening/playback. Preserve mobile1024/HD2048/ASTC, single sided materials, original source, source control and staged particle updates. The obsolete cascade_low.json proposal is cancelled. Existing color material needs a separate contract, not the gray role.

- [x] Claim and flat-backup exact source and production hashes; read exporter fingerprint algorithm (CRC32/FNV1a/length over PNG bytes).
- [x] Reproduce `validate(base)` rejecting class dissolve and material texture binding; save failing output in backups/20261008-compat-failing.log.
- [x] Implement `dissolveValidationErrors(spec)` with explicit1×1/index2/R/fullcurve scope and shared-MI mixed-mode rejection. Implement `dynamicInput(em,params,role,index)` retaining marked progress and zeroing unmarked progress.
- [x] Add texture dissolve mapping, linear setting, active material scalar/vector binding and strict native readback; preserve ordinary neutral policy.
- [x] Implement `canonicalTexturePlan(spec,assets)` for same-file Ramp/Cutout aliases and `writeAssetEntries(it)` for unique physical writes. Alias selection changes all logical references together; target conflicts retain protection for different source bytes.
- [x] `readPack(dir,configFile='cascade.json')` accepts only two filenames, validates relative texture paths and exporter hash, binds source/texture SHA256. PC/mobile selection persists with record and invalidates confirmation; extras remain ignored; mobile GPU errors before writing.
- [x] `planTextureReuse(it)` maps already saved matching hash/SHA/platform assets and `verifyTextureReuse(it)` checks class/diskHash/dirty/settings before writes. `registerTextureFingerprints` runs after verified texture save; borrowed targets never enter save/backup/checkout. Batch collision guard allows same-content texture writes to share the first target; execute checks the newly saved proof before skipping duplicates.
- [x] Build same HTML entry atv2.23, run explicit isolated regression list plus compatibility and native unsaved/read-only checks. Review exact patches against the flat baseline, not replace with older snapshots.
- [x] Return sanitized color contract and completion evidence through existing shared docs; distinguish native property checks from actual visual/playback acceptance, release claim and push safely.

Self review: all current queue items covered, obsolete third pack excluded, source and target change gates retained. Helper names above match the implementation. User already chose execution; continue inline without another permission question.

Native cleanup incident: 5 property checks passed before a later empty-package quarantine-save command caused UE fatal path conversion. User informed; no further native operations. Duplicate test asset quarantined/pending add reverted; probes disabled. Production changes and isolated tests are complete; recovery inspection, full native import/playback and actual browser visual acceptance remain pending.

Recovery inspection passed read-only after user reopened UE: all four test files/objects/added/checkouts absent; zero dirty content packages. Full native import/playback and browser visual acceptance remain unverified.
