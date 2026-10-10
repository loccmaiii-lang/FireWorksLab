import {validateDoc} from './editing-model.mjs';
import {changeMusicOffset} from './program-project.mjs';
export function applyProgrammeSettings(state,patch={}){
 const next=patch.musicOffset!==undefined?changeMusicOffset(state,patch.musicOffset):{...state,doc:{...state.doc,meta:{...state.doc.meta}}};
 if(patch.programName!==undefined){const name=String(patch.programName).trim();if(!name)throw Error('请输入节目名称');patch={...patch,programName:name,name};}
 if(patch.duration!==undefined&&(!Number.isFinite(patch.duration)||patch.duration<10||patch.duration>3600))throw Error('节目时长为10–3600秒');
 Object.assign(next.doc.meta,patch);const errors=validateDoc(next.doc);if(errors.length)throw Error(errors[0]);return next;
}
