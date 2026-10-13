// 只读：当前选中的 Actor、打开的资产编辑器（看是谁的 Details 在吃帧）
import {request} from '../MOBILE_TEST_20261011/ue.mjs';
const code=`import unreal, json
sel=[a.get_path_name() for a in unreal.EditorLevelLibrary.get_selected_level_actors()]
opened=[]
try:
  sub=unreal.get_editor_subsystem(unreal.AssetEditorSubsystem)
  opened=[str(x.get_path_name()) for x in sub.get_all_edited_assets()]
except Exception as e:
  opened=['ERR '+str(e)]
print('FWLSEL:'+json.dumps({'selected':sel,'openEditors':opened}))
`;
const r=await request('/object/call',{path:'/Script/PythonScriptPlugin.Default__PythonScriptLibrary',function:'ExecutePythonCommandEx',args:{PythonCommand:code,ExecutionMode:'ExecuteFile',FileExecutionScope:'Private'}},60000);
const d=r.data||r;const m=/Output="(FWLSEL:(?:[^"\\]|\\.)*)"/.exec(d.out_LogOutput||'');console.log(m?m[1].replace(/\\(.)/g,'$1'):String(d.out_CommandResult).slice(-600));
