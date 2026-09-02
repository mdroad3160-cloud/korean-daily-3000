'use strict';
const fs=require('fs');
const path=require.resolve('./inject-v1.6.16.js');
const target=process.argv[2]||'_site/index.html';
let code=fs.readFileSync(path,'utf8');
code=code.replace("VERSION='1.6.16'","VERSION='1.6.19'")
  .replace("require('./pack-next-v1.6.16.js')","require('./pack-next-v1.6.19.js')")
  .replace(/\nrequire\('child_process'\)\.execFileSync\(process\.execPath,\['inject-v1\.6\.17\.js',file\],\{stdio:'inherit'\}\);\s*$/,'\n');
if(!code.includes("VERSION='1.6.19'")||!code.includes("pack-next-v1.6.19.js")) throw Error('v1.6.19 template rewrite failed');
new Function('require','process',code)(require,process);
const out=fs.readFileSync(target,'utf8');
const rm=out.match(/(?:const|let)\s+RANK=(\[.*?\]);/s);if(!rm)throw Error('final RANK missing');
const ranks=JSON.parse(rm[1]);
const norm=s=>String(s||'').replace(/[-\s]/g,'').trim();
const nums=ranks.map(x=>Number(x.rank));
if(ranks.length!==5000||Math.max(...nums)!==5000||Math.min(...nums)!==1)throw Error(`Daily5000 incomplete: count=${ranks.length}, max=${Math.max(...nums)}`);
if(new Set(nums).size!==5000)throw Error('final duplicate rank');
for(let i=1;i<=5000;i++)if(!nums.includes(i))throw Error('final missing rank '+i);
if(new Set(ranks.map(x=>norm(x.word))).size!==5000)throw Error('final duplicate headword');
for(const key of ['korean-daily-3000-state-v01','korean-daily-3000-settings-v01','korean-daily-3000-sync-v01'])if(!out.includes(key))throw Error('final storage key missing '+key);
for(const marker of ['normalizeExampleToken','function initCloudSync(','function syncCloudCore(','function queueCloudSave(','id="startBtn"','id="showAnswerBtn"','id="knownBtn"','id="saveSettingsBtn"','id="cloudSyncNowBtn"'])if(!out.includes(marker))throw Error('final core marker missing '+marker);
const pp=out.search(/(?:const|let) PACK=/),rp=out.indexOf('const READY=new Map(PACK.filter');if(!(pp>=0&&rp>pp))throw Error('final PACK/READY order invalid');
console.log('Daily5000 v1.6.19 FINAL AUDIT OK: Rank 1-5000 complete; unique ranks/headwords; storage/core/PACK order preserved');
