const Module=require('module');
const path=require('path');
const fixes=require('./pack-v1.2-fixes.js');
const originalLoad=Module._load;
Module._load=function(request,parent,isMain){
  const out=originalLoad.apply(this,arguments);
  if(typeof request==='string' && /pack-(201-300|301-400|401-500)-v1\.2\.js$/.test(request) && Array.isArray(out)){
    for(const card of out){if(fixes[card.rank])Object.assign(card,fixes[card.rank]);}
  }
  return out;
};
