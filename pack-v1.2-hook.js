global.EXAMPLE_FUNCTION_WORDS={};
const Module=require('module');
const fixes=require('./pack-v1.2-fixes.js');
const originalLoad=Module._load;
Module._load=function(request,parent,isMain){
  const out=originalLoad.apply(this,arguments);
  if(typeof request==='string' && /pack-(201-300|301-400|401-500)-v1\.2\.js$/.test(request) && Array.isArray(out)){
    for(const card of out){
      const fix=fixes[card.rank];
      if(!fix)continue;
      const merged={...fix};
      if(fix.form_notes) merged.form_notes={...(card.form_notes||{}),...fix.form_notes};
      Object.assign(card,merged);
    }
  }
  return out;
};
