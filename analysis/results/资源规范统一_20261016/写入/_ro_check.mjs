// 只读：昨夜 26 测试在 UE 里留下的东西还在不在（临时发射器、未保存的脏包、4 个系统和代表材质的当前值）。不写、不存、不删。
import fs from 'node:fs';
import { py } from './ue_rw.mjs';
const r = await py(`# -*- coding: utf-8 -*-
import unreal, json
out = {}
acts = [a.get_actor_label() for a in unreal.EditorLevelLibrary.get_all_level_actors() if a.get_actor_label().startswith('RSU26_tmp_')]
out['rsu26_actors'] = acts
out['world'] = unreal.EditorLevelLibrary.get_editor_world().get_path_name()
try:
    dirty = [p.get_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()]
except Exception as e:
    dirty = ['ERR ' + str(e)]
out['dirty_count'] = len(dirty)
out['dirty'] = [d for d in dirty if 'FireWorks' in d or 'Fireworks' in d][:80]
print('FWL26:' + json.dumps(out))
`, 60000);
console.log(JSON.stringify(r, null, 1));
fs.writeFileSync(new URL('./ro_check_1215.json', import.meta.url), JSON.stringify(r, null, 1));
