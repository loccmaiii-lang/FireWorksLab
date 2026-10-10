import {makeBackup} from './workbench-data.mjs';
// Capture at submission, not when a slow previous IndexedDB write finishes.
export function createProgrammeSaver(writeBatch,key,seed){
 let tail=Promise.resolve();
 return state=>{const raw=JSON.stringify(makeBackup(state,seed)),entries=[[key,raw],[key+'-program-'+(state.doc.meta.programId||'ORIGINAL'),raw]];
 const result=tail.catch(()=>{}).then(()=>writeBatch(entries));tail=result;return result;};
}
