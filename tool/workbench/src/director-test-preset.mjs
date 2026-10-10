// Existing-resource stand-ins for import testing, not final artistic equivalence.
const sources={
 P_SILVER:'f31f1dc9292a9c49',P_MS:'f31f1dc9292a9c49',P_LS:'f31f1dc9292a9c49',P_WALL:'f31f1dc9292a9c49',
 P_LIME:'74c3b4e0e82277d6',P_GREEN:'74c3b4e0e82277d6',P_SPLIT:'8557286249fab172',P_MG:'88e1963f28cefde7',
 P_MULTI:'1cd54421fde3942b',P_LG:'5b153822bb8b8adc',G_GOLD:'9f279e1f1e8f2fef',G_RED5:'b6ba2e17989bfdb1',G_SILVER13:'ba23f4fed432ce45',
 F_COMET:'189f99a4d6b9ed4d',F_SILVER:'f31f1dc9292a9c49',F_LIME:'0fd60d034ec2f5d3',F_GOLD:'c6e275dbcab032fc',F_CRACKLE:'f6a1e3a4b1a8162a'
};
export function existingResourceTestPreset(doc,catalog){
 const mapping={};
 for(const t of doc.templateLibrary){const source=catalog.find(s=>s.key===sources[t.id]);if(!source)throw Error(`测试素材不可用：${t.name}`);mapping[t.id]={source:source.key,mode:'whole',testStandIn:true};}
 return mapping;
}
