'use strict';
const fs=require('fs');
const cp=require('child_process');
const file=process.argv[2]||'_site/index.html';
function maxRank(){
  const s=fs.readFileSync(file,'utf8');
  const m=s.match(/(?:const|let)\s+RANK=(\[.*?\]);/s);if(!m)throw new Error('RANK missing');
  const a=JSON.parse(m[1]);return Math.max(...a.map(x=>Number(x.rank)||0));
}
const nextByMax=new Map([
 [3000,'inject-v1.5.0.js'],[3100,'inject-v1.5.1.js'],[3200,'inject-v1.5.2.js'],[3300,'inject-v1.5.3.js'],
 [3400,'inject-v1.5.4.js'],[3500,'inject-v1.5.5.js'],[3600,'inject-v1.5.6.js'],[3700,'inject-v1.5.7.js'],
 [3800,'inject-v1.5.8.js'],[3900,'inject-v1.5.9.js'],[4000,'inject-v1.6.0.js'],[4100,'inject-v1.6.1.js'],
 [4200,'inject-v1.6.2.js'],[4300,'inject-v1.6.3.js']
]);
let guard=0;
while(maxRank()<5000){
  if(++guard>20)throw new Error('Daily5000 driver guard exceeded');
  const before=maxRank(),script=nextByMax.get(before);
  if(!script)throw new Error('No Daily5000 stage for current max Rank '+before);
  cp.execFileSync(process.execPath,[script,file],{stdio:'inherit'});
  const after=maxRank();if(after<=before)throw new Error(`${script} made no progress: ${before} -> ${after}`);
}
const s=fs.readFileSync(file,'utf8'),m=s.match(/(?:const|let)\s+RANK=(\[.*?\]);/s),r=JSON.parse(m[1]);
const nums=r.map(x=>Number(x.rank)),norm=x=>String(x||'').replace(/[-\s]/g,'').trim();
if(r.length!==5000||Math.min(...nums)!==1||Math.max(...nums)!==5000||new Set(nums).size!==5000)throw new Error('Final Rank 1-5000 continuity/uniqueness failed');
if(new Set(r.map(x=>norm(x.word))).size!==5000)throw new Error('Final Rank 1-5000 headword uniqueness failed');
console.log('Daily5000 driver FINAL OK: Rank 1-5000 complete and unique');
