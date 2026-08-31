const Module=require('module');
const load=Module._load;
Module._load=function(request,parent,isMain){
  const out=load.apply(this,arguments);
  if(typeof request==='string'&&request.includes('pack-2201-2300-v1.4.22.js')&&Array.isArray(out)&&out[7]?.[5]){
    out[7][5]=out[7][5].replace('単단하다','단단하다');
  }
  return out;
};
