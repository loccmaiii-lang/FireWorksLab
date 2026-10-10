export const SOURCE_BP='/Game/BluePrints/ShowDirector/Template/FX/BP_FX_FireWorksShow_Template.BP_FX_FireWorksShow_Template';
export const sourceAlias=(index,name)=>`WB_S${String(index).padStart(2,'0')}_${name.replace(/[^A-Za-z0-9_]/g,'_')}`;
const rows={P_SILVER:10,P_LIME:5,P_SPLIT:3,P_MS:10,P_MG:6,P_GREEN:5,P_MULTI:7,P_LS:10,P_LG:9,P_WALL:10,G_GOLD:1,G_RED5:2,G_SILVER13:1,F_COMET:4,F_SILVER:10,F_LIME:5,F_GOLD:8,F_CRACKLE:3};
export function sourceMapping(doc,catalog){
 const mapping={};for(const t of doc.templateLibrary){const s=catalog.find(c=>c.sourcePath===SOURCE_BP&&c.sourceIndex===rows[t.id]);if(!s?.sub.Entries?.length)throw Error(`${t.name}：指定库第${rows[t.id]+1}条不可用`);
  mapping[t.id]={source:s.key,mode:'whole',sourcePath:s.sourcePath,sourceIndex:s.sourceIndex,note:t.id==='G_GOLD'?'用户确认第2条为金扇形（来源名称误写）':t.id==='G_SILVER13'?'使用库中银扇形；与金扇形当前引用同一条资源':'按指定库原条目；形态与节奏仍需实播校准'};
 }return mapping;
}
