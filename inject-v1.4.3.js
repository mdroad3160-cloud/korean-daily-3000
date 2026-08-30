const fs=require('fs');
const file=process.argv[2]||'_site/index.html';
let html=fs.readFileSync(file,'utf8');
const cards=require('./pack-751-775-v1.4.3.js');
if(cards.length!==25)throw new Error(`expected 25 cards, got ${cards.length}`);
for(let r=751;r<=775;r++)if(!cards.some(c=>c.rank===r))throw new Error(`missing Rank ${r}`);
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
const ready='const READY=new Map(PACK.filter(x=>x.ready!==false).map(x=>[x.rank,x]));';
if(!html.includes(ready))throw new Error('READY marker missing');
html=html.replace(ready,`PACK.push(...${JSON.stringify(cards)});\n${ready}`);
for(const v of ['1.4.2']){html=html.replaceAll(`const APP_VERSION="${v}";`,'const APP_VERSION="1.4.3";').replaceAll(`FSRS · v${v}`,'FSRS · v1.4.3').replaceAll(`Web公開版 v${v}`,'Web公開版 v1.4.3');}
html=html.replaceAll('教材化済み：Rank 1–750','教材化済み：Rank 1–775').replaceAll('Rank 1–750（うちRank 40','Rank 1–775（うちRank 40');
const required=['startBtn','showAnswerBtn','speakWordBtn','speakExampleBtn','knownBtn','saveSettingsBtn','exportBtn','importProgress','importPack'];
for(const id of required)if(!html.includes(`id="${id}"`))throw new Error(`control missing ${id}`);
for(const s of ['const STORAGE_KEY="korean-daily-3000-state-v01";','const SETTINGS_KEY="korean-daily-3000-settings-v01";','function normalizeExampleToken(','"rank":775,"word":"미소"','const APP_VERSION="1.4.3";'])if(!html.includes(s))throw new Error(`required invariant missing: ${s}`);
if(html.slice(0,html.indexOf('const PACK=')).includes('PACK.push('))throw new Error('PACK TDZ regression');
fs.writeFileSync(file,html);
console.log('AUDIT OK: Rank 751-775 mapped; all example tokens explained; grammar links valid; controls/storage/PACK invariant preserved; v1.4.3');
