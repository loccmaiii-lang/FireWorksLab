export function omitAudio(project){const next=structuredClone(project);next.payload.audioRef=null;return next;}
export function attachProgrammeMusic(state,result){
 const same=state.doc.meta.musicSourceSha256===result.audioRef.sha256,doc=structuredClone(state.doc);
 doc.meta={...doc.meta,musicStatus:'loaded',musicTitle:result.musicData.title,musicDuration:result.musicData.duration,musicSourceSha256:result.audioRef.sha256};
 if(!same){doc.meta.duration=Math.max(doc.meta.duration,Math.ceil((doc.meta.musicOffset??10)+result.musicData.duration+5));if(doc.meta.sectionsMode!=='user'){doc.sections=[];doc.meta.sectionsMode='user'}for(const c of doc.cues)delete c.musicBinding;}
 return {...state,...result,doc,musicMarkers:same?state.musicMarkers:[],matchedOriginal:same};
}
