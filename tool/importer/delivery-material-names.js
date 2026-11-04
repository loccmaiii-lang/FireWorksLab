  // In the NEW delivery entry only: keep existing templates/execution, separate implicit mobile MI targets.
  // PC and mobile share Ramp/Cutout, but cannot share a material that binds different main textures.
  const deliveryOriginalMaterialName=formalMaterialName;
  formalMaterialName=function(spec,key,m){
    const name=deliveryOriginalMaterialName(spec,key,m);
    return spec.platform==='mobile'&&name?name.replace(/_HD$/,''):name;
  };
