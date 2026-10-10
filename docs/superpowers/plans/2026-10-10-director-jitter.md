# Director selection and launch jitter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Choose an exact UE director and configure repeatable per-flower launch staggering in actual8025 and the same offline HTML.

**Architecture:** connection.mjs resolves and lists read-only UE objects; explicit selection never falls back. launch-jitter.mjs computes keyed seeded delays; editing-model normalizes them into effective times shared by preview and director output. Existing native entries and original show remain unchanged unless a user edits a cue.

**Tech Stack:** existing React19/Vite6, Node tests, esbuild single-file release, GPUECli17780.

## Global Constraints
- No tool/src, shared tokens, engine code or real UE write; original programme252/1689 and v12 retained.
- Defaults jitter0, min0/max60seconds; seed saved, no runtime random; native layer offsets unchanged.
- Explicit target errors invalidate confirmation; selection and connection changes locked during writes.
- Use actual8025 first, then package once through existing build hook. File browser is policy-blocked; test HTTP artifact and disclose.
- Execute inline as user authorized; execution skills are not installed, no delegation requested.

### Task1: Exact director choice
Files: src/connection.mjs, ConnectionProvider.jsx, EnginePanel.jsx; scripts/offline-workbench/tests/connection.test.mjs.
Interfaces: resolveDirector(path,options) -> target; listDirectors(options) -> targets; probeConnection({explicit:true,preferred}) never searches on invalid selection.
- [ ] RED: assert.rejects(probeConnection({explicit:true,preferred:'/Game/Wrong.Wrong',request}),/导演/) and assert routes never include search.
- [ ] Implement exported resolver and read-only deduplicated catalogue (known BP + loaded actors/CDOs); exact path picker, paste and inline error.
- [ ] GREEN node --test scripts/offline-workbench/tests/connection.test.mjs; UI choose/invalid path, stale plan, readonly actualUE.

### Task2: Shared deterministic staggering
Files: src/launch-jitter.mjs (new), editing-model.mjs, editor-state.mjs, choreography-model.mjs, LaunchJitterControls.jsx (new), LaunchWorkspace.jsx, App.jsx; tests/launch-jitter.test.mjs.
Interfaces: validateLaunchJitter(config); launchDelay(config,key)->seconds; eventLaunchDelay(event)->seconds. Cue/call launchJitter={maxS,seed}; event.jitterKey stable across copy/point edits, launchJitterS derived once per normalization.
- [ ] RED assert editCue(doc,id,{launchJitter:{maxS:.2,seed:1}}) produces non-equal effective times within[launch,launch+.2]. Test blank creation multi-point together, native offsets, repeated normalization, stable reduced tiers, roundtrip, capture/reapply and duration rejection.
- [ ] Implement pure hash without Math.random, optional effective-time addition, validate malformed config before file normalization; together limit removed per new request.
- [ ] Add same compact controls in calls and placed cues, explicit換一组; timeline/actual times and nominal anchor distinguished.
- [ ] GREEN source core tests and actual isolatedQA create/save/undo/refresh.

### Task3: Library clarification and release
Files: TemplateLibraryCompact.jsx, library-model.mjs; scripts/offline-release.json, public offline adapter mirror, tool HTML/manual/verification; private v13 backup/diff.
- [ ] Label unbound builtin3 as预置框架 and link usage to存为编排模板; test capture creates fourth without mutating original.
- [ ] Set WORKBENCH_VERSION13 and v13 output; npm run build invokes source tests, packaging and wrapper checks once.
- [ ] Inspect actual8025+sameHTML HTTP, default full view, original counts, target block/confirmation, jitter playback and saved cue. Preserve original programme SHA.
- [ ] Update manual/zip, explicit-stage public artifacts + provenance, fetch/rebase/push then verify remote HTML blob; record actual scope and release claim.
