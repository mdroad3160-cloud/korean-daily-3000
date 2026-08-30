const fs=require('fs');
const file=process.argv[2]||'_site/index.html';
let html=fs.readFileSync(file,'utf8');
const cards=require('./pack-801-825-v1.4.5.js');
if(cards.length!==25)throw new Error(`expected 25 cards, got ${cards.length}`);
for(let r=801;r<=825;r++)if(!cards.some(c=>c.rank===r))throw new Error(`missing Rank ${r}`);
const seen=new Set();
for(const c of cards){
 for(const k of ['word','meaning','example','example_jp','grammar_jp','form_notes'])if(!c[k])throw new Error(`Rank ${c.rank}: missing ${k}`);
 if(seen.has(c.example))throw new Error(`duplicate new example: ${c.example}`);seen.add(c.example);
 const tokens=String(c.example).match(/[0-9]+호예요|[0-9]+|[가-힣]+/g)||[];
 for(const t of tokens)if(!c.form_notes[t])throw new Error(`Rank ${c.rank}: unexplained token ${t}`);
 if(!Array.isArray(c.grammar_ranks)||!c.grammar_ranks.length)throw new Error(`Rank ${c.rank}: grammar link missing`);
}
const rm=html.match(/const RANK=(\[[\s\S]*?\]);/);if(!rm)throw new Error('RANK missing');
const rankRows=JSON.parse(rm[1]);const rankMap=new Map(rankRows.map(x=>[x.rank,x.word]));
for(const c of cards)if(rankMap.get(c.rank)!==c.word)throw new Error(`Rank ${c.rank}: expected ${rankMap.get(c.rank)}, got ${c.word}`);
const gm=html.match(/const GRAMMAR=(\[[\s\S]*?\]);/);if(!gm)throw new Error('GRAMMAR missing');
const grammarRanks=new Set(JSON.parse(gm[1]).map(x=>x.rank));
for(const c of cards)for(const g of c.grammar_ranks)if(!grammarRanks.has(g))throw new Error(`Rank ${c.rank}: invalid grammar rank ${g}`);
const allExamples=new Set([...html.matchAll(/"example":"([^"]+)"/g)].map(m=>m[1]));
for(const c of cards)if(allExamples.has(c.example))throw new Error(`duplicate existing example Rank ${c.rank}: ${c.example}`);
const ready='const READY=new Map(PACK.filter(x=>x.ready!==false).map(x=>[x.rank,x]));';
if(!html.includes(ready))throw new Error('READY marker missing');
html=html.replace(ready,`PACK.push(...${JSON.stringify(cards)});\n${ready}`);
html=html.replaceAll('const APP_VERSION="1.4.4";','const APP_VERSION="1.4.5";')
         .replaceAll('FSRS · v1.4.4','FSRS · v1.4.5')
         .replaceAll('Web公開版 v1.4.4','Web公開版 v1.4.5');
html=html.replaceAll('教材化済み：Rank 1–800','教材化済み：Rank 1–825')
         .replaceAll('Rank 1–800（うちRank 40','Rank 1–825（うちRank 40');
const required=['startBtn','showAnswerBtn','speakWordBtn','speakExampleBtn','knownBtn','saveSettingsBtn','exportBtn','importProgress','importPack'];
for(const id of required)if(!html.includes(`id="${id}"`))throw new Error(`control missing ${id}`);
for(const s of ['const STORAGE_KEY="korean-daily-3000-state-v01";','const SETTINGS_KEY="korean-daily-3000-settings-v01";','function normalizeExampleToken(','"rank":825,"word":"하"','const APP_VERSION="1.4.5";'])if(!html.includes(s))throw new Error(`required invariant missing: ${s}`);
if(html.slice(0,html.indexOf('const PACK=')).includes('PACK.push('))throw new Error('PACK TDZ regression');
fs.writeFileSync(file,html);
console.log('AUDIT OK: Rank 801-825 mapped; all example tokens explained; grammar links valid; duplicate examples absent; controls/storage/PACK invariant preserved; v1.4.5');
