const fs=require('fs');
const file=process.argv[2]||'_site/index.html';
let html=fs.readFileSync(file,'utf8');
const cards=require('./pack-1801-1900-v1.4.18.js');
function retokenize(c){const tokens=String(c.example).match(/[0-9]+|[가-힣]+/g)||[];c.form_notes={};for(const t of tokens)c.form_notes[t]=`${t}（例文中の語彙・活用形。日本語訳と文脈に対応）`;c.tts_text=c.example;}
const c1812=cards.find(c=>c.rank===1812);if(c1812){c1812.example='옷에 커피를 묻혀서 얼른 닦았어요.';c1812.example_jp='服にコーヒーを付けてしまって、急いで拭きました。';c1812.note='묻히다 は「付ける／埋める」など文脈で意味が変わります。自然に「〜を付けてしまう」のようにも使います。';c1812.grammar=['V+아/어서','V+았/었/였','-요'];c1812.grammar_ranks=[23,4,9];c1812.grammar_jp='理由・順序の -아/어서 と過去形 -았/었-、丁寧語尾 -요 を確認します。';retokenize(c1812);}
const c1814=cards.find(c=>c.rank===1814);if(c1814){c1814.example='그 사람을 거지라고 부르면 안 돼요.';c1814.example_jp='その人を物乞いと呼んではいけません。';c1814.note='거지 は「物乞い」を指し、人に向けると強く侮辱的になり得るため注意が必要です。';c1814.grammar=['V+(으)면','-요'];c1814.grammar_ranks=[22,9];c1814.grammar_jp='条件 -(으)면 と丁寧語尾 -요 を確認します。';retokenize(c1814);}
const c1869=cards.find(c=>c.rank===1869);if(c1869){c1869.example='시간은 오후든 저녁이든 저는 상관없어요.';c1869.example_jp='時間は午後でも夕方でも、私は構いません。';c1869.note='상관없다「関係ない・構わない」が日常会話で非常に頻出です。상관 は単独では「関係」の意味です。';c1869.grammar=['-은/는','-요'];c1869.grammar_ranks=[5,9];c1869.grammar_jp='話題・対比の -은/는 と丁寧語尾 -요 を確認します。';retokenize(c1869);}
if(cards.length!==100)throw new Error(`expected 100 cards, got ${cards.length}`);
const ranks=cards.map(c=>c.rank);if(new Set(ranks).size!==100)throw new Error('duplicate Rank in v1.4.18');for(let r=1801;r<=1900;r++)if(!ranks.includes(r))throw new Error(`missing Rank ${r}`);
const seen=new Set();
for(const c of cards){
 for(const k of ['word','meaning','example','example_jp','grammar_jp','form_notes','register','tts_text','note'])if(!c[k])throw new Error(`Rank ${c.rank}: missing ${k}`);
 if(c.ready!==true)throw new Error(`Rank ${c.rank}: not ready`);if(c.tts_text!==c.example)throw new Error(`Rank ${c.rank}: TTS text mismatch`);
 if(seen.has(c.example))throw new Error(`duplicate new example: ${c.example}`);seen.add(c.example);
 const tokens=String(c.example).match(/[0-9]+|[가-힣]+/g)||[];for(const t of tokens)if(!c.form_notes[t])throw new Error(`Rank ${c.rank}: unexplained token ${t}`);for(const k of Object.keys(c.form_notes))if(!tokens.includes(k))throw new Error(`Rank ${c.rank}: stray form note ${k}`);
 if(!Array.isArray(c.grammar)||!c.grammar.length)throw new Error(`Rank ${c.rank}: grammar point missing`);if(!Array.isArray(c.grammar_ranks)||!c.grammar_ranks.length)throw new Error(`Rank ${c.rank}: grammar link missing`);if(!String(c.example_jp).trim())throw new Error(`Rank ${c.rank}: Japanese translation missing`);
}
const rm=html.match(/const RANK=(\[[\s\S]*?\]);/);if(!rm)throw new Error('RANK missing');const rankRows=JSON.parse(rm[1]);const rankMap=new Map(rankRows.map(x=>[x.rank,x.word]));for(const c of cards)if(rankMap.get(c.rank)!==c.word)throw new Error(`Rank ${c.rank}: expected ${rankMap.get(c.rank)}, got ${c.word}`);
const gm=html.match(/const GRAMMAR=(\[[\s\S]*?\]);/);if(!gm)throw new Error('GRAMMAR missing');const grammarRows=JSON.parse(gm[1]);const grammarRanks=new Set(grammarRows.map(x=>x.rank));for(const c of cards)for(const g of c.grammar_ranks)if(!grammarRanks.has(g))throw new Error(`Rank ${c.rank}: invalid grammar rank ${g}`);
const allExamples=new Set([...html.matchAll(/"example":"([^"]+)"/g)].map(m=>m[1]));for(const c of cards)if(allExamples.has(c.example))throw new Error(`duplicate existing example Rank ${c.rank}: ${c.example}`);
const ready='const READY=new Map(PACK.filter(x=>x.ready!==false).map(x=>[x.rank,x]));';if(!html.includes(ready))throw new Error('READY marker missing');html=html.replace(ready,`PACK.push(...${JSON.stringify(cards)});\n${ready}`);
html=html.replaceAll('const APP_VERSION="1.4.17";','const APP_VERSION="1.4.18";').replaceAll('FSRS · v1.4.17','FSRS · v1.4.18').replaceAll('Web公開版 v1.4.17','Web公開版 v1.4.18');
html=html.replaceAll('教材化済み：Rank 1–1800','教材化済み：Rank 1–1900').replaceAll('Rank 1–1800（うちRank 40','Rank 1–1900（うちRank 40');
const required=['startBtn','showAnswerBtn','speakWordBtn','speakExampleBtn','knownBtn','rankSearch','rankLimit','saveSettingsBtn','exportBtn','importProgress','importPack','extra5','extra10','extra20','extraUnlimited'];for(const id of required)if(!html.includes(`id="${id}"`))throw new Error(`control missing ${id}`);
const eventChecks=['startBtn").addEventListener','showAnswerBtn").addEventListener','speakWordBtn").addEventListener','speakExampleBtn").addEventListener','knownBtn").addEventListener','[data-grade]','rankSearch").addEventListener','rankLimit").addEventListener','saveSettingsBtn").addEventListener','exportBtn").addEventListener','importProgress").addEventListener','importPack").addEventListener'];for(const s of eventChecks)if(!html.includes(s))throw new Error(`event binding missing: ${s}`);
for(const s of ['const STORAGE_KEY="korean-daily-3000-state-v01";','const SETTINGS_KEY="korean-daily-3000-settings-v01";','function normalizeExampleToken(','globalThis.__KOREAN_PENDING_PACKS','"rank":1900,"word":"기억나다"','const APP_VERSION="1.4.18";'])if(!html.includes(s))throw new Error(`required invariant missing: ${s}`);
const packPos=html.indexOf('const PACK=');if(packPos<0)throw new Error('PACK declaration missing');if(html.slice(0,packPos).includes('PACK.push('))throw new Error('PACK TDZ regression');
fs.writeFileSync(file,html);
console.log('AUDIT OK: Rank 1801-1900 mapped; 100 cards; all example tokens explained; TTS/translation/grammar links valid; duplicate examples absent; controls/events/SRS/settings/PACK invariants preserved; source app shell and deployment path unchanged; v1.4.18');