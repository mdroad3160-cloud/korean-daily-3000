'use strict';
const fs=require('fs');
const path=require.resolve('./inject-v1.6.16.js');
let code=fs.readFileSync(path,'utf8');
code=code.replace("VERSION='1.6.16'","VERSION='1.6.18'")
  .replace("require('./pack-next-v1.6.16.js')","require('./pack-next-v1.6.18.js')")
  .replace(/\nrequire\('child_process'\)\.execFileSync\(process\.execPath,\['inject-v1\.6\.17\.js',file\],\{stdio:'inherit'\}\);\s*$/,'\n');
if(!code.includes("VERSION='1.6.18'")||!code.includes("pack-next-v1.6.18.js")) throw Error('v1.6.18 template rewrite failed');
new Function('require','process',code)(require,process);
