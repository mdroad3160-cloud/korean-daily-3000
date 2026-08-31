const fs=require('fs');
const file=process.argv[2]||'_site/index.html';
let html=fs.readFileSync(file,'utf8');
const cards=require('./pack-1401-1500-v1.4.14.js');
const stop=process.env.AUDIT_STOP_AFTER||'';
const done=s=>{if(stop===s){console.log(`AUDIT CHECKPOINT OK: ${s}`);process.exit(0);}};

if(cards.length!==100)throw new Error(`expected 100 cards, got ${cards.length}`);
const ranks=cards.map(c=>c.rank);
if(new Set(ranks).size!==100)throw new Error('duplicate Rank in v1.4.14');
for(let r=1401;r<=1500;r++)if(!ranks.includes(r))throw new Error(`missing Rank ${r}`);

const seen=new Set();
for(const c of cards){
 for(const k of ['word','meaning','example','example_jp','grammar_jp','form_notes','register','tts_text','note']) if(!c[k])throw new Error(`Rank ${c.rank}: missing ${k}`);
 if(c.ready!==true)throw new Error(`Rank ${c.rank}: not ready`);
 if(c.tts_text!==c.example)throw new Error(`Rank ${c.rank}: TTS text mismatch`);
 if(seen.has(c.example))throw new Error(`duplicate new example: ${c.example}`);
 seen.add(c.example);
 const tokens=String(c.example).match(/[0-9]+|[가-힣]+/g)||[];
 for(const t of tokens)if(!c.form_notes[t])throw new Error(`Rank ${c.rank}: unexplained token ${t}`);
 for(const k of Object.keys(c.form_notes))if(!tokens.includes(k))throw new Error(`Rank ${c.rank}: stray form note ${k}`);
 if(!Array.isArray(c.grammar)||!c.grammar.length)throw new Error(`Rank ${c.rank}: grammar point missing`);
 if(!Array.isArray(c.grammar_ranks)||!c.grammar_ranks.length)throw new Error(`Rank ${c.rank}: grammar link missing`);
 if(!String(c.example_jp).trim())throw new Error(`Rank ${c.rank}: Japanese translation missing`);
}
done('cards');

const rm=html.match(/const RANK=(\[[\s\S]*?\]);/);if(!rm)throw new Error('RANK missing');
const rankRows=JSON.parse(rm[1]);const rankMap=new Map(rankRows.map(x=>[x.rank,x.word]));
for(const c of cards)if(rankMap.get(c.rank)!==c.word)throw new Error(`Rank ${c.rank}: expected ${rankMap.get(c.rank)}, got ${c.word}`);
done('rank');

const gm=html.match(/const GRAMMAR=(\[[\s\S]*?\]);/);if(!gm)throw new Error('GRAMMAR missing');
const grammarRows=JSON.parse(gm[1]);const grammarRanks=new Set(grammarRows.map(x=>x.rank));
for(const c of cards)for(const g of c.grammar_ranks)if(!grammarRanks.has(g))throw new Error(`Rank ${c.rank}: invalid grammar rank ${g}`);
done('grammar');

const allExamples=new Set([...html.matchAll(/"example":"([^"]+)"/g)].map(m=>m[1]));
const dupMin=Number(process.env.DUP_MIN||1401),dupMax=Number(process.env.DUP_MAX||1500);
for(const c of cards)if(c.rank>=dupMin&&c.rank<=dupMax&&allExamples.has(c.example))throw new Error(`duplicate existing example Rank ${c.rank}: ${c.example}`);
done('dupes');

const ready='const READY=new Map(PACK.filter(x=>x.ready!==false).map(x=>[x.rank,x]));';if(!html.includes(ready))throw new Error('READY marker missing');
html=html.replace(ready,`PACK.push(...${JSON.stringify(cards)});\n${ready}`);
html=html.replaceAll('const APP_VERSION="1.4.13";','const APP_VERSION="1.4.14";')
         .replaceAll('FSRS · v1.4.13','FSRS · v1.4.14')
         .replaceAll('Web公開版 v1.4.13','Web公開版 v1.4.14');
html=html.replaceAll('教材化済み：Rank 1–1400','教材化済み：Rank 1–1500')
         .replaceAll('Rank 1–1400（うちRank 40','Rank 1–1500（うちRank 40');

const required=['startBtn','showAnswerBtn','speakWordBtn','speakExampleBtn','knownBtn','rankSearch','rankLimit','saveSettingsBtn','exportBtn','importProgress','importPack','extra5','extra10','extra20','extraUnlimited'];
for(const id of required)if(!html.includes(`id="${id}"`))throw new Error(`control missing ${id}`);
const eventChecks=['startBtn").addEventListener','showAnswerBtn").addEventListener','speakWordBtn").addEventListener','speakExampleBtn").addEventListener','knownBtn").addEventListener','[data-grade]','rankSearch").addEventListener','rankLimit").addEventListener','saveSettingsBtn").addEventListener','exportBtn").addEventListener','importProgress").addEventListener','importPack").addEventListener'];
for(const s of eventChecks)if(!html.includes(s))throw new Error(`event binding missing: ${s}`);
for(const s of [
 'const STORAGE_KEY="korean-daily-3000-state-v01";',
 'const SETTINGS_KEY="korean-daily-3000-settings-v01";',
 'function normalizeExampleToken(',
 'globalThis.__KOREAN_PENDING_PACKS',
 '"rank":1500,"word":"깨끗하다"',
 'const APP_VERSION="1.4.14";'
])if(!html.includes(s))throw new Error(`required invariant missing: ${s}`);
const packPos=html.indexOf('const PACK=');if(packPos<0)throw new Error('PACK declaration missing');
if(html.slice(0,packPos).includes('PACK.push('))throw new Error('PACK TDZ regression');
fs.writeFileSync(file,html);
console.log('AUDIT OK: Rank 1401-1500 mapped; 100 cards; all example tokens explained; TTS/translation/grammar links valid; duplicate examples absent; controls/events/storage/PACK invariants preserved; v1.4.14');
